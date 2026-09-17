import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { PersonDTO } from '@scriptcraft/shared';
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
export declare const AuthContext: import("react").Context<AuthContextValue | undefined>;
export declare function AuthProvider({ children }: {
    children: ReactNode;
}): React.JSX.Element;
//# sourceMappingURL=AuthContext.d.ts.map