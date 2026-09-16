import type { PersonDTO } from '@scriptcraft/shared';
/**
 * Starts the Google OAuth redirect. `hd` asks Google to show only company
 * accounts — a convenience, not a control. The real restriction is enforced
 * server-side in auth.middleware.
 */
export declare function signInWithGoogle(): Promise<void>;
export declare function signOut(): Promise<void>;
/** Exchanges the Supabase session for the caller's profile. */
export declare function createSession(): Promise<PersonDTO>;
//# sourceMappingURL=auth.service.d.ts.map