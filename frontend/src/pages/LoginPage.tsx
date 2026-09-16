import { Navigate } from 'react-router-dom';
import { GoogleSignInButton, useAuth } from '../features/authentication';
import { FullPageMessage } from '../components/ui/FullPageMessage';

export function LoginPage(): React.JSX.Element {
  const { person, isLoading, error } = useAuth();

  if (isLoading) return <FullPageMessage text="Loading…" />;
  if (person) return <Navigate to="/" replace />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">ScriptCraft</h1>
        <p className="mt-1 text-sm text-slate-500">Promo generation platform</p>

        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-5 text-sm text-slate-600">Sign in with your company Google account.</p>

          <GoogleSignInButton />

          {error && (
            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <p className="mt-5 text-xs text-slate-400">Restricted to @kukufm.com accounts.</p>
        </div>
      </div>
    </main>
  );
}
