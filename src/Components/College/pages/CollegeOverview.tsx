import { useEffect, useState } from 'react';
import {
  Avatar, Badge, Box, Center, Divider, Group, Loader, Paper,
  Progress, RingProgress, SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuBuilding2, LuUsers, LuUserCheck, LuCalendar,
  LuActivity, LuTrendingUp, LuBookOpen, LuTriangleAlert,
} from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import { supabase } from '../../../supabase/client';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FacultySummary {
  id:           string;
  name:         string;
  deanName:     string;
  deptCount:    number;
  studentCount: number;
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
const COLORS = ['blue', 'teal', 'violet', 'orange', 'cyan', 'grape', 'green', 'indigo', 'red', 'pink'];

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function nameToColor(name: string, palette = COLORS) {
  let h = 0;
  for (const c of name) h = (h << 5) - h + c.charCodeAt(0);
  return palette[Math.abs(h) % palette.length];
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

export default function CollegeOverview() {
  const user          = useAppSelector(s => s.auth.user);
  const institutionId = user?.institutionId ?? '';
  const collegeId     = user?.collegeId     ?? '';
  const collegeName   = user?.departmentName ?? 'College';

  const [faculties,       setFaculties]       = useState<FacultySummary[]>([]);
  const [totalStudents,   setTotalStudents]   = useState(0);
  const [totalSupervisors, setTotalSupervisors] = useState(0);
  const [recentStudents,  setRecentStudents]  = useState<RecentStudent[]>([]);
  const [degreeBreakdown, setDegreeBreakdown] = useState({ phd: 0, masters: 0, ug: 0, pg: 0 });
  const [loading,         setLoading]         = useState(true);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!institutionId || !collegeId) { setLoading(false); return; }

    async function load() {
      setLoading(true);

      // 1. Faculties in this college (institution-scoped)
      const { data: facRows } = await supabase
        .from('faculties')
        .select('id, name, dean_id')
        .eq('institution_id', institutionId)
        .eq('college_id', collegeId)
        .order('name');

      const facultyIds   = (facRows ?? []).map(f => f.id);
      const deanIds      = (facRows ?? []).map(f => f.dean_id).filter(Boolean) as string[];

      // 2. Departments grouped by faculty
      const { data: deptRows } = facultyIds.length
        ? await supabase.from('departments').select('id, name, faculty_id').eq('institution_id', institutionId).in('faculty_id', facultyIds)
        : { data: [] };

      const deptNames = (deptRows ?? []).map(d => d.name);

      // 3. Students in those departments
      const { data: studentRows } = deptNames.length
        ? await supabase.from('users').select('id, name, role, department, created_at').eq('institution_id', institutionId).in('role', STUDENT_ROLES).in('department', deptNames).order('created_at', { ascending: false })
        : { data: [] };

      // 4. Supervisors in those departments
      const { data: supRows } = deptNames.length
        ? await supabase.from('users').select('id').eq('institution_id', institutionId).in('role', ['Supervisor', 'Senior Supervisor', 'Co-Supervisor', 'Assistant Supervisor']).in('department', deptNames)
        : { data: [] };

      // 5. Dean names
      const deanMap: Record<string, string> = {};
      if (deanIds.length) {
        const { data: deans } = await supabase.from('users').select('id, name').in('id', deanIds).eq('institution_id', institutionId);
        (deans ?? []).forEach(d => { deanMap[d.id] = d.name; });
      }

      const deptCountByFaculty: Record<string, number> = {};
      (deptRows ?? []).forEach(d => { deptCountByFaculty[d.faculty_id] = (deptCountByFaculty[d.faculty_id] ?? 0) + 1; });

      const studentCountByDept: Record<string, number> = {};
      (studentRows ?? []).forEach(s => { if (s.department) studentCountByDept[s.department] = (studentCountByDept[s.department] ?? 0) + 1; });

      const deptsByFaculty: Record<string, string[]> = {};
      (deptRows ?? []).forEach(d => { (deptsByFaculty[d.faculty_id] ??= []).push(d.name); });

      const facs: FacultySummary[] = (facRows ?? []).map((f, i) => {
        const myDepts = deptsByFaculty[f.id] ?? [];
        const sc = myDepts.reduce((sum, dn) => sum + (studentCountByDept[dn] ?? 0), 0);
        return {
          id:           f.id,
          name:         f.name,
          deanName:     f.dean_id ? (deanMap[f.dean_id] ?? '—') : '—',
          deptCount:    deptCountByFaculty[f.id] ?? 0,
          studentCount: sc,
          color:        COLORS[i % COLORS.length],
        };
      });

      const allStudents = (studentRows ?? []) as { id: string; name: string; role: string; department: string; created_at: string }[];

      setFaculties(facs);
      setTotalStudents(allStudents.length);
      setTotalSupervisors((supRows ?? []).length);
      setDegreeBreakdown({
        phd:     allStudents.filter(s => s.role === 'PhD Student').length,
        masters: allStudents.filter(s => s.role === "Master's Student").length,
        ug:      allStudents.filter(s => s.role === 'Undergraduate Student').length,
        pg:      allStudents.filter(s => s.role === 'Postgraduate Student').length,
      });
      setRecentStudents(allStudents.slice(0, 6).map(s => ({
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
  }, [institutionId, collegeId]);

  if (loading) return (
    <Box p="xl" ta="center" pt={80}><Loader size="sm" color="brand" /><Text size="sm" c="dimmed" mt="sm">Loading college overview…</Text></Box>
  );

  if (!collegeId) return (
    <Box p="xl" ta="center" pt={80}>
      <LuBuilding2 size={48} color="#ced4da" />
      <Text fw={600} mt="md">Not assigned to a college</Text>
      <Text size="sm" c="dimmed" mt={4}>Ask your institution admin to assign you as Provost of a college.</Text>
    </Box>
  );

  const maxStudents = Math.max(...faculties.map(f => f.studentCount), 1);
  const assignedPct = totalStudents > 0 ? Math.round(((degreeBreakdown.phd + degreeBreakdown.masters) / totalStudents) * 100) : 0;

  return (
    <Box p="xl">
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>{collegeName}</Title>
          <Text size="sm" c="dimmed" mt={2}>College-wide oversight — faculties, departments and student activity.</Text>
        </Box>
        <Group gap="xs" align="center">
          <LuCalendar size={14} color="#adb5bd" />
          <Text size="sm" c="dimmed">{today}</Text>
        </Group>
      </Group>

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        <StatCard icon={LuBuilding2}  label="Faculties"    value={faculties.length}   color="brand"  sub="Under this college" />
        <StatCard icon={LuActivity}   label="Departments"  value={faculties.reduce((s, f) => s + f.deptCount, 0)} color="teal" sub="Across all faculties" />
        <StatCard icon={LuUsers}      label="Students"     value={totalStudents}      color="violet" sub={[degreeBreakdown.phd && `${degreeBreakdown.phd} PhD`, degreeBreakdown.masters && `${degreeBreakdown.masters} MSc`, degreeBreakdown.ug && `${degreeBreakdown.ug} UG`, degreeBreakdown.pg && `${degreeBreakdown.pg} PG`].filter(Boolean).join(' · ') || 'None yet'} />
        <StatCard icon={LuUserCheck}  label="Supervisors"  value={totalSupervisors}   color="green"  sub="Active across depts" />
      </SimpleGrid>

      {/* Faculty breakdown + degree ring */}
      <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">

        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuBuilding2 size={16} color="#4c6ef5" />
            <Text fw={600}>Faculty Breakdown</Text>
          </Group>
          <Divider mb="md" />
          {faculties.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">No faculties under this college yet.</Text>
          ) : (
            <Stack gap="md">
              {faculties.map(f => (
                <Box key={f.id}>
                  <Group justify="space-between" mb={6} wrap="nowrap">
                    <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                      <Avatar color={f.color} radius="xl" size="sm">{getInitials(f.name)}</Avatar>
                      <Box style={{ minWidth: 0 }}>
                        <Text size="sm" fw={600} lineClamp={1}>{f.name}</Text>
                        <Text size="xs" c="dimmed">Dean: {f.deanName} · {f.deptCount} dept{f.deptCount !== 1 ? 's' : ''}</Text>
                      </Box>
                    </Group>
                    <Text size="sm" fw={700} style={{ flexShrink: 0 }}>{f.studentCount}</Text>
                  </Group>
                  <Progress value={maxStudents > 0 ? (f.studentCount / maxStudents) * 100 : 0} color={f.color} size="xs" radius="xl" />
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuBookOpen size={16} color="#4c6ef5" />
            <Text fw={600}>Student Levels</Text>
          </Group>
          <Divider mb="md" />
          <Group justify="center" align="center" gap="xl" mt="sm">
            <RingProgress
              size={160} thickness={26} roundCaps
              sections={totalStudents === 0
                ? [{ value: 100, color: '#dee2e6' }]
                : [
                    { value: (degreeBreakdown.phd     / totalStudents) * 100, color: '#4c6ef5', tooltip: `PhD: ${degreeBreakdown.phd}`            },
                    { value: (degreeBreakdown.masters  / totalStudents) * 100, color: '#7950f2', tooltip: `Master's: ${degreeBreakdown.masters}`    },
                    { value: (degreeBreakdown.pg       / totalStudents) * 100, color: '#ae3ec9', tooltip: `Postgraduate: ${degreeBreakdown.pg}`     },
                    { value: (degreeBreakdown.ug       / totalStudents) * 100, color: '#0c8599', tooltip: `Undergraduate: ${degreeBreakdown.ug}`    },
                  ]}
              label={<Box ta="center"><Text fw={800} size="lg" lh={1}>{totalStudents}</Text><Text size="xs" c="dimmed">total</Text></Box>}
            />
            <Stack gap="sm">
              {[
                { label: 'PhD',           count: degreeBreakdown.phd,     color: '#4c6ef5' },
                { label: "Master's",      count: degreeBreakdown.masters,  color: '#7950f2' },
                { label: 'Postgraduate',  count: degreeBreakdown.pg,       color: '#ae3ec9' },
                { label: 'Undergraduate', count: degreeBreakdown.ug,       color: '#0c8599' },
              ].map(({ label, count, color }) => (
                <Group key={label} gap="xs" wrap="nowrap">
                  <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <Text size="sm" c="dimmed" style={{ minWidth: 90 }}>{label}</Text>
                  <Text size="sm" fw={700}>{count}</Text>
                </Group>
              ))}
            </Stack>
          </Group>
          {totalStudents > 0 && (
            <Text size="xs" c="dimmed" ta="center" mt="md">{assignedPct}% are postgrad or PhD level</Text>
          )}
        </Paper>

      </SimpleGrid>

      {/* Recent students */}
      <Paper withBorder p="lg" radius="md" bg="white">
        <Group gap="xs" mb="md">
          <LuUsers size={16} color="#4c6ef5" />
          <Text fw={600}>Recently Added Students</Text>
        </Group>
        <Divider mb="md" />
        {recentStudents.length === 0 ? (
          <Center py="lg"><Text size="sm" c="dimmed">No students in this college yet.</Text></Center>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {recentStudents.map(s => (
              <Group key={s.id} gap="sm" wrap="nowrap" p="xs" style={{ borderRadius: 8, border: '1px solid #f1f3f5' }}>
                <Avatar color={s.color} radius="xl" size="sm">{getInitials(s.name)}</Avatar>
                <Box style={{ minWidth: 0 }}>
                  <Text size="sm" fw={600} lineClamp={1}>{s.name}</Text>
                  <Group gap={4}>
                    <Badge size="xs" variant="light" color={s.role === 'PhD Student' ? 'blue' : s.role === "Master's Student" ? 'violet' : 'teal'}>
                      {s.role.replace(' Student', '')}
                    </Badge>
                    <Text size="xs" c="dimmed" lineClamp={1}>{s.department}</Text>
                  </Group>
                </Box>
              </Group>
            ))}
          </SimpleGrid>
        )}
      </Paper>

      {/* Unassigned faculties alert */}
      {faculties.some(f => f.deanName === '—') && (
        <Paper withBorder p="lg" radius="md" mt="xl" style={{ borderColor: '#ffa94d', background: '#fff9f0' }}>
          <Group gap="sm">
            <LuTriangleAlert size={18} color="#f08c00" />
            <Text fw={600} c="orange.8">
              {faculties.filter(f => f.deanName === '—').length} facult{faculties.filter(f => f.deanName === '—').length > 1 ? 'ies have' : 'y has'} no Dean assigned
            </Text>
          </Group>
        </Paper>
      )}
    </Box>
  );
}
