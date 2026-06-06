import { useEffect, useState } from 'react';
import {
  ActionIcon, Alert, Avatar, Badge, Box, Button, CopyButton,
  Divider, Group, Modal, Pagination, Paper, SimpleGrid, Stack,
  Table, Text, TextInput, Title, Tooltip,
} from '@mantine/core';
import {
  LuPlus, LuSearch, LuTrash2, LuUserCheck, LuRefreshCw,
  LuKeyRound, LuCopy, LuCheck, LuPhone, LuTriangleAlert, LuInfo,
} from 'react-icons/lu';
import { useAppDispatch, useAppSelector } from '../../../Redux/hooks';
import { removeSupervisor, loadSupervisors, loadStudents } from '../../../Redux/slices/hodSlice';
import { createStaffUser } from '../../../supabase/hierarchy';
import { supabase } from '../../../supabase/client';
import { showsucessnotification, showerrornotification } from '../../../helper/notificationhelper';

// ── Helpers ────────────────────────────────────────────────────────────────────

function generatePassword(len = 10): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const ROLE_COLOR: Record<string, string> = {
  'Supervisor':        'blue',
  'Senior Supervisor': 'violet',
  'Co-Supervisor':     'teal',
};

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

interface GeneratedCreds { name: string; email: string; password: string; role: string; }

// ── Credential Modal ───────────────────────────────────────────────────────────

function CredentialModal({ creds, onClose }: { creds: GeneratedCreds | null; onClose: () => void }) {
  return (
    <Modal
      opened={!!creds} onClose={onClose} centered size="sm"
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      title={<Group gap="xs"><LuKeyRound size={17} color="var(--mantine-color-brand-6)" /><Text fw={700}>Supervisor Account Created</Text></Group>}
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

// ── Component ──────────────────────────────────────────────────────────────────

interface SBUser { id: string; name: string; email: string; role: string; specialty?: string; department?: string; phone?: string; created_at: string; }

export default function HODSupervisors() {
  const dispatch        = useAppDispatch();
  const user            = useAppSelector(s => s.auth.user);
  const institutionId   = user?.institutionId   ?? '';
  const institutionName = user?.institutionName ?? '';
  const departmentName  = user?.departmentName  ?? '';

  // Local table state — direct from Supabase, no Redux middleman
  const [rows,       setRows]      = useState<SBUser[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [search,     setSearch]    = useState('');
  const [showModal,  setShowModal] = useState(false);
  const [saving,     setSaving]    = useState(false);
  const [creds,      setCreds]     = useState<GeneratedCreds | null>(null);

  // Form fields
  const [name,       setName]   = useState('');
  const [email,      setEmail]  = useState('');
  const [phone,      setPhone]  = useState('');
  const [specialty,  setSpec]   = useState('');
  const [department, setDept]   = useState(departmentName);
  const [role,       setRole]   = useState('Supervisor');

  // ── All supervisor-type roles ────────────────────────────────────────────────
  const SUP_ROLES = ['Supervisor', 'Senior Supervisor', 'Co-Supervisor'];

  // ── Fetch supervisors via edge function (service role, bypasses RLS) ────────
  const loadSupervisorRows = async () => {
    setLoading(true);
    try {
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('rapid-responder', {
        body: { action: 'fetch_users', institutionId, roles: SUP_ROLES },
      });

      let result: SBUser[] = [];

      if (!edgeError && Array.isArray(edgeData?.users)) {
        result = edgeData.users as SBUser[];
      } else {
        // Fallback: direct query with institution_id
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email, phone, specialty, department, role, created_at')
          .eq('institution_id', institutionId)
          .in('role', SUP_ROLES)
          .order('created_at');
        if (error) console.error('[HODSupervisors] fetch error:', error.message);
        result = (data ?? []) as SBUser[];
      }

      // Only overwrite when query returned data — prevents clearing on JWT-not-ready render
      if (result.length > 0) {
        setRows(result);
        const CS = ['blue', 'violet', 'teal', 'orange', 'grape', 'cyan'];
        dispatch(loadSupervisors(result.map((s, i) => ({
          id: s.id, name: s.name, email: s.email,
          specialty: s.specialty ?? '', role: s.role,
          studentsAssigned: 0, color: CS[i % CS.length],
          addedOn: new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        }))));
      }
    } finally {
      setLoading(false);
    }
  };

  const myId = user?.id ?? '';
  useEffect(() => { loadSupervisorRows(); }, [institutionId, institutionName, myId]);

  const [page,     setPage]  = useState(1);
  const PAGE_SIZE = 15;

  const filtered = search
    ? rows.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.specialty ?? '').toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
      )
    : rows;

  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const closeModal = () => {
    setShowModal(false);
    setName(''); setEmail(''); setPhone(''); setSpec(''); setDept(departmentName); setRole('Supervisor');
  };

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    const password = generatePassword();
    try {
      // Create Supabase auth account + users table row
      await createStaffUser({
        name:            name.trim(),
        email:           email.trim().toLowerCase(),
        phone:           phone.trim(),
        password,
        role,
        institutionId,
        institutionName,
        specialty:       specialty.trim(),
        department:      department.trim(),
      });

      // Show credentials and close form immediately
      setCreds({ name: name.trim(), email: email.trim().toLowerCase(), password, role });
      closeModal();
      showsucessnotification({ message: `${name.trim()} added as supervisor with login credentials.` });

      // Reload table in background (non-blocking)
      const CS = ['blue', 'violet', 'teal', 'orange', 'grape', 'cyan'];
      supabase
        .from('users')
        .select('id, name, email, phone, specialty, department, role, created_at')
        .eq('institution_id', institutionId)
        .in('role', ['Supervisor', 'Senior Supervisor', 'Co-Supervisor'])
        .order('created_at')
        .then(({ data: fresh }) => {
          if (fresh && fresh.length > 0) {
            dispatch(loadSupervisors(fresh.map((s: Record<string, string>, i: number) => ({
              id:               s.id,
              name:             s.name,
              email:            s.email,
              specialty:        s.specialty ?? '',
              role:             s.role,
              studentsAssigned: 0,
              color:            CS[i % CS.length],
              addedOn:          new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            }))));
          }
        });
    } catch (err: unknown) {
      showerrornotification({ message: err instanceof Error ? err.message : 'Failed to create supervisor account.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (id: string, supName: string) => {
    dispatch(removeSupervisor(id));
    showsucessnotification({ message: `${supName} has been removed from the department.` });
  };

  return (
    <Box p="xl">

      {/* Header */}
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Supervisors</Title>
          <Text size="sm" c="dimmed">
            {departmentName ? `${departmentName} — ` : ''}Add and manage supervisors in your department.
          </Text>
        </Box>
        <Button leftSection={<LuPlus size={14} />} color="brand" onClick={() => setShowModal(true)}>
          Add Supervisor
        </Button>
      </Group>

      {/* Stats */}
      <SimpleGrid cols={{ base: 2, md: 3 }} mb="xl">
        {[
          { label: 'Total Supervisors',         value: rows.length },
          { label: 'Filtered',                  value: filtered.length },
          { label: 'Roles',                     value: [...new Set(rows.map(s => s.role))].length },
        ].map(({ label, value }) => (
          <Paper key={label} withBorder p="md" radius="md" bg="white">
            <Text fw={800} size="xl">{value}</Text>
            <Text size="sm" c="dimmed">{label}</Text>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Search */}
      <TextInput
        placeholder="Search by name, specialty, or email…"
        leftSection={<LuSearch size={15} />}
        value={search}
        onChange={e => setSearch(e.currentTarget.value)}
        mb="md" size="md"
      />

      {/* Table */}
      {loading ? (
        <Box ta="center" py="xl"><LuRefreshCw size={24} color="#adb5bd" style={{ animation: 'spin 1s linear infinite' }} /></Box>
      ) : (
        <>
          <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
            <Table highlightOnHover verticalSpacing="md">
              <Table.Thead>
                <Table.Tr style={{ background: '#f8f9fa' }}>
                  {['Supervisor', 'Email', 'Specialisation', 'Department', 'Role', 'Phone', 'Added'].map(h => (
                    <Table.Th key={h}><Text size="xs" c="dimmed" fw={600}>{h}</Text></Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginated.map((sv: SBUser) => (
                  <Table.Tr key={sv.id}>
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <Avatar color="blue" radius="xl" size="md">{getInitials(sv.name)}</Avatar>
                        <Text size="sm" fw={600}>{sv.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{sv.email}</Text></Table.Td>
                    <Table.Td><Text size="sm">{sv.specialty || '—'}</Text></Table.Td>
                    <Table.Td><Text size="sm">{sv.department || '—'}</Text></Table.Td>
                    <Table.Td>
                      <Badge color={ROLE_COLOR[sv.role] ?? 'gray'} variant="light" size="sm">{sv.role}</Badge>
                    </Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{sv.phone || '—'}</Text></Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{new Date(sv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text></Table.Td>
                  </Table.Tr>
                ))}
                {paginated.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text ta="center" c="dimmed" py="xl" size="sm">No supervisors found. Add one above or create via Faculty & Depts.</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>

          {totalPages > 1 && (
            <Group justify="space-between" mt="md" align="center">
              <Text size="xs" c="dimmed">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} supervisors
              </Text>
              <Pagination value={page} onChange={setPage} total={totalPages} size="sm" color="brand" />
            </Group>
          )}
        </>
      )}

      {/* Add Supervisor Modal */}
      <Modal
        opened={showModal} onClose={closeModal} centered size="md"
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        title={<Group gap="xs"><LuUserCheck size={16} color="var(--mantine-color-brand-6)" /><Text fw={700}>Add Supervisor</Text></Group>}
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

          <TextInput label="Full Name" required size="md" placeholder="e.g. Dr. Emeka Nwosu"
            value={name} onChange={e => setName(e.target.value)} />
          <TextInput label="Email" required size="md" type="email" placeholder="supervisor@institution.edu"
            value={email} onChange={e => setEmail(e.target.value)} />
          <TextInput label="Phone Number" size="md" type="tel" placeholder="+234 800 000 0000"
            leftSection={<LuPhone size={14} color="#868e96" />}
            value={phone} onChange={e => setPhone(e.target.value)} />
          <TextInput
            label="Specialisation"
            size="md"
            placeholder="e.g. Machine Learning, Environmental Science"
            value={specialty}
            onChange={e => setSpec(e.target.value)}
          />
          <TextInput
            label="Department"
            size="md"
            placeholder="e.g. Computer Science"
            value={department}
            onChange={e => setDept(e.target.value)}
          />

          <Divider label="Role" labelPosition="center" />
          {['Supervisor', 'Senior Supervisor', 'Co-Supervisor'].map(r => (
            <Box key={r}
              onClick={() => setRole(r)}
              style={{
                padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                background: role === r ? '#eef2ff' : '#fff',
                border: role === r ? '1.5px solid #748ffc' : '1px solid #e9ecef',
              }}
            >
              <Text size="sm" fw={role === r ? 600 : 400} c={role === r ? 'brand' : 'dark'}>{r}</Text>
            </Box>
          ))}

          <Text size="xs" c="dimmed" mt={4}>A login account will be created with a temporary password.</Text>
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" color="gray" onClick={closeModal}>Cancel</Button>
            <Button color="brand" loading={saving} onClick={handleAdd}
              disabled={!name.trim() || !email.trim()}>
              Add &amp; Generate Credentials
            </Button>
          </Group>
        </Stack>
      </Modal>

      <CredentialModal creds={creds} onClose={() => setCreds(null)} />
    </Box>
  );
}
