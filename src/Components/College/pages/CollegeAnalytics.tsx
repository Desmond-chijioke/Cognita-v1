import { useEffect, useState } from 'react';
import {
  Box, Center, Divider, Group, Loader, Paper, Progress,
  RingProgress, SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import { LuBuilding2, LuUsers,  LuGraduationCap, LuUserCheck } from 'react-icons/lu';

import { useAppSelector } from '../../../Redux/hooks';
import { supabase } from '../../../supabase/client';
import { FiBarChart2 } from 'react-icons/fi';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FacultyStat {
  name:         string;
  studentCount: number;
  supCount:     number;
  deptCount:    number;
  color:        string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STUDENT_ROLES = ['PhD Student', "Master's Student", 'Undergraduate Student', 'Student', 'Researcher', 'Postgraduate Student'];
const SUP_ROLES     = ['Supervisor', 'Senior Supervisor', 'Co-Supervisor', 'Assistant Supervisor'];
const COLORS = ['#4c6ef5', '#0c8599', '#7950f2', '#f08c00', '#2f9e44', '#ae3ec9', '#e03131', '#1971c2'];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CollegeAnalytics() {
  const user          = useAppSelector(s => s.auth.user);
  const institutionId = user?.institutionId ?? '';
  const collegeId     = user?.collegeId     ?? '';
  const collegeName   = user?.departmentName ?? 'College';

  const [facStats,   setFacStats]   = useState<FacultyStat[]>([]);
  const [degreeDist, setDegreeDist] = useState({ phd: 0, masters: 0, ug: 0, pg: 0 });
  const [totals,     setTotals]     = useState({ students: 0, supervisors: 0, faculties: 0, departments: 0 });
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!institutionId || !collegeId) { setLoading(false); return; }

    async function load() {
      setLoading(true);

      const { data: facRows } = await supabase
        .from('faculties')
        .select('id, name')
        .eq('institution_id', institutionId)
        .eq('college_id', collegeId)
        .order('name');

      if (!facRows?.length) { setLoading(false); return; }

      const facultyIds = facRows.map(f => f.id);

      const { data: deptRows } = await supabase
        .from('departments')
        .select('id, name, faculty_id')
        .eq('institution_id', institutionId)
        .in('faculty_id', facultyIds);

      const deptNames = (deptRows ?? []).map(d => d.name);
      const deptsByFaculty: Record<string, number> = {};
      (deptRows ?? []).forEach(d => { deptsByFaculty[d.faculty_id] = (deptsByFaculty[d.faculty_id] ?? 0) + 1; });

      if (!deptNames.length) { setLoading(false); return; }

      const [{ data: studentRows }, { data: supRows }] = await Promise.all([
        supabase.from('users').select('id, role, department').eq('institution_id', institutionId).in('role', STUDENT_ROLES).in('department', deptNames),
        supabase.from('users').select('id, department').eq('institution_id', institutionId).in('role', SUP_ROLES).in('department', deptNames),
      ]);

      const studs = (studentRows ?? []) as { id: string; role: string; department: string }[];
      const sups  = (supRows     ?? []) as { id: string; department: string }[];

      const studentsByDept: Record<string, number> = {};
      studs.forEach(s => { if (s.department) studentsByDept[s.department] = (studentsByDept[s.department] ?? 0) + 1; });

      const supsByDept: Record<string, number> = {};
      sups.forEach(s => { if (s.department) supsByDept[s.department] = (supsByDept[s.department] ?? 0) + 1; });

      const deptsByFacName: Record<string, string[]> = {};
      (deptRows ?? []).forEach(d => { (deptsByFacName[d.faculty_id] ??= []).push(d.name); });

      const stats: FacultyStat[] = facRows.map((f, i) => {
        const myDepts = deptsByFacName[f.id] ?? [];
        const sc  = myDepts.reduce((s, dn) => s + (studentsByDept[dn] ?? 0), 0);
        const sup = myDepts.reduce((s, dn) => s + (supsByDept[dn]     ?? 0), 0);
        return { name: f.name, studentCount: sc, supCount: sup, deptCount: deptsByFaculty[f.id] ?? 0, color: COLORS[i % COLORS.length] };
      });

      const degreeCounts = {
        phd:     studs.filter(s => s.role === 'PhD Student').length,
        masters: studs.filter(s => s.role === "Master's Student").length,
        ug:      studs.filter(s => s.role === 'Undergraduate Student').length,
        pg:      studs.filter(s => s.role === 'Postgraduate Student').length,
      };

      setFacStats(stats);
      setDegreeDist(degreeCounts);
      setTotals({ students: studs.length, supervisors: sups.length, faculties: facRows.length, departments: (deptRows ?? []).length });
      setLoading(false);
    }

    load();
  }, [institutionId, collegeId]);

  if (loading) return (
    <Box p="xl" ta="center" pt={80}><Loader size="sm" color="brand" /><Text size="sm" c="dimmed" mt="sm">Loading analytics…</Text></Box>
  );

  if (!collegeId) return (
    <Box p="xl" ta="center" pt={80}>
      <FiBarChart2 size={48} color="#ced4da" />
      <Text fw={600} mt="md">Not assigned to a college</Text>
    </Box>
  );

  const maxStudents = Math.max(...facStats.map(f => f.studentCount), 1);

  return (
    <Box p="xl">
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Analytics</Title>
        <Text size="sm" c="dimmed" mt={2}>{collegeName} — research activity and student distribution.</Text>
      </Box>

      {/* Summary tiles */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl">
        {[
          { icon: LuBuilding2, label: 'Faculties',   value: totals.faculties,   color: 'brand'  },
          { icon: LuBuilding2, label: 'Departments', value: totals.departments, color: 'teal'   },
          { icon: LuUsers,     label: 'Students',    value: totals.students,    color: 'violet' },
          { icon: LuUserCheck, label: 'Supervisors', value: totals.supervisors, color: 'green'  },
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

        {/* Students per faculty */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <FiBarChart2 size={16} color="#4c6ef5" />
            <Text fw={600}>Students per Faculty</Text>
          </Group>
          <Divider mb="md" />
          {facStats.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">No data yet.</Text>
          ) : (
            <Stack gap="md">
              {facStats.map(f => (
                <Box key={f.name}>
                  <Group justify="space-between" mb={6}>
                    <Text size="sm" c="dimmed" lineClamp={1} style={{ flex: 1 }}>{f.name}</Text>
                    <Text size="sm" fw={700}>{f.studentCount}</Text>
                  </Group>
                  <Progress value={maxStudents > 0 ? (f.studentCount / maxStudents) * 100 : 0} color={f.color} size="sm" radius="xl" />
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        {/* Degree level distribution */}
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

      {/* Faculty detail table */}
      <Paper withBorder p="lg" radius="md" bg="white">
        <Group gap="xs" mb="md">
          <LuBuilding2 size={16} color="#4c6ef5" />
          <Text fw={600}>Faculty Summary Table</Text>
        </Group>
        <Divider mb="md" />
        {facStats.length === 0 ? (
          <Center py="lg"><Text size="sm" c="dimmed">No faculty data available.</Text></Center>
        ) : (
          <Stack gap={0}>
            {/* Header */}
            <Group py="xs" style={{ borderBottom: '2px solid #e9ecef' }}>
              <Text size="xs" fw={700} c="dimmed" style={{ flex: 3 }}>FACULTY</Text>
              <Text size="xs" fw={700} c="dimmed" ta="center" style={{ flex: 1 }}>DEPTS</Text>
              <Text size="xs" fw={700} c="dimmed" ta="center" style={{ flex: 1 }}>SUPERVISORS</Text>
              <Text size="xs" fw={700} c="dimmed" ta="center" style={{ flex: 1 }}>STUDENTS</Text>
            </Group>
            {facStats.map(f => (
              <Group key={f.name} py="sm" style={{ borderBottom: '1px solid #f1f3f5' }}>
                <Group gap="xs" style={{ flex: 3, minWidth: 0 }}>
                  <Box style={{ width: 10, height: 10, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
                  <Text size="sm" lineClamp={1}>{f.name}</Text>
                </Group>
                <Text size="sm" fw={600} ta="center" style={{ flex: 1 }}>{f.deptCount}</Text>
                <Text size="sm" fw={600} ta="center" style={{ flex: 1 }}>{f.supCount}</Text>
                <Text size="sm" fw={600} ta="center" style={{ flex: 1 }}>{f.studentCount}</Text>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
