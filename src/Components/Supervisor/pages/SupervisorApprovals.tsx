import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar, Badge, Box, Button, Divider, Group, Loader,
  Paper, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuCircleCheck, LuCheckCheck, LuFileText, LuEye,
  LuCalendar, LuActivity,
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

interface ApprovedCardProps {
  sub:     DBSubmission;
  student: StudentRow | undefined;
  index:   number;
  onView:  () => void;
}

function ApprovedCard({ sub, student, index, onView }: ApprovedCardProps) {
  const name  = student?.name  ?? 'Unknown Student';
  const color = student?.color ?? 'gray';

  return (
    <Paper
      withBorder p="lg" radius="md" bg="white"
      style={{ borderLeft: '4px solid #2f9e44' }}
    >
      {/* Rank + student header */}
      <Group justify="space-between" wrap="nowrap" mb="md">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          {/* Rank badge */}
          <Box
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#e6fcf5', border: '2px solid #2f9e44',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Text size="xs" fw={800} c="green.7">#{index + 1}</Text>
          </Box>
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
        <ThemeIcon size={32} radius="xl" color="green" variant="light" style={{ flexShrink: 0 }}>
          <LuCircleCheck size={16} />
        </ThemeIcon>
      </Group>

      <Divider mb="md" />

      {/* Chapter info */}
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Group gap="xs">
          <LuFileText size={14} color="#2f9e44" />
          <Text size="sm" fw={600}>{sub.section_title}</Text>
        </Group>
        <Badge variant="light" color="green" size="sm" radius="sm" leftSection={<LuCircleCheck size={10} />}>
          Approved
        </Badge>
      </Group>

      <Group gap="xl" mb="md">
        <Group gap="xs">
          <LuCalendar size={12} color="#adb5bd" />
          <Text size="xs" c="dimmed">
            Approved {sub.reviewed_at ? formatRelativeTime(sub.reviewed_at) : '—'}
          </Text>
        </Group>
        <Text size="xs" c="dimmed">
          Submitted {formatDate(sub.submitted_at)}
        </Text>
        {sub.reviewed_at && (
          <Text size="xs" c="dimmed">
            {formatDate(sub.reviewed_at)}
          </Text>
        )}
      </Group>

      {/* Supervisor comment */}
      {sub.supervisor_comment && (
        <Paper p="sm" radius="sm" mb="md" style={{ background: '#f6fef9', border: '1px solid #b2f2bb' }}>
          <Text size="xs" c="dimmed" fw={600} mb={2}>Approval note:</Text>
          <Text size="xs">{sub.supervisor_comment}</Text>
        </Paper>
      )}

      {/* View Full button */}
      <Button
        size="xs"
        variant="light"
        color="green"
        leftSection={<LuEye size={13} />}
        onClick={onView}
      >
        View Approved Chapter
      </Button>
    </Paper>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupervisorApprovals() {
  const navigate    = useNavigate();
  const currentUser = useAppSelector(s => s.auth.user);
  const [students,    setStudents]    = useState<StudentRow[]>([]);
  const [submissions, setSubmissions] = useState<DBSubmission[]>([]);
  const [loading,     setLoading]     = useState(true);

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

  // Approved only, sorted by reviewed_at descending (most recent first)
  const approved = useMemo(
    () =>
      submissions
        .filter(s => s.status === 'approved')
        .sort((a, b) => {
          const ta = a.reviewed_at ?? a.submitted_at;
          const tb = b.reviewed_at ?? b.submitted_at;
          return tb.localeCompare(ta);
        }),
    [submissions]
  );

  // Per-student approved count for summary
  const uniqueStudentsWithApprovals = useMemo(
    () => new Set(approved.map(s => s.student_id)).size,
    [approved]
  );

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  function goToStudent(sub: DBSubmission) {
    navigate(`/supervisor/students/${sub.student_id}`, {
      state: { tab: 'submissions', subTab: 'approved' },
    });
  }

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Approvals</Title>
          <Text size="sm" c="dimmed" mt={4}>
            All approved chapters across your students, most recent first.
          </Text>
        </Box>
        <Text size="sm" c="dimmed">{today}</Text>
      </Group>

      {loading ? (
        <Box ta="center" py="xl"><Loader size="sm" color="brand" /></Box>
      ) : (
        <>
          {/* ── Summary chips ── */}
          <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
            <SummaryChip value={approved.length}               label="Chapters Approved"   color="#2f9e44" />
            <SummaryChip value={uniqueStudentsWithApprovals}   label="Students with Approvals" color="#3b5bdb" />
            <SummaryChip value={submissions.filter(s => s.status === 'pending').length} label="Still Pending" color="#f08c00" />
          </Box>

          {/* ── Approved chapters list ── */}
          {approved.length === 0 ? (
            <Paper
              withBorder p="xl" radius="md" bg="white" ta="center"
              style={{ background: '#f4fce3', border: '1.5px solid #94d82d30' }}
            >
              <ThemeIcon size={48} radius="md" color="green" variant="light" mx="auto" mb="md">
                <LuCheckCheck size={22} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="dimmed">No approved chapters yet</Text>
              <Text size="xs" c="dimmed" mt={4}>
                Chapters you approve in the Reviews tab will appear here.
              </Text>
            </Paper>
          ) : (
            <>
              <Group gap="xs" mb="md">
                <LuActivity size={16} color="#2f9e44" />
                <Text fw={600} size="sm">{approved.length} Approved Chapter{approved.length !== 1 ? 's' : ''}</Text>
              </Group>
              <Stack gap="md">
                {approved.map((sub, i) => (
                  <ApprovedCard
                    key={sub.id}
                    sub={sub}
                    student={studentMap.get(sub.student_id)}
                    index={i}
                    onView={() => goToStudent(sub)}
                  />
                ))}
              </Stack>
            </>
          )}

          {/* ── Info note ── */}
          {approved.length > 0 && (
            <Paper
              withBorder p="sm" radius="md" mt="lg"
              style={{ background: '#f6fef9', border: '1.5px solid #2f9e4430' }}
            >
              <Group gap="xs">
                <LuCircleCheck size={13} color="#2f9e44" />
                <Text size="xs" c="dimmed">
                  Click <strong>View Approved Chapter</strong> on any card to open the full chapter in the student's submission history.
                </Text>
              </Group>
            </Paper>
          )}
        </>
      )}

    </Box>
  );
}
