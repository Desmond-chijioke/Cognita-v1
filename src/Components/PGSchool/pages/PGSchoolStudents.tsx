import { useEffect, useMemo, useState } from 'react';
import {
  Avatar, Badge, Box, Center, Divider, Group, Loader, Paper,
  ScrollArea, Stack, Tabs, Text, TextInput, Title,
} from '@mantine/core';
import { LuSearch, LuUsers, LuCalendar, LuBuilding } from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import { supabase } from '../../../supabase/client';

// ── Constants ─────────────────────────────────────────────────────────────────

const PG_ROLES = ['PhD Student', "Master's Student", 'Postgraduate Student', 'Researcher'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['blue', 'teal', 'violet', 'orange', 'cyan', 'grape', 'green', 'indigo'];
function nameToColor(name: string) {
  let h = 0;
  for (const c of name) h = (h << 5) - h + c.charCodeAt(0);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function roleBadgeColor(role: string) {
  if (role === 'PhD Student')           return 'blue';
  if (role === "Master's Student")      return 'violet';
  if (role === 'Postgraduate Student')  return 'grape';
  if (role === 'Researcher')            return 'green';
  return 'gray';
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudentRow {
  id:             string;
  name:           string;
  role:           string;
  department:     string;
  facultyId:      string;
  facultyName:    string;
  supervisorName: string | null;
  addedOn:        string;
  color:          string;
}

// ── Sub-component: student table ──────────────────────────────────────────────

function StudentTable({ rows }: { rows: StudentRow[] }) {
  if (rows.length === 0) return (
    <Center py={60}>
      <Stack align="center" gap="sm">
        <LuUsers size={48} color="#ced4da" />
        <Text fw={600} c="dimmed">No students found</Text>
      </Stack>
    </Center>
  );

  return (
    <ScrollArea type="auto">
      <Stack gap={0} style={{ minWidth: 720 }}>
        {/* Header */}
        <Group py="sm" px="xs" wrap="nowrap" style={{ borderBottom: '2px solid #e9ecef' }}>
          <Text size="xs" fw={700} c="dimmed" style={{ flex: 3, minWidth: 160 }}>STUDENT</Text>
          <Text size="xs" fw={700} c="dimmed" style={{ flex: 2, minWidth: 100 }}>DEGREE LEVEL</Text>
          <Text size="xs" fw={700} c="dimmed" style={{ flex: 2, minWidth: 120 }}>DEPARTMENT</Text>
          <Text size="xs" fw={700} c="dimmed" style={{ flex: 2, minWidth: 120 }}>FACULTY</Text>
          <Text size="xs" fw={700} c="dimmed" style={{ flex: 2, minWidth: 120 }}>SUPERVISOR</Text>
          <Text size="xs" fw={700} c="dimmed" style={{ flex: 1, minWidth: 80 }}>ADDED ON</Text>
        </Group>
        {rows.map(s => (
          <Group key={s.id} py="sm" px="xs" wrap="nowrap"
            style={{ borderBottom: '1px solid #f1f3f5' }}>
            <Group gap="xs" wrap="nowrap" style={{ flex: 3, minWidth: 160 }}>
              <Avatar color={s.color} radius="xl" size="sm">{getInitials(s.name)}</Avatar>
              <Text size="sm" fw={500} lineClamp={1}>{s.name}</Text>
            </Group>
            <Box style={{ flex: 2, minWidth: 100 }}>
              <Badge size="sm" variant="light" color={roleBadgeColor(s.role)}>
                {s.role.replace(' Student', '')}
              </Badge>
            </Box>
            <Text size="sm" c="dimmed" lineClamp={1} style={{ flex: 2, minWidth: 120 }}>
              {s.department}
            </Text>
            <Text size="sm" c="dimmed" lineClamp={1} style={{ flex: 2, minWidth: 120 }}>
              {s.facultyName}
            </Text>
            <Box style={{ flex: 2, minWidth: 120 }}>
              {s.supervisorName
                ? <Text size="sm" lineClamp={1}>{s.supervisorName}</Text>
                : <Badge size="sm" variant="light" color="orange">Unassigned</Badge>}
            </Box>
            <Text size="xs" c="dimmed" style={{ flex: 1, minWidth: 80, whiteSpace: 'nowrap' }}>
              {s.addedOn}
            </Text>
          </Group>
        ))}
      </Stack>
    </ScrollArea>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PGSchoolStudents() {
  const user          = useAppSelector(s => s.auth.user);
  const institutionId = user?.institutionId ?? '';

  const [students,       setStudents]       = useState<StudentRow[]>([]);
  const [faculties,      setFaculties]      = useState<{ id: string; name: string }[]>([]);
  const [deptsByFaculty, setDeptsByFaculty] = useState<Record<string, string[]>>({});

  // Two-level tab state: faculty (outer) + department (inner)
  const [activeFaculty, setActiveFaculty] = useState<string>('all');
  const [activeDept,    setActiveDept]    = useState<string>('all');
  const [search,        setSearch]        = useState('');
  const [loading,       setLoading]       = useState(true);

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Reset department tab whenever faculty changes
  const handleFacultyChange = (val: string | null) => {
    setActiveFaculty(val ?? 'all');
    setActiveDept('all');
  };

  useEffect(() => {
    if (!institutionId) { setLoading(false); return; }

    async function load() {
      setLoading(true);

      const [{ data: studentRows }, { data: deptRows }, { data: facRows }] = await Promise.all([
        supabase.from('users')
          .select('id, name, role, department, supervisor_id, created_at')
          .eq('institution_id', institutionId)
          .in('role', PG_ROLES)
          .order('created_at', { ascending: false }),
        supabase.from('departments')
          .select('name, faculty_id')
          .eq('institution_id', institutionId),
        supabase.from('faculties')
          .select('id, name')
          .eq('institution_id', institutionId)
          .order('name'),
      ]);

      const studs = (studentRows ?? []) as {
        id: string; name: string; role: string; department: string;
        supervisor_id: string | null; created_at: string;
      }[];

      const deptFacId:   Record<string, string> = {};
      const facNameById: Record<string, string> = {};
      (deptRows ?? []).forEach(d => { deptFacId[d.name] = d.faculty_id; });
      (facRows  ?? []).forEach(f => { facNameById[f.id] = f.name; });

      // Batch-fetch supervisor names
      const supIds = [...new Set(studs.map(s => s.supervisor_id).filter(Boolean) as string[])];
      const supNameById: Record<string, string> = {};
      if (supIds.length) {
        const { data: supRows } = await supabase
          .from('users').select('id, name').in('id', supIds);
        (supRows ?? []).forEach(s => { supNameById[s.id] = s.name; });
      }

      const rows: StudentRow[] = studs.map(s => {
        const facId   = deptFacId[s.department] ?? '';
        const facName = facId ? (facNameById[facId] ?? '—') : '—';
        return {
          id:             s.id,
          name:           s.name,
          role:           s.role,
          department:     s.department || '—',
          facultyId:      facId,
          facultyName:    facName,
          supervisorName: s.supervisor_id ? (supNameById[s.supervisor_id] ?? null) : null,
          addedOn:        new Date(s.created_at).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
          }),
          color: nameToColor(s.name),
        };
      });

      // Faculties that have at least one PG student
      const activeFacIds = new Set(rows.map(r => r.facultyId).filter(Boolean));
      const filteredFacs = (facRows ?? []).filter(f => activeFacIds.has(f.id));

      // Departments per faculty that have at least one PG student
      const deptsByFac: Record<string, Set<string>> = {};
      rows.forEach(s => {
        if (s.facultyId && s.department !== '—') {
          (deptsByFac[s.facultyId] ??= new Set()).add(s.department);
        }
      });
      const deptMap: Record<string, string[]> = {};
      Object.entries(deptsByFac).forEach(([facId, depts]) => {
        deptMap[facId] = [...depts].sort();
      });

      setStudents(rows);
      setFaculties(filteredFacs);
      setDeptsByFaculty(deptMap);
      setLoading(false);
    }

    load();
  }, [institutionId]);

  // Departments visible under the currently-selected faculty tab
  const currentDepts = useMemo(
    () => (activeFaculty !== 'all' ? (deptsByFaculty[activeFaculty] ?? []) : []),
    [activeFaculty, deptsByFaculty],
  );

  // Filtered student list — honours both active tabs + search
  const filtered = useMemo(() => {
    let list = students;

    if (activeFaculty !== 'all') {
      list = list.filter(s => s.facultyId === activeFaculty);
    }
    if (activeDept !== 'all') {
      list = list.filter(s => s.department === activeDept);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q)                  ||
        s.department.toLowerCase().includes(q)            ||
        s.facultyName.toLowerCase().includes(q)           ||
        s.role.toLowerCase().includes(q)                  ||
        (s.supervisorName ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [students, activeFaculty, activeDept, search]);

  if (loading) return (
    <Box p="xl" ta="center" pt={80}>
      <Loader size="sm" color="brand" />
      <Text size="sm" c="dimmed" mt="sm">Loading students…</Text>
    </Box>
  );

  return (
    <Box p="xl">
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>
            Postgraduate Students
          </Title>
          <Text size="sm" c="dimmed" mt={2}>
            {students.length} PG student{students.length !== 1 ? 's' : ''} across all faculties
          </Text>
        </Box>
        <Group gap="xs">
          <LuCalendar size={14} color="#adb5bd" />
          <Text size="sm" c="dimmed">{today}</Text>
        </Group>
      </Group>

      <Paper withBorder radius="md" bg="white" style={{ overflow: 'hidden' }}>

        {/* ── Row 1: Faculty tabs ── */}
        <Tabs value={activeFaculty} onChange={handleFacultyChange} variant="outline">
          <Tabs.List px="md" pt="md" style={{ flexWrap: 'wrap', gap: 4 }}>
            <Tabs.Tab value="all" leftSection={<LuUsers size={13} />}>
              All
              <Badge size="xs" ml={6} variant="light" color="gray">{students.length}</Badge>
            </Tabs.Tab>
            {faculties.map(f => {
              const count = students.filter(s => s.facultyId === f.id).length;
              return (
                <Tabs.Tab key={f.id} value={f.id} leftSection={<LuBuilding size={12} />}>
                  {f.name}
                  <Badge size="xs" ml={6} variant="light" color="indigo">{count}</Badge>
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs>

        {/* ── Row 2: Department sub-tabs (only when a faculty is selected) ── */}
        {activeFaculty !== 'all' && currentDepts.length > 0 && (
          <Box
            style={{
              background: '#f8f9fa',
              borderBottom: '1px solid #e9ecef',
              borderTop:    '1px solid #e9ecef',
            }}
          >
            <Tabs value={activeDept} onChange={v => setActiveDept(v ?? 'all')} variant="pills">
              <Tabs.List px="md" py="xs" style={{ flexWrap: 'wrap', gap: 4 }}>
                <Tabs.Tab value="all" size="sm" fw={500}>
                  All Departments
                  <Badge size="xs" ml={5} variant="dot" color="gray">
                    {students.filter(s => s.facultyId === activeFaculty).length}
                  </Badge>
                </Tabs.Tab>
                {currentDepts.map(d => {
                  const count = students.filter(
                    s => s.facultyId === activeFaculty && s.department === d,
                  ).length;
                  return (
                    <Tabs.Tab key={d} value={d} size="sm" fw={500}
                      leftSection={<LuBuilding size={12} />}>
                      {d}
                      <Badge size="xs" ml={5} variant="dot" color="gray">{count}</Badge>
                    </Tabs.Tab>
                  );
                })}
              </Tabs.List>
            </Tabs>
          </Box>
        )}

        <Divider />

        {/* ── Search ── */}
        <Box px="md" pt="md" pb="xs">
          <TextInput
            placeholder="Search by name, department, faculty, degree or supervisor…"
            leftSection={<LuSearch size={16} />}
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            radius="md"
            style={{ maxWidth: 480 }}
          />
        </Box>

        {/* ── Student table ── */}
        <Box p="md" pt="xs">
          <StudentTable rows={filtered} />
        </Box>

      </Paper>
    </Box>
  );
}
