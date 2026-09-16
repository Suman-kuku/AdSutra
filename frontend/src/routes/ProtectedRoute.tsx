import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/authentication';
import { FullPageMessage } from '../components/ui/FullPageMessage';

/** Gate for authenticated routes. Waits for the session check before deciding. */
export function ProtectedRoute(): React.JSX.Element {
  const { person, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageMessage text="Loading…" />;
  if (!person) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return <Outlet />;
}
