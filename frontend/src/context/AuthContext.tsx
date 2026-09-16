import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { PersonDTO } from '@scriptcraft/shared';
import { supabase } from '../services/supabase.client';
import { ApiError } from '../services/api.client';
import * as authService from '../features/authentication/services/auth.service';

export interface AuthContextValue {
  /** null once loading finishes and nobody is signed in. */
  person: PersonDTO | null;
  session: Session | null;
  /** True until the initial session check resolves. */
  isLoading: boolean;
  /** Set when the backend rejected an otherwise valid Google session. */
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [person, setPerson] = useState<PersonDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Turns a Supabase session into a ScriptCraft profile. The backend is the
  // authority on who may in — it enforces the @kukufm.com rule — so a rejection
  // here signs the user back out rather than leaving a half-authenticated UI.
  const resolvePerson = useCallback(async (next: Session | null) => {
    if (!next) {
      setPerson(null);
      setError(null);
      return;
    }
    try {
      setPerson(await authService.createSession());
      setError(null);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not verify your account. Please try again.';
      setError(message);
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
      signInWithGoogle: authService.signInWithGoogle,
      signOut: authService.signOut,
    }),
    [person, session, isLoading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
