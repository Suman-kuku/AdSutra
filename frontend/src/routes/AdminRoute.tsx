import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../features/authentication';

/**
 * Mount inside `ProtectedRoute`, so the session is already resolved here. A
 * creator who types the URL is sent home rather than shown an empty page —
 * the API would refuse them anyway (`requireAdmin`).
 */
export function AdminRoute(): React.JSX.Element {
  const { person } = useAuth();
  if (person?.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}
