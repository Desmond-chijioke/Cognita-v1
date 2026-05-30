import { Button } from '@mantine/core';
import { LuLogOut } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../Redux/hooks';
import { logout } from '../../Redux/slices/authSlice';
import { signOut } from '../../supabase/auth';
import { clearSession } from '../../helper/storage';

export default function Logout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    // 1. Clear local state first so the App.tsx onAuthStateChange(SIGNED_OUT)
    //    handler sees an empty localStorage and doesn't try to keep the user in.
    clearSession();
    dispatch(logout());

    // 2. Redirect immediately — user is already logged out locally.
    navigate('/login');

    // 3. Fire-and-forget Supabase server-side signout (non-blocking).
    //    If this fails it doesn't matter — the local session is already gone.
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
