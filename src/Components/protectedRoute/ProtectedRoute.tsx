import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, Loader } from '@mantine/core';
import { useAppSelector } from '../../Redux/hooks';

export default function ProtectedRoute() {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const isInitializing  = useAppSelector(state => state.auth.isInitializing);
  const location        = useLocation();

  // Wait until the localStorage session check completes before redirecting.
  // Without this, ProtectedRoute would redirect to /login on every refresh
  // before the useEffect in App.tsx has a chance to restore the session.
  if (isInitializing) {
    return (
      <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Loader size="md" color="brand" />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
