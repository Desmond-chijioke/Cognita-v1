import { useState } from 'react';
import { ActionIcon, AppShell, Badge, Box, Divider, NavLink, Stack, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LuLayoutDashboard, LuUsers, LuUserCheck,
  LuMessageSquare, LuSettings, LuFlaskConical,
  LuChevronLeft, LuChevronRight,
} from 'react-icons/lu';
import { FiBarChart2 } from 'react-icons/fi';
import { APPROUTE_LIST } from '../../Route/types';
import Logout from '../Auth/Logout';
import AppHeader from '../shared/AppHeader';
import { useAppSelector } from '../../Redux/hooks';
import { useUnreadCount } from '../../hooks/useUnreadCount';

const NAV_ITEMS = [
  { label: 'Overview',    icon: LuLayoutDashboard, path: APPROUTE_LIST.PGSCHOOL_OVERVIEW    },
  { label: 'Students',    icon: LuUsers,            path: APPROUTE_LIST.PGSCHOOL_STUDENTS    },
  { label: 'Supervisors', icon: LuUserCheck,        path: APPROUTE_LIST.PGSCHOOL_SUPERVISORS },
  { label: 'Analytics',   icon: FiBarChart2,        path: APPROUTE_LIST.PGSCHOOL_ANALYTICS   },
  { label: 'My Research', icon: LuFlaskConical,     path: APPROUTE_LIST.PGSCHOOL_RESEARCH_EDITOR },
  { label: 'Messages',    icon: LuMessageSquare,    path: APPROUTE_LIST.PGSCHOOL_MESSAGES    },
  { label: 'Settings',    icon: LuSettings,         path: APPROUTE_LIST.PGSCHOOL_SETTINGS    },
];

export default function PGSchoolLayout() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const [opened, { toggle, close }] = useDisclosure();
  const [expanded, setExpanded] = useState(true);
  const myId        = useAppSelector(s => s.auth.user?.id ?? '');
  const unreadCount = useUnreadCount(myId);

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: expanded ? 240 : 64, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
      transitionDuration={200}
    >
      <AppShell.Header>
        <AppHeader navItems={NAV_ITEMS} opened={opened} onToggle={toggle} />
      </AppShell.Header>

      <AppShell.Navbar p={expanded ? 'md' : 8} style={{ borderRight: '1px solid #f0f0f0', overflow: 'hidden' }}>
        <Box
          visibleFrom="sm"
          style={{ display: 'flex', justifyContent: expanded ? 'flex-end' : 'center', marginBottom: 8 }}
        >
          <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => setExpanded(e => !e)}>
            {expanded ? <LuChevronLeft size={16} /> : <LuChevronRight size={16} />}
          </ActionIcon>
        </Box>

        <Stack gap={4} style={{ flex: 1, overflowX: 'hidden' }}>
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname.startsWith(item.path);
            const badge = item.label === 'Messages' && unreadCount > 0
              ? <Badge size="xs" color="brand" variant="filled" circle>{unreadCount}</Badge>
              : undefined;

            return (
              <Tooltip key={item.path} label={item.label} position="right" withArrow disabled={expanded}>
                <NavLink
                  label={expanded ? item.label : undefined}
                  leftSection={<item.icon size={expanded ? 18 : 20} />}
                  rightSection={expanded ? badge : undefined}
                  active={isActive}
                  onClick={() => { navigate(item.path); close(); }}
                  variant="light"
                  style={{ borderRadius: 8 }}
                  styles={!expanded ? { root: { justifyContent: 'center', paddingInline: 0 }, section: { margin: 0 } } : undefined}
                />
              </Tooltip>
            );
          })}
        </Stack>

        <Divider my="sm" />
        {expanded ? <Logout /> : (
          <Tooltip label="Logout" position="right" withArrow>
            <Box><Logout iconOnly /></Box>
          </Tooltip>
        )}
      </AppShell.Navbar>

      <AppShell.Main bg="#f8f9fa">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
