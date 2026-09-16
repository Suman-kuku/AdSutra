import type { PersonDTO } from '@scriptcraft/shared';

declare global {
  namespace Express {
    interface Request {
      /** Set by auth.middleware. Present on every route mounted behind it. */
      user?: PersonDTO;
      /** The caller's raw Supabase access token, for RLS-scoped queries. */
      accessToken?: string;
    }
  }
}

export {};
