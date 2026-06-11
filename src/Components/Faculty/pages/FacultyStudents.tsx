import { useEffect, useState } from 'react';
import {
  Avatar, Badge, Box, Center, Group, Input, Loader,
  Paper, Stack, Tabs, Text, Title,
} from '@mantine/core';
import { LuUsers, LuBuilding, LuSearch, LuCalendar } from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import { supabase } from '../../../supabase/client';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StudentRow {
  id:          string;
  name:        string;
  role:        string;
  department:  string;
  supAssigned: boolean;
  addedOn:     string;
  color:       string;
}

interface DeptTab {
  name: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STUDENT_ROLES = ['PhD Student', "Master's Student", 'Undergraduate Student', 'Student', 'Researcher', 'Postgraduate Student'];
const COLORS = ['blue', 'teal', 'violet', 'orange', 'cyan', 'grape', 'green', 'indigo'];

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

function StudentList({ students }: { students: StudentRow[] }) {
  const [q, setQ] = useState('');
  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(q.toLowerCase()) ||
    s.department.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Stack gap="sm">
      <Input
        placeholder="Search students…"
        leftSection={<LuSearch size={14} />}
        value={q}
        onChange={e => setQ(e.currentTarget.value)}
        size="sm"
        style={{ maxWidth: 300 }}
      />
      {filtered.length === 0 ? (
        <Center py="xl"><Text size="sm" c="dimmed">No students found.</Text></Center>
      ) : (
        <Stack gap={0}>
          {filtered.map(s => (
            <Group key={s.id} justify="space-between" py="sm" wrap="nowrap"
              style={{ borderBottom: '1px solid #f1f3f5' }}>
              <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                <Avatar color={s.color} radius="xl" size="sm">{getInitials(s.name)}</Avatar>
                <Box style={{ minWidth: 0 }}>
                  <Text size="sm" fw={600} lineClamp={1}>{s.name}</Text>
                  <Text size="xs" c="dimmed">{s.department}</Text>
                </Box>
              </Group>
              <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
                <Badge size="xs" variant="light" color={roleBadgeColor(s.role)}>
                  {s.role.replace(' Student', '')}
                </Badge>
                <Badge size="xs" variant="light" color={s.supAssigned ? 'green' : 'orange'}>
                  {s.supAssigned ? 'Assigned' : 'Unassigned'}
                </Badge>
              </Stack>
            </Group>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function FacultyStudents() {
  const user          = useAppSelector(s => s.auth.user);
  const institutionId = user?.institutionId ?? '';
  const facultyId     = user?.facultyId     ?? '';

  const [deptTabs,  setDeptTabs]  = useState<DeptTab[]>([]);
  const [students,  setStudents]  = useState<StudentRow[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [loading,   setLoading]   = useState(true);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

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

      const deptNames = (deptRows ?? []).map(d => d.name);
      if (!deptNames.length) { setLoading(false); return; }

      const { data: studentRows } = await supabase
        .from('users')
        .select('id, name, role, department, supervisor_id, created_at')
        .eq('institution_id', institutionId)
        .in('role', STUDENT_ROLES)
        .in('department', deptNames)
        .order('name');

      setDeptTabs(deptNames.map(n => ({ name: n })));
      setStudents((studentRows ?? []).map(s => ({
        id:          s.id,
        name:        s.name,
        role:        s.role,
        department:  s.department ?? '—',
        supAssigned: !!s.supervisor_id,
        addedOn:     new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        color:       nameToColor(s.name),
      })));
      setLoading(false);
    }

    load();
  }, [institutionId, facultyId]);

  if (loading) return (
    <Box p="xl" ta="center" pt={80}><Loader size="sm" color="brand" /><Text size="sm" c="dimmed" mt="sm">Loading students…</Text></Box>
  );

  if (!facultyId) return (
    <Box p="xl" ta="center" pt={80}>
      <LuBuilding size={48} color="#ced4da" />
      <Text fw={600} mt="md">Not assigned to a faculty</Text>
    </Box>
  );

  const visibleStudents = activeTab === 'all'
    ? students
    : students.filter(s => s.department === activeTab);

  return (
    <Box p="xl">
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Students</Title>
          <Text size="sm" c="dimmed" mt={2}>All students across departments in this faculty.</Text>
        </Box>
        <Group gap="xs">
          <LuCalendar size={14} color="#adb5bd" />
          <Text size="sm" c="dimmed">{today}</Text>
        </Group>
      </Group>

      <Paper withBorder radius="md" bg="white" p="lg">
        <Tabs value={activeTab} onChange={v => setActiveTab(v ?? 'all')} variant="pills">
          <Tabs.List mb="lg" style={{ flexWrap: 'wrap', gap: 4 }}>
            <Tabs.Tab value="all" leftSection={<LuUsers size={13} />}>
              All <Badge size="xs" ml={6} variant="light" color="brand">{students.length}</Badge>
            </Tabs.Tab>
            {deptTabs.map(t => (
              <Tabs.Tab key={t.name} value={t.name} leftSection={<LuBuilding size={13} />}>
                {t.name}
                <Badge size="xs" ml={6} variant="light" color="gray">
                  {students.filter(s => s.department === t.name).length}
                </Badge>
              </Tabs.Tab>
            ))}
          </Tabs.List>

          <StudentList students={visibleStudents} />
        </Tabs>
      </Paper>
    </Box>
  );
}
