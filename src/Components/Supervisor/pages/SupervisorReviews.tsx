import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar, Badge, Box, Button, Divider, Group, Loader,
  Paper, Stack, Tabs, Text, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuClock, LuCircleCheck, LuTriangleAlert, LuList,
  LuActivity, LuFileText, LuEye,
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

function degreeBadgeColor(level: string) {
  return level === 'PhD' ? 'blue' : level === "Master's" ? 'violet' : 'teal';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
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
  if (diffDays  <  7) return `${diffDays} days ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudentRow {
  id:           string;
  name:         string;
  degreeLevel:  DegreeLevel;
  projectTitle: string;
  color:        string;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryChip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <Box p="md" style={{ borderRadius: 10, background: `${color}10`, border: `1.5px solid ${color}28`, textAlign: 'center' }}>
      <Text fw={800} size="xl" lh={1} style={{ color }}>{value}</Text>
      <Text size="xs" c="dimmed" mt={6} fw={500}>{label}</Text>
    </Box>
  );
}

interface SubmissionCardProps {
  sub:      DBSubmission;
  student:  StudentRow | undefined;
  onView:   () => void;
}

function SubmissionCard({ sub, student, onView }: SubmissionCardProps) {
  const name  = student?.name  ?? 'Unknown Student';
  const color = student?.color ?? 'gray';

  const statusColor = sub.status === 'approved'       ? 'green'
                    : sub.status === 'needs-revision'  ? 'red'
                    : 'orange';
  const statusLabel = sub.status === 'approved'       ? 'Approved'
                    : sub.status === 'needs-revision'  ? 'Needs Revision'
                    : 'Pending Review';
  const StatusIcon  = sub.status === 'approved'       ? LuCircleCheck
                    : sub.status === 'needs-revision'  ? LuTriangleAlert
                    : LuClock;

  return (
    <Paper
      withBorder p="lg" radius="md" bg="white"
      style={
        sub.status === 'pending'
          ? { borderLeft: '4px solid #f08c00' }
          : sub.status === 'needs-revision'
          ? { borderLeft: '4px solid #e03131' }
          : { borderLeft: '4px solid #2f9e44' }
      }
    >
      {/* Header row */}
      <Group justify="space-between" wrap="nowrap" mb="md">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <Avatar color={color} radius="xl" size="md">{getInitials(name)}</Avatar>
          <Box style={{ minWidth: 0 }}>
            <Group gap="xs" wrap="nowrap" mb={2}>
              <Text size="sm" fw={700} lineClamp={1}>{name}</Text>
              {student && (
                <Badge variant="light" color={degreeBadgeColor(student.degreeLevel)} size="xs" radius="sm">
                  {student.degreeLevel}
                </Badge>
              )}
            </Group>
            <Text size="xs" c="dimmed" lineClamp={1}>{student?.projectTitle ?? '—'}</Text>
          </Box>
        </Group>
        <Group gap="xs" style={{ flexShrink: 0 }} wrap="nowrap">
          <ThemeIcon size={24} radius="xl" color={statusColor} variant="light">
            <StatusIcon size={12} />
          </ThemeIcon>
          <Badge variant="light" color={statusColor} size="sm" radius="sm">
            {statusLabel}
          </Badge>
        </Group>
      </Group>

      <Divider mb="md" />

      {/* Chapter info */}
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Group gap="xs">
          <LuFileText size={14} color="#4c6ef5" />
          <Text size="sm" fw={600}>{sub.section_title}</Text>
        </Group>
        <Text size="xs" c="dimmed">{formatRelativeTime(sub.submitted_at)}</Text>
      </Group>
      <Text size="xs" c="dimmed" mb="md">Submitted {formatDate(sub.submitted_at)}</Text>

      {/* Supervisor comment if any */}
      {sub.supervisor_comment && (
        <Paper p="sm" radius="sm" mb="md" style={{ background: '#fff9db', border: '1px solid #fab00530' }}>
          <Text size="xs" c="dimmed" fw={600} mb={2}>Your feedback:</Text>
          <Text size="xs">{sub.supervisor_comment}</Text>
        </Paper>
      )}

      {/* View Full button */}
      <Button
        size="xs"
        variant="light"
        color="brand"
        leftSection={<LuEye size={13} />}
        onClick={onView}
      >
        View Full Submission
      </Button>
    </Paper>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupervisorReviews() {
  const navigate    = useNavigate();
  const currentUser = useAppSelector(s => s.auth.user);
  const [students,    setStudents]    = useState<StudentRow[]>([]);
  const [submissions, setSubmissions] = useState<DBSubmission[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState('pending');

  useEffect(() => {
    if (!currentUser?.id) return;
    setLoading(true);
    Promise.all([
      supabase
        .from('users')
        .select('id, name, email, project_title, role, degree_level')
        .eq('supervisor_id', currentUser.id)
        .in('role', STUDENT_ROLES)
        .order('name'),
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
  }, [currentUser?.id]);

  const studentMap = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);

  // Sorted by submitted_at descending
  const sorted = useMemo(
    () => [...submissions].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at)),
    [submissions]
  );

  const pending  = useMemo(() => sorted.filter(s => s.status === 'pending'),        [sorted]);
  const rejected = useMemo(() => sorted.filter(s => s.status === 'needs-revision'), [sorted]);
  const reviewed = useMemo(() => sorted.filter(s => s.status !== 'pending'),        [sorted]);

  const byTab = tab === 'pending'  ? pending
              : tab === 'rejected' ? rejected
              : tab === 'reviewed' ? reviewed
              : sorted;

  function goToStudent(sub: DBSubmission) {
    navigate(`/supervisor/students/${sub.student_id}`, {
      state: { tab: 'submissions', subTab: 'submitted' },
    });
  }

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Reviews</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Chapter submissions from your students awaiting or completed review.
        </Text>
      </Box>

      {loading ? (
        <Box ta="center" py="xl"><Loader size="sm" color="brand" /></Box>
      ) : (
        <>
          {/* ── Summary chips ── */}
          <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
            <SummaryChip value={pending.length}  label="Pending Review"    color="#f08c00" />
            <SummaryChip value={reviewed.length} label="Reviewed"          color="#2f9e44" />
            <SummaryChip value={rejected.length} label="Needs Revision"    color="#e03131" />
          </Box>

          {/* ── Tabs ── */}
          <Tabs value={tab} onChange={v => setTab(v ?? 'pending')}>
            <Tabs.List mb="lg">
              <Tabs.Tab value="pending"  leftSection={<LuClock         size={14} />}>
                Pending ({pending.length})
              </Tabs.Tab>
              <Tabs.Tab value="rejected" leftSection={<LuTriangleAlert  size={14} />}>
                Needs Revision ({rejected.length})
              </Tabs.Tab>
              <Tabs.Tab value="reviewed" leftSection={<LuCircleCheck    size={14} />}>
                Reviewed ({reviewed.length})
              </Tabs.Tab>
              <Tabs.Tab value="all"      leftSection={<LuList           size={14} />}>
                All ({sorted.length})
              </Tabs.Tab>
            </Tabs.List>

            {(['pending', 'rejected', 'reviewed', 'all'] as const).map(t => (
              <Tabs.Panel key={t} value={t}>
                {byTab.length === 0 ? (
                  <Paper withBorder p="xl" radius="md" bg="white" ta="center">
                    <LuFileText size={28} color="#adb5bd" style={{ marginBottom: 8 }} />
                    <Text fw={600} c="dimmed" size="sm">No submissions in this category.</Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {tab === 'pending' ? 'All caught up — no chapters awaiting review.' : 'Nothing to show here yet.'}
                    </Text>
                  </Paper>
                ) : (
                  <Stack gap="md">
                    {byTab.map(sub => (
                      <SubmissionCard
                        key={sub.id}
                        sub={sub}
                        student={studentMap.get(sub.student_id)}
                        onView={() => goToStudent(sub)}
                      />
                    ))}
                  </Stack>
                )}
              </Tabs.Panel>
            ))}
          </Tabs>

          {/* ── Info banner ── */}
          {pending.length > 0 && (
            <Paper
              withBorder p="sm" radius="md" mt="lg"
              style={{ background: '#fff9db', border: '1.5px solid #fab00530' }}
            >
              <Group gap="xs">
                <LuActivity size={13} color="#f08c00" />
                <Text size="xs" c="dimmed">
                  You have <strong>{pending.length} pending review{pending.length > 1 ? 's' : ''}</strong>. Students are waiting for your feedback.
                </Text>
              </Group>
            </Paper>
          )}
        </>
      )}

    </Box>
  );
}
