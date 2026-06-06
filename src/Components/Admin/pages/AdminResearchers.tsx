import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon, Alert, Avatar, Badge, Box, Button, CopyButton,
  Divider, Group, Loader, Modal, Pagination, Paper, PasswordInput, Progress,
  Select, SimpleGrid, Stack, Table, Text, TextInput, Title, Tooltip,
} from '@mantine/core';
import {
  LuSearch, LuMail, LuBuilding2, LuFolder,
  LuUsers, LuUserCheck, LuTrendingUp, LuUserPlus, LuKey,
  LuRefreshCw, LuCopy, LuCheck, LuLink,
} from 'react-icons/lu';
import { useAppDispatch, useAppSelector } from '../../../Redux/hooks';
import { createUser, assignToSupervisor as assignSupervisor } from '../../../Redux/slices/usersSlice';
import type { StoredUser } from '../../../Redux/slices/usersSlice';
import type { AppRole } from '../../../Redux/slices/authSlice';
import { supabase } from '../../../supabase/client';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DisplayResearcher {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  projects: number;
  publications: number;
  integrity: number;
  lastActive: string;
  color: string;
  specializations: string[];
  bio: string;
  recentProjects: { title: string; status: string }[];
  isRedux: boolean;
  supervisorId?: string;
  matricNo?: string;
  degreeLevel?: string;
  projectTitle?: string;
}


// ── Helpers ────────────────────────────────────────────────────────────────────

const MANTINE_COLORS = ['blue', 'teal', 'green', 'grape', 'orange', 'cyan', 'indigo', 'red', 'pink', 'yellow'];

function nameToColor(name: string) {
  let h = 0;
  for (const c of name) h = (h << 5) - h + c.charCodeAt(0);
  return MANTINE_COLORS[Math.abs(h) % MANTINE_COLORS.length];
}

function storedToDisplay(u: StoredUser): DisplayResearcher {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    department: u.department ?? 'Unassigned',
    role: u.role,
    projects: 0,
    publications: 0,
    integrity: 0,
    lastActive: 'Just created',
    color: nameToColor(u.name),
    specializations: [],
    bio: `${u.role} registered via the admin portal.`,
    recentProjects: u.projectTitle ? [{ title: u.projectTitle, status: 'Draft' }] : [],
    isRedux: true,
    supervisorId: u.supervisorId,
    matricNo: u.matricNo,
    degreeLevel: u.degreeLevel,
    projectTitle: u.projectTitle,
  };
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
}


function genPassword(len = 12): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function pwStrength(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 8)              s++;
  if (pw.length >= 12)             s++;
  if (/[A-Z]/.test(pw))            s++;
  if (/[0-9]/.test(pw))            s++;
  if (/[^a-zA-Z0-9]/.test(pw))    s++;
  const lvl = [
    { score: 0, label: '',          color: 'gray'   },
    { score: 1, label: 'Very Weak', color: 'red'    },
    { score: 2, label: 'Weak',      color: 'orange' },
    { score: 3, label: 'Fair',      color: 'yellow' },
    { score: 4, label: 'Good',      color: 'teal'   },
    { score: 5, label: 'Strong',    color: 'green'  },
  ];
  return lvl[Math.min(s, 5)];
}

const STATUS_COLOR: Record<string, string> = {
  Draft: 'gray', 'In-Progress': 'blue', Review: 'yellow', Submitted: 'green', Exported: 'teal',
};

const ROLE_COLOR: Record<string, string> = {
  Researcher: 'blue', 'Postgraduate Student': 'violet', Supervisor: 'green',
  Student: 'orange', "Master's Student": 'cyan', 'Undergraduate Student': 'pink',
  'Head of Department': 'teal',
};

// const STUDENT_ROLES: AppRole[] = [
//   'Student', 'Researcher', "Master's Student", 'Undergraduate Student',
// ];

const ADD_ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'Supervisor',           label: 'Supervisor' },
  { value: 'Researcher',           label: 'Researcher (PhD)' },
  { value: "Master's Student",     label: "Master's Student" },
  { value: 'Undergraduate Student', label: 'Undergraduate Student' },
  { value: 'Head of Department',   label: 'Head of Department' },
  { value: 'Student',              label: 'Student' },
];

const DEGREE_OPTIONS = [
  { value: 'PhD',          label: 'PhD' },
  { value: "Master's",     label: "Master's" },
  { value: 'Undergraduate', label: 'Undergraduate' },
];

// ── Empty form ──────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', email: '', password: '', role: 'Researcher' as AppRole,
  department: '', matricNo: '', degreeLevel: '', projectTitle: '', supervisorId: '',
};

// ── Component ──────────────────────────────────────────────────────────────────

// ── Role buckets ──────────────────────────────────────────────────────────────

const SUPERVISOR_ROLES = ['Supervisor', 'Senior Supervisor', 'Co-Supervisor', 'Dean', 'Head of Department'];
const STUDENT_ROLES    = ['Student', 'PhD Student', "Master's Student", 'Undergraduate Student', 'Researcher'];
// Only roles that have access to the Supervisor dashboard (can review student work)
const ASSIGNABLE_SUPERVISOR_ROLES = ['Supervisor', 'Senior Supervisor', 'Co-Supervisor', 'Assistant Supervisor'];

interface SupabaseUser {
  id:             string;
  name:           string;
  email:          string;
  role:           string;
  department?:    string;
  specialty?:     string;
  phone?:         string;
  matric_no?:     string;
  project_title?: string;
  supervisor_id?: string;
  created_at:     string;
}

function sbToDisplay(u: SupabaseUser): DisplayResearcher {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    department: u.department ?? 'Unassigned',
    role: u.role,
    projects: 0,
    publications: 0,
    integrity: 0,
    lastActive: new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    color: nameToColor(u.name),
    specializations: u.specialty ? [u.specialty] : [],
    bio: '',
    recentProjects: u.project_title ? [{ title: u.project_title, status: 'Draft' }] : [],
    isRedux: false,
    supervisorId: u.supervisor_id,
    matricNo: u.matric_no,
    projectTitle: u.project_title,
  };
}

export default function AdminResearchers() {
  const dispatch = useAppDispatch();
  const reduxUsers    = useAppSelector(s => s.users.list);
  const authUser      = useAppSelector(s => s.auth.user);
  const institutionId = authUser?.institutionId ?? '';

  // ── Supabase users split into supervisors and students ───────────────────
  const [sbSupervisors, setSbSupervisors] = useState<SupabaseUser[]>([]);
  const [sbStudents,    setSbStudents]    = useState<SupabaseUser[]>([]);
  const [sbLoading,     setSbLoading]     = useState(false);

  const loadFromSupabase = async () => {
    if (!institutionId) return;
    setSbLoading(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('id, name, email, role, department, specialty, phone, matric_no, project_title, supervisor_id, created_at')
        .eq('institution_id', institutionId)
        .neq('role', 'Director of Research')
        .order('created_at');
      const all = (data ?? []) as SupabaseUser[];
      setSbSupervisors(all.filter(u => SUPERVISOR_ROLES.includes(u.role)));
      setSbStudents(all.filter(u => STUDENT_ROLES.includes(u.role)));
    } finally {
      setSbLoading(false);
    }
  };

  useEffect(() => { loadFromSupabase(); }, [institutionId]);

  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState<DisplayResearcher | null>(null);
  const [page, setPage]             = useState(1);

  // Add User modal
  const [addOpen, setAddOpen]       = useState(false);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [showPassword, setShowPassword] = useState(false);
  const [created, setCreated]       = useState<{ email: string; password: string } | null>(null);

  // Supervisor assignment inside detail modal
  const [assignSupId, setAssignSupId] = useState('');
  const [assignSaved, setAssignSaved] = useState(false);

  const PER_PAGE = 6;

  const allResearchers = useMemo<DisplayResearcher[]>(() => [
    ...sbStudents.map(sbToDisplay),
    ...reduxUsers.filter(u => STUDENT_ROLES.includes(u.role)).map(storedToDisplay),
  ], [sbStudents, reduxUsers]);

  const allDepartments = useMemo(
    () => [...new Set(allResearchers.map(r => r.department).filter(Boolean))],
    [allResearchers],
  );

  const allSupervisors = useMemo<DisplayResearcher[]>(() => [
    ...sbSupervisors.map(sbToDisplay),
    ...reduxUsers.filter(u => SUPERVISOR_ROLES.includes(u.role)).map(storedToDisplay),
  ], [sbSupervisors, reduxUsers]);

  const assignableSupervisors = useMemo(
    () => allSupervisors.filter(s => ASSIGNABLE_SUPERVISOR_ROLES.includes(s.role)),
    [allSupervisors],
  );

  const filtered = useMemo(() => {
    setPage(1);
    const q = search.toLowerCase();
    return !q ? allResearchers : allResearchers.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q),
    );
  }, [search, allResearchers]);

  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  // ── Add User handlers ──────────────────────────────────────────────────────

  function openAdd() {
    setForm({ ...EMPTY_FORM, password: genPassword() });
    setCreated(null);
    setAddOpen(true);
  }

  function handleCreate() {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) return;
    dispatch(createUser({
      name:        form.name.trim(),
      email:       form.email.trim().toLowerCase(),
      password:    form.password,
      role:        form.role,
      department:  form.department || undefined,
      matricNo:    form.matricNo   || undefined,
      degreeLevel: form.degreeLevel || undefined,
      projectTitle: form.projectTitle || undefined,
      supervisorId: form.supervisorId || undefined,
    }));
    setCreated({ email: form.email.trim().toLowerCase(), password: form.password });
    setTimeout(() => loadFromSupabase(), 1500);
  }

  function closeAdd() {
    setAddOpen(false);
    setCreated(null);
    setForm({ ...EMPTY_FORM });
  }

  // ── Supervisor assignment handler ─────────────────────────────────────────

  async function handleAssign() {
    if (!selected || !assignSupId) return;
    if (!selected.isRedux) {
      await supabase.from('users').update({ supervisor_id: assignSupId }).eq('id', selected.id);
      loadFromSupabase();
    } else {
      dispatch(assignSupervisor({ studentId: selected.id, supervisorId: assignSupId }));
    }
    setAssignSaved(true);
    setTimeout(() => setAssignSaved(false), 2500);
  }

  function openDetail(r: DisplayResearcher) {
    setSelected(r);
    setAssignSupId(r.supervisorId ?? '');
    setAssignSaved(false);
  }

  const isStudentRole = STUDENT_ROLES.includes(form.role as AppRole);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box p="xl">

      {/* ── Title + Add button ── */}
      <Group justify="space-between" mb="xl" wrap="nowrap">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Students & Researchers</Title>
          <Text size="sm" c="dimmed">
            {allResearchers.length} students across {allDepartments.length} departments — {authUser?.institutionName ?? 'your institution'}
          </Text>
        </Box>
        <Group gap="xs">
          <Button size="sm" variant="subtle" leftSection={<LuRefreshCw size={14} />} onClick={loadFromSupabase} loading={sbLoading}>
            Refresh
          </Button>
          <Button leftSection={<LuUserPlus size={16} />} radius="md" onClick={openAdd}>
            Add User
          </Button>
        </Group>
      </Group>

      {/* ── Summary cards ── */}
      <SimpleGrid cols={{ base: 2, md: 4 }} mb="xl">
        {[
          { label: 'Total Students',  value: allResearchers.length,    icon: LuUsers,      color: '#228be6' },
          { label: 'Departments',     value: allDepartments.length,    icon: LuBuilding2,  color: '#7950f2' },
          { label: 'Supervisors',     value: allSupervisors.length,    icon: LuUserCheck,  color: '#2f9e44' },
          { label: 'With Projects',   value: allResearchers.filter(r => !!r.projectTitle).length, icon: LuTrendingUp, color: '#f59f00' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Paper key={label} withBorder p="md" radius="md" bg="white">
            <Group gap="sm" mb={4}>
              <Icon size={20} color={color} />
              <Text fw={800} size="xl">{sbLoading ? '…' : value}</Text>
            </Group>
            <Text size="sm" c="dimmed">{label}</Text>
          </Paper>
        ))}
      </SimpleGrid>

      {/* ── Search ── */}
      <TextInput
        placeholder="Search by name, department, or email..."
        leftSection={<LuSearch size={16} />}
        value={search}
        onChange={e => setSearch(e.currentTarget.value)}
        mb="md"
        size="md"
      />

      {/* ── Table ── */}
      {sbLoading ? (
        <Box ta="center" py="xl"><Loader size="sm" color="brand" /></Box>
      ) : allResearchers.length === 0 ? (
        <Paper withBorder p="xl" radius="md" ta="center">
          <LuUsers size={28} color="#ced4da" style={{ marginBottom: 8 }} />
          <Text c="dimmed" size="sm">No students or researchers registered for this institution yet.</Text>
          <Text size="xs" c="dimmed" mt={4}>Use Add User or the HOD Students page to create accounts.</Text>
        </Paper>
      ) : (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <Table highlightOnHover verticalSpacing="md">
            <Table.Thead>
              <Table.Tr style={{ background: '#f8f9fa' }}>
                {['Student / Researcher', 'Department', 'Role', 'Matric No', 'Project Title', 'Joined'].map(h => (
                  <Table.Th key={h}>
                    <Text size="sm" c="dimmed" fw={500}>{h}</Text>
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginated.map(r => (
                <Table.Tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(r)}>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <Avatar color={r.color} radius="xl" size="md">
                        {getInitials(r.name)}
                      </Avatar>
                      <Box>
                        <Group gap={6}>
                          <Text size="sm" fw={600}>{r.name}</Text>
                          {r.isRedux && (
                            <Badge size="xs" color="teal" variant="dot" radius="xl">New</Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">{r.email}</Text>
                      </Box>
                    </Group>
                  </Table.Td>
                  <Table.Td><Text size="sm">{r.department}</Text></Table.Td>
                  <Table.Td>
                    <Badge color={ROLE_COLOR[r.role] ?? 'gray'} variant="light" radius="sm" size="sm">
                      {r.role}
                    </Badge>
                  </Table.Td>
                  <Table.Td><Text size="sm" ff="monospace" c="dimmed">{r.matricNo || '—'}</Text></Table.Td>
                  <Table.Td><Text size="sm" lineClamp={1} style={{ maxWidth: 200 }}>{r.projectTitle || '—'}</Text></Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">{r.lastActive}</Text></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <Group justify="space-between" mt="md">
          <Text size="sm" c="dimmed">
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} researchers
          </Text>
          <Pagination total={totalPages} value={page} onChange={setPage} color="brand" radius="md" size="sm" />
        </Group>
      )}


      {/* ════════════════════════════════════════════════════════════════════
          Add User Modal
      ════════════════════════════════════════════════════════════════════ */}
      <Modal
        opened={addOpen}
        onClose={closeAdd}
        title={null}
        size="lg"
        padding={0}
        centered
        overlayProps={{ color: 'var(--mantine-color-brand-9)', backgroundOpacity: 0.7, blur: 2 }}
        styles={{
          content: { borderRadius: 16, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
          body:    { padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
        }}
      >
        {created ? (
          /* ── Success screen ── */
          <Box style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <Box style={{
              background: 'linear-gradient(135deg, #2f9e44 0%, #51cf66 100%)',
              padding: '40px 32px 32px',
              textAlign: 'center',
              flexShrink: 0,
            }}>
              <Box style={{
                width: 68, height: 68, borderRadius: '50%',
                background: 'rgba(255,255,255,0.22)',
                border: '2px solid rgba(255,255,255,0.4)',
                margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LuCheck size={30} color="white" />
              </Box>
              <Text fw={800} size="xl" c="white">User Created Successfully</Text>
              <Text size="sm" mt={6} style={{ color: 'rgba(255,255,255,0.78)' }}>
                Account is ready — share these credentials securely with the user.
              </Text>
            </Box>

            <Box p="xl" style={{ overflowY: 'auto', flex: 1 }}>
              <Alert
                variant="light" color="orange" mb="lg"
                icon={<LuKey size={15} />}
                title="Save these credentials now"
              >
                The password cannot be recovered after this dialog is closed.
              </Alert>

              <Paper withBorder p="lg" radius="md" mb="lg" style={{ background: '#f8f9fa' }}>
                <Stack gap="md">
                  <CredentialRow label="Email Address" value={created.email} />
                  <Divider />
                  <CredentialRow label="Password" value={created.password} />
                </Stack>
              </Paper>

              <Group gap="sm">
                <Button
                  style={{ flex: 1 }} variant="default" radius="md"
                  onClick={() => { setCreated(null); setForm({ ...EMPTY_FORM, password: genPassword() }); }}
                >
                  Add Another User
                </Button>
                <Button style={{ flex: 2 }} color="brand" radius="md" onClick={closeAdd}>
                  Done
                </Button>
              </Group>
            </Box>
          </Box>
        ) : (
          /* ── Form ── */
          <Box style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Gradient header with live name/email preview */}
            <Box style={{
              background: 'linear-gradient(135deg, #3b5bdb 0%, #4c6ef5 100%)',
              padding: '28px 32px 24px',
              flexShrink: 0,
            }}>
              <Group gap="md" wrap="nowrap">
                <Box style={{
                  width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(255,255,255,0.18)',
                  border: '2px solid rgba(255,255,255,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {form.name.trim()
                    ? <Text fw={800} style={{ color: 'white', fontSize: 16, letterSpacing: '-0.5px' }}>{getInitials(form.name)}</Text>
                    : <LuUserPlus size={22} color="white" />}
                </Box>
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={800} size="lg" c="white" lh={1.2} lineClamp={1}>
                    {form.name.trim() || 'New User Account'}
                  </Text>
                  <Text size="xs" mt={3} lineClamp={1} style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {form.email.trim() || 'Complete the form below to create an account'}
                  </Text>
                </Box>
                <Badge radius="xl" size="sm" style={{
                  background: 'rgba(255,255,255,0.2)', color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)', flexShrink: 0,
                }}>
                  {form.role || 'Researcher'}
                </Badge>
              </Group>
            </Box>

            {/* Form body — scrollable */}
            <Box p="xl" style={{ overflowY: 'auto', flex: 1 }}>
              <Stack gap="lg">

                {/* ── 1 · Account Details ── */}
                <Box>
                  <Group gap={8} mb="md">
                    <Box style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: '#3b5bdb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: 800, color: 'white', lineHeight: 1 }}>1</Text>
                    </Box>
                    <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: 0.9 }}>
                      Account Details
                    </Text>
                  </Group>
                  <Stack gap="sm">
                    <TextInput
                      label="Full Name" placeholder="e.g. Dr. Jane Doe"
                      size="md" required
                      value={form.name}
                      onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, name: v })); }}
                    />
                    <TextInput
                      label="Email Address" placeholder="user@university.edu"
                      size="md" required leftSection={<LuMail size={15} />}
                      value={form.email}
                      onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, email: v })); }}
                    />
                    <Select
                      label="Role" placeholder="Select a role"
                      size="md" data={ADD_ROLE_OPTIONS} value={form.role}
                      onChange={v => setForm(f => ({ ...f, role: (v ?? 'Researcher') as AppRole, supervisorId: '' }))}
                    />
                    <TextInput
                      label="Department" placeholder="e.g. Computer Science"
                      size="md" leftSection={<LuBuilding2 size={15} />}
                      value={form.department}
                      onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, department: v })); }}
                    />
                  </Stack>
                </Box>

                <Divider />

                {/* ── 2 · Login Credentials ── */}
                <Box>
                  <Group gap={8} mb="md">
                    <Box style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: '#3b5bdb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: 800, color: 'white', lineHeight: 1 }}>2</Text>
                    </Box>
                    <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: 0.9 }}>
                      Login Credentials
                    </Text>
                    <Box style={{ flex: 1 }} />
                    <Tooltip label="Generate strong password" withArrow>
                      <ActionIcon size="sm" variant="subtle" color="brand"
                        onClick={() => setForm(f => ({ ...f, password: genPassword() }))}>
                        <LuRefreshCw size={13} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>

                  <Group gap="xs" mb={form.password ? 10 : 0}>
                    <PasswordInput
                      style={{ flex: 1 }} size="md"
                      placeholder="At least 8 characters"
                      visible={showPassword}
                      onVisibilityChange={setShowPassword}
                      value={form.password}
                      onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, password: v })); }}
                    />
                    <CopyButton value={form.password}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? 'Copied!' : 'Copy password'} withArrow>
                          <ActionIcon
                            onClick={copy} variant="light"
                            color={copied ? 'teal' : 'gray'}
                            size="42px"
                          >
                            {copied ? <LuCheck size={16} /> : <LuCopy size={16} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>

                  {form.password && (() => {
                    const s = pwStrength(form.password);
                    return (
                      <Box>
                        <Group justify="space-between" mb={5}>
                          <Text size="xs" c="dimmed">Password strength</Text>
                          <Text size="xs" fw={700} c={s.color}>{s.label}</Text>
                        </Group>
                        <Progress value={(s.score / 5) * 100} color={s.color} size="sm" radius="xl" />
                      </Box>
                    );
                  })()}
                </Box>

                {/* ── 3 · Student Details (conditional) ── */}
                {isStudentRole && (
                  <>
                    <Divider />
                    <Box>
                      <Group gap={8} mb="md">
                        <Box style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          background: '#3b5bdb',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ fontSize: 11, fontWeight: 800, color: 'white', lineHeight: 1 }}>3</Text>
                        </Box>
                        <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: 0.9 }}>
                          Student Details
                        </Text>
                      </Group>
                      <Stack gap="sm">
                        <TextInput
                          label="Matric / Student Number" placeholder="e.g. GF/2024/001"
                          size="md"
                          value={form.matricNo}
                          onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, matricNo: v })); }}
                        />
                        <Select
                          label="Degree Level" placeholder="Select level"
                          size="md" data={DEGREE_OPTIONS} value={form.degreeLevel}
                          onChange={v => setForm(f => ({ ...f, degreeLevel: v ?? '' }))}
                        />
                        <TextInput
                          label="Project Title" placeholder="Working title of research"
                          size="md" leftSection={<LuFolder size={15} />}
                          value={form.projectTitle}
                          onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, projectTitle: v })); }}
                        />
                        <Select
                          label="Assign Supervisor" placeholder="Select supervisor"
                          size="md"
                          data={assignableSupervisors.map(s => ({ value: s.id, label: `${s.name} (${s.role})` }))}
                          value={form.supervisorId}
                          onChange={v => setForm(f => ({ ...f, supervisorId: v ?? '' }))}
                          clearable leftSection={<LuLink size={14} />}
                        />
                      </Stack>
                    </Box>
                  </>
                )}

                {/* ── Footer actions ── */}
                <Group gap="sm" style={{ borderTop: '1px solid #f1f3f5', paddingTop: 20 }}>
                  <Button style={{ flex: 1 }} variant="default" radius="md" size="md" onClick={closeAdd}>
                    Cancel
                  </Button>
                  <Button
                    style={{ flex: 2 }} color="brand" radius="md" size="md"
                    leftSection={<LuKey size={15} />}
                    disabled={!form.name.trim() || !form.email.trim() || !form.password.trim()}
                    onClick={handleCreate}
                  >
                    Create User Account
                  </Button>
                </Group>

              </Stack>
            </Box>
          </Box>
        )}
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          Researcher Detail Modal
      ════════════════════════════════════════════════════════════════════ */}
      <Modal
        opened={!!selected}
        onClose={() => setSelected(null)}
        size="lg"
        centered
        padding="xl"
        title={null}
        overlayProps={{ color: 'var(--mantine-color-brand-9)', backgroundOpacity: 0.7, blur: 2 }}
      >
        {selected && (
          <Stack gap="lg">

            {/* Header */}
            <Group gap="lg" wrap="nowrap">
              <Avatar color={selected.color} radius="xl" size={72} style={{ fontSize: 18 }}>
                {getInitials(selected.name)}
              </Avatar>
              <Box>
                <Group gap="xs" mb={4}>
                  <Title order={3}>{selected.name}</Title>
                  <Badge color={ROLE_COLOR[selected.role] ?? 'gray'} variant="light" radius="sm">
                    {selected.role}
                  </Badge>
                </Group>
                <Group gap="xs">
                  <LuMail size={14} color="#868e96" />
                  <Text size="sm" c="dimmed">{selected.email}</Text>
                </Group>
                <Group gap="xs" mt={2}>
                  <LuBuilding2 size={14} color="#868e96" />
                  <Text size="sm" c="dimmed">{selected.department}</Text>
                </Group>
              </Box>
            </Group>

            <Divider />

            {/* Student details: matric / degree / project */}
            {(selected.matricNo || selected.degreeLevel || selected.projectTitle) && (
              <SimpleGrid cols={3}>
                {selected.matricNo && (
                  <Box>
                    <Text size="xs" c="dimmed" fw={600} style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>Matric No</Text>
                    <Text size="sm" fw={500} ff="monospace">{selected.matricNo}</Text>
                  </Box>
                )}
                {selected.degreeLevel && (
                  <Box>
                    <Text size="xs" c="dimmed" fw={600} style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>Degree</Text>
                    <Text size="sm" fw={500}>{selected.degreeLevel}</Text>
                  </Box>
                )}
                {selected.projectTitle && (
                  <Box>
                    <Text size="xs" c="dimmed" fw={600} style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>Project</Text>
                    <Text size="sm" fw={500} lineClamp={2}>{selected.projectTitle}</Text>
                  </Box>
                )}
              </SimpleGrid>
            )}

            {/* Specializations */}
            {selected.specializations.length > 0 && (
              <Box>
                <SectionLabel>Specialisations</SectionLabel>
                <Group gap="xs">
                  {selected.specializations.map(s => (
                    <Badge key={s} variant="light" color="blue" radius="sm">{s}</Badge>
                  ))}
                </Group>
              </Box>
            )}

            {/* Recent projects */}
            {selected.recentProjects.length > 0 && (
              <Box>
                <SectionLabel>Recent Projects</SectionLabel>
                <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                  {selected.recentProjects.map((p, i) => (
                    <Group
                      key={p.title}
                      justify="space-between"
                      px="md"
                      py="sm"
                      wrap="nowrap"
                      style={{ borderTop: i > 0 ? '1px solid #f1f3f5' : undefined }}
                    >
                      <Text size="sm" style={{ flex: 1 }} lineClamp={1}>{p.title}</Text>
                      <Badge color={STATUS_COLOR[p.status] ?? 'gray'} variant="light" radius="sm" size="sm" style={{ flexShrink: 0 }}>
                        {p.status}
                      </Badge>
                    </Group>
                  ))}
                </Paper>
              </Box>
            )}

            {/* ── Supervisor assignment ── */}
            {STUDENT_ROLES.includes(selected.role as AppRole) && (
              <>
                <Divider />
                <Box>
                  <SectionLabel>Supervisor Assignment</SectionLabel>
                  {selected.supervisorId && (
                    <Text size="sm" c="dimmed" mb="xs">
                      Currently assigned to:{' '}
                      <Text component="span" fw={600} c="dark">
                        {allSupervisors.find(s => s.id === selected.supervisorId)?.name ?? 'Unknown'}
                      </Text>
                    </Text>
                  )}
                  <Group gap="sm">
                    <Select
                      placeholder="Select supervisor"
                      data={assignableSupervisors.map(s => ({ value: s.id, label: `${s.name} ` }))}
                      value={assignSupId}
                      onChange={v => setAssignSupId(v ?? '')}
                      clearable
                      style={{ flex: 1 }}
                      leftSection={<LuLink size={14} />}
                    />
                    <Button
                      radius="md"
                      disabled={!assignSupId}
                      onClick={handleAssign}
                      color={assignSaved ? 'teal' : 'blue'}
                      leftSection={assignSaved ? <LuCheck size={14} /> : undefined}
                    >
                      {assignSaved ? 'Assigned!' : 'Assign'}
                    </Button>
                  </Group>
                </Box>
              </>
            )}

            <Text size="xs" c="dimmed" ta="right">Last active: {selected.lastActive}</Text>

          </Stack>
        )}
      </Modal>
    </Box>
  );
}

// ── Small reusable sub-components ──────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text size="xs" fw={700} c="dimmed" mb="xs" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
      {children}
    </Text>
  );
}


function CredentialRow({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Box>
        <Text size="xs" c="dimmed" fw={600}>{label}</Text>
        <Text size="sm" fw={600} ff="monospace">{value}</Text>
      </Box>
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? 'Copied!' : `Copy ${label.toLowerCase()}`} withArrow>
            <ActionIcon onClick={copy} variant="light" color={copied ? 'teal' : 'gray'} size="md">
              {copied ? <LuCheck size={14} /> : <LuCopy size={14} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}
