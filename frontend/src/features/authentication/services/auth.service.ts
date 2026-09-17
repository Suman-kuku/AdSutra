import type { PersonDTO } from '@scriptcraft/shared';
import { supabase } from '../../../services/supabase.client';
import { apiFetch } from '../../../services/api.client';

/**
 * Starts the Google OAuth redirect. Any Google account may sign in — that only
 * creates a profile and a waitlist entry; an admin grants the actual access.
 */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: { prompt: 'select_account' },
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
