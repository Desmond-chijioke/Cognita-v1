import { useEffect, useState } from 'react';
import {
  ActionIcon, Alert, Avatar, Badge, Box, Button, CopyButton,
  Divider, Group, Modal, Pagination, Paper, Select, SimpleGrid, Stack,
  Table, Text, TextInput, Title, Tooltip,
} from '@mantine/core';
import {
  LuPlus, LuSearch, LuUserCheck, LuUserX,
  LuKeyRound, LuCopy, LuCheck, LuPhone, LuTriangleAlert, LuInfo,
} from 'react-icons/lu';
import { useAppDispatch, useAppSelector } from '../../../Redux/hooks';
import { loadSupervisors, loadStudents } from '../../../Redux/slices/hodSlice';
import { createStaffUser, updateSupervisorAssignment } from '../../../supabase/hierarchy';
import { supabase } from '../../../supabase/client';
import { showsucessnotification, showerrornotification } from '../../../helper/notificationhelper';

// ── Helpers ────────────────────────────────────────────────────────────────────

function generatePassword(len = 10): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const STUDENT_ROLE_COLORS: Record<string, string> = {
  'PhD Student':           'blue',
  "Master's Student":      'violet',
  'Undergraduate Student': 'teal',
  'Student':               'orange',
  'Researcher':            'grape',
};

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

interface GeneratedCreds { name: string; email: string; password: string; role: string; }

function CredentialModal({ creds, onClose }: { creds: GeneratedCreds | null; onClose: () => void }) {
  return (
    <Modal
      opened={!!creds} onClose={onClose} centered size="lg"
      overlayProps={{ color: 'var(--mantine-color-brand-9)', backgroundOpacity: 0.55, blur: 3 }}
      title={<Group gap="xs"><LuKeyRound size={17} color="var(--mantine-color-brand-6)" /><Text fw={700}>Student Account Created</Text></Group>}
    >
      {creds && (
        <Stack gap="md">
          <Alert color="orange" variant="light" icon={<LuTriangleAlert size={15} />}>
            Share these credentials securely with <strong>{creds.name}</strong>. The password cannot be recovered after closing.
          </Alert>
          <Paper withBorder p="md" radius="md" bg="gray.0">
            {[
              { label: 'Level',         value: creds.role },
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

// ── Component ──────────────────────────────────────────────────────────────────

interface SBStudent { id: string; name: string; email: string; role: string; phone?: string; matric_no?: string; project_title?: string; supervisor_id?: string; created_at: string; }
interface SBSup    { id: string; name: string; role: string; }

export default function HODStudents() {
  const dispatch        = useAppDispatch();
  const user            = useAppSelector(s => s.auth.user);
  const institutionId  = user?.institutionId  ?? '';
  const institutionName = user?.institutionName ?? '';
  const departmentName = user?.departmentName  ?? '';

  // Local state — direct from Supabase
  const [rows,          setRows]          = useState<SBStudent[]>([]);
  const [supRows,       setSupRows]       = useState<SBSup[]>([]);
  const [loading,       setLoading]       = useState(true); // true = show spinner on first mount
  const [search,        setSearch]        = useState('');
  const [showModal,     setShowModal]     = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [creds,         setCreds]         = useState<GeneratedCreds | null>(null);
  const [assignTarget,  setAssignTarget]  = useState<string | null>(null);
  const [newSupId,      setNewSupId]      = useState<string | null>(null);
  const [page,          setPage]          = useState(1);
  const PAGE_SIZE = 8;

  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [phone,   setPhone]   = useState('');
  const [matric,  setMatric]  = useState('');
  const [program, setProgram] = useState('');
  const [role,    setRole]    = useState('PhD Student');
  const [supId,   setSupId]   = useState<string | null>(null);

  const STUDENT_ROLES = ['PhD Student', "Master's Student", 'Undergraduate Student', 'Student', 'Researcher'];
  const SUP_ROLES    = ['Supervisor', 'Senior Supervisor', 'Co-Supervisor', 'Assistant Supervisor'];

  // ── Helper: strict institution_id filter — no name fallback, no unscoped query ─
  const queryByInstitution = async (select: string, roles: string[]) => {
    type Row = Record<string, unknown>;
    if (!institutionId) return [] as Row[];
    const { data } = await supabase.from('users').select(select)
      .eq('institution_id', institutionId)
      .in('role', roles)
      .order('created_at', { ascending: false });
    return (data ?? []) as unknown as Row[];
  };

  // ── Load supervisors for the Add Student dropdown ─────────────────────────
  const loadDropdownSups = async () => {
    const data = await queryByInstitution('id, name, role', SUP_ROLES);
    if (data.length > 0) setSupRows(data as unknown as SBSup[]);
  };

  // ── Fetch students + supervisors from users table ─────────────────────────
  const loadAll = async () => {
    setLoading(true);
    try {
      const [studs, sups] = await Promise.all([
        // All students in the institution regardless of department
        queryByInstitution(
          'id, name, email, phone, role, created_at, matric_no, project_title, supervisor_id',
          STUDENT_ROLES,
        ),
        queryByInstitution('id, name, role', SUP_ROLES),
      ]);

      // Only overwrite state when the query actually returned data.
      // If Supabase returns empty (e.g. JWT not ready yet on first render),
      // keep whatever was already in state rather than clearing it.
      if (studs.length > 0) setRows(studs as unknown as SBStudent[]);
      if (sups.length  > 0) setSupRows(sups as unknown as SBSup[]);

      const CS = ['blue', 'violet', 'teal', 'orange', 'grape', 'cyan'];
      if (sups.length > 0) {
        dispatch(loadSupervisors(sups.map((s, i) => ({
          id:               String(s.id   ?? ''),
          name:             String(s.name ?? ''),
          email:            String(s.email ?? ''),
          specialty:        String(s.specialty ?? ''),
          role:             String(s.role ?? ''),
          studentsAssigned: studs.filter(st => st.supervisor_id === s.id).length,
          color:            CS[i % CS.length],
          addedOn:          '',
        }))));
      }
      if (studs.length > 0) {
        dispatch(loadStudents(studs.map((st: Record<string, unknown>, i: number) => ({
          id:           String(st.id   ?? ''),
          name:         String(st.name ?? ''),
          email:        String(st.email ?? ''),
          matricNo:     String(st.matric_no     ?? ''),
          program:      String(st.project_title ?? ''),
          role:         String(st.role ?? ''),
          supervisorId: (st.supervisor_id as string | null) ?? null,
          color:        ['orange','indigo','blue','red','green','grape'][i % 6],
          addedOn:      new Date(String(st.created_at)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        }))));
      }
    } finally {
      setLoading(false);
    }
  };

  const myId = user?.id ?? '';
  useEffect(() => { loadAll(); }, [institutionId, myId]);
  useEffect(() => { setPage(1); }, [search]);

  const supervisorOptions = supRows.map(s => ({ value: s.id, label: `${s.name}` }));
  const supervisorInfo = (id: string | null) => id ? (supRows.find(s => s.id === id) ?? null) : null;
  const supervisorName = (id: string | null) =>
    id ? (supRows.find(s => s.id === id)?.name ?? '—') : null;

  const filtered = search
    ? rows.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.matric_no ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (s.project_title ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : rows;

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const closeAddModal = () => {
    setShowModal(false);
    setName(''); setEmail(''); setPhone(''); setMatric(''); setProgram(''); setRole('PhD Student'); setSupId(null);
  };

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    const password = generatePassword();
    try {
      await createStaffUser({
        name:            name.trim(),
        email:           email.trim().toLowerCase(),
        phone:           phone.trim(),
        password,
        role,
        institutionId,
        institutionName,
        department:      departmentName || undefined,
        matricNo:        matric.trim(),
        projectTitle:    program.trim(),
        supervisorId:    supId ?? undefined,
      });

      // Show credentials and close form immediately
      setCreds({ name: name.trim(), email: email.trim().toLowerCase(), password, role });
      closeAddModal();
      showsucessnotification({ message: `${name.trim()} added with login credentials.` });

      // Re-fetch so the table updates immediately without a full page refresh
      loadAll();
    } catch (err: unknown) {
      showerrornotification({ message: err instanceof Error ? err.message : 'Failed to create student account.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!assignTarget) return;
    const student = rows.find(s => s.id === assignTarget);
    const supName = supervisorName(newSupId);
    try {
      await updateSupervisorAssignment(assignTarget, newSupId);
      // Update local state directly
      setRows(prev => prev.map(s => s.id === assignTarget ? { ...s, supervisor_id: newSupId ?? undefined } : s));
      showsucessnotification({
        message: supName
          ? `${student?.name} assigned to ${supName}.`
          : `${student?.name}'s supervisor assignment cleared.`,
      });
    } catch (err: unknown) {
      showerrornotification({ message: err instanceof Error ? err.message : 'Failed to save assignment.' });
    }
    setAssignTarget(null); setNewSupId(null);
  };

  const assigningStudent = assignTarget ? rows.find(s => s.id === assignTarget) : null;

  return (
    <Box p="xl">

      {/* Header */}
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Students</Title>
          <Text size="sm" c="dimmed">
            {departmentName ? `${departmentName} — ` : ''}Add students and assign them to supervisors.
          </Text>
        </Box>
        <Button leftSection={<LuPlus size={14} />} color="brand" onClick={() => { setShowModal(true); loadDropdownSups(); }}>
          Add Student
        </Button>
      </Group>

      {/* Stats */}
      <SimpleGrid cols={{ base: 2, md: 4 }} mb="xl">
        {[
          { label: 'Total Students', value: rows.length },
          { label: 'Assigned',       value: rows.filter(s => s.supervisor_id).length },
          { label: 'Unassigned',     value: rows.filter(s => !s.supervisor_id).length },
          { label: 'PhD Students',   value: rows.filter(s => s.role === 'PhD Student').length },
        ].map(({ label, value }) => (
          <Paper key={label} withBorder p="md" radius="md" bg="white">
            <Text fw={800} size="xl">{value}</Text>
            <Text size="sm" c="dimmed">{label}</Text>
          </Paper>
        ))}
      </SimpleGrid>

      <TextInput
        placeholder="Search by name, matric, or program…"
        leftSection={<LuSearch size={15} />}
        value={search} onChange={e => setSearch(e.currentTarget.value)}
        mb="md" size="md"
      />

      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        <Table highlightOnHover verticalSpacing="md">
          <Table.Thead>
            <Table.Tr style={{ background: '#f8f9fa' }}>
              {['Student', 'Matric No', 'Research Program', 'Level', 'Supervisor', 'Added', ''].map(h => (
                <Table.Th key={h}><Text size="xs" c="dimmed" fw={600}>{h}</Text></Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginated.map((st: SBStudent) => (
              <Table.Tr key={st.id}>
                <Table.Td>
                  <Group gap="sm" wrap="nowrap">
                    <Avatar color="teal" radius="xl" size="md">{getInitials(st.name)}</Avatar>
                    <Box>
                      <Text size="sm" fw={600}>{st.name}</Text>
                      <Text size="xs" c="dimmed">{st.email}</Text>
                    </Box>
                  </Group>
                </Table.Td>
                <Table.Td><Text size="sm" ff="monospace">{st.matric_no || '—'}</Text></Table.Td>
                <Table.Td><Text size="sm" lineClamp={1} style={{ maxWidth: 180 }}>{st.project_title || '—'}</Text></Table.Td>
                <Table.Td><Badge color={STUDENT_ROLE_COLORS[st.role] ?? 'gray'} variant="light" size="sm">{st.role}</Badge></Table.Td>
                <Table.Td>
                  {st.supervisor_id ? (
                    <Group gap={4} wrap="nowrap">
                      <LuUserCheck size={13} color="#2f9e44" />
                      <Box>
                        <Text size="sm" c="green.7">{supervisorName(st.supervisor_id)}</Text>
                        <Text size="xs" c="dimmed">{supervisorInfo(st.supervisor_id)?.role ?? ''}</Text>
                      </Box>
                    </Group>
                  ) : (
                    <Group gap={4} wrap="nowrap">
                      <LuUserX size={13} color="#fa5252" />
                      <Text size="sm" c="red.6">Unassigned</Text>
                    </Group>
                  )}
                </Table.Td>
                <Table.Td><Text size="xs" c="dimmed">{new Date(st.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text></Table.Td>
                <Table.Td>
                  <ActionIcon variant="light" color="brand" size="sm" title="Assign supervisor"
                    onClick={() => { setAssignTarget(st.id); setNewSupId(st.supervisor_id ?? null); }}>
                    <LuUserCheck size={13} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
            {paginated.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={7}><Text ta="center" c="dimmed" py="xl" size="sm">No students found.</Text></Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {totalPages > 1 && (
        <Group justify="space-between" mt="md" align="center">
          <Text size="xs" c="dimmed">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} students
          </Text>
          <Pagination value={page} onChange={setPage} total={totalPages} size="sm" color="brand" />
        </Group>
      )}

      {/* Add Student Modal */}
      <Modal opened={showModal} onClose={closeAddModal} centered size="lg"
        overlayProps={{ color: 'var(--mantine-color-brand-9)', backgroundOpacity: 0.55, blur: 3 }}
        title={<Group gap="xs"><LuUserCheck size={16} color="var(--mantine-color-brand-6)" /><Text fw={700}>Add Student</Text></Group>}
      >
        <Stack gap="sm">
          {/* Institution context */}
          <Box style={{ background: '#f0f4ff', borderRadius: 8, padding: '8px 12px', border: '1px solid #c5d2fb' }}>
            <Group gap={6}>
              <LuInfo size={13} color="#3b5bdb" />
              <Text size="xs" c="brand.7" fw={600}>Institution · Department</Text>
            </Group>
            <Text size="sm" fw={600} mt={2}>{institutionName}</Text>
            <Text size="xs" c="dimmed">{departmentName} · <Text component="span" ff="monospace">{institutionId}</Text></Text>
          </Box>

          <TextInput label="Full Name" required size="md" placeholder="e.g. John Doe"
            value={name} onChange={e => setName(e.target.value)} />
          <TextInput label="Email" required size="md" type="email" placeholder="student@institution.edu"
            value={email} onChange={e => setEmail(e.target.value)} />
          <TextInput label="Phone Number" size="md" type="tel" placeholder="+234 800 000 0000"
            leftSection={<LuPhone size={14} color="#868e96" />}
            value={phone} onChange={e => setPhone(e.target.value)} />
          <TextInput label="Matric Number" size="md" placeholder="e.g. CS/PHD/004"
            value={matric} onChange={e => setMatric(e.target.value)} />

          <Divider label="Academic Details" labelPosition="center" />

          <Select label="Level / Role" data={STUDENT_ROLES} value={role}
            onChange={v => setRole(v ?? 'PhD Student')} size="md" required />
          <TextInput label="Research Program / Topic" size="md" placeholder="e.g. Deep Learning for Healthcare"
            value={program} onChange={e => setProgram(e.target.value)} />
          <Select label="Assign Supervisor (optional)" size="md"
            placeholder={supRows.length ? 'Select a supervisor' : 'No supervisors added yet'}
            data={supervisorOptions} value={supId} onChange={setSupId} clearable />

          <Text size="xs" c="dimmed">A login account will be created with a temporary password.</Text>
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" color="gray" onClick={closeAddModal}>Cancel</Button>
            <Button color="brand" loading={saving} onClick={handleAdd}
              disabled={!name.trim() || !email.trim()}>
              Add &amp; Generate Credentials
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Assign Supervisor Modal */}
      <Modal opened={!!assignTarget} onClose={() => { setAssignTarget(null); setNewSupId(null); }}
        title={<Text fw={700}>Assign Supervisor — {assigningStudent?.name}</Text>}
        centered size="sm" overlayProps={{ color: 'var(--mantine-color-brand-9)', backgroundOpacity: 0.55, blur: 3 }}>
        <Stack gap="md">
          <Select
            label="Supervisor"
            placeholder="Select a supervisor"
            data={supervisorOptions}
            value={newSupId}
            onChange={setNewSupId}
            clearable
          />
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
