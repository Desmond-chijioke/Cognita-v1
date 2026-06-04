import { useEffect, useMemo, useState } from 'react';
import {
  Avatar, Badge, Box, Divider, Group, Loader, Paper, Progress,
  RingProgress, SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuUsers, LuTrendingUp, LuCircleCheck, LuCalendar, LuActivity,
  LuBookOpen, LuClock, LuTriangleAlert, LuFileText, LuGraduationCap,
} from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import { supabase } from '../../../supabase/client';
import { fetchAllSupervisorSubmissions, type DBSubmission } from '../../../supabase/submissions';
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
  const diffMs   = Date.now() - new Date(iso).getTime();
  const diffMins  = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays  = Math.floor(diffMs / 86_400_000);
  if (diffMins  <  1) return 'Just now';
  if (diffMins  < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays  ===1) return 'Yesterday';
  if (diffDays  <  7) return `${diffDays} days ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function degreeBadgeColor(level: string) {
  return level === 'PhD' ? 'blue' : level === "Master's" ? 'violet' : 'teal';
}

function statusBadgeColor(status: DBSubmission['status']) {
  if (status === 'approved')       return 'green';
  if (status === 'needs-revision') return 'red';
  return 'orange';
}

function statusLabel(status: DBSubmission['status']) {
  if (status === 'approved')       return 'Approved';
  if (status === 'needs-revision') return 'Rejected';
  return 'Pending';
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

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, sub, color }: StatCardProps) {
  return (
    <Paper withBorder p="lg" radius="md" bg="white">
      <Group justify="space-between" mb="sm">
        <ThemeIcon size={42} radius="md" color={color} variant="light">
          <Icon size={20} />
        </ThemeIcon>
        <LuActivity size={14} color="#ced4da" />
      </Group>
      <Text fw={800} lh={1} mb={4} style={{ fontSize: 32 }}>{value}</Text>
      <Text size="sm" c="dimmed" fw={500}>{label}</Text>
      {sub && <Text size="xs" c="dimmed" mt={6}>{sub}</Text>}
    </Paper>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupervisorOverview() {
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

  // ── Derived ────────────────────────────────────────────────────────────────

  const pending  = useMemo(() => submissions.filter(s => s.status === 'pending'),         [submissions]);
  const approved = useMemo(() => submissions.filter(s => s.status === 'approved'),        [submissions]);
  const rejected = useMemo(() => submissions.filter(s => s.status === 'needs-revision'),  [submissions]);
  const reviewed = useMemo(() => approved.length + rejected.length,                       [approved, rejected]);

  const studentMap = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);

  const avgProgress = useMemo(() => {
    if (students.length === 0) return 0;
    const perStudent = students.map(s => {
      const subs = submissions.filter(sub => sub.student_id === s.id);
      if (subs.length === 0) return 0;
      return Math.round((subs.filter(sub => sub.status === 'approved').length / subs.length) * 100);
    });
    return Math.round(perStudent.reduce((a, b) => a + b, 0) / students.length);
  }, [students, submissions]);

  const phd     = students.filter(s => s.degreeLevel === 'PhD').length;
  const masters  = students.filter(s => s.degreeLevel === "Master's").length;
  const ug       = students.filter(s => s.degreeLevel === 'Undergraduate').length;

  const recentActivity = useMemo(
    () => [...submissions].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at)).slice(0, 8),
    [submissions]
  );

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box p="xl" ta="center" pt={80}>
        <Loader size="sm" color="brand" />
        <Text size="sm" c="dimmed" mt="sm">Loading overview…</Text>
      </Box>
    );
  }

  const approvalRate = submissions.length > 0
    ? Math.round((approved.length / submissions.length) * 100)
    : 0;

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Overview</Title>
          <Text size="sm" c="dimmed" mt={2}>
            Live summary of your students' progress and research activity.
          </Text>
        </Box>
        <Group gap="xs" align="center">
          <LuCalendar size={14} color="#adb5bd" />
          <Text size="sm" c="dimmed">{today}</Text>
        </Group>
      </Group>

      {/* ── KPI Cards ── */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        <StatCard
          icon={LuUsers}
          label="Total Students"
          value={students.length}
          color="brand"
          sub={`${phd} PhD · ${masters} MSc · ${ug} UG`}
        />
        <StatCard
          icon={LuTrendingUp}
          label="Avg Progress"
          value={`${avgProgress}%`}
          color="teal"
          sub="Chapters approved vs submitted"
        />
        <StatCard
          icon={LuCircleCheck}
          label="Chapters Approved"
          value={approved.length}
          color="green"
          sub={`${reviewed} reviewed total`}
        />
        <StatCard
          icon={LuTriangleAlert}
          label="Pending Review"
          value={pending.length}
          color={pending.length > 0 ? 'orange' : 'green'}
          sub="Awaiting your review"
        />
      </SimpleGrid>

      {/* ── Chapter Reviews + Approval Ring ── */}
      <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">

        {/* Chapter review breakdown */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuBookOpen size={16} color="#4c6ef5" />
            <Text fw={600}>Chapter Reviews</Text>
          </Group>
          <Divider mb="md" />
          <Stack gap="md">
            {[
              { label: 'Total Submitted', value: submissions.length, color: '#3b5bdb', icon: LuFileText      },
              { label: 'Reviewed',        value: reviewed,           color: '#7950f2', icon: LuActivity      },
              { label: 'Approved',        value: approved.length,    color: '#2f9e44', icon: LuCircleCheck   },
              { label: 'Rejected',        value: rejected.length,    color: '#e03131', icon: LuTriangleAlert },
              { label: 'Pending',         value: pending.length,     color: '#f08c00', icon: LuClock         },
            ].map(({ label, value, color, icon: Icon }) => (
              <Group key={label} justify="space-between" align="center">
                <Group gap="xs">
                  <Icon size={14} style={{ color }} />
                  <Text size="sm" c="dimmed">{label}</Text>
                </Group>
                <Badge
                  variant="light"
                  size="sm"
                  radius="sm"
                  style={{ background: `${color}18`, color }}
                >
                  {value}
                </Badge>
              </Group>
            ))}
          </Stack>
        </Paper>

        {/* Approval rate ring */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuGraduationCap size={16} color="#4c6ef5" />
            <Text fw={600}>Approval Rate</Text>
          </Group>
          <Divider mb="md" />
          <Group justify="center" align="center" gap="xl" mt="sm">
            <RingProgress
              size={160}
              thickness={26}
              roundCaps
              sections={
                submissions.length === 0
                  ? [{ value: 100, color: '#e9ecef' }]
                  : [
                      { value: (approved.length / submissions.length) * 100, color: '#2f9e44', tooltip: `Approved: ${approved.length}` },
                      { value: (rejected.length / submissions.length) * 100, color: '#e03131', tooltip: `Rejected: ${rejected.length}` },
                      { value: (pending.length  / submissions.length) * 100, color: '#f08c00', tooltip: `Pending: ${pending.length}`  },
                    ]
              }
              label={
                <Box ta="center">
                  <Text fw={800} size="lg" lh={1}>{submissions.length === 0 ? '—' : `${approvalRate}%`}</Text>
                  <Text size="xs" c="dimmed">approved</Text>
                </Box>
              }
            />
            <Stack gap="md">
              {[
                { label: 'Approved', color: '#2f9e44', count: approved.length },
                { label: 'Rejected', color: '#e03131', count: rejected.length },
                { label: 'Pending',  color: '#f08c00', count: pending.length  },
              ].map(({ label, color, count }) => (
                <Group key={label} gap="xs" wrap="nowrap">
                  <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <Text size="sm" c="dimmed" style={{ minWidth: 70 }}>{label}</Text>
                  <Text size="sm" fw={700}>{count}</Text>
                </Group>
              ))}
            </Stack>
          </Group>
        </Paper>

      </SimpleGrid>

      {/* ── Recent Activity + Student Details ── */}
      <SimpleGrid cols={{ base: 1, md: 2 }}>

        {/* Recent chapter submissions */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuClock size={16} color="#4c6ef5" />
            <Text fw={600}>Recent Activity</Text>
          </Group>
          <Divider mb="md" />
          {recentActivity.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">No chapter submissions yet.</Text>
          ) : (
            <Stack gap={0}>
              {recentActivity.map(sub => {
                const student = studentMap.get(sub.student_id);
                const name    = student?.name  ?? 'Unknown Student';
                const color   = student?.color ?? 'gray';
                return (
                  <Group
                    key={sub.id}
                    justify="space-between"
                    py="xs"
                    wrap="nowrap"
                    style={{ borderBottom: '1px solid #f1f3f5' }}
                  >
                    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                      <Avatar color={color} radius="xl" size="sm">{getInitials(name)}</Avatar>
                      <Box style={{ minWidth: 0 }}>
                        <Text size="sm" fw={600} lineClamp={1}>{name}</Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>{sub.section_title}</Text>
                      </Box>
                    </Group>
                    <Group gap="xs" style={{ flexShrink: 0 }} wrap="nowrap">
                      <Badge
                        variant="light"
                        color={statusBadgeColor(sub.status)}
                        size="xs"
                        radius="sm"
                      >
                        {statusLabel(sub.status)}
                      </Badge>
                      <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                        {formatRelativeTime(sub.submitted_at)}
                      </Text>
                    </Group>
                  </Group>
                );
              })}
            </Stack>
          )}
        </Paper>

        {/* Student details */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuUsers size={16} color="#4c6ef5" />
            <Text fw={600}>Student Details</Text>
          </Group>
          <Divider mb="md" />
          {students.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">No students assigned yet.</Text>
          ) : (
            <Stack gap="lg">
              {students.map(st => {
                const subs          = submissions.filter(s => s.student_id === st.id);
                const approvedCount = subs.filter(s => s.status === 'approved').length;
                const pendingCount  = subs.filter(s => s.status === 'pending').length;
                const rejectedCount = subs.filter(s => s.status === 'needs-revision').length;
                const progress      = subs.length > 0
                  ? Math.round((approvedCount / subs.length) * 100)
                  : 0;
                return (
                  <Box key={st.id}>
                    <Group justify="space-between" mb={6} wrap="nowrap">
                      <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                        <Avatar color={st.color} radius="xl" size="sm">{getInitials(st.name)}</Avatar>
                        <Box style={{ minWidth: 0 }}>
                          <Text size="sm" fw={600} lineClamp={1}>{st.name}</Text>
                          <Text size="xs" c="dimmed" lineClamp={1}>{st.projectTitle}</Text>
                        </Box>
                      </Group>
                      <Badge
                        variant="dot"
                        color={degreeBadgeColor(st.degreeLevel)}
                        size="xs"
                        style={{ flexShrink: 0 }}
                      >
                        {st.degreeLevel}
                      </Badge>
                    </Group>
                    <Progress
                      value={progress}
                      color={progress >= 70 ? 'green' : progress >= 40 ? 'orange' : 'blue'}
                      size="xs"
                      radius="xl"
                    />
                    <Group justify="space-between" mt={4}>
                      <Text size="xs" c="dimmed">{approvedCount} approved</Text>
                      {pendingCount > 0 && (
                        <Text size="xs" c="orange.7">{pendingCount} pending</Text>
                      )}
                      {rejectedCount > 0 && (
                        <Text size="xs" c="red.7">{rejectedCount} rejected</Text>
                      )}
                      <Text size="xs" fw={600}>{progress}%</Text>
                    </Group>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Paper>

      </SimpleGrid>

    </Box>
  );
}
