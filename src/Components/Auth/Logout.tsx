import { Button } from '@mantine/core';
import { LuLogOut } from 'react-icons/lu';
import { useAppDispatch } from '../../Redux/hooks';
import { logout } from '../../Redux/slices/authSlice';
import { signOut } from '../../supabase/auth';
import { clearSession } from '../../helper/storage';
import { useNavigate } from 'react-router-dom';

export default function Logout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    // 1. Immediately clear the app session and Redux state — user sees
    //    the login page right away without waiting for any network call.
    clearSession();
    dispatch(logout());
    navigate('/login', { replace: true });

    // 2. Supabase cleanup runs in the background (fire-and-forget).
    //    This invalidates the server-side refresh token so the session
    //    can't be restored later, but we don't block navigation on it.
    signOut().catch(() => {});
  };

  return (
    <Button
      variant="subtle"
      color="red"
      size="sm"
      fullWidth
      leftSection={<LuLogOut size={16} />}
      justify="start"
      onClick={handleLogout}
    >
      Log out
    </Button>
  );
}
