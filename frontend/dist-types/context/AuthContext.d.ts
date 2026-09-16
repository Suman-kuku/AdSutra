import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { PersonDTO } from '@scriptcraft/shared';
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
export declare const AuthContext: import("react").Context<AuthContextValue | undefined>;
export declare function AuthProvider({ children }: {
    children: ReactNode;
}): React.JSX.Element;
//# sourceMappingURL=AuthContext.d.ts.map