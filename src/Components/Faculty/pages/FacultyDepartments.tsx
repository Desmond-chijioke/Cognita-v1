import { useEffect, useState } from 'react';
import {
  Avatar, Badge, Box, Center, Divider, Group, Loader,
  Paper, Stack, Tabs, Text, ThemeIcon, Title,SimpleGrid
} from '@mantine/core';
import { LuBuilding, LuUsers, LuUserCheck, LuCalendar, LuGraduationCap } from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import { supabase } from '../../../supabase/client';


// ── Types ──────────────────────────────────────────────────────────────────────

interface StudentRow {
  id:           string;
  name:         string;
  role:         string;
  degreeLevel:  string;
  supervisorId: string | null;
  addedOn:      string;
  color:        string;
}

interface SupervisorRow {
  id:       string;
  name:     string;
  role:     string;
  email:    string;
  students: number;
  color:    string;
}

interface DeptDetail {
  id:          string;
  name:        string;
  hodName:     string;
  hodEmail:    string;
  students:    StudentRow[];
  supervisors: SupervisorRow[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STUDENT_ROLES = ['PhD Student', "Master's Student", 'Undergraduate Student', 'Student', 'Researcher', 'Postgraduate Student'];
const SUP_ROLES     = ['Supervisor', 'Senior Supervisor', 'Co-Supervisor', 'Assistant Supervisor'];
const COLORS        = ['blue', 'teal', 'violet', 'orange', 'cyan', 'grape', 'green', 'indigo'];

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function nameToColor(name: string) {
  let h = 0;
  for (const c of name) h = (h << 5) - h + c.charCodeAt(0);
  return COLORS[Math.abs(h) % COLORS.length];
}

function roleBadgeColor(role: string) {
  if (role === 'PhD Student')           return 'blue';
  if (role === "Master's Student")      return 'violet';
  if (role === 'Postgraduate Student')  return 'grape';
  if (role === 'Undergraduate Student') return 'teal';
  return 'gray';
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function FacultyDepartments() {
  const user          = useAppSelector(s => s.auth.user);
  const institutionId = user?.institutionId ?? '';
  const facultyId     = user?.facultyId     ?? '';

  const [departments, setDepartments] = useState<DeptDetail[]>([]);
  const [activeTab,   setActiveTab]   = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!institutionId || !facultyId) { setLoading(false); return; }

    async function load() {
      setLoading(true);

      const { data: deptRows } = await supabase
        .from('departments')
        .select('id, name, hod_id')
        .eq('institution_id', institutionId)
        .eq('faculty_id', facultyId)
        .order('name');

      if (!deptRows?.length) { setDepartments([]); setLoading(false); return; }

      const deptNames = deptRows.map(d => d.name);
      const hodIds    = deptRows.map(d => d.hod_id).filter(Boolean) as string[];

      const hodMap: Record<string, { name: string; email: string }> = {};
      if (hodIds.length) {
        const { data: hods } = await supabase.from('users').select('id, name, email').in('id', hodIds).eq('institution_id', institutionId);
        (hods ?? []).forEach(h => { hodMap[h.id] = { name: h.name, email: h.email }; });
      }

      // Fetch all students and supervisors for these departments in two queries
      const [{ data: studentRows }, { data: supRows }] = await Promise.all([
        supabase.from('users')
          .select('id, name, role, degree_level, department, supervisor_id, created_at')
          .eq('institution_id', institutionId)
          .in('role', STUDENT_ROLES)
          .in('department', deptNames)
          .order('created_at', { ascending: false }),
        supabase.from('users')
          .select('id, name, role, email, department')
          .eq('institution_id', institutionId)
          .in('role', SUP_ROLES)
          .in('department', deptNames),
      ]);

      const studs = (studentRows ?? []) as { id: string; name: string; role: string; degree_level: string | null; department: string; supervisor_id: string | null; created_at: string }[];
      const sups  = (supRows     ?? []) as { id: string; name: string; role: string; email: string; department: string }[];

      const studentsByDept:    Record<string, typeof studs> = {};
      const supsByDept:        Record<string, typeof sups>  = {};
      const studsBySupAndDept: Record<string, number>       = {};

      studs.forEach(s => { (studentsByDept[s.department] ??= []).push(s); });
      sups.forEach(s => {
        (supsByDept[s.department] ??= []).push(s);
        studs.filter(st => st.supervisor_id === s.id).forEach(() => {
          studsBySupAndDept[s.id] = (studsBySupAndDept[s.id] ?? 0) + 1;
        });
      });

      const result: DeptDetail[] = deptRows.map(d => ({
        id:       d.id,
        name:     d.name,
        hodName:  d.hod_id ? (hodMap[d.hod_id]?.name  ?? '—') : '—',
        hodEmail: d.hod_id ? (hodMap[d.hod_id]?.email ?? '—') : '—',
        students: (studentsByDept[d.name] ?? []).map(s => ({
          id:           s.id,
          name:         s.name,
          role:         s.role,
          degreeLevel:  s.degree_level ?? s.role,
          supervisorId: s.supervisor_id,
          addedOn:      new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          color:        nameToColor(s.name),
        })),
        supervisors: (supsByDept[d.name] ?? []).map((s, i) => ({
          id:       s.id,
          name:     s.name,
          role:     s.role,
          email:    s.email,
          students: studsBySupAndDept[s.id] ?? 0,
          color:    COLORS[i % COLORS.length],
        })),
      }));

      setDepartments(result);
      setActiveTab(result[0]?.id ?? null);
      setLoading(false);
    }

    load();
  }, [institutionId, facultyId]);

  if (loading) return (
    <Box p="xl" ta="center" pt={80}><Loader size="sm" color="brand" /><Text size="sm" c="dimmed" mt="sm">Loading departments…</Text></Box>
  );

  if (!facultyId) return (
    <Box p="xl" ta="center" pt={80}>
      <LuBuilding size={48} color="#ced4da" />
      <Text fw={600} mt="md">Not assigned to a faculty</Text>
    </Box>
  );

  const active = departments.find(d => d.id === activeTab);

  return (
    <Box p="xl">
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Departments</Title>
          <Text size="sm" c="dimmed" mt={2}>Browse each department's students and supervisors.</Text>
        </Box>
        <Group gap="xs">
          <LuCalendar size={14} color="#adb5bd" />
          <Text size="sm" c="dimmed">{today}</Text>
        </Group>
      </Group>

      {departments.length === 0 ? (
        <Center py={60}>
          <Stack align="center" gap="sm">
            <LuBuilding size={48} color="#ced4da" />
            <Text fw={600} c="dimmed">No departments found</Text>
            <Text size="sm" c="dimmed" ta="center">No departments have been assigned to this faculty yet.</Text>
          </Stack>
        </Center>
      ) : (
        <Tabs value={activeTab} onChange={setActiveTab} variant="outline">
          {/* Dynamic tabs — one per department */}
          <Tabs.List mb="lg" style={{ flexWrap: 'wrap', gap: 4 }}>
            {departments.map(d => (
              <Tabs.Tab key={d.id} value={d.id} leftSection={<LuBuilding size={13} />}>
                {d.name}
                <Badge size="xs" ml={6} variant="light" color="gray">{d.students.length}</Badge>
              </Tabs.Tab>
            ))}
          </Tabs.List>

          {departments.map(d => (
            <Tabs.Panel key={d.id} value={d.id}>
              {active && (
                <Stack gap="lg">
                  {/* HOD Card */}
                  <Paper withBorder p="md" radius="md" bg="white">
                    <Group gap="sm">
                      <ThemeIcon size={38} radius="md" color="brand" variant="light"><LuUserCheck size={17} /></ThemeIcon>
                      <Box>
                        <Text size="sm" fw={700}>{d.hodName}</Text>
                        <Text size="xs" c="dimmed">{d.hodEmail} · Head of Department</Text>
                      </Box>
                      <Box ml="auto">
                        <Badge variant="light" color="brand">{d.students.length} student{d.students.length !== 1 ? 's' : ''}</Badge>
                      </Box>
                    </Group>
                  </Paper>

                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    {/* Supervisors */}
                    <Paper withBorder p="lg" radius="md" bg="white">
                      <Group gap="xs" mb="md">
                        <LuUserCheck size={16} color="#4c6ef5" />
                        <Text fw={600}>Supervisors ({d.supervisors.length})</Text>
                      </Group>
                      <Divider mb="md" />
                      {d.supervisors.length === 0 ? (
                        <Text size="sm" c="dimmed" ta="center" py="sm">No supervisors in this department.</Text>
                      ) : (
                        <Stack gap="xs">
                          {d.supervisors.map(s => (
                            <Group key={s.id} justify="space-between" wrap="nowrap">
                              <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                                <Avatar color={s.color} radius="xl" size="sm">{getInitials(s.name)}</Avatar>
                                <Box style={{ minWidth: 0 }}>
                                  <Text size="sm" fw={500} lineClamp={1}>{s.name}</Text>
                                  <Text size="xs" c="dimmed">{s.role}</Text>
                                </Box>
                              </Group>
                              <Badge variant="light" color="teal" size="sm">{s.students} student{s.students !== 1 ? 's' : ''}</Badge>
                            </Group>
                          ))}
                        </Stack>
                      )}
                    </Paper>

                    {/* Students */}
                    <Paper withBorder p="lg" radius="md" bg="white">
                      <Group gap="xs" mb="md">
                        <LuGraduationCap size={16} color="#4c6ef5" />
                        <Text fw={600}>Students ({d.students.length})</Text>
                      </Group>
                      <Divider mb="md" />
                      {d.students.length === 0 ? (
                        <Text size="sm" c="dimmed" ta="center" py="sm">No students in this department yet.</Text>
                      ) : (
                        <Stack gap={0} style={{ maxHeight: 320, overflowY: 'auto' }}>
                          {d.students.map(s => (
                            <Group key={s.id} justify="space-between" py="xs" wrap="nowrap"
                              style={{ borderBottom: '1px solid #f1f3f5' }}>
                              <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                                <Avatar color={s.color} radius="xl" size="sm">{getInitials(s.name)}</Avatar>
                                <Box style={{ minWidth: 0 }}>
                                  <Text size="sm" fw={500} lineClamp={1}>{s.name}</Text>
                                  <Text size="xs" c="dimmed">{s.addedOn}</Text>
                                </Box>
                              </Group>
                              <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
                                <Badge size="xs" variant="light" color={roleBadgeColor(s.role)}>
                                  {s.role.replace(' Student', '')}
                                </Badge>
                                {!s.supervisorId && <Badge size="xs" variant="light" color="orange">Unassigned</Badge>}
                              </Stack>
                            </Group>
                          ))}
                        </Stack>
                      )}
                    </Paper>
                  </SimpleGrid>
                </Stack>
              )}
            </Tabs.Panel>
          ))}
        </Tabs>
      )}
    </Box>
  );
}
