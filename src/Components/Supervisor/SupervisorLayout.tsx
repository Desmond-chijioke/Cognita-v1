import { useEffect, useState } from 'react';
import { AppShell, Box, Group, Image, NavLink, Stack, Text, Badge, Divider } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../Redux/hooks';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { supabase } from '../../supabase/client';
import {
  LuLayoutDashboard,
  LuUsers,
  LuFileText,
  LuClipboardCheck,
  LuBell,
  LuMessageSquare,
  LuSettings,
} from 'react-icons/lu';
import { SiGoogleanalytics } from 'react-icons/si';
import Logo from '../../assets/cognita-logo.png';
import { APPROUTE_LIST } from '../../Route/types';
import Logout from '../Auth/Logout';
import AppHeader from '../shared/AppHeader';

const NAV_ITEMS = [
  { label: 'Overview',      icon: LuLayoutDashboard, path: APPROUTE_LIST.SUPERVISOR_OVERVIEW },
  { label: 'My Students',   icon: LuUsers,           path: APPROUTE_LIST.SUPERVISOR_STUDENTS },
  { label: 'Reviews',       icon: LuFileText,        path: APPROUTE_LIST.SUPERVISOR_REVIEWS },
  { label: 'Approvals',     icon: LuClipboardCheck,  path: APPROUTE_LIST.SUPERVISOR_APPROVALS },
  { label: 'Analytics',     icon: SiGoogleanalytics, path: APPROUTE_LIST.SUPERVISOR_ANALYTICS },
  // { label: 'Notifications', icon: LuBell,            path: APPROUTE_LIST.SUPERVISOR_NOTIFICATIONS },
  { label: 'Messages',      icon: LuMessageSquare,   path: APPROUTE_LIST.SUPERVISOR_MESSAGES },
  { label: 'Settings',      icon: LuSettings,        path: APPROUTE_LIST.SUPERVISOR_SETTINGS },
];

export default function SupervisorLayout() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const [opened, { toggle, close }] = useDisclosure();
  const myId        = useAppSelector(s => s.auth.user?.id ?? '');
  const unreadCount = useUnreadCount(myId);
  const [pendingNotifs, setPendingNotifs] = useState(0);

  useEffect(() => {
    if (!myId) return;
    const fetchPending = () =>
      supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('supervisor_id', myId)
        .eq('status', 'pending')
        .then(({ count }) => setPendingNotifs(count ?? 0));

    fetchPending();

    const channel = supabase
      .channel(`layout-pending-${myId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions', filter: `supervisor_id=eq.${myId}` },
        fetchPending)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [myId]);

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
        {/* Brand */}
       
        {/* Nav */}
        <Stack gap={4} style={{ flex: 1 }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={<item.icon size={18} />}
              rightSection={
                item.label === 'Messages' && unreadCount > 0
                  ? <Badge size="xs" color="brand" variant="filled" circle>{unreadCount}</Badge>
                  : item.label === 'Notifications' && pendingNotifs > 0
                  ? <Badge size="xs" color="red" variant="filled" circle>{pendingNotifs}</Badge>
                  : undefined
              }
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
