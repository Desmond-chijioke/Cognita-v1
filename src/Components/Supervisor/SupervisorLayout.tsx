import { useEffect, useState } from 'react';
import { ActionIcon, AppShell, Badge, Box, Divider, NavLink, Stack, Tooltip } from '@mantine/core';
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
  LuMessageSquare,
  LuSettings,
  LuChevronLeft,
  LuChevronRight,
  LuFlaskConical,
} from 'react-icons/lu';
import { SiGoogleanalytics } from 'react-icons/si';
import { APPROUTE_LIST } from '../../Route/types';
import Logout from '../Auth/Logout';
import AppHeader from '../shared/AppHeader';

const NAV_ITEMS = [
  { label: 'Overview',    icon: LuLayoutDashboard, path: APPROUTE_LIST.SUPERVISOR_OVERVIEW },
  { label: 'My Students', icon: LuUsers,           path: APPROUTE_LIST.SUPERVISOR_STUDENTS },
  { label: 'Reviews',     icon: LuFileText,        path: APPROUTE_LIST.SUPERVISOR_REVIEWS },
  { label: 'Approvals',   icon: LuClipboardCheck,  path: APPROUTE_LIST.SUPERVISOR_APPROVALS },
  { label: 'Analytics',   icon: SiGoogleanalytics, path: APPROUTE_LIST.SUPERVISOR_ANALYTICS },
  { label: 'Messages',    icon: LuMessageSquare,   path: APPROUTE_LIST.SUPERVISOR_MESSAGES },
  { label: 'My Research', icon: LuFlaskConical,    path: APPROUTE_LIST.SUPERVISOR_RESEARCH_EDITOR },
  { label: 'Settings',    icon: LuSettings,        path: APPROUTE_LIST.SUPERVISOR_SETTINGS },
];

export default function SupervisorLayout() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const [opened, { toggle, close }] = useDisclosure();
  const [expanded, setExpanded] = useState(true);
  const myId          = useAppSelector(s => s.auth.user?.id ?? '');
  const unreadCount   = useUnreadCount(myId);
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
      navbar={{
        width: expanded ? 240 : 64,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      transitionDuration={200}
    >
      <AppShell.Header>
        <AppHeader navItems={NAV_ITEMS} opened={opened} onToggle={toggle} />
      </AppShell.Header>

      <AppShell.Navbar
        p={expanded ? 'md' : 8}
        style={{ borderRight: '1px solid #f0f0f0', overflow: 'hidden' }}
      >
        {/* Toggle button — desktop only */}
        <Box
          visibleFrom="sm"
          style={{ display: 'flex', justifyContent: expanded ? 'flex-end' : 'center', marginBottom: 8 }}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => setExpanded(e => !e)}
            title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {expanded ? <LuChevronLeft size={16} /> : <LuChevronRight size={16} />}
          </ActionIcon>
        </Box>

        <Stack gap={4} style={{ flex: 1, overflowX: 'hidden' }}>
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.path;
            const badge =
              item.label === 'Messages' && unreadCount > 0
                ? <Badge size="xs" color="brand" variant="filled" circle>{unreadCount}</Badge>
                : item.label === 'Reviews' && pendingNotifs > 0
                ? <Badge size="xs" color="orange" variant="filled" circle>{pendingNotifs}</Badge>
                : undefined;

            return (
              <Tooltip
                key={item.path}
                label={item.label}
                position="right"
                withArrow
                disabled={expanded}
              >
                <NavLink
                  label={expanded ? item.label : undefined}
                  leftSection={<item.icon size={expanded ? 18 : 20} />}
                  rightSection={expanded ? badge : undefined}
                  active={isActive}
                  onClick={() => { navigate(item.path); close(); }}
                  variant="light"
                  style={{ borderRadius: 8 }}
                  styles={!expanded ? {
                    root: { justifyContent: 'center', paddingInline: 0 },
                    section: { margin: 0 },
                  } : undefined}
                />
              </Tooltip>
            );
          })}
        </Stack>

        <Divider my="sm" />
        {expanded ? (
          <Logout />
        ) : (
          <Tooltip label="Logout" position="right" withArrow>
            <Box>
              <Logout iconOnly />
            </Box>
          </Tooltip>
        )}
      </AppShell.Navbar>

      <AppShell.Main bg="#f8f9fa">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
