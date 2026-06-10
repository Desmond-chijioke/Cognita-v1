import { ActionIcon, Button } from '@mantine/core';
import { LuLogOut } from 'react-icons/lu';
import { useAppDispatch } from '../../Redux/hooks';
import { startLogout, logout } from '../../Redux/slices/authSlice';
import { signOut } from '../../supabase/auth';
import { clearSession } from '../../helper/storage';
import { useNavigate } from 'react-router-dom';

export default function Logout({ iconOnly = false }: { iconOnly?: boolean }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    dispatch(startLogout());
    try { await signOut(); } catch { /* ignore */ }
    clearSession();
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  if (iconOnly) {
    return (
      <ActionIcon
        variant="subtle"
        color="red"
        size={40}
        radius={8}
        onClick={handleLogout}
        title="Log out"
        style={{ width: '100%' }}
      >
        <LuLogOut size={18} />
      </ActionIcon>
    );
  }

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
