import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon, Avatar, Badge, Box, Button, Group, Loader,
  Paper, Stack, Text, ThemeIcon, Title, Tooltip,
} from '@mantine/core';
import {
  LuBellOff, LuCheckCheck, LuCircleCheck,
  LuClock, LuFileText, LuTriangleAlert, LuEye, LuX,
} from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import { fetchAllSupervisorSubmissions, type DBSubmission } from '../../../supabase/submissions';
import { supabase } from '../../../supabase/client';
import type { DegreeLevel } from '../supervisorData';

// ── Helpers ────────────────────────────────────────────────────────────────────

const STUDENT_ROLES = ['PhD Student', "Master's Student", 'Undergraduate Student', 'Student', 'Researcher'];
const MANTINE_COLORS = ['blue', 'teal', 'green', 'grape', 'orange', 'cyan', 'indigo', 'red', 'pink', 'yellow'];

function nameToColor(name: string) {
  let h = 0;
  for (const c of name) h = (h << 5) - h + c.charCodeAt(0);
  return MANTINE_COLORS[Math.abs(h) % MANTINE_COLORS.length];
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatRelativeTime(iso: string) {
  const diffMs    = Date.now() - new Date(iso).getTime();
  const diffMins  = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays  = Math.floor(diffMs / 86_400_000);
  if (diffMins  <  1) return 'Just now';
  if (diffMins  < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays  === 1) return 'Yesterday';
  if (diffDays  <  7) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusConfig(status: DBSubmission['status']) {
  if (status === 'approved')       return { color: '#2f9e44', label: 'Approved',          icon: LuCircleCheck   };
  if (status === 'needs-revision') return { color: '#f08c00', label: 'Needs Revision',    icon: LuTriangleAlert };
  return                                  { color: '#3b5bdb', label: 'Awaiting Review',   icon: LuFileText      };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudentRow {
  id:           string;
  name:         string;
  degreeLevel:  DegreeLevel;
  projectTitle: string;
  color:        string;
}

// ── Notification card ─────────────────────────────────────────────────────────

interface CardProps {
  sub:      DBSubmission;
  student:  StudentRow | undefined;
  isUnread: boolean;
  onRead:   () => void;
  onView:   () => void;
}

function NotifCard({ sub, student, isUnread, onRead, onView }: CardProps) {
  const name   = student?.name  ?? 'Unknown Student';
  const color  = student?.color ?? 'gray';
  const cfg    = statusConfig(sub.status);
  const Icon   = cfg.icon;

  // accent: blue for new pending, green/orange for reviewed
  const accentColor = sub.status === 'pending' ? '#3b5bdb'
                    : sub.status === 'approved' ? '#2f9e44'
                    : '#f08c00';

  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      style={{
        background:  isUnread ? (sub.status === 'pending' ? '#f0f4ff' : '#fff') : 'white',
        borderLeft:  `4px solid ${isUnread ? accentColor : '#e9ecef'}`,
        cursor:      isUnread ? 'pointer' : 'default',
        transition:  'background 0.15s, border-color 0.15s',
      }}
      onClick={() => { if (isUnread) onRead(); }}
    >
      <Group gap="md" align="flex-start" wrap="nowrap">
        {/* Avatar */}
        <Avatar
          color={color}
          radius="xl"
          size="md"
          style={{ flexShrink: 0, marginTop: 2 }}
        >
          {getInitials(name)}
        </Avatar>

        {/* Content */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          {/* Top row: name + unread dot + time + dismiss */}
          <Group justify="space-between" wrap="nowrap" mb={4}>
            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
              <Text size="sm" fw={isUnread ? 700 : 500} lineClamp={1}>
                {name}
              </Text>
              {isUnread && (
                <Box
                  style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: accentColor, flexShrink: 0,
                  }}
                />
              )}
            </Group>
            <Group gap={6} style={{ flexShrink: 0 }} wrap="nowrap">
              <Group gap={4} wrap="nowrap">
                <LuClock size={11} color="#adb5bd" />
                <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {formatRelativeTime(sub.submitted_at)}
                </Text>
              </Group>
              {isUnread && (
                <Tooltip label="Mark as read" withArrow fz="xs">
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    color="gray"
                    onClick={e => { e.stopPropagation(); onRead(); }}
                  >
                    <LuX size={11} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          </Group>

          {/* Chapter info */}
          <Text size="sm" c="dimmed" mb={6}>
            Submitted <strong style={{ color: '#1c1c1e' }}>{sub.section_title}</strong>
            {student && <> — {student.projectTitle}</>}
          </Text>

          {/* Bottom row: status badge + degree badge + view button */}
          <Group gap="xs" align="center">
            <Badge
              variant="light"
              size="xs"
              radius="sm"
              style={{ background: `${cfg.color}15`, color: cfg.color }}
              leftSection={<Icon size={10} />}
            >
              {cfg.label}
            </Badge>
            {student && (
              <Badge
                variant="outline"
                size="xs"
                radius="sm"
                color={student.degreeLevel === 'PhD' ? 'blue' : student.degreeLevel === "Master's" ? 'violet' : 'teal'}
              >
                {student.degreeLevel}
              </Badge>
            )}
            <Button
              size="xs"
              variant="subtle"
              color="brand"
              leftSection={<LuEye size={11} />}
              ml="auto"
              onClick={e => { e.stopPropagation(); onView(); }}
            >
              View
            </Button>
          </Group>

          {/* Supervisor comment if any */}
          {sub.supervisor_comment && (
            <Paper
              p="xs"
              radius="sm"
              mt={8}
              style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}
              onClick={e => e.stopPropagation()}
            >
              <Text size="xs" c="dimmed">
                <strong>Your note:</strong> {sub.supervisor_comment}
              </Text>
            </Paper>
          )}
        </Box>
      </Group>
    </Paper>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupervisorNotifications() {
  const navigate    = useNavigate();
  const currentUser = useAppSelector(s => s.auth.user);

  const [students,    setStudents]    = useState<StudentRow[]>([]);
  const [submissions, setSubmissions] = useState<DBSubmission[]>([]);
  const [loading,     setLoading]     = useState(true);

  // ── Read-state via localStorage (per supervisor) ───────────────────────────
  const lsKey = `cognita_sv_notif_read_${currentUser?.id ?? 'anon'}`;

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(lsKey);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch { return new Set(); }
  });

  const persist = useCallback((next: Set<string>) => {
    setReadIds(next);
    try { localStorage.setItem(lsKey, JSON.stringify([...next])); } catch {}
  }, [lsKey]);

  const markOne = useCallback((id: string) => {
    const next = new Set(readIds);
    next.add(id);
    persist(next);
  }, [readIds, persist]);

  const markAll = useCallback(() => {
    persist(new Set(submissions.map(s => s.id)));
  }, [submissions, persist]);

  // ── Fetch data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;
    setLoading(true);

    Promise.all([
      supabase
        .from('users')
        .select('id, name, project_title, role, degree_level')
        .eq('supervisor_id', currentUser.id)
        .in('role', STUDENT_ROLES),
      fetchAllSupervisorSubmissions(currentUser.id),
    ]).then(([{ data: usersData }, subs]) => {
      setStudents(
        ((usersData ?? []) as Record<string, string>[]).map(u => ({
          id:           u.id,
          name:         u.name,
          degreeLevel:  (u.degree_level ?? u.role ?? 'PhD') as DegreeLevel,
          projectTitle: u.project_title ?? 'Untitled Research',
          color:        nameToColor(u.name),
        }))
      );
      setSubmissions(subs);
      setLoading(false);
    });

    // Realtime: new submission → prepend to list (auto-unread)
    const channel = supabase
      .channel(`sv-notif-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions', filter: `supervisor_id=eq.${currentUser.id}` },
        payload => setSubmissions(prev => [payload.new as DBSubmission, ...prev]),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'submissions', filter: `supervisor_id=eq.${currentUser.id}` },
        payload => setSubmissions(prev =>
          prev.map(s => s.id === (payload.new as DBSubmission).id ? (payload.new as DBSubmission) : s)
        ),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const studentMap = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);

  const sorted = useMemo(
    () => [...submissions].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at)),
    [submissions],
  );

  const unreadCount = useMemo(
    () => sorted.filter(s => !readIds.has(s.id)).length,
    [sorted, readIds],
  );

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Group gap="sm" mb={4} align="center">
            <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>
              Notifications
            </Title>
            {unreadCount > 0 && (
              <Badge color="red" size="lg" radius="sm" variant="filled">
                {unreadCount} new
              </Badge>
            )}
          </Group>
          <Text size="sm" c="dimmed">{today}</Text>
        </Box>

        <Button
          size="sm"
          variant="light"
          color="brand"
          leftSection={<LuCheckCheck size={15} />}
          disabled={unreadCount === 0}
          onClick={markAll}
        >
          Mark all as read
        </Button>
      </Group>

      {/* ── Summary row ── */}
      {!loading && sorted.length > 0 && (
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 28,
          }}
        >
          {[
            { label: 'Unread',    count: unreadCount,                                         color: '#3b5bdb' },
            { label: 'Pending',   count: sorted.filter(s => s.status === 'pending').length,   color: '#f08c00' },
            { label: 'Approved',  count: sorted.filter(s => s.status === 'approved').length,  color: '#2f9e44' },
          ].map(({ label, count, color }) => (
            <Box
              key={label}
              p="md"
              style={{
                borderRadius: 10,
                background: `${color}10`,
                border: `1.5px solid ${color}28`,
                textAlign: 'center',
              }}
            >
              <Text fw={800} lh={1} style={{ color }}>{count}</Text>
              <Text size="xs" c="dimmed" mt={4} fw={500}>{label}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* ── Feed ── */}
      {loading ? (
        <Box ta="center" py="xl">
          <Loader size="sm" color="brand" />
          <Text size="sm" c="dimmed" mt="sm">Loading notifications…</Text>
        </Box>
      ) : sorted.length === 0 ? (
        <Paper
          withBorder p="xl" radius="md" ta="center"
          style={{ background: '#f8f9fa', border: '1.5px dashed #dee2e6' }}
        >
          <ThemeIcon size={48} radius="md" color="gray" variant="light" mx="auto" mb="md">
            <LuBellOff size={22} />
          </ThemeIcon>
          <Text size="sm" fw={600} c="dimmed">No notifications yet</Text>
          <Text size="xs" c="dimmed" mt={4}>
            When your students submit chapters, they will appear here.
          </Text>
        </Paper>
      ) : (
        <>
          {unreadCount === 0 && (
            <Paper
              withBorder p="sm" radius="md" mb="md"
              style={{ background: '#f4fce3', border: '1.5px solid #94d82d30' }}
            >
              <Group gap="xs">
                <ThemeIcon size={26} radius="md" color="green" variant="light">
                  <LuCheckCheck size={13} />
                </ThemeIcon>
                <Text size="sm" fw={500} c="dimmed">
                  All caught up — no unread notifications.
                </Text>
              </Group>
            </Paper>
          )}

          <Stack gap="sm">
            {sorted.map(sub => (
              <NotifCard
                key={sub.id}
                sub={sub}
                student={studentMap.get(sub.student_id)}
                isUnread={!readIds.has(sub.id)}
                onRead={() => markOne(sub.id)}
                onView={() =>
                  navigate(`/supervisor/students/${sub.student_id}`, {
                    state: {
                      tab:    'submissions',
                      subTab: sub.status === 'approved' ? 'approved' : 'submitted',
                    },
                  })
                }
              />
            ))}
          </Stack>
        </>
      )}

    </Box>
  );
}
