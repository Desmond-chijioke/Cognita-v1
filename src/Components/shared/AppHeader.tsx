import { useEffect, useState } from 'react';
import {
  ActionIcon, Avatar, Box, Burger, Center, Divider,
  Group, Image, Indicator, Modal, ScrollArea, Stack, Text, ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  LuBell, LuCircleCheck, LuTriangleAlert, LuFileText, LuInfo, LuCheck,
} from 'react-icons/lu';
import { useAppSelector } from '../../Redux/hooks';
import { supabase } from '../../supabase/client';
import Logo from '../../assets/cognita-logo.png';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AppNotification {
  id:        string;
  type:      'success' | 'warning' | 'info' | 'file';
  title:     string;
  message:   string;
  time:      string;
  timestamp: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STUDENT_ROLES   = ['Student', 'PhD Student', "Master's Student", 'Undergraduate Student', 'Researcher'];
const SUPERVISOR_ROLES = ['Supervisor', 'Senior Supervisor', 'Co-Supervisor', 'Assistant Supervisor'];

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${Math.max(mins, 1)}m ago`;
}

function readKey(userId: string) { return `cognita_notif_read_${userId}`; }

function getReadIds(userId: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(readKey(userId)) ?? '[]')); }
  catch { return new Set(); }
}

function saveReadIds(userId: string, ids: Set<string>) {
  localStorage.setItem(readKey(userId), JSON.stringify([...ids]));
}

async function fetchNotifications(user: {
  id: string; role: string; institutionId?: string;
  departmentName?: string;
}): Promise<AppNotification[]> {
  const notifs: AppNotification[] = [];

  // ── Student: their own chapters reviewed by supervisor ──────────────────────
  if (STUDENT_ROLES.includes(user.role)) {
    const { data } = await supabase
      .from('submissions')
      .select('id, section_title, status, submitted_at, reviewed_at, supervisor_comment')
      .eq('student_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(30);

    for (const s of data ?? []) {
      if (s.status === 'approved') {
        notifs.push({
          id:        `${s.id}_approved`,
          type:      'success',
          title:     'Chapter approved',
          message:   `"${s.section_title}" was approved by your supervisor.`,
          time:      timeAgo(s.reviewed_at ?? s.submitted_at),
          timestamp: s.reviewed_at ?? s.submitted_at,
        });
      } else if (s.status === 'needs-revision') {
        notifs.push({
          id:        `${s.id}_revision`,
          type:      'warning',
          title:     'Revision requested',
          message:   s.supervisor_comment
            ? `"${s.section_title}" needs revision: ${s.supervisor_comment}`
            : `"${s.section_title}" has been sent back for revision.`,
          time:      timeAgo(s.reviewed_at ?? s.submitted_at),
          timestamp: s.reviewed_at ?? s.submitted_at,
        });
      } else {
        notifs.push({
          id:        `${s.id}_pending`,
          type:      'info',
          title:     'Awaiting review',
          message:   `"${s.section_title}" is pending supervisor review.`,
          time:      timeAgo(s.submitted_at),
          timestamp: s.submitted_at,
        });
      }
    }
  }

  // ── Supervisor: pending submissions assigned to them ─────────────────────────
  else if (SUPERVISOR_ROLES.includes(user.role)) {
    const { data: subs } = await supabase
      .from('submissions')
      .select('id, section_title, status, submitted_at, reviewed_at, student_id')
      .eq('supervisor_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(30);

    if (subs?.length) {
      const studentIds = [...new Set(subs.map(s => s.student_id))];
      const { data: students } = await supabase
        .from('users')
        .select('id, name')
        .in('id', studentIds);
      const nameMap = new Map((students ?? []).map(u => [u.id, u.name]));

      for (const s of subs) {
        const name = nameMap.get(s.student_id) ?? 'A student';
        if (s.status === 'pending') {
          notifs.push({
            id:        `${s.id}_pending`,
            type:      'file',
            title:     'New submission to review',
            message:   `${name} submitted "${s.section_title}" for your review.`,
            time:      timeAgo(s.submitted_at),
            timestamp: s.submitted_at,
          });
        } else if (s.status === 'approved') {
          notifs.push({
            id:        `${s.id}_approved`,
            type:      'success',
            title:     'Chapter approved',
            message:   `You approved "${s.section_title}" from ${name}.`,
            time:      timeAgo(s.reviewed_at ?? s.submitted_at),
            timestamp: s.reviewed_at ?? s.submitted_at,
          });
        } else if (s.status === 'needs-revision') {
          notifs.push({
            id:        `${s.id}_revision`,
            type:      'warning',
            title:     'Revision requested',
            message:   `You requested revision on "${s.section_title}" from ${name}.`,
            time:      timeAgo(s.reviewed_at ?? s.submitted_at),
            timestamp: s.reviewed_at ?? s.submitted_at,
          });
        }
      }
    }
  }

  // ── HOD: recent submissions in their department ──────────────────────────────
  else if (user.role === 'Head of Department' && user.institutionId) {
    const dept = user.departmentName;
    let studentQuery = supabase
      .from('users')
      .select('id, name')
      .eq('institution_id', user.institutionId)
      .in('role', STUDENT_ROLES);
    if (dept) studentQuery = studentQuery.eq('department', dept);

    const { data: students } = await studentQuery.limit(200);
    const studentIds = (students ?? []).map(s => s.id);

    if (studentIds.length) {
      const nameMap = new Map((students ?? []).map(u => [u.id, u.name]));
      const { data: subs } = await supabase
        .from('submissions')
        .select('id, section_title, status, submitted_at, reviewed_at, student_id')
        .in('student_id', studentIds)
        .order('submitted_at', { ascending: false })
        .limit(30);

      for (const s of subs ?? []) {
        const name = nameMap.get(s.student_id) ?? 'A student';
        const ts   = (s.status !== 'pending' ? s.reviewed_at : null) ?? s.submitted_at;
        notifs.push({
          id:        `${s.id}_${s.status}`,
          type:      s.status === 'approved' ? 'success' : s.status === 'needs-revision' ? 'warning' : 'file',
          title:     s.status === 'approved' ? 'Chapter approved'
                   : s.status === 'needs-revision' ? 'Revision requested'
                   : 'New submission',
          message:   s.status === 'pending'
            ? `${name} submitted "${s.section_title}"`
            : s.status === 'approved'
            ? `"${s.section_title}" by ${name} was approved`
            : `"${s.section_title}" by ${name} needs revision`,
          time:      timeAgo(ts),
          timestamp: ts,
        });
      }
    }
  }

  // ── Admin (Director of Research): institution-wide recent activity ───────────
  else if (user.role === 'Director of Research' && user.institutionId) {
    const { data: students } = await supabase
      .from('users')
      .select('id, name, department')
      .eq('institution_id', user.institutionId)
      .in('role', STUDENT_ROLES)
      .limit(500);

    const studentIds = (students ?? []).map(s => s.id);
    if (studentIds.length) {
      const nameMap = new Map((students ?? []).map(u => [u.id, { name: u.name, dept: u.department ?? '' }]));
      const { data: subs } = await supabase
        .from('submissions')
        .select('id, section_title, status, submitted_at, reviewed_at, student_id')
        .in('student_id', studentIds)
        .order('submitted_at', { ascending: false })
        .limit(30);

      for (const s of subs ?? []) {
        const info = nameMap.get(s.student_id);
        const name = info?.name ?? 'A student';
        const dept = info?.dept ? ` · ${info.dept}` : '';
        const ts   = (s.status !== 'pending' ? s.reviewed_at : null) ?? s.submitted_at;
        notifs.push({
          id:        `${s.id}_${s.status}`,
          type:      s.status === 'approved' ? 'success' : s.status === 'needs-revision' ? 'warning' : 'file',
          title:     s.status === 'approved' ? 'Chapter approved'
                   : s.status === 'needs-revision' ? 'Revision requested'
                   : 'New submission',
          message:   s.status === 'pending'
            ? `${name} submitted "${s.section_title}"${dept}`
            : s.status === 'approved'
            ? `"${s.section_title}" by ${name} was approved${dept}`
            : `"${s.section_title}" by ${name} needs revision${dept}`,
          time:      timeAgo(ts),
          timestamp: ts,
        });
      }
    }
  }

  return notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ── Notification icon map ──────────────────────────────────────────────────────

const NOTIF_ICON = {
  success: { icon: LuCircleCheck,   color: 'green'  as const },
  warning: { icon: LuTriangleAlert, color: 'orange' as const },
  file:    { icon: LuFileText,      color: 'brand'  as const },
  info:    { icon: LuInfo,          color: 'gray'   as const },
};

// ── AppHeader props ────────────────────────────────────────────────────────────

interface AppHeaderProps {
  navItems: unknown[];
  opened: boolean;
  onToggle: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AppHeader({ opened, onToggle }: AppHeaderProps) {
  const user       = useAppSelector(state => state.auth.user);
  const schoolName = useAppSelector(state => state.auth.schoolName);
  const schoolLogo = useAppSelector(state => state.auth.schoolLogo);

  const institutionName = user?.institutionName ?? schoolName ?? 'Cognita';
  const [notifOpened, { open: openNotifModal, close: closeNotif }] = useDisclosure();
  const [fetchedLogo,    setFetchedLogo]    = useState<string | null>(null);
  const [fetchedAvatar,  setFetchedAvatar]  = useState<string | null>(null);
  const [notifications,  setNotifications]  = useState<AppNotification[]>([]);
  const [readIds,        setReadIds]        = useState<Set<string>>(new Set());

  // Institution logo
  useEffect(() => {
    if (!user?.institutionId) { setFetchedLogo(null); return; }
    let cancelled = false;
    supabase
      .from('users')
      .select('institution_logo')
      .eq('institution_id', user.institutionId)
      .eq('role', 'Director of Research')
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setFetchedLogo(data?.institution_logo ?? null); });
    return () => { cancelled = true; };
  }, [user?.institutionId]);

  // User avatar
  useEffect(() => {
    if (!user?.id) { setFetchedAvatar(null); return; }
    let cancelled = false;
    supabase
      .from('users')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setFetchedAvatar(data?.avatar_url ?? null); });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Load read IDs from localStorage on mount / user change
  useEffect(() => {
    if (user?.id) setReadIds(getReadIds(user.id));
  }, [user?.id]);

  // Fetch notifications whenever user changes
  useEffect(() => {
    if (!user?.id) { setNotifications([]); return; }
    let cancelled = false;
    fetchNotifications(user).then(n => { if (!cancelled) setNotifications(n); });
    return () => { cancelled = true; };
  }, [user?.id, user?.role]);

  function openNotif() {
    openNotifModal();
    if (!user?.id || notifications.length === 0) return;
    const all = new Set([...readIds, ...notifications.map(n => n.id)]);
    setReadIds(all);
    saveReadIds(user.id, all);
  }

  function markAllRead() {
    if (!user?.id) return;
    const all = new Set([...readIds, ...notifications.map(n => n.id)]);
    setReadIds(all);
    saveReadIds(user.id, all);
  }

  const unreadCount  = notifications.filter(n => !readIds.has(n.id)).length;
  const initials     = user?.name
    ? user.name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('')
    : '?';
  const institutionLogo = schoolLogo ?? fetchedLogo;
  const displayAvatar   = user?.avatar ?? fetchedAvatar;

  return (
    <>
      <Group
        h="100%"
        px="lg"
        justify="space-between"
        wrap="nowrap"
        style={{ borderBottom: '1px solid #f0f0f0' }}
      >
        {/* Left: burger + logos */}
        <Group gap="sm" wrap="nowrap">
          <Burger opened={opened} onClick={onToggle} hiddenFrom="sm" size="sm" />
          <Group gap="sm" wrap="nowrap">
            <Image src={Logo} w={36} h={36} style={{ objectFit: 'contain', borderRadius: 6 }} />
            {institutionLogo && (
              <>
                <Divider orientation="vertical" />
                <Image src={institutionLogo} w={36} h={36} style={{ objectFit: 'contain', borderRadius: 6 }} />
              </>
            )}
            <Text fw={700} size="md" lh={1}>{institutionName}</Text>
          </Group>
        </Group>

        {/* Right: bell + avatar */}
        <Group gap="sm" wrap="nowrap">
          <Indicator
            label={unreadCount > 9 ? '9+' : unreadCount}
            size={16}
            disabled={unreadCount === 0}
            color="red"
            offset={4}
          >
            <ActionIcon variant="subtle" color="gray" size="lg" radius="xl" onClick={openNotif}>
              <LuBell size={20} />
            </ActionIcon>
          </Indicator>

          <Divider orientation="vertical" my="xs" />

          <Group gap="xs" wrap="nowrap" style={{ cursor: 'pointer' }}>
            <Avatar
              src={displayAvatar ?? null}
              size={36}
              radius="xl"
              color="brand"
              variant="filled"
              style={{ border: '2px solid var(--mantine-color-brand-3)', fontWeight: 700 }}
            >
              {initials}
            </Avatar>
            <Box visibleFrom="sm">
              <Text size="sm" fw={600} lh={1.2} style={{ textTransform: 'capitalize' }}>
                {user?.name ?? ''}
              </Text>
              <Text size="xs" c="dimmed" lh={1.4}>{user?.role ?? ''}</Text>
            </Box>
          </Group>
        </Group>
      </Group>

      {/* ── Notification modal ── */}
      <Modal
        opened={notifOpened}
        onClose={closeNotif}
        title={
          <Group justify="space-between" w="100%">
            <Group gap="xs">
              <LuBell size={16} />
              <Text fw={700}>Notifications</Text>
              {unreadCount > 0 && (
                <Text size="xs" c="dimmed">({unreadCount} unread)</Text>
              )}
            </Group>
          </Group>
        }
        centered
        size="md"
        overlayProps={{ color: 'var(--mantine-color-brand-9)', backgroundOpacity: 0.55, blur: 3 }}
      >
        {notifications.length === 0 ? (
          <Center py={48}>
            <Stack align="center" gap="sm">
              <LuBell size={48} color="#adb5bd" />
              <Text fw={600} c="dimmed">No notifications yet</Text>
              <Text size="sm" c="dimmed" ta="center">
                You're all caught up. Check back later for updates.
              </Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap={0}>
            {unreadCount > 0 && (
              <Group justify="flex-end" mb="xs">
                <Text
                  size="xs" c="brand" fw={600}
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={markAllRead}
                >
                  Mark all as read
                </Text>
              </Group>
            )}
            <ScrollArea h={Math.min(notifications.length * 76, 440)}>
              <Stack gap={0}>
                {notifications.map(n => {
                  const isUnread  = !readIds.has(n.id);
                  const { icon: Icon, color } = NOTIF_ICON[n.type];
                  return (
                    <Group
                      key={n.id}
                      gap="sm"
                      align="flex-start"
                      wrap="nowrap"
                      p="sm"
                      style={{
                        borderBottom: '1px solid #f1f3f5',
                        background: isUnread ? 'var(--mantine-color-brand-0)' : 'white',
                        borderLeft: isUnread ? '3px solid var(--mantine-color-brand-5)' : '3px solid transparent',
                      }}
                    >
                      <ThemeIcon size={32} radius="xl" color={color} variant="light" style={{ flexShrink: 0, marginTop: 2 }}>
                        <Icon size={15} />
                      </ThemeIcon>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group justify="space-between" wrap="nowrap" mb={2}>
                          <Text size="sm" fw={isUnread ? 700 : 500} lineClamp={1}>{n.title}</Text>
                          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>{n.time}</Text>
                        </Group>
                        <Text size="xs" c="dimmed" lineClamp={2}>{n.message}</Text>
                      </Box>
                      {isUnread && (
                        <Box style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mantine-color-brand-5)', flexShrink: 0, marginTop: 6 }} />
                      )}
                    </Group>
                  );
                })}
              </Stack>
            </ScrollArea>
            {/* "read" confirmation row */}
            {unreadCount === 0 && (
              <Group justify="center" py="xs" gap={4}>
                <LuCheck size={12} color="#2f9e44" />
                <Text size="xs" c="dimmed">All caught up</Text>
              </Group>
            )}
          </Stack>
        )}
      </Modal>
    </>
  );
}
