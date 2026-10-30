import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Social features need a handle: send first-time users to profile setup (the demo skips it). */
export function RequireProfile() {
  const { isDemo, profile, profileLoading } = useAuth();
  const location = useLocation();
  if (profileLoading) return null;
  if (!isDemo && !profile) return <Navigate to="/setup" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
