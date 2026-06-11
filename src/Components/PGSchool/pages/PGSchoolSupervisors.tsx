import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon, Avatar, Badge, Box, Button, Center, Divider, Group,
  Loader, Modal, Paper, ScrollArea, Stack, Tabs, Text,
  TextInput, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuUserCheck, LuSearch, LuCalendar, LuBuilding, LuMail,
  LuUsers, LuX, LuGraduationCap,
} from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import { supabase } from '../../../supabase/client';

// ── Constants ─────────────────────────────────────────────────────────────────

const PG_ROLES  = ['PhD Student', "Master's Student", 'Postgraduate Student', 'Researcher'];
const SUP_ROLES = ['Supervisor', 'Senior Supervisor', 'Co-Supervisor', 'Assistant Supervisor'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const COLORS = ['blue', 'teal', 'violet', 'orange', 'cyan', 'grape', 'green', 'indigo'];
function nameToColor(name: string) {
  let h = 0;
  for (const c of name) h = (h << 5) - h + c.charCodeAt(0);
  return COLORS[Math.abs(h) % COLORS.length];
}
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function supRoleBadgeColor(role: string) {
  if (role === 'Senior Supervisor')    return 'indigo';
  if (role === 'Co-Supervisor')        return 'teal';
  if (role === 'Assistant Supervisor') return 'cyan';
  return 'blue';
}
function roleBadgeColor(role: string) {
  if (role === 'PhD Student')           return 'blue';
  if (role === "Master's Student")      return 'violet';
  if (role === 'Postgraduate Student')  return 'grape';
  if (role === 'Researcher')            return 'green';
  return 'gray';
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SupervisorRow {
  id:         string;
  name:       string;
  role:       string;
  email:      string;
  department: string;
  facultyId:  string;
  faculty:    string;
  pgCount:    number;
  color:      string;
}

interface SupStudent {
  id:         string;
  name:       string;
  role:       string;
  department: string;
  faculty:    string;
  addedOn:    string;
  color:      string;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PGSchoolSupervisors() {
  const user          = useAppSelector(s => s.auth.user);
  const institutionId = user?.institutionId ?? '';

  const [supervisors,    setSupervisors]    = useState<SupervisorRow[]>([]);
  const [faculties,      setFaculties]      = useState<{ id: string; name: string }[]>([]);
  const [deptsByFaculty, setDeptsByFaculty] = useState<Record<string, string[]>>({});

  // Lookup maps kept in state so the modal async fetch can use them
  const [deptFacId,   setDeptFacId]   = useState<Record<string, string>>({});
  const [facNameById, setFacNameById] = useState<Record<string, string>>({});

  const [activeFaculty,  setActiveFaculty]  = useState<string>('all');
  const [activeDept,     setActiveDept]     = useState<string>('all');
  const [search,         setSearch]         = useState('');
  const [loading,        setLoading]        = useState(true);

  // Modal state
  const [selectedSup,     setSelectedSup]     = useState<SupervisorRow | null>(null);
  const [supStudents,     setSupStudents]     = useState<SupStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [hoveredId,       setHoveredId]       = useState<string | null>(null);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const handleFacultyChange = (val: string | null) => {
    setActiveFaculty(val ?? 'all');
    setActiveDept('all');
  };

  // ── Data load ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!institutionId) { setLoading(false); return; }

    async function load() {
      setLoading(true);

      const { data: studentRows } = await supabase
        .from('users')
        .select('supervisor_id')
        .eq('institution_id', institutionId)
        .in('role', PG_ROLES)
        .not('supervisor_id', 'is', null);

      const studs = (studentRows ?? []) as { supervisor_id: string }[];
      if (!studs.length) { setSupervisors([]); setLoading(false); return; }

      const pgCountById: Record<string, number> = {};
      studs.forEach(s => { pgCountById[s.supervisor_id] = (pgCountById[s.supervisor_id] ?? 0) + 1; });
      const supIds = Object.keys(pgCountById);

      const { data: supRows } = await supabase
        .from('users')
        .select('id, name, role, email, department')
        .in('id', supIds)
        .eq('institution_id', institutionId)
        .in('role', SUP_ROLES);

      const sups = (supRows ?? []) as {
        id: string; name: string; role: string; email: string; department: string;
      }[];

      if (!sups.length) { setSupervisors([]); setLoading(false); return; }

      const deptNames = [...new Set(sups.map(s => s.department).filter(Boolean))];
      const [{ data: deptRows }, { data: facRows }] = await Promise.all([
        supabase.from('departments').select('name, faculty_id').eq('institution_id', institutionId).in('name', deptNames),
        supabase.from('faculties').select('id, name').eq('institution_id', institutionId).order('name'),
      ]);

      const deptMap: Record<string, string> = {};
      const facMap:  Record<string, string> = {};
      (deptRows ?? []).forEach(d => { deptMap[d.name] = d.faculty_id; });
      (facRows  ?? []).forEach(f => { facMap[f.id]   = f.name; });

      const rows: SupervisorRow[] = sups
        .sort((a, b) => (pgCountById[b.id] ?? 0) - (pgCountById[a.id] ?? 0))
        .map(s => {
          const facId   = deptMap[s.department] ?? '';
          const facName = facId ? (facMap[facId] ?? '—') : '—';
          return {
            id:         s.id,
            name:       s.name,
            role:       s.role,
            email:      s.email,
            department: s.department || '—',
            facultyId:  facId,
            faculty:    facName,
            pgCount:    pgCountById[s.id] ?? 0,
            color:      nameToColor(s.name),
          };
        });

      // Build faculty list and deptsByFaculty from actual supervisor data
      const activeFacIds = new Set(rows.map(r => r.facultyId).filter(Boolean));
      const filteredFacs = (facRows ?? []).filter(f => activeFacIds.has(f.id));

      const deptsByFac: Record<string, Set<string>> = {};
      rows.forEach(r => {
        if (r.facultyId && r.department !== '—') {
          (deptsByFac[r.facultyId] ??= new Set()).add(r.department);
        }
      });
      const deptByFacMap: Record<string, string[]> = {};
      Object.entries(deptsByFac).forEach(([fId, depts]) => { deptByFacMap[fId] = [...depts].sort(); });

      setSupervisors(rows);
      setFaculties(filteredFacs);
      setDeptsByFaculty(deptByFacMap);
      setDeptFacId(deptMap);
      setFacNameById(facMap);
      setLoading(false);
    }

    load();
  }, [institutionId]);

  // ── Derived lists ──────────────────────────────────────────────────────────

  const currentDepts = useMemo(
    () => (activeFaculty !== 'all' ? (deptsByFaculty[activeFaculty] ?? []) : []),
    [activeFaculty, deptsByFaculty],
  );

  const filtered = useMemo(() => {
    let list = supervisors;
    if (activeFaculty !== 'all') list = list.filter(s => s.facultyId === activeFaculty);
    if (activeDept    !== 'all') list = list.filter(s => s.department === activeDept);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q)       ||
        s.email.toLowerCase().includes(q)      ||
        s.department.toLowerCase().includes(q) ||
        s.faculty.toLowerCase().includes(q)    ||
        s.role.toLowerCase().includes(q),
      );
    }
    return list;
  }, [supervisors, activeFaculty, activeDept, search]);

  // ── Modal open ─────────────────────────────────────────────────────────────

  async function openSupervisor(sup: SupervisorRow) {
    setSelectedSup(sup);
    setLoadingStudents(true);
    setSupStudents([]);

    const { data: rows } = await supabase
      .from('users')
      .select('id, name, role, department, created_at')
      .eq('institution_id', institutionId)
      .eq('supervisor_id', sup.id)
      .in('role', PG_ROLES)
      .order('created_at', { ascending: false });

    const students: SupStudent[] = (rows ?? []).map((s: {
      id: string; name: string; role: string; department: string; created_at: string;
    }) => {
      const facId   = deptFacId[s.department];
      const facName = facId ? (facNameById[facId] ?? '—') : '—';
      return {
        id:         s.id,
        name:       s.name,
        role:       s.role,
        department: s.department || '—',
        faculty:    facName,
        addedOn:    new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        color:      nameToColor(s.name),
      };
    });

    setSupStudents(students);
    setLoadingStudents(false);
  }

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) return (
    <Box p="xl" ta="center" pt={80}>
      <Loader size="sm" color="brand" />
      <Text size="sm" c="dimmed" mt="sm">Loading supervisors…</Text>
    </Box>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box p="xl">
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Supervisors</Title>
          <Text size="sm" c="dimmed" mt={2}>
            {supervisors.length} supervisor{supervisors.length !== 1 ? 's' : ''} actively assigned to postgraduate students
          </Text>
        </Box>
        <Group gap="xs">
          <LuCalendar size={14} color="#adb5bd" />
          <Text size="sm" c="dimmed">{today}</Text>
        </Group>
      </Group>

      <Paper withBorder radius="md" bg="white" style={{ overflow: 'hidden' }}>

        {/* ── Level 1: Faculty tabs ── */}
        <Tabs value={activeFaculty} onChange={handleFacultyChange} variant="outline">
          <Tabs.List px="md" pt="md" style={{ flexWrap: 'wrap', gap: 4 }}>
            <Tabs.Tab value="all" leftSection={<LuUsers size={13} />}>
              All
              <Badge size="xs" ml={6} variant="light" color="gray">{supervisors.length}</Badge>
            </Tabs.Tab>
            {faculties.map(f => {
              const count = supervisors.filter(s => s.facultyId === f.id).length;
              return (
                <Tabs.Tab key={f.id} value={f.id} leftSection={<LuBuilding size={12} />}>
                  {f.name}
                  <Badge size="xs" ml={6} variant="light" color="grape">{count}</Badge>
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs>

        {/* ── Level 2: Department sub-tabs ── */}
        {activeFaculty !== 'all' && currentDepts.length > 0 && (
          <Box style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef', borderTop: '1px solid #e9ecef' }}>
            <Tabs value={activeDept} onChange={v => setActiveDept(v ?? 'all')} variant="pills">
              <Tabs.List px="md" py="xs" style={{ flexWrap: 'wrap', gap: 4 }}>
                <Tabs.Tab value="all" size="sm" fw={500}>
                  All Departments
                  <Badge size="xs" ml={5} variant="dot" color="gray">
                    {supervisors.filter(s => s.facultyId === activeFaculty).length}
                  </Badge>
                </Tabs.Tab>
                {currentDepts.map(d => {
                  const count = supervisors.filter(
                    s => s.facultyId === activeFaculty && s.department === d,
                  ).length;
                  return (
                    <Tabs.Tab key={d} value={d} size="sm" fw={500} leftSection={<LuBuilding size={12} />}>
                      {d}
                      <Badge size="xs" ml={5} variant="dot" color="grape">{count}</Badge>
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
            placeholder="Search by name, email, department, faculty or role…"
            leftSection={<LuSearch size={16} />}
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            radius="md"
            style={{ maxWidth: 460 }}
          />
        </Box>

        {/* ── Table ── */}
        <Box p="md" pt="xs">
          {filtered.length === 0 ? (
            <Center py={60}>
              <Stack align="center" gap="sm">
                <LuUserCheck size={48} color="#ced4da" />
                <Text fw={600} c="dimmed">
                  {supervisors.length === 0
                    ? 'No supervisors are assigned to PG students yet.'
                    : 'No results match your search.'}
                </Text>
              </Stack>
            </Center>
          ) : (
            <ScrollArea type="auto">
              <Stack gap={0} style={{ minWidth: 680 }}>
                <Group py="sm" px="xs" wrap="nowrap" style={{ borderBottom: '2px solid #e9ecef' }}>
                  <Text size="xs" fw={700} c="dimmed" style={{ flex: 3, minWidth: 160 }}>SUPERVISOR</Text>
                  <Text size="xs" fw={700} c="dimmed" style={{ flex: 2, minWidth: 120 }}>ROLE</Text>
                  <Text size="xs" fw={700} c="dimmed" style={{ flex: 2, minWidth: 120 }}>DEPARTMENT</Text>
                  <Text size="xs" fw={700} c="dimmed" style={{ flex: 2, minWidth: 120 }}>FACULTY</Text>
                  <Text size="xs" fw={700} c="dimmed" ta="center" style={{ flex: 1, minWidth: 80 }}>PG STUDENTS</Text>
                </Group>

                {filtered.map(s => (
                  <Group
                    key={s.id}
                    py="sm" px="xs" wrap="nowrap"
                    onClick={() => openSupervisor(s)}
                    onMouseEnter={() => setHoveredId(s.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      borderBottom: '1px solid #f1f3f5',
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: hoveredId === s.id ? '#f5f0ff' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <Group gap="xs" wrap="nowrap" style={{ flex: 3, minWidth: 160 }}>
                      <Avatar color={s.color} radius="xl" size="sm">{getInitials(s.name)}</Avatar>
                      <Box style={{ minWidth: 0 }}>
                        <Text size="sm" fw={600} lineClamp={1}
                          style={{ color: hoveredId === s.id ? '#6741d9' : undefined }}>
                          {s.name}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>{s.email}</Text>
                      </Box>
                    </Group>
                    <Box style={{ flex: 2, minWidth: 120 }}>
                      <Badge size="sm" variant="light" color={supRoleBadgeColor(s.role)}>{s.role}</Badge>
                    </Box>
                    <Text size="sm" c="dimmed" lineClamp={1} style={{ flex: 2, minWidth: 120 }}>{s.department}</Text>
                    <Text size="sm" c="dimmed" lineClamp={1} style={{ flex: 2, minWidth: 120 }}>{s.faculty}</Text>
                    <Group justify="center" style={{ flex: 1, minWidth: 80 }}>
                      <ThemeIcon size={28} radius="xl" color="grape" variant="light">
                        <Text size="xs" fw={800}>{s.pgCount}</Text>
                      </ThemeIcon>
                    </Group>
                  </Group>
                ))}
              </Stack>
            </ScrollArea>
          )}
        </Box>
      </Paper>

      {/* ── Supervisor detail modal ── */}
      <Modal
        opened={!!selectedSup}
        onClose={() => setSelectedSup(null)}
        size="xl"
        padding={0}
        radius="lg"
        withCloseButton={false}
        overlayProps={{ backgroundOpacity: 0.6, blur: 8, color: '#1e3a8a' }}
        styles={{ content: { overflow: 'hidden' } }}
      >
        {selectedSup && (
          <>
            {/* Gradient header */}
            <Box style={{
              background: 'linear-gradient(135deg, #4c6ef5 0%, #3b5bdb 50%, #1e3a8a 100%)',
              padding: '28px 28px 24px',
              position: 'relative',
            }}>
              <ActionIcon
                variant="subtle" size="md" radius="xl"
                style={{ position: 'absolute', top: 14, right: 14, color: 'rgba(255,255,255,0.75)' }}
                onClick={() => setSelectedSup(null)}
              >
                <LuX size={16} />
              </ActionIcon>

              <Group gap="lg" align="flex-start" wrap="nowrap">
                <Avatar
                  color={selectedSup.color}
                  radius="xl" size={76}
                  style={{
                    border: '3px solid rgba(255,255,255,0.35)',
                    boxShadow: '0 8px 28px rgba(59,91,219,0.45)',
                    background: 'rgba(255,255,255,0.15)',
                    color: 'white',
                    fontSize: 26,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(selectedSup.name)}
                </Avatar>

                <Box style={{ minWidth: 0, flex: 1 }}>
                  <Text fw={800} size="xl" c="white" lh={1.2}>{selectedSup.name}</Text>
                  <Badge
                    mt={6} size="md" variant="outline"
                    style={{ borderColor: 'rgba(255,255,255,0.45)', color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.12)' }}
                  >
                    {selectedSup.role}
                  </Badge>
                  <Group mt={10} gap="lg" wrap="wrap">
                    <Group gap={6} wrap="nowrap">
                      <LuMail size={13} color="rgba(255,255,255,0.65)" />
                      <Text size="sm" c="rgba(255,255,255,0.85)" style={{ wordBreak: 'break-all' }}>
                        {selectedSup.email}
                      </Text>
                    </Group>
                  </Group>
                </Box>
              </Group>

              {/* Info strip */}
              <Group mt="lg" gap={0} style={{
                background: 'rgba(0,0,0,0.15)',
                borderRadius: 10,
                overflow: 'hidden',
              }}>
                {[
                  { label: 'Department',   value: selectedSup.department },
                  { label: 'Faculty',      value: selectedSup.faculty },
                  { label: 'PG Students',  value: String(selectedSup.pgCount) },
                ].map((item, i) => (
                  <Box key={item.label} style={{ flex: 1, padding: '10px 16px', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
                    <Text size="xs" c="rgba(255,255,255,0.6)" mb={2}>{item.label}</Text>
                    <Text size="sm" fw={700} c="white" lineClamp={1}>{item.value}</Text>
                  </Box>
                ))}
              </Group>
            </Box>

            {/* Students section */}
            <Box p="lg">
              <Group gap="xs" mb="md">
                <LuGraduationCap size={15} color="#7950f2" />
                <Text fw={700} size="sm">Assigned Students</Text>
                {!loadingStudents && (
                  <Badge size="sm" variant="light" color="grape">{supStudents.length}</Badge>
                )}
              </Group>
              <Divider mb="md" />

              {loadingStudents ? (
                <Center py={48}>
                  <Stack align="center" gap="sm">
                    <Loader size="sm" color="grape" />
                    <Text size="sm" c="dimmed">Loading students…</Text>
                  </Stack>
                </Center>
              ) : supStudents.length === 0 ? (
                <Center py={48}>
                  <Stack align="center" gap="xs">
                    <LuUsers size={40} color="#ced4da" />
                    <Text size="sm" c="dimmed" fw={500}>No PG students found for this supervisor.</Text>
                  </Stack>
                </Center>
              ) : (
                <ScrollArea type="auto" style={{ maxHeight: 320 }}>
                  <Stack gap={0} style={{ minWidth: 560 }}>
                    <Group py="xs" px="xs" wrap="nowrap" style={{ borderBottom: '2px solid #e9ecef' }}>
                      <Text size="xs" fw={700} c="dimmed" style={{ flex: 3, minWidth: 150 }}>STUDENT</Text>
                      <Text size="xs" fw={700} c="dimmed" style={{ flex: 2, minWidth: 100 }}>DEGREE LEVEL</Text>
                      <Text size="xs" fw={700} c="dimmed" style={{ flex: 2, minWidth: 120 }}>DEPARTMENT</Text>
                      <Text size="xs" fw={700} c="dimmed" style={{ flex: 1, minWidth: 80 }}>ADDED ON</Text>
                    </Group>
                    {supStudents.map(s => (
                      <Group key={s.id} py="sm" px="xs" wrap="nowrap"
                        style={{ borderBottom: '1px solid #f1f3f5' }}>
                        <Group gap="xs" wrap="nowrap" style={{ flex: 3, minWidth: 150 }}>
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
                        <Text size="xs" c="dimmed" style={{ flex: 1, minWidth: 80, whiteSpace: 'nowrap' }}>
                          {s.addedOn}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </ScrollArea>
              )}

              <Group justify="flex-end" mt="lg">
                <Button variant="light" color="grape" radius="md" onClick={() => setSelectedSup(null)}>
                  Close
                </Button>
              </Group>
            </Box>
          </>
        )}
      </Modal>
    </Box>
  );
}
