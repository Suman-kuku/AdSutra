import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { supabaseAdmin } from '../config/supabase.js';
import { getPersonById, toPersonDTO } from '../services/people.service.js';
import { AppError } from './errorHandler.js';

function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

function isAllowedDomain(email: string): boolean {
  return email.toLowerCase().endsWith(`@${env.ALLOWED_EMAIL_DOMAIN.toLowerCase()}`);
}

/**
 * Verifies the caller's Supabase JWT and attaches their `people` row.
 *
 * Domain restriction is enforced here rather than only at login, so a session
 * minted before the rule existed still cannot reach a protected route.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  void (async () => {
    try {
      const token = bearerToken(req.headers.authorization);
      if (!token) {
        throw AppError.unauthorized('Missing bearer token.', 'NO_TOKEN');
      }

      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data.user) {
        throw AppError.unauthorized('Invalid or expired session.', 'INVALID_TOKEN');
      }

      const email = data.user.email;
      if (!email) {
        throw AppError.forbidden('Your Google account has no email address.', 'NO_EMAIL');
      }
      if (!isAllowedDomain(email)) {
        throw AppError.forbidden(
          `Sign-in is restricted to @${env.ALLOWED_EMAIL_DOMAIN} accounts.`,
          'DOMAIN_NOT_ALLOWED',
        );
      }

      const person = await getPersonById(data.user.id);
      if (!person) {
        throw AppError.forbidden('No profile found for this account.', 'NO_PROFILE');
      }
      if (!person.is_active) {
        throw AppError.forbidden('This account has been deactivated.', 'ACCOUNT_INACTIVE');
      }

      req.user = toPersonDTO(person);
      req.accessToken = token;
      next();
    } catch (err) {
      next(err);
    }
  })();
};
