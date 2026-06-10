import { useState } from 'react';
import { ActionIcon, AppShell, Badge, Box, Divider, NavLink, Stack, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../Redux/hooks';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import {
  LuLayoutDashboard,
  LuPenLine,
  LuBook,
  LuDatabase,
  LuActivity,
  LuClipboard,
  LuBot,
  LuShield,
  LuDownload,
  LuMessageSquare,
  LuUsers,
  LuSettings,
  LuChevronLeft,
  LuChevronRight,
} from 'react-icons/lu';
import { APPROUTE_LIST } from '../../Route/types';
import Logout from '../Auth/Logout';
import AppHeader from '../shared/AppHeader';

const NAV_ITEMS = [
  { label: 'Dashboard',          icon: LuLayoutDashboard, path: APPROUTE_LIST.STUDENT_DASHBOARD },
  { label: 'Editor',             icon: LuPenLine,         path: APPROUTE_LIST.STUDENT_EDITOR },
  { label: 'References',         icon: LuBook,            path: APPROUTE_LIST.STUDENT_REFERENCES },
  { label: 'Data & Files',       icon: LuDatabase,        path: APPROUTE_LIST.STUDENT_DATA_FILES },
  { label: 'Analysis',           icon: LuActivity,        path: APPROUTE_LIST.STUDENT_ANALYSIS },
  { label: 'Results',            icon: LuClipboard,       path: APPROUTE_LIST.STUDENT_RESULTS },
  { label: 'AI Reviewer',        icon: LuBot,             path: APPROUTE_LIST.STUDENT_AI_REVIEWER },
  { label: 'Plagiarism Checker', icon: LuShield,          path: APPROUTE_LIST.STUDENT_PLAGIARISM },
  { label: 'Export',             icon: LuDownload,        path: APPROUTE_LIST.STUDENT_EXPORT },
  { label: 'Messages',           icon: LuMessageSquare,   path: APPROUTE_LIST.STUDENT_MESSAGES },
  { label: 'Collaboration',      icon: LuUsers,           path: APPROUTE_LIST.STUDENT_COLLABORATION },
  { label: 'Settings',           icon: LuSettings,        path: APPROUTE_LIST.STUDENT_SETTINGS },
];

export default function StudentLayout() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const [opened, { toggle, close }] = useDisclosure();
  const [expanded, setExpanded] = useState(true);
  const myId          = useAppSelector(s => s.auth.user?.id ?? '');
  const unreadCount   = useUnreadCount(myId);

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

        <Stack gap={4} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.path;
            const badge = item.label === 'Messages' && unreadCount > 0
              ? <Badge size="xs" color="brand" variant="filled" circle>{unreadCount}</Badge>
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
