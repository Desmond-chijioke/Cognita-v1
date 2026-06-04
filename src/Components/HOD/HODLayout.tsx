import { AppShell, Badge, Divider, NavLink, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LuLayoutDashboard, LuUsers,
  LuMessageSquare, LuSettings,
} from 'react-icons/lu';
import { APPROUTE_LIST } from '../../Route/types';
import Logout from '../Auth/Logout';
import AppHeader from '../shared/AppHeader';
import { useAppSelector } from '../../Redux/hooks';
import { useUnreadCount } from '../../hooks/useUnreadCount';

const NAV_ITEMS = [
  { label: 'Overview',     icon: LuLayoutDashboard, path: APPROUTE_LIST.HOD_OVERVIEW },
  { label: 'Students',     icon: LuUsers,           path: APPROUTE_LIST.HOD_STUDENTS },
  { label: 'Supervisors',  icon: LuUsers,           path: APPROUTE_LIST.HOD_SUPERVISORS },
  { label: 'Messages',     icon: LuMessageSquare,   path: APPROUTE_LIST.HOD_MESSAGES },
  { label: 'Settings',     icon: LuSettings,        path: APPROUTE_LIST.HOD_SETTINGS },
];

export default function HODLayout() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const [opened, { toggle, close }] = useDisclosure();
  const myId        = useAppSelector(s => s.auth.user?.id ?? '');
  const unreadCount = useUnreadCount(myId);

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <AppHeader navItems={NAV_ITEMS} opened={opened} onToggle={toggle} />
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ borderRight: '1px solid #f0f0f0' }}>
        <Stack gap={4} style={{ flex: 1 }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={<item.icon size={18} />}
              rightSection={item.label === 'Messages' && unreadCount > 0
                ? <Badge size="xs" color="brand" variant="filled" circle>{unreadCount}</Badge>
                : undefined}
              active={location.pathname === item.path}
              onClick={() => { navigate(item.path); close(); }}
              variant="light"
              style={{ borderRadius: 8 }}
            />
          ))}
        </Stack>
        <Divider my="sm" />
        <Logout />
      </AppShell.Navbar>

      <AppShell.Main bg="#f8f9fa">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
