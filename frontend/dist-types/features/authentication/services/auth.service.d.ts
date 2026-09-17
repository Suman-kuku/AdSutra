import type { PersonDTO } from '@scriptcraft/shared';
/**
 * Starts the Google OAuth redirect. Any Google account may sign in — that only
 * creates a profile and a waitlist entry; an admin grants the actual access.
 */
export declare function signInWithGoogle(): Promise<void>;
export declare function signOut(): Promise<void>;
/** Exchanges the Supabase session for the caller's profile. */
export declare function createSession(): Promise<PersonDTO>;
//# sourceMappingURL=auth.service.d.ts.map