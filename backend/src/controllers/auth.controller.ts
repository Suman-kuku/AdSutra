import type { RequestHandler } from 'express';
import type { APIResponse, PersonDTO } from '@scriptcraft/shared';
import { supabaseAdmin } from '../config/supabase.js';
import { getPersonById, syncPersonFromAuth, toPersonDTO } from '../services/people.service.js';
import { AppError } from '../middleware/errorHandler.js';

/** Reads the display fields Google returns, whichever key it used. */
function profileFromMetadata(metadata: Record<string, unknown>): {
  name: string | null;
  avatarUrl: string | null;
} {
  const pick = (key: string): string | null => {
    const value = metadata[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
  };
  return {
    name: pick('full_name') ?? pick('name'),
    avatarUrl: pick('avatar_url') ?? pick('picture'),
  };
}

/**
 * POST /auth/session — called once after the OAuth redirect.
 *
 * `requireAuth` has already verified the JWT and the email domain. The `people`
 * row exists courtesy of the signup trigger, so this refreshes the Google-owned
 * profile fields and hands back the caller's profile.
 */
export const createSession: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      if (!req.user || !req.accessToken) {
        throw AppError.unauthorized('Authentication required.', 'NO_SESSION');
      }

      const { data, error } = await supabaseAdmin.auth.getUser(req.accessToken);
      if (error || !data.user) {
        throw AppError.unauthorized('Invalid or expired session.', 'INVALID_TOKEN');
      }

      const person = await getPersonById(req.user.id);
      if (!person) {
        throw AppError.forbidden('No profile found for this account.', 'NO_PROFILE');
      }

      const updated = await syncPersonFromAuth(
        person,
        profileFromMetadata(data.user.user_metadata ?? {}),
      );

      const body: APIResponse<PersonDTO> = { ok: true, data: toPersonDTO(updated) };
      res.json(body);
    } catch (err) {
      next(err);
    }
  })();
};

/** GET /me — the current profile, already loaded by `requireAuth`. */
export const getMe: RequestHandler = (req, res, next) => {
  if (!req.user) {
    next(AppError.unauthorized('Authentication required.', 'NO_SESSION'));
    return;
  }
  const body: APIResponse<PersonDTO> = { ok: true, data: req.user };
  res.json(body);
};
