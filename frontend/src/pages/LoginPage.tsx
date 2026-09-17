import { Navigate } from 'react-router-dom';
import { GoogleSignInButton, useAuth } from '../features/authentication';
import { FullPageMessage } from '../components/ui/FullPageMessage';

export function LoginPage(): React.JSX.Element {
  const { person, isLoading, error, accessState } = useAuth();

  if (isLoading) return <FullPageMessage text="Loading…" />;
  if (person) return <Navigate to="/" replace />;

  // Signing in is itself the access request — the profile row it creates is
  // what an admin sees on the waitlist. So this is an outcome, not an error.
  if (accessState) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">AdSutra</h1>
          <p className="mt-1 text-sm text-slate-500">Promo generation platform</p>

          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            {accessState === 'pending' ? (
              <>
                <p className="text-sm font-medium text-slate-900">Access requested</p>
                <p className="mt-2 text-sm text-slate-600">
                  Your request is with the admins. You will be able to sign in as soon as one of
                  them approves it.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-900">No access</p>
                <p className="mt-2 text-sm text-slate-600">
                  Your access to this workspace has been removed. Ask an admin if you think that is
                  a mistake.
                </p>
              </>
            )}

            <div className="mt-5">
              <GoogleSignInButton />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">ScriptCraft</h1>
        <p className="mt-1 text-sm text-slate-500">Promo generation platform</p>

        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-5 text-sm text-slate-600">Sign in with your Google account.</p>

          <GoogleSignInButton />

          {error && (
            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <p className="mt-5 text-xs text-slate-400">
            New here? Signing in sends an access request to the admins.
          </p>
        </div>
      </div>
    </main>
  );
}
