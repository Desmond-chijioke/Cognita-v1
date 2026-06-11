import { useEffect, useState } from 'react';
import {
  Box, Center, Divider, Group, Loader, Paper, Progress,
  RingProgress, SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import { LuBuilding, LuUsers, LuGraduationCap, LuUserCheck } from 'react-icons/lu';
import { FiBarChart2 } from 'react-icons/fi';
import { useAppSelector } from '../../../Redux/hooks';
import { supabase } from '../../../supabase/client';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DeptStat {
  name:         string;
  studentCount: number;
  supCount:     number;
  assignedPct:  number;
  color:        string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STUDENT_ROLES = ['PhD Student', "Master's Student", 'Undergraduate Student', 'Student', 'Researcher', 'Postgraduate Student'];
const SUP_ROLES     = ['Supervisor', 'Senior Supervisor', 'Co-Supervisor', 'Assistant Supervisor'];
const COLORS = ['#4c6ef5', '#0c8599', '#7950f2', '#f08c00', '#2f9e44', '#ae3ec9', '#e03131', '#1971c2'];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function FacultyAnalytics() {
  const user          = useAppSelector(s => s.auth.user);
  const institutionId = user?.institutionId ?? '';
  const facultyId     = user?.facultyId     ?? '';
  const facultyName   = user?.departmentName ?? 'Faculty';

  const [deptStats,  setDeptStats]  = useState<DeptStat[]>([]);
  const [degreeDist, setDegreeDist] = useState({ phd: 0, masters: 0, ug: 0, pg: 0 });
  const [totals,     setTotals]     = useState({ students: 0, supervisors: 0, departments: 0, unassigned: 0 });
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!institutionId || !facultyId) { setLoading(false); return; }

    async function load() {
      setLoading(true);

      const { data: deptRows } = await supabase
        .from('departments')
        .select('id, name')
        .eq('institution_id', institutionId)
        .eq('faculty_id', facultyId)
        .order('name');

      if (!deptRows?.length) { setLoading(false); return; }

      const deptNames = deptRows.map(d => d.name);

      const [{ data: studentRows }, { data: supRows }] = await Promise.all([
        supabase.from('users').select('id, role, department, supervisor_id').eq('institution_id', institutionId).in('role', STUDENT_ROLES).in('department', deptNames),
        supabase.from('users').select('id, department').eq('institution_id', institutionId).in('role', SUP_ROLES).in('department', deptNames),
      ]);

      const studs = (studentRows ?? []) as { id: string; role: string; department: string; supervisor_id: string | null }[];
      const sups  = (supRows     ?? []) as { id: string; department: string }[];

      const studentByDept:  Record<string, typeof studs> = {};
      const supCountByDept: Record<string, number>       = {};
      studs.forEach(s => { (studentByDept[s.department] ??= []).push(s); });
      sups.forEach(s => { supCountByDept[s.department] = (supCountByDept[s.department] ?? 0) + 1; });

      const stats: DeptStat[] = deptRows.map((d, i) => {
        const ds  = studentByDept[d.name] ?? [];
        const asg = ds.filter(s => s.supervisor_id).length;
        return {
          name:         d.name,
          studentCount: ds.length,
          supCount:     supCountByDept[d.name] ?? 0,
          assignedPct:  ds.length > 0 ? Math.round((asg / ds.length) * 100) : 0,
          color:        COLORS[i % COLORS.length],
        };
      });

      const unassigned = studs.filter(s => !s.supervisor_id).length;

      setDeptStats(stats);
      setDegreeDist({
        phd:     studs.filter(s => s.role === 'PhD Student').length,
        masters: studs.filter(s => s.role === "Master's Student").length,
        ug:      studs.filter(s => s.role === 'Undergraduate Student').length,
        pg:      studs.filter(s => s.role === 'Postgraduate Student').length,
      });
      setTotals({ students: studs.length, supervisors: sups.length, departments: deptRows.length, unassigned });
      setLoading(false);
    }

    load();
  }, [institutionId, facultyId]);

  if (loading) return (
    <Box p="xl" ta="center" pt={80}><Loader size="sm" color="brand" /><Text size="sm" c="dimmed" mt="sm">Loading analytics…</Text></Box>
  );

  if (!facultyId) return (
    <Box p="xl" ta="center" pt={80}>
      <FiBarChart2 size={48} color="#ced4da" />
      <Text fw={600} mt="md">Not assigned to a faculty</Text>
    </Box>
  );

  const maxStudents = Math.max(...deptStats.map(d => d.studentCount), 1);
  const assignedOverall = totals.students > 0 ? Math.round(((totals.students - totals.unassigned) / totals.students) * 100) : 0;

  return (
    <Box p="xl">
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Analytics</Title>
        <Text size="sm" c="dimmed" mt={2}>{facultyName} — student distribution and supervisor coverage.</Text>
      </Box>

      {/* Summary tiles */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl">
        {[
          { icon: LuBuilding,  label: 'Departments', value: totals.departments,  color: 'brand'  },
          { icon: LuUsers,     label: 'Students',    value: totals.students,     color: 'violet' },
          { icon: LuUserCheck, label: 'Supervisors', value: totals.supervisors,  color: 'green'  },
          { icon: FiBarChart2, label: 'Assigned %',  value: `${assignedOverall}%`, color: assignedOverall >= 80 ? 'green' : assignedOverall >= 50 ? 'orange' : 'red' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Paper key={label} withBorder p="lg" radius="md" bg="white">
            <Group gap="sm">
              <ThemeIcon size={38} radius="md" color={color} variant="light"><Icon size={17} /></ThemeIcon>
              <Box>
                <Text fw={800} size="xl" lh={1}>{value}</Text>
                <Text size="xs" c="dimmed">{label}</Text>
              </Box>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">

        {/* Students per department */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <FiBarChart2 size={16} color="#4c6ef5" />
            <Text fw={600}>Students per Department</Text>
          </Group>
          <Divider mb="md" />
          {deptStats.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">No data yet.</Text>
          ) : (
            <Stack gap="md">
              {deptStats.map(d => (
                <Box key={d.name}>
                  <Group justify="space-between" mb={6}>
                    <Text size="sm" c="dimmed" lineClamp={1} style={{ flex: 1 }}>{d.name}</Text>
                    <Text size="sm" fw={700}>{d.studentCount}</Text>
                  </Group>
                  <Progress value={maxStudents > 0 ? (d.studentCount / maxStudents) * 100 : 0} color={d.color} size="sm" radius="xl" />
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        {/* Degree level ring */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuGraduationCap size={16} color="#4c6ef5" />
            <Text fw={600}>Degree Level Distribution</Text>
          </Group>
          <Divider mb="md" />
          <Group justify="center" align="center" gap="xl" mt="sm">
            <RingProgress
              size={150} thickness={24} roundCaps
              sections={totals.students === 0
                ? [{ value: 100, color: '#dee2e6' }]
                : [
                    { value: (degreeDist.phd     / totals.students) * 100, color: '#4c6ef5' },
                    { value: (degreeDist.masters  / totals.students) * 100, color: '#7950f2' },
                    { value: (degreeDist.pg       / totals.students) * 100, color: '#ae3ec9' },
                    { value: (degreeDist.ug       / totals.students) * 100, color: '#0c8599' },
                  ]}
              label={<Box ta="center"><Text fw={800} size="md" lh={1}>{totals.students}</Text><Text size="xs" c="dimmed">total</Text></Box>}
            />
            <Stack gap="sm">
              {[
                { label: 'PhD',           count: degreeDist.phd,     color: '#4c6ef5' },
                { label: "Master's",      count: degreeDist.masters,  color: '#7950f2' },
                { label: 'Postgraduate',  count: degreeDist.pg,       color: '#ae3ec9' },
                { label: 'Undergraduate', count: degreeDist.ug,       color: '#0c8599' },
              ].map(({ label, count, color }) => (
                <Group key={label} gap="xs" wrap="nowrap">
                  <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <Text size="sm" c="dimmed" style={{ minWidth: 90 }}>{label}</Text>
                  <Text size="sm" fw={700}>{count}</Text>
                </Group>
              ))}
            </Stack>
          </Group>
        </Paper>

      </SimpleGrid>

      {/* Department detail table */}
      <Paper withBorder p="lg" radius="md" bg="white">
        <Group gap="xs" mb="md">
          <LuBuilding size={16} color="#4c6ef5" />
          <Text fw={600}>Department Summary</Text>
        </Group>
        <Divider mb="md" />
        {deptStats.length === 0 ? (
          <Center py="lg"><Text size="sm" c="dimmed">No department data available.</Text></Center>
        ) : (
          <Stack gap={0}>
            <Group py="xs" style={{ borderBottom: '2px solid #e9ecef' }}>
              <Text size="xs" fw={700} c="dimmed" style={{ flex: 3 }}>DEPARTMENT</Text>
              <Text size="xs" fw={700} c="dimmed" ta="center" style={{ flex: 1 }}>SUPERVISORS</Text>
              <Text size="xs" fw={700} c="dimmed" ta="center" style={{ flex: 1 }}>STUDENTS</Text>
              <Text size="xs" fw={700} c="dimmed" ta="center" style={{ flex: 1 }}>ASSIGNED</Text>
            </Group>
            {deptStats.map(d => (
              <Group key={d.name} py="sm" style={{ borderBottom: '1px solid #f1f3f5' }}>
                <Group gap="xs" style={{ flex: 3, minWidth: 0 }}>
                  <Box style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <Text size="sm" lineClamp={1}>{d.name}</Text>
                </Group>
                <Text size="sm" fw={600} ta="center" style={{ flex: 1 }}>{d.supCount}</Text>
                <Text size="sm" fw={600} ta="center" style={{ flex: 1 }}>{d.studentCount}</Text>
                <Text size="sm" fw={600} ta="center" style={{ flex: 1, color: d.assignedPct >= 80 ? '#2f9e44' : d.assignedPct >= 50 ? '#f08c00' : '#e03131' }}>
                  {d.assignedPct}%
                </Text>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
