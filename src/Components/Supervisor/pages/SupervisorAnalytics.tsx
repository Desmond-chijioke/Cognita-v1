import { useEffect, useMemo, useState } from 'react';
import {
  Box, Divider, Group, Loader, Paper, Progress,
  SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuUsers, LuTrendingUp, LuCircleCheck, LuClock,
  LuActivity, LuBookOpen, LuFileText, LuShield,
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

function avgTurnaround(subs: DBSubmission[]): string {
  const reviewed = subs.filter(s => s.reviewed_at && s.submitted_at);
  if (!reviewed.length) return '—';
  const days = reviewed.map(s =>
    (new Date(s.reviewed_at!).getTime() - new Date(s.submitted_at).getTime()) / 86_400_000
  );
  const mean = days.reduce((a, b) => a + b, 0) / days.length;
  return mean < 1 ? `${Math.round(mean * 24)}h` : `${mean.toFixed(1)}d`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudentRow {
  id:           string;
  name:         string;
  degreeLevel:  DegreeLevel;
  projectTitle: string;
  color:        string;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <Paper withBorder p="lg" radius="md" bg="white">
      <Group justify="space-between" mb="sm">
        <ThemeIcon size={42} radius="md" color={color} variant="light">
          <Icon size={20} />
        </ThemeIcon>
        <LuActivity size={14} color="#ced4da" />
      </Group>
      <Text fw={800} lh={1} mb={4} style={{ fontSize: 28 }}>{value}</Text>
      <Text size="sm" c="dimmed" fw={500}>{label}</Text>
      {sub && <Text size="xs" c="dimmed" mt={4}>{sub}</Text>}
    </Paper>
  );
}

// ── SVG: Chapter submissions per student ──────────────────────────────────────

function ChapterChart({ students, submissions }: {
  students:    StudentRow[];
  submissions: DBSubmission[];
}) {
  if (!students.length) return (
    <Text size="sm" c="dimmed" ta="center" py="xl">No student data yet.</Text>
  );

  const BAR_START = 130;
  const BAR_MAX   = 210;
  const ROW_H     = 32;

  const perStudent = students.map(st => {
    const subs      = submissions.filter(s => s.student_id === st.id);
    const approved  = subs.filter(s => s.status === 'approved').length;
    const revision  = subs.filter(s => s.status === 'needs-revision').length;
    const pending   = subs.filter(s => s.status === 'pending').length;
    const total     = subs.length;
    return { ...st, approved, revision, pending, total };
  });

  const maxTotal = Math.max(...perStudent.map(s => s.total), 1);
  const height   = 30 + perStudent.length * ROW_H;

  return (
    <svg viewBox={`0 0 420 ${height}`} width="100%" height={height}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map(v => {
        const x = BAR_START + (v / 100) * BAR_MAX;
        return (
          <g key={v}>
            <line x1={x} y1={12} x2={x} y2={height - 6} stroke="#f1f3f5" strokeWidth={1} />
            <text x={x} y={10} textAnchor="middle" fontSize={9} fill="#adb5bd">{v}%</text>
          </g>
        );
      })}

      {perStudent.map((st, i) => {
        const y         = 16 + i * ROW_H;
        const approvedW = (st.approved / maxTotal) * BAR_MAX;
        const revisionW = (st.revision / maxTotal) * BAR_MAX;
        const pendingW  = (st.pending  / maxTotal) * BAR_MAX;
        const label     = st.name.split(' ')[0] + ' ' + (st.name.split(' ')[1]?.[0] ?? '') + '.';
        return (
          <g key={st.id}>
            <text x={124} y={y + 14} textAnchor="end" fontSize={11} fill="#495057">{label}</text>
            {/* Approved segment */}
            {approvedW > 0 && (
              <rect x={BAR_START} y={y} width={approvedW} height={20} fill="#2f9e44" rx={3} opacity={0.8} />
            )}
            {/* Needs-revision segment */}
            {revisionW > 0 && (
              <rect x={BAR_START + approvedW} y={y} width={revisionW} height={20} fill="#f08c00" rx={3} opacity={0.8} />
            )}
            {/* Pending segment */}
            {pendingW > 0 && (
              <rect x={BAR_START + approvedW + revisionW} y={y} width={pendingW} height={20} fill="#3b5bdb" rx={3} opacity={0.6} />
            )}
            {/* Empty bar outline if no submissions */}
            {st.total === 0 && (
              <rect x={BAR_START} y={y} width={BAR_MAX} height={20} fill="none"
                stroke="#dee2e6" strokeWidth={1} strokeDasharray="4 3" rx={3} />
            )}
            <text x={BAR_START + approvedW + revisionW + pendingW + 6} y={y + 14} fontSize={10} fill="#868e96">
              {st.total} chapter{st.total !== 1 ? 's' : ''}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      {[
        { color: '#2f9e44', label: 'Approved'  },
        { color: '#f08c00', label: 'Revision'  },
        { color: '#3b5bdb', label: 'Pending'   },
      ].map(({ color, label }, i) => (
        <g key={label} transform={`translate(${BAR_START + i * 72}, ${height - 2})`}>
          <rect width={10} height={8} fill={color} rx={2} opacity={0.8} />
          <text x={14} y={8} fontSize={9} fill="#868e96">{label}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupervisorAnalytics() {
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
        .select('id, name, project_title, role, degree_level')
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

  const approved  = useMemo(() => submissions.filter(s => s.status === 'approved'),       [submissions]);
  const pending   = useMemo(() => submissions.filter(s => s.status === 'pending'),         [submissions]);
  const revision  = useMemo(() => submissions.filter(s => s.status === 'needs-revision'), [submissions]);

  const approvalRate = submissions.length
    ? Math.round((approved.length / submissions.length) * 100)
    : 0;

  const turnaround = avgTurnaround(submissions);


  // Degree level breakdown
  const byLevel = useMemo(() => [
    { label: 'PhD',           color: '#3b5bdb' },
    { label: "Master's",      color: '#7950f2' },
    { label: 'Undergraduate', color: '#0c8599' },
  ].map(({ label, color }) => {
    const group = students.filter(s => s.degreeLevel === label);
    const groupSubs = submissions.filter(s => group.some(st => st.id === s.student_id));
    const groupApproved = groupSubs.filter(s => s.status === 'approved').length;
    return {
      label, color,
      count:       group.length,
      submitted:   groupSubs.length,
      approvalRate: groupSubs.length ? Math.round((groupApproved / groupSubs.length) * 100) : 0,
    };
  }).filter(g => g.count > 0), [students, submissions]);

  // Most submitted section titles
  const sectionFreq = useMemo(() => {
    const freq: Record<string, number> = {};
    for (const s of submissions) {
      freq[s.section_title] = (freq[s.section_title] ?? 0) + 1;
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [submissions]);

  if (loading) {
    return (
      <Box p="xl" ta="center" pt={80}>
        <Loader size="sm" color="brand" />
        <Text size="sm" c="dimmed" mt="sm">Loading analytics…</Text>
      </Box>
    );
  }

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Analytics</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Chapter submission and review metrics across your supervised students.
        </Text>
      </Box>

      {/* ── KPI Cards ── */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        <KPICard
          icon={LuUsers}
          label="Total Students"
          value={students.length}
          color="brand"
          sub="Under active supervision"
        />
        <KPICard
          icon={LuFileText}
          label="Chapters Submitted"
          value={submissions.length}
          color="blue"
          sub={`${pending.length} pending · ${revision.length} revision`}
        />
        <KPICard
          icon={LuCircleCheck}
          label="Chapters Approved"
          value={approved.length}
          color="green"
          sub={`${approvalRate}% approval rate`}
        />
        <KPICard
          icon={LuClock}
          label="Avg Review Time"
          value={turnaround}
          color={turnaround === '—' ? 'gray' : 'teal'}
          sub="Submission to decision"
        />
      </SimpleGrid>

      {/* ── Charts row ── */}
      <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">

        {/* Per-student chapter progress bars */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuTrendingUp size={16} color="#4c6ef5" />
            <Text fw={600}>Chapter Progress per Student</Text>
          </Group>
          <Divider mb="md" />
          <ChapterChart
            students={students}
            submissions={submissions}
          />
        </Paper>

        {/* Submission status breakdown */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuShield size={16} color="#4c6ef5" />
            <Text fw={600}>Submission Status Breakdown</Text>
          </Group>
          <Divider mb="md" />
          {submissions.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">No submissions yet.</Text>
          ) : (
            <Stack gap="lg">
              {[
                { label: 'Approved',       count: approved.length, color: '#2f9e44', mantine: 'green'  },
                { label: 'Pending Review', count: pending.length,  color: '#3b5bdb', mantine: 'blue'   },
                { label: 'Needs Revision', count: revision.length, color: '#f08c00', mantine: 'orange' },
              ].map(({ label, count, color, mantine }) => (
                <Box key={label}>
                  <Group justify="space-between" mb={6}>
                    <Group gap="xs">
                      <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                      <Text size="sm" c="dimmed">{label}</Text>
                    </Group>
                    <Group gap="xs">
                      <Text size="sm" fw={700}>{count}</Text>
                      <Text size="xs" c="dimmed">
                        ({Math.round((count / submissions.length) * 100)}%)
                      </Text>
                    </Group>
                  </Group>
                  <Progress
                    value={(count / submissions.length) * 100}
                    color={mantine}
                    size="sm"
                    radius="xl"
                  />
                </Box>
              ))}

              <Divider />

              {/* Most submitted sections */}
              {sectionFreq.length > 0 && (
                <Box>
                  <Group gap="xs" mb="sm">
                    <LuBookOpen size={13} color="#adb5bd" />
                    <Text size="xs" fw={600} c="dimmed">Most Submitted Chapters</Text>
                  </Group>
                  <Stack gap="xs">
                    {sectionFreq.map(([title, count]) => (
                      <Group key={title} justify="space-between" wrap="nowrap">
                        <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1 }}>{title}</Text>
                        <Text size="xs" fw={600}>{count}×</Text>
                      </Group>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </Paper>

      </SimpleGrid>

      {/* ── Bottom row ── */}
      <SimpleGrid cols={{ base: 1, md: 2 }}>

        {/* By degree level */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuBookOpen size={16} color="#4c6ef5" />
            <Text fw={600}>Performance by Degree Level</Text>
          </Group>
          <Divider mb="md" />
          {byLevel.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">No students yet.</Text>
          ) : (
            <Stack gap="lg">
              {byLevel.map(({ label, color, count, submitted, approvalRate: ar }) => (
                <Box key={label}>
                  <Group justify="space-between" mb={6}>
                    <Group gap="xs">
                      <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                      <Text size="sm" fw={500}>{label}</Text>
                    </Group>
                    <Group gap="md">
                      <Text size="xs" c="dimmed">{count} student{count !== 1 ? 's' : ''}</Text>
                      <Text size="xs" c="dimmed">{submitted} chapters</Text>
                      <Text size="xs" fw={700} style={{ color }}>{ar}% approved</Text>
                    </Group>
                  </Group>
                  <Progress value={ar} color={ar >= 70 ? 'green' : ar >= 40 ? 'orange' : 'red'} size="sm" radius="xl" />
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        {/* Per-student chapter summary */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuShield size={16} color="#4c6ef5" />
            <Text fw={600}>Chapter Summary by Student</Text>
          </Group>
          <Divider mb="md" />
          {students.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">No students assigned yet.</Text>
          ) : (
            <Stack gap="md">
              {students.map(st => {
                const subs     = submissions.filter(s => s.student_id === st.id);
                const app      = subs.filter(s => s.status === 'approved').length;
                const pen      = subs.filter(s => s.status === 'pending').length;
                const rev      = subs.filter(s => s.status === 'needs-revision').length;
                const rate     = subs.length ? Math.round((app / subs.length) * 100) : 0;
                const rateColor = rate >= 70 ? '#2f9e44' : rate >= 40 ? '#f08c00' : subs.length === 0 ? '#adb5bd' : '#e03131';
                return (
                  <Box key={st.id}>
                    <Group justify="space-between" mb={4}>
                      <Text size="sm" fw={500}>{st.name}</Text>
                      <Group gap="md">
                        {subs.length === 0 ? (
                          <Text size="xs" c="dimmed">No submissions</Text>
                        ) : (
                          <>
                            <Text size="xs" c="dimmed">✓ {app}</Text>
                            {pen > 0  && <Text size="xs" c="blue.6">⏳ {pen}</Text>}
                            {rev > 0  && <Text size="xs" c="orange.6">↩ {rev}</Text>}
                            <Text size="xs" fw={700} style={{ color: rateColor }}>{rate}%</Text>
                          </>
                        )}
                      </Group>
                    </Group>
                    <Progress
                      value={rate}
                      color={rate >= 70 ? 'green' : rate >= 40 ? 'orange' : subs.length === 0 ? 'gray' : 'red'}
                      size="xs"
                      radius="xl"
                    />
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
