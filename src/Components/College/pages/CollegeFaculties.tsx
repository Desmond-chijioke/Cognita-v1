import { useEffect, useState } from 'react';
import {
  Accordion, Avatar, Badge, Box, Center, Divider, Group,
  Loader, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import { LuBuilding2, LuUsers, LuUserCheck, LuCalendar, LuBuilding } from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import { supabase } from '../../../supabase/client';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DeptRow {
  id:           string;
  name:         string;
  hodName:      string;
  studentCount: number;
}

interface FacultyRow {
  id:           string;
  name:         string;
  deanName:     string;
  deanEmail:    string;
  departments:  DeptRow[];
  studentCount: number;
  color:        string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STUDENT_ROLES = ['PhD Student', "Master's Student", 'Undergraduate Student', 'Student', 'Researcher', 'Postgraduate Student'];
const COLORS = ['blue', 'teal', 'violet', 'orange', 'cyan', 'grape', 'green', 'indigo'];

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CollegeFaculties() {
  const user          = useAppSelector(s => s.auth.user);
  const institutionId = user?.institutionId ?? '';
  const collegeId     = user?.collegeId     ?? '';

  const [faculties, setFaculties] = useState<FacultyRow[]>([]);
  const [loading,   setLoading]   = useState(true);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!institutionId || !collegeId) { setLoading(false); return; }

    async function load() {
      setLoading(true);

      // Faculties in this college, institution-scoped
      const { data: facRows } = await supabase
        .from('faculties')
        .select('id, name, dean_id')
        .eq('institution_id', institutionId)
        .eq('college_id', collegeId)
        .order('name');

      if (!facRows?.length) { setFaculties([]); setLoading(false); return; }

      const facultyIds = facRows.map(f => f.id);
      const leaderIds  = facRows.map(f => f.dean_id).filter(Boolean) as string[];

      // Departments for all these faculties
      const { data: deptRows } = await supabase
        .from('departments')
        .select('id, name, faculty_id, hod_id')
        .eq('institution_id', institutionId)
        .in('faculty_id', facultyIds)
        .order('name');

      const allHodIds  = (deptRows ?? []).map(d => d.hod_id).filter(Boolean) as string[];
      const allLeaders = [...new Set([...leaderIds, ...allHodIds])];

      // Batch fetch all leader names
      const leaderMap: Record<string, { name: string; email: string }> = {};
      if (allLeaders.length) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', allLeaders)
          .eq('institution_id', institutionId);
        (users ?? []).forEach(u => { leaderMap[u.id] = { name: u.name, email: u.email }; });
      }

      // Students in departments of these faculties
      const deptNames = (deptRows ?? []).map(d => d.name);
      const studentCountByDept: Record<string, number> = {};
      if (deptNames.length) {
        const { data: studs } = await supabase
          .from('users')
          .select('department')
          .eq('institution_id', institutionId)
          .in('role', STUDENT_ROLES)
          .in('department', deptNames);
        (studs ?? []).forEach(s => { if (s.department) studentCountByDept[s.department] = (studentCountByDept[s.department] ?? 0) + 1; });
      }

      const deptsByFaculty: Record<string, typeof deptRows> = {};
      (deptRows ?? []).forEach(d => { (deptsByFaculty[d.faculty_id] ??= []).push(d); });

      const result: FacultyRow[] = facRows.map((f, i) => {
        const myDepts = (deptsByFaculty[f.id] ?? []).map(d => ({
          id:           d.id,
          name:         d.name,
          hodName:      d.hod_id ? (leaderMap[d.hod_id]?.name ?? '—') : '—',
          studentCount: studentCountByDept[d.name] ?? 0,
        }));
        const totalStudents = myDepts.reduce((s, d) => s + d.studentCount, 0);
        return {
          id:           f.id,
          name:         f.name,
          deanName:     f.dean_id ? (leaderMap[f.dean_id]?.name  ?? '—') : '—',
          deanEmail:    f.dean_id ? (leaderMap[f.dean_id]?.email ?? '—') : '—',
          departments:  myDepts,
          studentCount: totalStudents,
          color:        COLORS[i % COLORS.length],
        };
      });

      setFaculties(result);
      setLoading(false);
    }

    load();
  }, [institutionId, collegeId]);

  if (loading) return (
    <Box p="xl" ta="center" pt={80}><Loader size="sm" color="brand" /><Text size="sm" c="dimmed" mt="sm">Loading faculties…</Text></Box>
  );

  if (!collegeId) return (
    <Box p="xl" ta="center" pt={80}>
      <LuBuilding2 size={48} color="#ced4da" />
      <Text fw={600} mt="md">Not assigned to a college</Text>
    </Box>
  );

  return (
    <Box p="xl">
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Faculties</Title>
          <Text size="sm" c="dimmed" mt={2}>All faculties and their departments under this college.</Text>
        </Box>
        <Group gap="xs">
          <LuCalendar size={14} color="#adb5bd" />
          <Text size="sm" c="dimmed">{today}</Text>
        </Group>
      </Group>

      {/* Summary strip */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
        {[
          { icon: LuBuilding2, label: 'Total Faculties',   value: faculties.length,                                        color: 'brand'  },
          { icon: LuBuilding,  label: 'Total Departments', value: faculties.reduce((s, f) => s + f.departments.length, 0), color: 'teal'   },
          { icon: LuUsers,     label: 'Total Students',    value: faculties.reduce((s, f) => s + f.studentCount, 0),       color: 'violet' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Paper key={label} withBorder p="lg" radius="md" bg="white">
            <Group gap="sm">
              <ThemeIcon size={38} radius="md" color={color} variant="light"><Icon size={18} /></ThemeIcon>
              <Box>
                <Text fw={800} size="xl" lh={1}>{value}</Text>
                <Text size="xs" c="dimmed">{label}</Text>
              </Box>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>

      {faculties.length === 0 ? (
        <Center py={60}>
          <Stack align="center" gap="sm">
            <LuBuilding2 size={48} color="#ced4da" />
            <Text fw={600} c="dimmed">No faculties found</Text>
            <Text size="sm" c="dimmed" ta="center">No faculties have been assigned to this college yet.</Text>
          </Stack>
        </Center>
      ) : (
        <Accordion variant="separated" radius="md" chevronPosition="right">
          {faculties.map(f => (
            <Accordion.Item key={f.id} value={f.id} style={{ background: 'white', border: '1px solid #e9ecef' }}>
              <Accordion.Control>
                <Group gap="sm" wrap="nowrap">
                  <Avatar color={f.color} radius="xl" size="md">{getInitials(f.name)}</Avatar>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={700} lineClamp={1}>{f.name}</Text>
                    <Group gap="xs" mt={2}>
                      <Text size="xs" c="dimmed">Dean: {f.deanName}</Text>
                      <Text size="xs" c="dimmed">·</Text>
                      <Badge size="xs" variant="light" color={f.color}>{f.departments.length} dept{f.departments.length !== 1 ? 's' : ''}</Badge>
                      <Badge size="xs" variant="light" color="gray">{f.studentCount} students</Badge>
                    </Group>
                  </Box>
                </Group>
              </Accordion.Control>

              <Accordion.Panel>
                <Divider mb="md" />
                {/* Dean info */}
                <Paper p="md" radius="md" mb="md" style={{ background: '#f8f9fa' }}>
                  <Group gap="sm">
                    <ThemeIcon size={34} radius="md" color={f.color} variant="light"><LuUserCheck size={16} /></ThemeIcon>
                    <Box>
                      <Text size="sm" fw={600}>{f.deanName}</Text>
                      <Text size="xs" c="dimmed">{f.deanEmail} · Dean of Faculty</Text>
                    </Box>
                  </Group>
                </Paper>

                {/* Department list */}
                {f.departments.length === 0 ? (
                  <Text size="sm" c="dimmed" ta="center" py="sm">No departments in this faculty yet.</Text>
                ) : (
                  <Stack gap="xs">
                    {f.departments.map(d => (
                      <Group key={d.id} justify="space-between" p="sm" wrap="nowrap"
                        style={{ borderRadius: 8, border: '1px solid #f1f3f5', background: 'white' }}>
                        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                          <ThemeIcon size={28} radius="md" color="gray" variant="light"><LuBuilding size={13} /></ThemeIcon>
                          <Box style={{ minWidth: 0 }}>
                            <Text size="sm" fw={500} lineClamp={1}>{d.name}</Text>
                            <Text size="xs" c="dimmed">HOD: {d.hodName}</Text>
                          </Box>
                        </Group>
                        <Badge variant="light" color="teal" size="sm">{d.studentCount} students</Badge>
                      </Group>
                    ))}
                  </Stack>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Box>
  );
}
