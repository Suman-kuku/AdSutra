import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { PersonDTO } from '@scriptcraft/shared';
import { supabase } from '../services/supabase.client';
import { ApiError } from '../services/api.client';
import * as authService from '../features/authentication/services/auth.service';

/**
 * Why the backend turned a valid Google session away. `pending` and `denied`
 * are normal states, not failures, so the login page says so in plain words
 * instead of showing a red error.
 */
export type AccessState = 'pending' | 'denied' | null;

export interface AuthContextValue {
  /** null once loading finishes and nobody is signed in. */
  person: PersonDTO | null;
  session: Session | null;
  /** True until the initial session check resolves. */
  isLoading: boolean;
  /** Set when the backend rejected an otherwise valid Google session. */
  error: string | null;
  /** Set instead of `error` when the rejection is a waitlist decision. */
  accessState: AccessState;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [person, setPerson] = useState<PersonDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessState, setAccessState] = useState<AccessState>(null);

  // Turns a Supabase session into a ScriptCraft profile. The backend is the
  // authority on who may in — it checks the waitlist decision on the row — so a
  // rejection here signs the user back out rather than leaving a
  // half-authenticated UI.
  const resolvePerson = useCallback(async (next: Session | null) => {
    if (!next) {
      setPerson(null);
      setError(null);
      setAccessState(null);
      return;
    }
    try {
      setPerson(await authService.createSession());
      setError(null);
      setAccessState(null);
    } catch (err) {
      // A first-time signer-in is `pending`: their profile row now exists and
      // sits on the admin waitlist. That is the request being made — there is
      // nothing else for them to submit.
      const code = err instanceof ApiError ? err.code : null;
      const waiting = code === 'ACCESS_PENDING' ? 'pending' : code === 'ACCESS_DENIED' ? 'denied' : null;

      setAccessState(waiting);
      setError(
        waiting
          ? null
          : err instanceof ApiError
            ? err.message
            : 'Could not verify your account. Please try again.',
      );
      setPerson(null);
      await supabase.auth.signOut();
    }
  }, []);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await resolvePerson(data.session);
      if (active) setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      // TOKEN_REFRESHED keeps the same user; re-fetching the profile would be noise.
      if (event === 'TOKEN_REFRESHED') return;
      void resolvePerson(next);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [resolvePerson]);

  const value = useMemo<AuthContextValue>(
    () => ({
      person,
      session,
      isLoading,
      error,
      accessState,
      signInWithGoogle: authService.signInWithGoogle,
      signOut: authService.signOut,
    }),
    [person, session, isLoading, error, accessState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
