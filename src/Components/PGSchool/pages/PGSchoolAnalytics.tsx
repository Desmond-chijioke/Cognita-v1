import { useEffect, useState } from 'react';
import {
  Box, Center, Divider, Group, Loader, Paper, Progress,
  RingProgress, SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import { LuGraduationCap, LuUsers, LuUserCheck, LuBuilding2 } from 'react-icons/lu';
import { FiBarChart2 } from 'react-icons/fi';
import { useAppSelector } from '../../../Redux/hooks';
import { supabase } from '../../../supabase/client';

// ── Constants ─────────────────────────────────────────────────────────────────

const PG_ROLES  = ['PhD Student', "Master's Student", 'Postgraduate Student', 'Student', 'Researcher'];
const SUP_ROLES = ['Supervisor', 'Senior Supervisor', 'Co-Supervisor', 'Assistant Supervisor'];
const COLORS    = ['#4c6ef5', '#0c8599', '#7950f2', '#f08c00', '#2f9e44', '#ae3ec9', '#e03131', '#1971c2'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface FacStat {
  id:         string;
  name:       string;
  deptCount:  number;
  students:   number;
  supervisors: number;
  color:      string;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PGSchoolAnalytics() {
  const user          = useAppSelector(s => s.auth.user);
  const institutionId = user?.institutionId   ?? '';
  const instName      = user?.institutionName ?? 'Institution';

  const [facStats,   setFacStats]   = useState<FacStat[]>([]);
  const [totals,     setTotals]     = useState({ students: 0, supervisors: 0, faculties: 0, departments: 0 });
  const [degreeDist, setDegreeDist] = useState({ phd: 0, masters: 0, pg: 0, researcher: 0 });
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!institutionId) { setLoading(false); return; }

    async function load() {
      setLoading(true);

      const [{ data: facRows }, { data: studentRows }] = await Promise.all([
        supabase.from('faculties').select('id, name').eq('institution_id', institutionId).order('name'),
        supabase.from('users').select('id, role, department, supervisor_id')
          .eq('institution_id', institutionId).in('role', PG_ROLES),
      ]);

      const facs  = (facRows     ?? []) as { id: string; name: string }[];
      const studs = (studentRows ?? []) as { id: string; role: string; department: string; supervisor_id: string | null }[];

      if (!facs.length) { setLoading(false); return; }

      // Get all departments
      const { data: deptRows } = await supabase
        .from('departments')
        .select('name, faculty_id')
        .eq('institution_id', institutionId);

      const deptFacId:     Record<string, string>   = {};
      const deptsByFacId:  Record<string, number>   = {};
      (deptRows ?? []).forEach(d => {
        deptFacId[d.name] = d.faculty_id;
        deptsByFacId[d.faculty_id] = (deptsByFacId[d.faculty_id] ?? 0) + 1;
      });

      // Get supervisors who have PG students assigned
      const supIds = [...new Set(studs.map(s => s.supervisor_id).filter(Boolean) as string[])];
      let supDeptMap: Record<string, string> = {};
      if (supIds.length) {
        const { data: supRows } = await supabase
          .from('users').select('id, department').in('id', supIds)
          .eq('institution_id', institutionId).in('role', SUP_ROLES);
        (supRows ?? []).forEach(s => { supDeptMap[s.id] = s.department; });
      }

      // Aggregate per faculty
      const studentsByFac:   Record<string, number> = {};
      const supervisorsByFac: Record<string, Set<string>> = {};

      studs.forEach(s => {
        const facId = deptFacId[s.department];
        if (!facId) return;
        studentsByFac[facId] = (studentsByFac[facId] ?? 0) + 1;
      });

      Object.entries(supDeptMap).forEach(([supId, dept]) => {
        const facId = deptFacId[dept];
        if (!facId) return;
        (supervisorsByFac[facId] ??= new Set()).add(supId);
      });

      const stats: FacStat[] = facs.map((f, i) => ({
        id:          f.id,
        name:        f.name,
        deptCount:   deptsByFacId[f.id] ?? 0,
        students:    studentsByFac[f.id]   ?? 0,
        supervisors: supervisorsByFac[f.id]?.size ?? 0,
        color:       COLORS[i % COLORS.length],
      }));

      setFacStats(stats);
      setTotals({
        students:    studs.length,
        supervisors: supIds.length,
        faculties:   facs.length,
        departments: (deptRows ?? []).length,
      });
      setDegreeDist({
        phd:        studs.filter(s => s.role === 'PhD Student').length,
        masters:    studs.filter(s => s.role === "Master's Student").length,
        pg:         studs.filter(s => s.role === 'Postgraduate Student').length,
        researcher: studs.filter(s => s.role === 'Researcher').length,
      });
      setLoading(false);
    }

    load();
  }, [institutionId]);

  if (loading) return (
    <Box p="xl" ta="center" pt={80}>
      <Loader size="sm" color="brand" />
      <Text size="sm" c="dimmed" mt="sm">Loading analytics…</Text>
    </Box>
  );

  const maxStudents = Math.max(...facStats.map(f => f.students), 1);
  const totalD      = totals.students || 1;

  return (
    <Box p="xl">
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Analytics</Title>
        <Text size="sm" c="dimmed" mt={2}>{instName} — postgraduate student distribution and supervisor coverage.</Text>
      </Box>

      {/* Summary tiles */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl">
        {[
          { icon: LuUsers,     label: 'PG Students', value: totals.students,    color: 'indigo' },
          { icon: LuBuilding2, label: 'Faculties',   value: totals.faculties,   color: 'brand'  },
          { icon: LuBuilding2, label: 'Departments', value: totals.departments, color: 'teal'   },
          { icon: LuUserCheck, label: 'Supervisors', value: totals.supervisors, color: 'grape'  },
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
            <Text fw={600}>PG Students per Faculty</Text>
          </Group>
          <Divider mb="md" />
          {facStats.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">No data yet.</Text>
          ) : (
            <Stack gap="md">
              {facStats.map(f => (
                <Box key={f.id}>
                  <Group justify="space-between" mb={6}>
                    <Text size="sm" c="dimmed" lineClamp={1} style={{ flex: 1 }}>{f.name}</Text>
                    <Text size="sm" fw={700}>{f.students}</Text>
                  </Group>
                  <Progress value={maxStudents > 0 ? (f.students / maxStudents) * 100 : 0} color={f.color} size="sm" radius="xl" />
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
                    { value: (degreeDist.phd        / totalD) * 100, color: '#4c6ef5' },
                    { value: (degreeDist.masters     / totalD) * 100, color: '#7950f2' },
                    { value: (degreeDist.pg          / totalD) * 100, color: '#ae3ec9' },
                    { value: (degreeDist.researcher  / totalD) * 100, color: '#2f9e44' },
                  ]}
              label={
                <Box ta="center">
                  <Text fw={800} size="md" lh={1}>{totals.students}</Text>
                  <Text size="xs" c="dimmed">total</Text>
                </Box>
              }
            />
            <Stack gap="sm">
              {[
                { label: 'PhD',          count: degreeDist.phd,        color: '#4c6ef5' },
                { label: "Master's",     count: degreeDist.masters,    color: '#7950f2' },
                { label: 'Postgraduate', count: degreeDist.pg,         color: '#ae3ec9' },
                { label: 'Researcher',   count: degreeDist.researcher, color: '#2f9e44' },
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

      {/* Faculty summary table */}
      <Paper withBorder p="lg" radius="md" bg="white">
        <Group gap="xs" mb="md">
          <LuBuilding2 size={16} color="brand" />
          <Text fw={600}>Faculty Summary</Text>
        </Group>
        <Divider mb="md" />
        {facStats.length === 0 ? (
          <Center py="lg"><Text size="sm" c="dimmed">No faculty data available.</Text></Center>
        ) : (
          <Stack gap={0}>
            <Group py="xs" style={{ borderBottom: '2px solid #e9ecef' }}>
              <Text size="xs" fw={700} c="dimmed" style={{ flex: 4 }}>FACULTY</Text>
              <Text size="xs" fw={700} c="dimmed" ta="center" style={{ flex: 1 }}>DEPTS</Text>
              <Text size="xs" fw={700} c="dimmed" ta="center" style={{ flex: 1 }}>SUPERVISORS</Text>
              <Text size="xs" fw={700} c="dimmed" ta="center" style={{ flex: 1 }}>PG STUDENTS</Text>
            </Group>
            {facStats.map(f => (
              <Group key={f.id} py="sm" style={{ borderBottom: '1px solid #f1f3f5' }}>
                <Group gap="xs" style={{ flex: 4, minWidth: 0 }}>
                  <Box style={{ width: 10, height: 10, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
                  <Text size="sm" lineClamp={1}>{f.name}</Text>
                </Group>
                <Text size="sm" fw={600} ta="center" style={{ flex: 1 }}>{f.deptCount}</Text>
                <Text size="sm" fw={600} ta="center" style={{ flex: 1 }}>{f.supervisors}</Text>
                <Text size="sm" fw={600} ta="center" style={{ flex: 1 }}>{f.students}</Text>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
