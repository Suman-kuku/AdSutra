import type { RequestHandler } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { getPersonById, toPersonDTO } from '../services/people.service.js';
import { AppError } from './errorHandler.js';

function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

/**
 * Verifies the caller's Supabase JWT and attaches their `people` row.
 *
 * Anyone with a Google account can sign in and get a profile row. Signing in
 * is not access — `access_status` is, and an admin decides it on the People
 * page. Checked on every request, not only at login, so revoking access takes
 * effect on the next call rather than at the next sign-in.
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

      if (!data.user.email) {
        throw AppError.forbidden('Your Google account has no email address.', 'NO_EMAIL');
      }

      const person = await getPersonById(data.user.id);
      if (!person) {
        throw AppError.forbidden('No profile found for this account.', 'NO_PROFILE');
      }
      // The `people` row exists from first sign-in onward, so "has a row" is
      // not "has access" — `access_status` is. A pending row *is* the waitlist
      // entry an admin sees.
      if (person.access_status === 'pending') {
        throw AppError.forbidden(
          'Your access request is waiting for an admin to approve it.',
          'ACCESS_PENDING',
        );
      }
      if (person.access_status === 'denied') {
        throw AppError.forbidden(
          'Your access to this workspace has been removed.',
          'ACCESS_DENIED',
        );
      }

      req.user = toPersonDTO(person);
      req.accessToken = token;
      next();
    } catch (err) {
      next(err);
    }
  })();
};
