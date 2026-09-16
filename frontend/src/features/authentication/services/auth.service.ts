import type { PersonDTO } from '@scriptcraft/shared';
import { supabase } from '../../../services/supabase.client';
import { apiFetch } from '../../../services/api.client';

/**
 * Starts the Google OAuth redirect. `hd` asks Google to show only company
 * accounts — a convenience, not a control. The real restriction is enforced
 * server-side in auth.middleware.
 */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: { hd: 'kukufm.com', prompt: 'select_account' },
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Exchanges the Supabase session for the caller's profile. */
export async function createSession(): Promise<PersonDTO> {
  return apiFetch<PersonDTO>('/auth/session', { method: 'POST' });
}
