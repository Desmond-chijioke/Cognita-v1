import { useEffect } from 'react';
import {
  Avatar, Badge, Box, Divider, Group, Paper, Progress,
  RingProgress, SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuUsers, LuUserCheck, LuUserX, LuGraduationCap,
  LuActivity, LuTriangleAlert, LuCalendar, LuMicroscope,
  LuTrendingUp, LuBookOpen,
} from 'react-icons/lu';
import { useAppDispatch, useAppSelector } from '../../../Redux/hooks';
import { loadSupervisors, loadStudents } from '../../../Redux/slices/hodSlice';
import type { HODSupervisor, HODStudent } from '../../../Redux/slices/hodSlice';
import { supabase } from '../../../supabase/client';

// ── Helpers ────────────────────────────────────────────────────────────────────

const ROLE_COLOR: Record<string, string> = {
  'PhD Student':           'blue',
  "Master's Student":      'violet',
  'Undergraduate Student': 'teal',
  'Student':               'orange',
  'Researcher':            'grape',
  'Postgraduate Student':  'indigo',
};

const SUP_ROLE_COLOR: Record<string, string> = {
  'Supervisor':           'blue',
  'Senior Supervisor':    'violet',
  'Co-Supervisor':        'teal',
  'Assistant Supervisor': 'cyan',
};

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
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
        <LuTrendingUp size={14} color="#ced4da" />
      </Group>
      <Text fw={800} lh={1} mb={4} style={{ fontSize: 32 }}>{value}</Text>
      <Text size="sm" c="dimmed" fw={500}>{label}</Text>
      {sub && (
        <Text size="xs" c="dimmed" mt={6}>
          {sub}
        </Text>
      )}
    </Paper>
  );
}

interface WorkloadRowProps { supervisor: HODSupervisor; maxLoad: number }

function WorkloadRow({ supervisor: sup, maxLoad }: WorkloadRowProps) {
  const pct = maxLoad > 0 ? (sup.studentsAssigned / maxLoad) * 100 : 0;
  return (
    <Box py="xs" style={{ borderBottom: '1px solid #f1f3f5' }}>
      <Group justify="space-between" mb={6} wrap="nowrap">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <Avatar color={sup.color} radius="xl" size="sm">
            {getInitials(sup.name)}
          </Avatar>
          <Box style={{ minWidth: 0 }}>
            <Text size="sm" fw={600} lineClamp={1}>{sup.name}</Text>
            <Text size="xs" c="dimmed" lineClamp={1}>{sup.specialty || '—'}</Text>
          </Box>
        </Group>
        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Badge color={SUP_ROLE_COLOR[sup.role] ?? 'gray'} variant="light" size="xs">
            {sup.role}
          </Badge>
          <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
            {sup.studentsAssigned} student{sup.studentsAssigned !== 1 ? 's' : ''}
          </Text>
        </Group>
      </Group>
      <Progress value={pct} color={sup.color} size="xs" radius="xl" />
    </Box>
  );
}

interface RecentStudentRowProps { student: HODStudent }

function RecentStudentRow({ student: st }: RecentStudentRowProps) {
  return (
    <Group
      justify="space-between"
      py="xs"
      wrap="nowrap"
      style={{ borderBottom: '1px solid #f1f3f5' }}
    >
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <Avatar color={st.color} radius="xl" size="sm">
          {getInitials(st.name)}
        </Avatar>
        <Box style={{ minWidth: 0 }}>
          <Text size="sm" fw={600} lineClamp={1}>{st.name}</Text>
          <Text size="xs" c="dimmed" lineClamp={1}>{st.program || st.matricNo || '—'}</Text>
        </Box>
      </Group>
      <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
        <Badge color={ROLE_COLOR[st.role] ?? 'gray'} variant="light" size="xs">
          {st.role.replace(' Student', '')}
        </Badge>
        <Text size="xs" c="dimmed">{st.addedOn}</Text>
      </Stack>
    </Group>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const STUDENT_ROLES = ['PhD Student', "Master's Student", 'Undergraduate Student', 'Student', 'Researcher', 'Postgraduate Student'];
const SUP_ROLES    = ['Supervisor', 'Senior Supervisor', 'Co-Supervisor', 'Assistant Supervisor'];

export default function HODOverview() {
  const dispatch       = useAppDispatch();
  const students       = useAppSelector(s => s.hod.students);
  const supervisors    = useAppSelector(s => s.hod.supervisors);
  const user           = useAppSelector(s => s.auth.user);
  const institutionId   = user?.institutionId  ?? '';
  const institutionName = user?.institutionName ?? '';
  const departmentName  = user?.departmentName ?? 'Department';

  // ── Fetch students + supervisors on mount so overview always has live counts ──
  useEffect(() => {
    if (!institutionId) return;   // never fetch without an institution anchor

    const CS = ['blue', 'violet', 'teal', 'orange', 'grape', 'cyan'];
    const CT = ['orange', 'indigo', 'blue', 'red', 'green', 'grape'];

    // Filter by institution AND the HOD's own department
    const deptName = user?.departmentName ?? '';
    const query = async (roles: string[], select: string) => {
      type Row = Record<string, unknown>;
      let q = supabase.from('users').select(select)
        .eq('institution_id', institutionId)
        .in('role', roles);
      if (deptName) q = q.eq('department', deptName);
      const { data } = await q.order('created_at');
      return (data ?? []) as unknown as Row[];
    };

    Promise.all([
      query(STUDENT_ROLES, 'id, name, email, role, matric_no, project_title, supervisor_id, created_at'),
      query(SUP_ROLES,     'id, name, email, role, specialty, created_at'),
    ]).then(([studs, sups]) => {
      dispatch(loadStudents(studs.map((st, i) => ({
        id:           String(st.id   ?? ''),
        name:         String(st.name ?? ''),
        email:        String(st.email ?? ''),
        matricNo:     String(st.matric_no     ?? ''),
        program:      String(st.project_title ?? ''),
        role:         String(st.role ?? ''),
        supervisorId: (st.supervisor_id as string | null) ?? null,
        color:        CT[i % CT.length],
        addedOn:      new Date(String(st.created_at)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      }))));
      dispatch(loadSupervisors(sups.map((s, i) => ({
        id:               String(s.id   ?? ''),
        name:             String(s.name ?? ''),
        email:            String(s.email ?? ''),
        specialty:        String(s.specialty ?? ''),
        role:             String(s.role ?? ''),
        studentsAssigned: studs.filter(st => st.supervisor_id === s.id).length,
        color:            CS[i % CS.length],
        addedOn:          new Date(String(s.created_at)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      }))));
    });
  }, [institutionId, user?.departmentName, dispatch]);

  // Student splits
  const assigned   = students.filter(s => s.supervisorId);
  const unassigned = students.filter(s => !s.supervisorId);
  const phd        = students.filter(s => s.role === 'PhD Student');
  const masters    = students.filter(s => s.role === "Master's Student");
  const ug         = students.filter(s => s.role === 'Undergraduate Student');

  // Supervisor metrics
  const totalAssigned = supervisors.reduce((a, s) => a + s.studentsAssigned, 0);
  const avgPerSup     = supervisors.length
    ? (totalAssigned / supervisors.length).toFixed(1)
    : '—';
  const maxLoad = supervisors.length
    ? Math.max(...supervisors.map(s => s.studentsAssigned), 1)
    : 1;

  // Ring chart
  const assignedPct   = students.length ? Math.round((assigned.length / students.length) * 100) : 0;
  const unassignedPct = 100 - assignedPct;

  // Recent students (last 4 added)
  const recentStudents = [...students].reverse().slice(0, 4);

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>
            {departmentName}
          </Title>
          <Text size="sm" c="dimmed" mt={2}>
            Live research activity across supervisors and students.
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
          sub={`${phd.length} PhD · ${masters.length} MSc · ${ug.length} UG`}
        />
        <StatCard
          icon={LuUserCheck}
          label="Supervisors"
          value={supervisors.length}
          color="teal"
          sub="Active faculty members"
        />
        <StatCard
          icon={LuUserX}
          label="Unassigned"
          value={unassigned.length}
          color={unassigned.length > 0 ? 'red' : 'green'}
          sub="Students without a supervisor"
        />
        <StatCard
          icon={LuGraduationCap}
          label="Avg per Supervisor"
          value={avgPerSup}
          color="violet"
          sub="Students per active supervisor"
        />
      </SimpleGrid>

      {/* ── Middle row ── */}
      <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">

        {/* Student breakdown by degree level */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuBookOpen size={16} color="#4c6ef5" />
            <Text fw={600}>Student Breakdown by Level</Text>
          </Group>
          <Divider mb="md" />
          <Stack gap="md">
            {[
              { label: 'PhD Students',           count: phd.length,     color: '#4c6ef5' },
              { label: "Master's Students",      count: masters.length, color: '#7950f2' },
              { label: 'Undergraduate Students', count: ug.length,      color: '#0c8599' },
            ].map(({ label, count, color }) => (
              <Box key={label}>
                <Group justify="space-between" mb={6}>
                  <Text size="sm" c="dimmed">{label}</Text>
                  <Text size="sm" fw={700}>{count}</Text>
                </Group>
                <Progress
                  value={students.length ? (count / students.length) * 100 : 0}
                  color={color}
                  size="sm"
                  radius="xl"
                />
              </Box>
            ))}
          </Stack>

          {students.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="md">No students in the department yet.</Text>
          )}
        </Paper>

        {/* Assignment status ring */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuActivity size={16} color="#4c6ef5" />
            <Text fw={600}>Supervisor Assignment Status</Text>
          </Group>
          <Divider mb="md" />
          <Group justify="center" align="center" gap="xl" mt="sm">
            <RingProgress
              size={160}
              thickness={26}
              roundCaps
              sections={
                students.length === 0
                  ? [{ value: 100, color: '#dee2e6' }]
                  : [
                      { value: assignedPct,   color: '#2f9e44', tooltip: `Assigned: ${assigned.length}` },
                      { value: unassignedPct, color: '#fa5252', tooltip: `Unassigned: ${unassigned.length}` },
                    ]
              }
              label={
                <Box ta="center">
                  <Text fw={800} size="lg" lh={1}>{assignedPct}%</Text>
                  <Text size="xs" c="dimmed">assigned</Text>
                </Box>
              }
            />
            <Stack gap="md">
              {[
                { label: 'Assigned',   count: assigned.length,   color: '#2f9e44' },
                { label: 'Unassigned', count: unassigned.length, color: '#fa5252' },
                { label: 'Total',      count: students.length,   color: '#ced4da' },
              ].map(({ label, count, color }) => (
                <Group key={label} gap="xs" wrap="nowrap">
                  <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <Text size="sm" c="dimmed" style={{ minWidth: 80 }}>{label}</Text>
                  <Text size="sm" fw={700}>{count}</Text>
                </Group>
              ))}
            </Stack>
          </Group>
        </Paper>

      </SimpleGrid>

      {/* ── Bottom row ── */}
      <SimpleGrid cols={{ base: 1, md: 2 }} mb={unassigned.length > 0 ? 'xl' : 0}>

        {/* Supervisor workload */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuUserCheck size={16} color="#4c6ef5" />
            <Text fw={600}>Supervisor Workload</Text>
          </Group>
          <Divider mb="md" />
          {supervisors.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="lg">
              No supervisors added yet.
            </Text>
          ) : (
            <Stack gap={0}>
              {supervisors.map(sup => (
                <WorkloadRow key={sup.id} supervisor={sup} maxLoad={maxLoad} />
              ))}
            </Stack>
          )}
        </Paper>

        {/* Recently added students */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuMicroscope size={16} color="#4c6ef5" />
            <Text fw={600}>Recently Added Students</Text>
          </Group>
          <Divider mb="md" />
          {recentStudents.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="lg">
              No students added yet.
            </Text>
          ) : (
            <Stack gap={0}>
              {recentStudents.map(st => (
                <RecentStudentRow key={st.id} student={st} />
              ))}
            </Stack>
          )}
        </Paper>

      </SimpleGrid>

      {/* ── Unassigned alert panel ── */}
      {unassigned.length > 0 && (
        <Paper
          withBorder
          p="lg"
          radius="md"
          style={{ borderColor: '#ffa94d', background: '#fff9f0' }}
        >
          <Group gap="sm" mb="md">
            <LuTriangleAlert size={18} color="#f08c00" />
            <Text fw={600} c="orange.8">
              {unassigned.length} Student{unassigned.length > 1 ? 's' : ''} Awaiting Supervisor Assignment
            </Text>
          </Group>
          <Divider color="orange.2" mb="md" />
          <Stack gap="sm">
            {unassigned.map(st => (
              <Group key={st.id} justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <Avatar color={st.color} radius="xl" size="sm">
                    {getInitials(st.name)}
                  </Avatar>
                  <Box style={{ minWidth: 0 }}>
                    <Text size="sm" fw={500} lineClamp={1}>{st.name}</Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>{st.program || st.matricNo || st.email}</Text>
                  </Box>
                </Group>
                <Badge variant="light" color="orange" size="sm" style={{ flexShrink: 0 }}>
                  {st.role}
                </Badge>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}

    </Box>
  );
}
