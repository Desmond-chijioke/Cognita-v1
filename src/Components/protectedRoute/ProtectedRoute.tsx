import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../Redux/hooks';
import GlobalLoader from '../shared/GlobalLoader';

export default function ProtectedRoute() {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const isInitializing  = useAppSelector(state => state.auth.isInitializing);
  const location        = useLocation();

  if (isInitializing) {
    return <GlobalLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
