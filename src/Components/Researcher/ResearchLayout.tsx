import { useState } from 'react';
import {
  ActionIcon, AppShell, Box, Button, Divider,
  NavLink, Stack, Text, Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LuPenLine, LuBook, LuBot, LuShield, LuDownload,
  LuChevronLeft, LuChevronRight, LuArrowLeft, LuFlaskConical,
} from 'react-icons/lu';
import { useAppSelector } from '../../Redux/hooks';
import { ROLE_HOME } from '../../Route/types';
import AppHeader from '../shared/AppHeader';
import Logout from '../Auth/Logout';

export default function ResearchLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [opened, { toggle, close }] = useDisclosure();
  const [expanded, setExpanded] = useState(true);

  const user = useAppSelector(s => s.auth.user);
  const role = user?.role ?? '';

  // Detect which role's research section we're in
  const base = location.pathname.startsWith('/supervisor')
    ? '/supervisor/research'
    : '/hod/research';

  const backPath = ROLE_HOME[role] ?? '/';

  const NAV_ITEMS = [
    { label: 'Editor',             icon: LuPenLine,       path: `${base}/editor` },
    { label: 'Export',             icon: LuDownload,      path: `${base}/export` },
    { label: 'References',         icon: LuBook,          path: `${base}/references` },
    { label: 'AI Reviewer',        icon: LuBot,           path: `${base}/ai-reviewer` },
    { label: 'Plagiarism Checker', icon: LuShield,        path: `${base}/plagiarism` },
  ];

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
        {/* Toggle button */}
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

        {/* Back to dashboard */}
        <Tooltip label="Back to Dashboard" position="right" withArrow disabled={expanded}>
          <Box mb={8}>
            {expanded ? (
              <Button
                variant="light"
                color="brand"
                size="xs"
                leftSection={<LuArrowLeft size={13} />}
                onClick={() => navigate(backPath)}
                fullWidth
                style={{ borderRadius: 8 }}
              >
                Back to Dashboard
              </Button>
            ) : (
              <ActionIcon
                variant="light"
                color="brand"
                size="md"
                onClick={() => navigate(backPath)}
                style={{ width: '100%', borderRadius: 8 }}
              >
                <LuArrowLeft size={16} />
              </ActionIcon>
            )}
          </Box>
        </Tooltip>

        {/* Research workspace label */}
        {expanded && (
          <Box mb={8} px={4}>
            <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <LuFlaskConical size={14} color="#3b5bdb" />
              <Text size="11px" fw={700} c="brand" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Research Workspace
              </Text>
            </Box>
          </Box>
        )}

        <Divider mb={8} />

        {/* Nav items */}
        <Stack gap={4} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
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
