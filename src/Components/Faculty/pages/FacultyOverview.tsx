import { useEffect, useState } from 'react';
import {
  Avatar, Badge, Box, Center, Divider, Group, Loader, Paper,
  Progress, RingProgress, SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuBuilding, LuUsers, LuUserCheck, LuUserX,
  LuCalendar, LuActivity, LuTrendingUp, LuTriangleAlert, LuMicroscope,
} from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import { supabase } from '../../../supabase/client';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DeptSummary {
  id:           string;
  name:         string;
  hodName:      string;
  studentCount: number;
  supCount:     number;
  color:        string;
}

interface RecentStudent {
  id:         string;
  name:       string;
  role:       string;
  department: string;
  addedOn:    string;
  color:      string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STUDENT_ROLES = ['PhD Student', "Master's Student", 'Undergraduate Student', 'Student', 'Researcher', 'Postgraduate Student'];
const SUP_ROLES     = ['Supervisor', 'Senior Supervisor', 'Co-Supervisor', 'Assistant Supervisor'];
const COLORS = ['blue', 'teal', 'violet', 'orange', 'cyan', 'grape', 'green', 'indigo'];

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function nameToColor(name: string) {
  let h = 0;
  for (const c of name) h = (h << 5) - h + c.charCodeAt(0);
  return COLORS[Math.abs(h) % COLORS.length];
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <Paper withBorder p="lg" radius="md" bg="white">
      <Group justify="space-between" mb="sm">
        <ThemeIcon size={42} radius="md" color={color} variant="light"><Icon size={20} /></ThemeIcon>
        <LuTrendingUp size={14} color="#ced4da" />
      </Group>
      <Text fw={800} lh={1} mb={4} style={{ fontSize: 32 }}>{value}</Text>
      <Text size="sm" c="dimmed" fw={500}>{label}</Text>
      {sub && <Text size="xs" c="dimmed" mt={6}>{sub}</Text>}
    </Paper>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function FacultyOverview() {
  const user          = useAppSelector(s => s.auth.user);
  const institutionId = user?.institutionId ?? '';
  const facultyId     = user?.facultyId     ?? '';
  const facultyName   = user?.departmentName ?? 'Faculty';

  const [departments,  setDepartments]  = useState<DeptSummary[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalSups,    setTotalSups]    = useState(0);
  const [unassigned,   setUnassigned]   = useState(0);
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([]);
  const [assignedPct,  setAssignedPct]  = useState(0);
  const [loading,      setLoading]      = useState(true);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!institutionId || !facultyId) { setLoading(false); return; }

    async function load() {
      setLoading(true);

      // 1. Departments in this faculty (institution-scoped)
      const { data: deptRows } = await supabase
        .from('departments')
        .select('id, name, hod_id')
        .eq('institution_id', institutionId)
        .eq('faculty_id', facultyId)
        .order('name');

      const deptNames = (deptRows ?? []).map(d => d.name);
      const hodIds    = (deptRows ?? []).map(d => d.hod_id).filter(Boolean) as string[];

      // 2. HOD name map
      const hodMap: Record<string, string> = {};
      if (hodIds.length) {
        const { data: hods } = await supabase.from('users').select('id, name').in('id', hodIds).eq('institution_id', institutionId);
        (hods ?? []).forEach(h => { hodMap[h.id] = h.name; });
      }

      if (!deptNames.length) {
        setDepartments([]);
        setLoading(false);
        return;
      }

      // 3. Students in those departments
      const { data: studentRows } = await supabase
        .from('users')
        .select('id, name, role, department, supervisor_id, created_at')
        .eq('institution_id', institutionId)
        .in('role', STUDENT_ROLES)
        .in('department', deptNames)
        .order('created_at', { ascending: false });

      // 4. Supervisors in those departments
      const { data: supRows } = await supabase
        .from('users')
        .select('id, department')
        .eq('institution_id', institutionId)
        .in('role', SUP_ROLES)
        .in('department', deptNames);

      const allStudents = (studentRows ?? []) as { id: string; name: string; role: string; department: string; supervisor_id: string | null; created_at: string }[];
      const allSups     = (supRows     ?? []) as { id: string; department: string }[];

      const supCountByDept:     Record<string, number> = {};
      const studentCountByDept: Record<string, number> = {};
      allSups.forEach(s => { supCountByDept[s.department]     = (supCountByDept[s.department]     ?? 0) + 1; });
      allStudents.forEach(s => { studentCountByDept[s.department] = (studentCountByDept[s.department] ?? 0) + 1; });

      const depts: DeptSummary[] = (deptRows ?? []).map((d, i) => ({
        id:           d.id,
        name:         d.name,
        hodName:      d.hod_id ? (hodMap[d.hod_id] ?? '—') : '—',
        studentCount: studentCountByDept[d.name] ?? 0,
        supCount:     supCountByDept[d.name]     ?? 0,
        color:        COLORS[i % COLORS.length],
      }));

      const unassignedCount = allStudents.filter(s => !s.supervisor_id).length;
      const assignedCount   = allStudents.length - unassignedCount;

      setDepartments(depts);
      setTotalStudents(allStudents.length);
      setTotalSups(allSups.length);
      setUnassigned(unassignedCount);
      setAssignedPct(allStudents.length > 0 ? Math.round((assignedCount / allStudents.length) * 100) : 0);
      setRecentStudents(allStudents.slice(0, 5).map(s => ({
        id:         s.id,
        name:       s.name,
        role:       s.role,
        department: s.department ?? '—',
        addedOn:    new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        color:      nameToColor(s.name),
      })));
      setLoading(false);
    }

    load();
  }, [institutionId, facultyId]);

  if (loading) return (
    <Box p="xl" ta="center" pt={80}><Loader size="sm" color="brand" /><Text size="sm" c="dimmed" mt="sm">Loading faculty overview…</Text></Box>
  );

  if (!facultyId) return (
    <Box p="xl" ta="center" pt={80}>
      <LuBuilding size={48} color="#ced4da" />
      <Text fw={600} mt="md">Not assigned to a faculty</Text>
      <Text size="sm" c="dimmed" mt={4}>Ask your institution admin to assign you as Dean of a faculty.</Text>
    </Box>
  );

  const maxStudents = Math.max(...departments.map(d => d.studentCount), 1);
  const unassignedPct = 100 - assignedPct;

  return (
    <Box p="xl">
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>{facultyName}</Title>
          <Text size="sm" c="dimmed" mt={2}>Faculty-wide oversight — departments, students and supervisors.</Text>
        </Box>
        <Group gap="xs" align="center">
          <LuCalendar size={14} color="#adb5bd" />
          <Text size="sm" c="dimmed">{today}</Text>
        </Group>
      </Group>

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        <StatCard icon={LuBuilding}  label="Departments"       value={departments.length}  color="brand"  sub="In this faculty" />
        <StatCard icon={LuUsers}     label="Total Students"    value={totalStudents}        color="teal"   sub="Across all departments" />
        <StatCard icon={LuUserCheck} label="Supervisors"       value={totalSups}            color="green"  sub="Active faculty staff" />
        <StatCard icon={LuUserX}     label="Unassigned"        value={unassigned}           color={unassigned > 0 ? 'red' : 'green'} sub="Without a supervisor" />
      </SimpleGrid>

      {/* Department breakdown + assignment ring */}
      <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">

        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuBuilding size={16} color="#4c6ef5" />
            <Text fw={600}>Department Breakdown</Text>
          </Group>
          <Divider mb="md" />
          {departments.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">No departments in this faculty yet.</Text>
          ) : (
            <Stack gap="md">
              {departments.map(d => (
                <Box key={d.id}>
                  <Group justify="space-between" mb={6} wrap="nowrap">
                    <Box style={{ minWidth: 0 }}>
                      <Text size="sm" fw={600} lineClamp={1}>{d.name}</Text>
                      <Text size="xs" c="dimmed">HOD: {d.hodName} · {d.supCount} supervisor{d.supCount !== 1 ? 's' : ''}</Text>
                    </Box>
                    <Text size="sm" fw={700} style={{ flexShrink: 0 }}>{d.studentCount} students</Text>
                  </Group>
                  <Progress value={maxStudents > 0 ? (d.studentCount / maxStudents) * 100 : 0} color={d.color} size="xs" radius="xl" />
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuActivity size={16} color="#4c6ef5" />
            <Text fw={600}>Supervisor Assignment</Text>
          </Group>
          <Divider mb="md" />
          <Group justify="center" align="center" gap="xl" mt="sm">
            <RingProgress
              size={160} thickness={26} roundCaps
              sections={totalStudents === 0
                ? [{ value: 100, color: '#dee2e6' }]
                : [
                    { value: assignedPct,   color: '#2f9e44', tooltip: `Assigned: ${totalStudents - unassigned}` },
                    { value: unassignedPct, color: '#fa5252', tooltip: `Unassigned: ${unassigned}` },
                  ]}
              label={<Box ta="center"><Text fw={800} size="lg" lh={1}>{assignedPct}%</Text><Text size="xs" c="dimmed">assigned</Text></Box>}
            />
            <Stack gap="md">
              {[
                { label: 'Assigned',   count: totalStudents - unassigned, color: '#2f9e44' },
                { label: 'Unassigned', count: unassigned,                 color: '#fa5252' },
                { label: 'Total',      count: totalStudents,              color: '#ced4da' },
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

      {/* Recent students */}
      <Paper withBorder p="lg" radius="md" bg="white">
        <Group gap="xs" mb="md">
          <LuMicroscope size={16} color="#4c6ef5" />
          <Text fw={600}>Recently Added Students</Text>
        </Group>
        <Divider mb="md" />
        {recentStudents.length === 0 ? (
          <Center py="lg"><Text size="sm" c="dimmed">No students in this faculty yet.</Text></Center>
        ) : (
          <Stack gap={0}>
            {recentStudents.map(s => (
              <Group key={s.id} justify="space-between" py="xs" wrap="nowrap" style={{ borderBottom: '1px solid #f1f3f5' }}>
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <Avatar color={s.color} radius="xl" size="sm">{getInitials(s.name)}</Avatar>
                  <Box style={{ minWidth: 0 }}>
                    <Text size="sm" fw={600} lineClamp={1}>{s.name}</Text>
                    <Text size="xs" c="dimmed">{s.department}</Text>
                  </Box>
                </Group>
                <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
                  <Badge size="xs" variant="light" color={s.role === 'PhD Student' ? 'blue' : s.role === "Master's Student" ? 'violet' : 'teal'}>
                    {s.role.replace(' Student', '')}
                  </Badge>
                  <Text size="xs" c="dimmed">{s.addedOn}</Text>
                </Stack>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Unassigned alert */}
      {unassigned > 0 && (
        <Paper withBorder p="lg" radius="md" mt="xl" style={{ borderColor: '#ffa94d', background: '#fff9f0' }}>
          <Group gap="sm">
            <LuTriangleAlert size={18} color="#f08c00" />
            <Text fw={600} c="orange.8">{unassigned} student{unassigned > 1 ? 's are' : ' is'} awaiting supervisor assignment across this faculty</Text>
          </Group>
        </Paper>
      )}
    </Box>
  );
}
