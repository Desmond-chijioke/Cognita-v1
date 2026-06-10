import { useEffect, useState } from 'react';
import {
  ActionIcon, Alert, Avatar, Badge, Box, Button, CopyButton,
  Divider, Group, Loader, Modal, Paper, Select, SimpleGrid,
  Stack, Table, Tabs, Text, TextInput, Title, Tooltip,
} from '@mantine/core';
import {
  LuPlus, LuSearch, LuUserCheck, LuUserX,
  LuKeyRound, LuCopy, LuCheck, LuPhone, LuTriangleAlert, LuInfo,
  LuUsers, LuGraduationCap, LuBuilding2,
} from 'react-icons/lu';
import { useAppDispatch, useAppSelector } from '../../../Redux/hooks';
import { loadSupervisors, loadStudents } from '../../../Redux/slices/hodSlice';
import { createStaffUser, updateSupervisorAssignment } from '../../../supabase/hierarchy';
import { supabase } from '../../../supabase/client';
import { showsucessnotification, showerrornotification } from '../../../helper/notificationhelper';

// ── Role constants ─────────────────────────────────────────────────────────────

const SUP_ROLES     = ['Supervisor', 'Senior Supervisor', 'Co-Supervisor', 'Assistant Supervisor'];
const STUDENT_ROLES = ['PhD Student', "Master's Student", 'Undergraduate Student', 'Postgraduate Student'];

const ROLE_COLOR: Record<string, string> = {
  'Supervisor':             'blue',
  'Senior Supervisor':      'violet',
  'Co-Supervisor':          'teal',
  'Assistant Supervisor':   'cyan',
  'PhD Student':            'blue',
  "Master's Student":       'violet',
  'Undergraduate Student':  'teal',
  'Postgraduate Student':   'indigo',
};

function rc(role: string) { return ROLE_COLOR[role] ?? 'gray'; }

function generatePassword(len = 10): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface SBUser {
  id:             string;
  name:           string;
  email:          string;
  role:           string;
  phone?:         string;
  specialty?:     string;
  department?:    string;
  matric_no?:     string;
  project_title?: string;
  supervisor_id?: string;
  created_at:     string;
}

interface GeneratedCreds { name: string; email: string; password: string; role: string; }

// ── Credential Modal ───────────────────────────────────────────────────────────

function CredentialModal({ creds, onClose }: { creds: GeneratedCreds | null; onClose: () => void }) {
  return (
    <Modal opened={!!creds} onClose={onClose} centered size="sm"
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      title={<Group gap="xs"><LuKeyRound size={17} color="var(--mantine-color-brand-6)" /><Text fw={700}>Account Created</Text></Group>}
    >
      {creds && (
        <Stack gap="md">
          <Alert color="orange" variant="light" icon={<LuTriangleAlert size={15} />}>
            Share these credentials securely with <strong>{creds.name}</strong>. The password cannot be recovered after closing.
          </Alert>
          <Paper withBorder p="md" radius="md" bg="gray.0">
            {[
              { label: 'Role',          value: creds.role },
              { label: 'Login Email',   value: creds.email },
              { label: 'Temp Password', value: creds.password },
            ].map(({ label, value }) => (
              <Group key={label} justify="space-between" mb="xs">
                <Box>
                  <Text size="xs" c="dimmed" fw={600}>{label}</Text>
                  <Text size="sm" fw={700} ff="monospace">{value}</Text>
                </Box>
                <CopyButton value={value} timeout={1500}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied!' : 'Copy'} withArrow>
                      <ActionIcon variant="light" color={copied ? 'green' : 'brand'} onClick={copy} size="sm">
                        {copied ? <LuCheck size={13} /> : <LuCopy size={13} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            ))}
          </Paper>
          <Text size="xs" c="dimmed">They can log in at <strong>/login</strong> using the email and password above.</Text>
          <Button fullWidth color="brand" onClick={onClose}>Done</Button>
        </Stack>
      )}
    </Modal>
  );
}

// ── Department context banner ──────────────────────────────────────────────────

function DeptBanner({ institutionName, departmentName }: { institutionName: string; departmentName: string }) {
  return (
    <Box style={{ background: '#f0f4ff', borderRadius: 8, padding: '8px 12px', border: '1px solid #c5d2fb' }}>
      <Group gap={6}>
        <LuBuilding2 size={13} color="#3b5bdb" />
        <Text size="xs" c="brand.7" fw={600}>Institution · Department</Text>
      </Group>
      <Text size="sm" fw={600} mt={2}>{institutionName}</Text>
      <Text size="xs" c="dimmed">{departmentName || '(no department set)'}</Text>
    </Box>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function HODUsers() {
  const dispatch        = useAppDispatch();
  const user            = useAppSelector(s => s.auth.user);
  const institutionId   = user?.institutionId   ?? '';
  const institutionName = user?.institutionName ?? '';
  const departmentName  = user?.departmentName  ?? '';

  // ── State ────────────────────────────────────────────────────────────────────
  const [allRows,      setAllRows]  = useState<SBUser[]>([]);
  const [loading,      setLoading]  = useState(true);
  const [tab,          setTab]      = useState('supervisors');
  const [search,       setSearch]   = useState('');
  const [creds,        setCreds]    = useState<GeneratedCreds | null>(null);

  // Add supervisor modal
  const [showSupModal, setShowSupModal] = useState(false);
  const [savingSup,    setSavingSup]    = useState(false);
  const [supName,      setSupName]      = useState('');
  const [supEmail,     setSupEmail]     = useState('');
  const [supPhone,     setSupPhone]     = useState('');
  const [supSpec,      setSupSpec]      = useState('');
  const [supRole,      setSupRole]      = useState('Supervisor');

  // Add student modal
  const [showStuModal, setShowStuModal] = useState(false);
  const [savingStu,    setSavingStu]    = useState(false);
  const [stuName,      setStuName]      = useState('');
  const [stuEmail,     setStuEmail]     = useState('');
  const [stuPhone,     setStuPhone]     = useState('');
  const [stuMatric,    setStuMatric]    = useState('');
  const [stuProgram,   setStuProgram]   = useState('');
  const [stuRole,      setStuRole]      = useState('PhD Student');
  const [stuSupId,     setStuSupId]     = useState<string | null>(null);

  // Assign supervisor modal
  const [assignTarget, setAssignTarget] = useState<string | null>(null);
  const [newSupId,     setNewSupId]     = useState<string | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const supervisors = allRows.filter(u => SUP_ROLES.includes(u.role));
  const students    = allRows.filter(u => STUDENT_ROLES.includes(u.role));

  const supervisorOptions = supervisors.map(s => ({ value: s.id, label: `${s.name} — ${s.role}` }));
  const supById = (id?: string | null) => id ? allRows.find(u => u.id === id) ?? null : null;
  const studentCount = (supId: string) => students.filter(s => s.supervisor_id === supId).length;

  // ── Fetch — scoped to HOD's department ───────────────────────────────────────
  const loadAll = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      // Always filter by institution; also filter by department when the HOD has one set.
      let query = supabase
        .from('users')
        .select('id, name, email, phone, role, specialty, department, matric_no, project_title, supervisor_id, created_at')
        .eq('institution_id', institutionId);

      if (departmentName) {
        query = query.eq('department', departmentName);
      }

      const { data, error } = await query.order('created_at');

      if (error) console.error('[HODUsers]', error.code, error.message);

      const rows = (data ?? []) as SBUser[];
      setAllRows(rows);

      // Sync Redux so HODOverview charts stay accurate
      const sups  = rows.filter(u => SUP_ROLES.includes(u.role));
      const studs = rows.filter(u => STUDENT_ROLES.includes(u.role));
      const CS = ['blue', 'violet', 'teal', 'orange', 'grape', 'cyan'];
      const CT = ['orange', 'indigo', 'blue', 'red', 'green', 'grape'];

      dispatch(loadSupervisors(sups.map((s, i) => ({
        id:               s.id,
        name:             s.name,
        email:            s.email,
        specialty:        s.specialty  ?? '',
        role:             s.role,
        studentsAssigned: studs.filter(st => st.supervisor_id === s.id).length,
        color:            CS[i % CS.length],
        addedOn:          new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      }))));

      dispatch(loadStudents(studs.map((st, i) => ({
        id:           st.id,
        name:         st.name,
        email:        st.email,
        matricNo:     st.matric_no     ?? '',
        program:      st.project_title ?? '',
        role:         st.role,
        supervisorId: st.supervisor_id ?? null,
        color:        CT[i % CT.length],
        addedOn:      new Date(st.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      }))));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [institutionId, departmentName]);

  // ── Search ────────────────────────────────────────────────────────────────────
  const filter = (list: SBUser[]) => !search.trim() ? list : list.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.matric_no     ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.specialty     ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.project_title ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const visSups  = filter(supervisors);
  const visStuds = filter(students);

  // ── Add supervisor ────────────────────────────────────────────────────────────
  const closeSupModal = () => {
    setShowSupModal(false);
    setSupName(''); setSupEmail(''); setSupPhone(''); setSupSpec(''); setSupRole('Supervisor');
  };

  const handleAddSupervisor = async () => {
    if (!supName.trim() || !supEmail.trim()) return;
    setSavingSup(true);
    const password = generatePassword();
    try {
      await createStaffUser({
        name:         supName.trim(),
        email:        supEmail.trim().toLowerCase(),
        phone:        supPhone.trim(),
        password,
        role:         supRole,
        institutionId,
        institutionName,
        specialty:    supSpec.trim(),
        department:   departmentName,   // always locked to HOD's department
      });
      setCreds({ name: supName.trim(), email: supEmail.trim().toLowerCase(), password, role: supRole });
      closeSupModal();
      showsucessnotification({ message: `${supName.trim()} added as ${supRole}.` });
      loadAll();
    } catch (err: unknown) {
      showerrornotification({ message: err instanceof Error ? err.message : 'Failed to create account.' });
    } finally {
      setSavingSup(false);
    }
  };

  // ── Add student ───────────────────────────────────────────────────────────────
  const closeStuModal = () => {
    setShowStuModal(false);
    setStuName(''); setStuEmail(''); setStuPhone(''); setStuMatric('');
    setStuProgram(''); setStuRole('PhD Student'); setStuSupId(null);
  };

  const handleAddStudent = async () => {
    if (!stuName.trim() || !stuEmail.trim()) return;
    setSavingStu(true);
    const password = generatePassword();
    try {
      await createStaffUser({
        name:          stuName.trim(),
        email:         stuEmail.trim().toLowerCase(),
        phone:         stuPhone.trim(),
        password,
        role:          stuRole,
        institutionId,
        institutionName,
        department:    departmentName,   // locked to HOD's department
        matricNo:      stuMatric.trim(),
        projectTitle:  stuProgram.trim(),
        supervisorId:  stuSupId ?? undefined,
      });
      setCreds({ name: stuName.trim(), email: stuEmail.trim().toLowerCase(), password, role: stuRole });
      closeStuModal();
      showsucessnotification({ message: `${stuName.trim()} added as ${stuRole}.` });
      loadAll();
    } catch (err: unknown) {
      showerrornotification({ message: err instanceof Error ? err.message : 'Failed to create account.' });
    } finally {
      setSavingStu(false);
    }
  };

  // ── Assign supervisor ─────────────────────────────────────────────────────────
  const assigningStudent = assignTarget ? allRows.find(u => u.id === assignTarget) : null;

  const handleAssign = async () => {
    if (!assignTarget) return;
    try {
      await updateSupervisorAssignment(assignTarget, newSupId);
      setAllRows(prev => prev.map(u =>
        u.id === assignTarget ? { ...u, supervisor_id: newSupId ?? undefined } : u
      ));
      const sup = supById(newSupId);
      showsucessnotification({
        message: sup
          ? `${assigningStudent?.name} assigned to ${sup.name}.`
          : `${assigningStudent?.name}'s supervisor cleared.`,
      });
    } catch (err: unknown) {
      showerrornotification({ message: err instanceof Error ? err.message : 'Failed to save.' });
    }
    setAssignTarget(null); setNewSupId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Box p="xl">

      {/* Header */}
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Users</Title>
          <Text size="sm" c="dimmed">
            {departmentName
              ? <><strong>{departmentName}</strong> — supervisors and students</>
              : <>Supervisors and students in <strong>{institutionName}</strong></>}
          </Text>
        </Box>
        <Group gap="xs">
          <Button leftSection={<LuPlus size={14} />} color="brand" variant="light"
            onClick={() => setShowSupModal(true)}>
            Add Supervisor
          </Button>
          <Button leftSection={<LuPlus size={14} />} color="brand"
            onClick={() => setShowStuModal(true)}>
            Add Student
          </Button>
        </Group>
      </Group>

      {/* Stats */}
      <SimpleGrid cols={{ base: 2, md: 4 }} mb="xl">
        {[
          { label: 'Total Users',   value: allRows.length },
          { label: 'Supervisors',   value: supervisors.length },
          { label: 'Students',      value: students.length },
          { label: 'Unassigned',    value: students.filter(s => !s.supervisor_id).length },
        ].map(({ label, value }) => (
          <Paper key={label} withBorder p="md" radius="md" bg="white">
            <Text fw={800} size="xl">{value}</Text>
            <Text size="sm" c="dimmed">{label}</Text>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Search */}
      <TextInput
        placeholder="Search by name, email, matric, or specialisation…"
        leftSection={<LuSearch size={15} />}
        value={search}
        onChange={e => setSearch(e.currentTarget.value)}
        mb="md" size="md"
      />

      {loading ? (
        <Box ta="center" py="xl"><Loader size="sm" color="brand" /></Box>
      ) : (
        <Tabs value={tab} onChange={v => setTab(v ?? 'supervisors')}>
          <Tabs.List mb="md">
            <Tabs.Tab value="supervisors" leftSection={<LuUserCheck size={14} />}>
              Supervisors ({visSups.length})
            </Tabs.Tab>
            <Tabs.Tab value="students" leftSection={<LuGraduationCap size={14} />}>
              Students ({visStuds.length})
            </Tabs.Tab>
          </Tabs.List>

          {/* ── Supervisors Tab ── */}
          <Tabs.Panel value="supervisors">
            <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
              <Table highlightOnHover verticalSpacing="md">
                <Table.Thead>
                  <Table.Tr style={{ background: '#f8f9fa' }}>
                    {['Supervisor', 'Role', 'Specialisation', 'Phone', 'Students', 'Added'].map(h => (
                      <Table.Th key={h}><Text size="xs" c="dimmed" fw={600}>{h}</Text></Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {visSups.map(sv => (
                    <Table.Tr key={sv.id}>
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <Avatar color={rc(sv.role)} radius="xl" size="md">{getInitials(sv.name)}</Avatar>
                          <Box>
                            <Text size="sm" fw={600}>{sv.name}</Text>
                            <Text size="xs" c="dimmed">{sv.email}</Text>
                          </Box>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={rc(sv.role)} variant="light" size="sm">{sv.role}</Badge>
                      </Table.Td>
                      <Table.Td><Text size="sm">{sv.specialty || '—'}</Text></Table.Td>
                      <Table.Td><Text size="sm" c="dimmed">{sv.phone || '—'}</Text></Table.Td>
                      <Table.Td>
                        <Badge color={studentCount(sv.id) > 0 ? 'green' : 'gray'} variant="light" size="sm">
                          {studentCount(sv.id)} student{studentCount(sv.id) !== 1 ? 's' : ''}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {new Date(sv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {visSups.length === 0 && (
                    <Table.Tr>
                      <Table.Td colSpan={6}>
                        <Text ta="center" c="dimmed" py="xl" size="sm">
                          No supervisors in {departmentName || 'this department'} yet.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Paper>
          </Tabs.Panel>

          {/* ── Students Tab ── */}
          <Tabs.Panel value="students">
            <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
              <Table highlightOnHover verticalSpacing="md">
                <Table.Thead>
                  <Table.Tr style={{ background: '#f8f9fa' }}>
                    {['Student', 'Matric No', 'Role', 'Research Topic', 'Supervisor', 'Added', ''].map(h => (
                      <Table.Th key={h}><Text size="xs" c="dimmed" fw={600}>{h}</Text></Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {visStuds.map(st => {
                    const sup = supById(st.supervisor_id);
                    return (
                      <Table.Tr key={st.id}>
                        <Table.Td>
                          <Group gap="sm" wrap="nowrap">
                            <Avatar color={rc(st.role)} radius="xl" size="md">{getInitials(st.name)}</Avatar>
                            <Box>
                              <Text size="sm" fw={600}>{st.name}</Text>
                              <Text size="xs" c="dimmed">{st.email}</Text>
                            </Box>
                          </Group>
                        </Table.Td>
                        <Table.Td><Text size="sm" ff="monospace">{st.matric_no || '—'}</Text></Table.Td>
                        <Table.Td>
                          <Badge color={rc(st.role)} variant="light" size="sm">{st.role}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" lineClamp={1} style={{ maxWidth: 180 }}>{st.project_title || '—'}</Text>
                        </Table.Td>
                        <Table.Td>
                          {sup ? (
                            <Group gap={4} wrap="nowrap">
                              <LuUserCheck size={13} color="#2f9e44" />
                              <Box>
                                <Text size="sm" c="green.7">{sup.name}</Text>
                                <Text size="xs" c="dimmed">{sup.role}</Text>
                              </Box>
                            </Group>
                          ) : (
                            <Group gap={4} wrap="nowrap">
                              <LuUserX size={13} color="#fa5252" />
                              <Text size="sm" c="red.6">Unassigned</Text>
                            </Group>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {new Date(st.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon variant="light" color="brand" size="sm" title="Assign supervisor"
                            onClick={() => { setAssignTarget(st.id); setNewSupId(st.supervisor_id ?? null); }}>
                            <LuUserCheck size={13} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                  {visStuds.length === 0 && (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <Text ta="center" c="dimmed" py="xl" size="sm">
                          No students in {departmentName || 'this department'} yet.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      )}

      {/* ── Add Supervisor Modal ── */}
      <Modal opened={showSupModal} onClose={closeSupModal} centered size="md"
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        title={<Group gap="xs"><LuUserCheck size={16} color="var(--mantine-color-brand-6)" /><Text fw={700}>Add Supervisor</Text></Group>}
      >
        <Stack gap="sm">
          <DeptBanner institutionName={institutionName} departmentName={departmentName} />

          <TextInput label="Full Name" required size="md" placeholder="e.g. Dr. Emeka Nwosu"
            value={supName} onChange={e => setSupName(e.target.value)} />
          <TextInput label="Email" required size="md" type="email" placeholder="supervisor@institution.edu"
            value={supEmail} onChange={e => setSupEmail(e.target.value)} />
          <TextInput label="Phone Number" size="md" type="tel" placeholder="+234 800 000 0000"
            leftSection={<LuPhone size={14} color="#868e96" />}
            value={supPhone} onChange={e => setSupPhone(e.target.value)} />
          <TextInput label="Specialisation" size="md" placeholder="e.g. Machine Learning"
            value={supSpec} onChange={e => setSupSpec(e.target.value)} />

          <Divider label="Role" labelPosition="center" />
          {['Supervisor', 'Senior Supervisor', 'Co-Supervisor', 'Assistant Supervisor'].map(r => (
            <Box key={r} onClick={() => setSupRole(r)} style={{
              padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
              background: supRole === r ? '#eef2ff' : '#fff',
              border:     supRole === r ? '1.5px solid #748ffc' : '1px solid #e9ecef',
            }}>
              <Text size="sm" fw={supRole === r ? 600 : 400} c={supRole === r ? 'brand' : 'dark'}>{r}</Text>
            </Box>
          ))}

          <Text size="xs" c="dimmed" mt={4}>A login account will be created with a temporary password.</Text>
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" color="gray" onClick={closeSupModal}>Cancel</Button>
            <Button color="brand" loading={savingSup} onClick={handleAddSupervisor}
              disabled={!supName.trim() || !supEmail.trim()}>
              Add &amp; Generate Credentials
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Add Student Modal ── */}
      <Modal opened={showStuModal} onClose={closeStuModal} centered size="lg"
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        title={<Group gap="xs"><LuGraduationCap size={16} color="var(--mantine-color-brand-6)" /><Text fw={700}>Add Student</Text></Group>}
      >
        <Stack gap="sm">
          <DeptBanner institutionName={institutionName} departmentName={departmentName} />

          <TextInput label="Full Name" required size="md" placeholder="e.g. John Doe"
            value={stuName} onChange={e => setStuName(e.target.value)} />
          <TextInput label="Email" required size="md" type="email" placeholder="student@institution.edu"
            value={stuEmail} onChange={e => setStuEmail(e.target.value)} />
          <TextInput label="Phone Number" size="md" type="tel" placeholder="+234 800 000 0000"
            leftSection={<LuPhone size={14} color="#868e96" />}
            value={stuPhone} onChange={e => setStuPhone(e.target.value)} />
          <TextInput label="Matric Number" size="md" placeholder="e.g. CS/PHD/004"
            value={stuMatric} onChange={e => setStuMatric(e.target.value)} />

          <Divider label="Academic Details" labelPosition="center" />
          <Select label="Level / Role" required size="md"
            data={STUDENT_ROLES} value={stuRole}
            onChange={v => setStuRole(v ?? 'PhD Student')} />
          <TextInput label="Research Program / Topic" size="md" placeholder="e.g. Deep Learning for Healthcare"
            value={stuProgram} onChange={e => setStuProgram(e.target.value)} />
          <Select label="Assign Supervisor (optional)" size="md"
            placeholder={supervisors.length ? 'Select a supervisor from this department' : 'No supervisors in this department yet'}
            data={supervisorOptions} value={stuSupId} onChange={setStuSupId} clearable />

          <Text size="xs" c="dimmed">A login account will be created with a temporary password.</Text>
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" color="gray" onClick={closeStuModal}>Cancel</Button>
            <Button color="brand" loading={savingStu} onClick={handleAddStudent}
              disabled={!stuName.trim() || !stuEmail.trim()}>
              Add &amp; Generate Credentials
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Assign Supervisor Modal ── */}
      <Modal opened={!!assignTarget} onClose={() => { setAssignTarget(null); setNewSupId(null); }}
        title={<Text fw={700}>Assign Supervisor — {assigningStudent?.name}</Text>}
        centered size="sm" overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}>
        <Stack gap="md">
          <Text size="xs" c="dimmed">
            Showing supervisors from <strong>{departmentName || 'this department'}</strong> only.
          </Text>
          <Select label="Supervisor" placeholder="Select a supervisor"
            data={supervisorOptions} value={newSupId} onChange={setNewSupId} clearable />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => { setAssignTarget(null); setNewSupId(null); }}>Cancel</Button>
            <Button color="brand" onClick={handleAssign}>Save Assignment</Button>
          </Group>
        </Stack>
      </Modal>

      <CredentialModal creds={creds} onClose={() => setCreds(null)} />
    </Box>
  );
}
