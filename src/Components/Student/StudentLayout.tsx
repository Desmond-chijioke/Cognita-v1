import { AppShell, Box, Group, Image, NavLink, Stack, Text, Badge, Divider } from '@mantine/core';
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
} from 'react-icons/lu';
import Logo from '../../assets/cognita-logo.png';
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
       
        {/* Nav */}
        <Stack gap={4} style={{ flex: 1, overflowY: 'auto' }}>
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
