import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';

/** Bottom-nav "Profile": my public profile (the demo has none, so it gets its settings). */
export function MePage() {
  const { isDemo, profile } = useAuth();
  if (isDemo || !profile) return <Navigate to="/settings" replace />;
  return <Navigate to={`/u/${profile.handle}`} replace />;
}
