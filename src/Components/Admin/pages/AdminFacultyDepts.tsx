import { useEffect, useState } from 'react';
import {
  ActionIcon, Alert, Badge, Box, Button, CopyButton, Divider, Group,
  Loader, Modal, Paper, SimpleGrid, Stack, Text, TextInput, ThemeIcon, Title, Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuBuilding2, LuGraduationCap, LuKeyRound, LuPlus, LuLandmark,
  LuCopy, LuCheck, LuTrash2, LuUsers, LuChevronRight, LuUserCheck,
  LuRefreshCw, LuTriangleAlert, LuPhone, LuInfo,
} from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import {
  fetchHierarchy, insertCollege, insertFaculty, insertDepartment,
  deleteCollege as dbDeleteCollege, deleteFaculty as dbDeleteFaculty,
  deleteDepartment as dbDeleteDepartment, createStaffUser,
} from '../../../supabase/hierarchy';
import type { DBCollege, DBFaculty, DBDepartment } from '../../../supabase/hierarchy';
import {showerrornotification, showsucessnotification} from '../../../helper/notificationhelper'; 
// ── Helpers ────────────────────────────────────────────────────────────────────

function generateCredentials(name: string) {
  const parts    = name.trim().split(' ').filter(Boolean);
  const base     = ((parts[0]?.[0] ?? '') + (parts[1] ?? '')).toLowerCase();
  const username = base + Math.floor(100 + Math.random() * 900);
  const chars    = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
  const password = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return { username, password };
}

interface GeneratedCreds { name: string; role: string; email: string; username: string; password: string; }

// ── Credential Modal ───────────────────────────────────────────────────────────

function CredentialModal({ creds, onClose }: { creds: GeneratedCreds | null; onClose: () => void }) {
  return (
    <Modal
      opened={!!creds} onClose={onClose} centered size="sm"
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      title={
        <Group gap="xs">
          <LuKeyRound size={17} color="var(--mantine-color-brand-6)" />
          <Text fw={700}>Account Created</Text>
        </Group>
      }
    >
      {creds && (
        <Stack gap="md">
          <Alert color="orange" variant="light" icon={<LuTriangleAlert size={15} />}>
            Share these credentials securely with <strong>{creds.name}</strong>.
            The password cannot be recovered after closing.
          </Alert>
          <Paper withBorder p="md" radius="md" bg="gray.0">
            {[
              { label: 'Role',          value: creds.role },
              { label: 'Login Email',   value: creds.email },
              { label: 'Username',      value: creds.username },
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
          <Text size="xs" c="dimmed">
            They can log in at <strong>/login</strong> using the email and password above.
          </Text>
          <Button fullWidth color="brand" onClick={onClose}>Done</Button>
        </Stack>
      )}
    </Modal>
  );
}

// ── NodeCard ───────────────────────────────────────────────────────────────────

interface NodeCardProps {
  name:         string;
  leaderLabel:  string;
  leaderName:   string;
  leaderEmail:  string;
  badge?:       string;
  badgeColor?:  string;
  selected?:    boolean;
  hasChildren?: boolean;
  onSelect?:    () => void;
  onDelete:     () => void;
}

function NodeCard({ name, leaderLabel, leaderName, leaderEmail, badge, badgeColor = 'blue', selected, hasChildren, onSelect, onDelete }: NodeCardProps) {
  return (
    <Box
      onClick={onSelect}
      style={{
        padding: '10px 12px', borderRadius: 8, marginBottom: 6,
        cursor: onSelect ? 'pointer' : 'default',
        background: selected ? '#eef2ff' : '#fff',
        border: selected ? '1.5px solid #748ffc' : '1px solid #e9ecef',
        transition: 'all 0.12s',
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap={6} mb={2} wrap="nowrap">
            <Text size="sm" fw={600} lineClamp={1} style={{ color: selected ? '#3b5bdb' : '#212529' }}>
              {name}
            </Text>
            {badge && <Badge size="xs" color={badgeColor} variant="light" style={{ flexShrink: 0 }}>{badge}</Badge>}
          </Group>
          <Text size="xs" c="dimmed" lineClamp={1}>
            <Text component="span" size="xs" fw={500} c="dimmed">{leaderLabel}: </Text>
            {leaderName}
          </Text>
          {leaderEmail && <Text size="xs" c="dimmed" lineClamp={1}>{leaderEmail}</Text>}
        </Box>
        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
          {hasChildren && <LuChevronRight size={14} color={selected ? '#748ffc' : '#adb5bd'} />}
          <ActionIcon size="xs" color="red" variant="subtle"
            onClick={e => { e.stopPropagation(); onDelete(); }}>
            <LuTrash2 size={12} />
          </ActionIcon>
        </Group>
      </Group>
    </Box>
  );
}

// ── HierarchyPanel ─────────────────────────────────────────────────────────────

interface PanelProps {
  icon:         React.ElementType;
  color:        string;
  title:        string;
  subtitle:     string;
  count:        number;
  onAdd:        () => void;
  addLabel:     string;
  addDisabled?: boolean;
  addHint?:     string;
  loading?:     boolean;
  children:     React.ReactNode;
  isEmpty?:     boolean;
  emptyText?:   string;
}

function HierarchyPanel({ icon: Icon, color, title, subtitle, count, onAdd, addLabel, addDisabled, addHint, loading, children, isEmpty, emptyText }: PanelProps) {
  return (
    <Paper withBorder radius="md" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box px="md" py="sm" style={{ borderBottom: '1px solid #f1f3f5', flexShrink: 0, background: '#fafbff' }}>
        <Group gap="sm" mb={6}>
          <ThemeIcon size={30} radius="md" style={{ background: color + '18', color }}>
            <Icon size={15} />
          </ThemeIcon>
          <Box>
            <Text size="sm" fw={700} lh={1.2}>{title}</Text>
            <Text size="xs" c="dimmed">{subtitle}</Text>
          </Box>
          <Badge size="sm" color="gray" variant="light" ml="auto">{count}</Badge>
        </Group>
        <Tooltip label={addHint ?? ''} withArrow disabled={!addDisabled || !addHint}>
          <Button
            size="xs" variant="light" color="brand" fullWidth
            leftSection={<LuPlus size={13} />}
            onClick={onAdd} disabled={addDisabled}
          >
            {addLabel}
          </Button>
        </Tooltip>
      </Box>
      <Box p="sm" style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <Stack align="center" py={24} gap={8}>
            <Loader size="sm" color="brand" />
            <Text size="xs" c="dimmed">Loading…</Text>
          </Stack>
        ) : isEmpty ? (
          <Stack align="center" py={24} gap={6}>
            <Icon size={28} color="#ced4da" />
            <Text size="xs" c="dimmed" ta="center">{emptyText}</Text>
          </Stack>
        ) : children}
      </Box>
    </Paper>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminFacultyDepts() {
  const user            = useAppSelector(s => s.auth.user);
  const institutionId   = user?.institutionId   ?? '';
  const institutionName = user?.institutionName ?? 'Institution';

  // ── Data state ──────────────────────────────────────────────────────────────
  const [colleges,    setColleges]    = useState<DBCollege[]>([]);
  const [faculties,   setFaculties]   = useState<DBFaculty[]>([]);
  const [departments, setDepartments] = useState<DBDepartment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [creds,       setCreds]       = useState<GeneratedCreds | null>(null);

  // ── Selection ────────────────────────────────────────────────────────────────
  const [selectedCollegeId, setSelectedCollegeId] = useState<string | null>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);

  // ── College modal ────────────────────────────────────────────────────────────
  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [colName,          setColName]          = useState('');
  const [colDeanName,      setColDeanName]      = useState('');
  const [colDeanEmail,     setColDeanEmail]     = useState('');
  const [colDeanPhone,     setColDeanPhone]     = useState('');
  const [savingCol,        setSavingCol]        = useState(false);

  // ── Faculty modal ────────────────────────────────────────────────────────────
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [facName,          setFacName]          = useState('');
  const [facDeanName,      setFacDeanName]      = useState('');
  const [facDeanEmail,     setFacDeanEmail]     = useState('');
  const [facDeanPhone,     setFacDeanPhone]     = useState('');
  const [savingFac,        setSavingFac]        = useState(false);

  // ── Department modal ─────────────────────────────────────────────────────────
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptName,      setDeptName]      = useState('');
  const [deptHodName,   setDeptHodName]   = useState('');
  const [deptHodEmail,  setDeptHodEmail]  = useState('');
  const [deptHodPhone,  setDeptHodPhone]  = useState('');
  const [savingDept,    setSavingDept]    = useState(false);

  // ── Load data whenever institutionId changes ─────────────────────────────────
  useEffect(() => {
    if (!institutionId) { setLoading(false); return; }
    setLoading(true);   // always reset spinner before each fetch
    fetchHierarchy(institutionId)
      .then(({ colleges: c, faculties: f, departments: d }) => {
        setColleges(c);
        setFaculties(f);
        setDepartments(d);
      })
      .catch(err => showerrornotification({ message: err.message || 'Failed to load hierarchy data.' }))
      .finally(() => setLoading(false));
  }, [institutionId]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const selectedCollege  = colleges.find(c => c.id === selectedCollegeId) ?? null;
  const selectedFaculty  = faculties.find(f => f.id === selectedFacultyId) ?? null;
  const panelFaculties   = faculties.filter(f =>
    selectedCollegeId ? f.college_id === selectedCollegeId : f.college_id === null,
  );
  const panelDepartments = departments.filter(d => d.faculty_id === selectedFacultyId);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const saveCollege = async () => {
    if (!colName.trim() || !colDeanName.trim()) return;
    setSavingCol(true);
    try {
      const { username, password } = generateCredentials(colDeanName);

      // Create Provost account first → get userId for FK reference
      let deanId: string | null = null;
      if (colDeanEmail.trim()) {
        try {
          const result = await createStaffUser({ name: colDeanName.trim(), email: colDeanEmail.trim(), phone: colDeanPhone.trim(), password, role: 'Provost', institutionId, institutionName });
          deanId = result.userId;
        } catch {
          notifications.show({ title: 'Note', message: 'Provost login account could not be created. College will be saved without a Provost assigned.', color: 'yellow' });
        }
      }

      // Save college with dean_id (reused for Provost FK)
      const id = await insertCollege({ institution_id: institutionId, name: colName.trim(), dean_id: deanId });

      setColleges(prev => [...prev, {
        id, institution_id: institutionId, name: colName.trim(), dean_id: deanId,
        dean: deanId ? { id: deanId, name: colDeanName.trim(), email: colDeanEmail.trim(), phone: colDeanPhone.trim() } : null,
        created_at: new Date().toISOString(),
      }]);
      setCreds({ name: colDeanName.trim(), role: 'Provost', email: colDeanEmail.trim(), username, password });
      setShowCollegeModal(false);
      setColName(''); setColDeanName(''); setColDeanEmail(''); setColDeanPhone('');
      showsucessnotification({ message: `${colName.trim()} created successfully!` });
    } catch (err: unknown) {
      showerrornotification({ message: err instanceof Error ? err.message : 'Failed to save college.' });
    } finally {
      setSavingCol(false);
    }
  };

  const saveFaculty = async () => {
    if (!facName.trim() || !facDeanName.trim()) return;
    setSavingFac(true);
    try {
      const { username, password } = generateCredentials(facDeanName);

      // Step 1: Save faculty — must succeed
      // Step 1: Create dean's account → get userId
      let facDeanId: string | null = null;
      if (facDeanEmail.trim()) {
        try {
          const result = await createStaffUser({ name: facDeanName.trim(), email: facDeanEmail.trim(), phone: facDeanPhone.trim(), password, role: 'Dean', institutionId, institutionName });
          facDeanId = result.userId;
        } catch {
          notifications.show({ title: 'Note', message: 'Dean login account could not be created. Faculty will be saved without a dean assigned.', color: 'yellow' });
        }
      }

      // Step 2: Save faculty with dean_id reference
      const id = await insertFaculty({ institution_id: institutionId, college_id: selectedCollegeId, name: facName.trim(), dean_id: facDeanId });

      setFaculties(prev => [...prev, {
        id, institution_id: institutionId, college_id: selectedCollegeId, name: facName.trim(), dean_id: facDeanId,
        dean: facDeanId ? { id: facDeanId, name: facDeanName.trim(), email: facDeanEmail.trim(), phone: facDeanPhone.trim() } : null,
        created_at: new Date().toISOString(),
      }]);
      setCreds({ name: facDeanName.trim(), role: 'Dean', email: facDeanEmail.trim(), username, password });
      setShowFacultyModal(false);
      setFacName(''); setFacDeanName(''); setFacDeanEmail(''); setFacDeanPhone('');
      showsucessnotification({ message: `${facName.trim()} created successfully!` });
    } catch (err: unknown) {
      showerrornotification({ message: err instanceof Error ? err.message : 'Failed to save faculty.' });
    } finally {
      setSavingFac(false);
    }
  };

  const saveDepartment = async () => {
    if (!deptName.trim() || !deptHodName.trim() || !selectedFacultyId) return;
    setSavingDept(true);
    try {
      const { username, password } = generateCredentials(deptHodName);

      // Step 1: Save department — must succeed
      // Step 1: Create HoD's account → get userId
      let hodId: string | null = null;
      if (deptHodEmail.trim()) {
        try {
          const result = await createStaffUser({ name: deptHodName.trim(), email: deptHodEmail.trim(), phone: deptHodPhone.trim(), password, role: 'Head of Department', institutionId, institutionName });
          hodId = result.userId;
        } catch {
          notifications.show({ title: 'Note', message: 'HoD login account could not be created. Department will be saved without an HoD assigned.', color: 'yellow' });
        }
      }

      // Step 2: Save department with hod_id reference
      const id = await insertDepartment({ institution_id: institutionId, faculty_id: selectedFacultyId, name: deptName.trim(), hod_id: hodId, students: 0 });

      setDepartments(prev => [...prev, {
        id, institution_id: institutionId, faculty_id: selectedFacultyId, name: deptName.trim(), hod_id: hodId,
        hod: hodId ? { id: hodId, name: deptHodName.trim(), email: deptHodEmail.trim(), phone: deptHodPhone.trim() } : null,
        students: 0, created_at: new Date().toISOString(),
      }]);
      setCreds({ name: deptHodName.trim(), role: 'Head of Department', email: deptHodEmail.trim(), username, password });
      setShowDeptModal(false);
      setDeptName(''); setDeptHodName(''); setDeptHodEmail(''); setDeptHodPhone('');
      showsucessnotification({ message: `${deptName.trim()} created successfully!` });
    } catch (err: unknown) {
      showerrornotification({ message: err instanceof Error ? err.message : 'Failed to save department.' });
    } finally {
      setSavingDept(false);
    }
  };

  const handleDeleteCollege = async (id: string) => {
    try {
      await dbDeleteCollege(id);
      setColleges(prev => prev.filter(c => c.id !== id));
      if (selectedCollegeId === id) { setSelectedCollegeId(null); setSelectedFacultyId(null); }
    } catch (err: unknown) {
      notifications.show({ title: 'Error', message: err instanceof Error ? err.message : 'Delete failed', color: 'red' });
    }
  };

  const handleDeleteFaculty = async (id: string) => {
    try {
      await dbDeleteFaculty(id);
      setFaculties(prev => prev.filter(f => f.id !== id));
      if (selectedFacultyId === id) setSelectedFacultyId(null);
    } catch (err: unknown) {
      notifications.show({ title: 'Error', message: err instanceof Error ? err.message : 'Delete failed', color: 'red' });
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    try {
      await dbDeleteDepartment(id);
      setDepartments(prev => prev.filter(d => d.id !== id));
    } catch (err: unknown) {
      notifications.show({ title: 'Error', message: err instanceof Error ? err.message : 'Delete failed', color: 'red' });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Box p="xl">

      {/* Header */}
      <Group justify="space-between" mb="xl" wrap="nowrap">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>
            Institutional Structure
          </Title>
          <Text size="sm" c="dimmed" mt={2}>
            <strong>{institutionName}</strong> — Institution → College → Faculty → Department
            {institutionId && (
              <Text component="span" size="xs" c="dimmed" ml={8} ff="monospace">({institutionId})</Text>
            )}
          </Text>
        </Box>
        <Tooltip label="Reload from Supabase" withArrow>
          <ActionIcon
            variant="subtle" color="brand" size="lg"
            onClick={() => {
              setLoading(true);
              fetchHierarchy(institutionId).then(({ colleges: c, faculties: f, departments: d }) => {
                setColleges(c); setFaculties(f); setDepartments(d);
              }).finally(() => setLoading(false));
            }}
          >
            <LuRefreshCw size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Stats */}
      <SimpleGrid cols={{ base: 2, md: 4 }} mb="xl">
        {[
          { label: 'Colleges',    value: colleges.length,    icon: LuLandmark,    color: '#7950f2' },
          { label: 'Faculties',   value: faculties.length,   icon: LuBuilding2,   color: '#1971c2' },
          { label: 'Departments', value: departments.length, icon: LuUsers,       color: '#2f9e44' },
          { label: 'Staff Heads', value: colleges.length + faculties.length + departments.length, icon: LuUserCheck, color: '#e67700' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Paper key={label} withBorder p="md" radius="md" bg="white">
            <Group gap="sm" mb={4}>
              <Icon size={20} color={color} />
              <Text fw={800} size="xl">{value}</Text>
            </Group>
            <Text size="sm" c="dimmed">{label}</Text>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Breadcrumb */}
      <Paper withBorder px="md" py="sm" radius="md" mb="md" bg="white">
        <Group gap={6} wrap="wrap">
          <ThemeIcon size={22} radius="sm" color="brand" variant="light">
            <LuBuilding2 size={12} />
          </ThemeIcon>
          <Text size="sm" fw={600}>{institutionName}</Text>
          {selectedCollege && (
            <>
              <LuChevronRight size={14} color="#adb5bd" />
              <ThemeIcon size={22} radius="sm" color="violet" variant="light">
                <LuLandmark size={12} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="violet.7">{selectedCollege.name}</Text>
            </>
          )}
          {selectedFaculty && (
            <>
              <LuChevronRight size={14} color="#adb5bd" />
              <ThemeIcon size={22} radius="sm" color="blue" variant="light">
                <LuGraduationCap size={12} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="blue.7">{selectedFaculty.name}</Text>
            </>
          )}
          {!selectedCollege && (
            <Text size="xs" c="dimmed" ml={4}>— select a College to drill down</Text>
          )}
        </Group>
      </Paper>

      {/* 3-Panel navigator */}
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" style={{ minHeight: 480, alignItems: 'stretch' }}>

        {/* Column 1: Colleges */}
        <HierarchyPanel
          icon={LuLandmark} color="#7950f2"
          title="Colleges" subtitle="Led by Provost"
          count={colleges.length} onAdd={() => setShowCollegeModal(true)}
          addLabel="Add College" loading={loading}
          isEmpty={!loading && colleges.length === 0}
          emptyText="No colleges yet. Click Add College above."
        >
          {colleges.map(c => (
            <NodeCard key={c.id}
              name={c.name} leaderLabel="Provost"
              leaderName={c.dean?.name ?? '—'} leaderEmail={c.dean?.email ?? ''}
              badge={`${faculties.filter(f => f.college_id === c.id).length} faculties`}
              badgeColor="violet"
              selected={selectedCollegeId === c.id}
              hasChildren
              onSelect={() => { setSelectedCollegeId(c.id); setSelectedFacultyId(null); }}
              onDelete={() => handleDeleteCollege(c.id)}
            />
          ))}
          <Box
            onClick={() => { setSelectedCollegeId(null); setSelectedFacultyId(null); }}
            style={{
              padding: '8px 12px', borderRadius: 8, cursor: 'pointer', marginTop: 6,
              background: selectedCollegeId === null ? '#fff3e0' : '#fff',
              border: selectedCollegeId === null ? '1.5px solid #fd7e14' : '1.5px dashed #dee2e6',
            }}
          >
            <Group gap={6}>
              <LuBuilding2 size={13} color={selectedCollegeId === null ? '#e67700' : '#adb5bd'} />
              <Text size="xs" fw={600} c={selectedCollegeId === null ? 'orange.7' : 'dimmed'}>
                Faculties directly under Institution
              </Text>
              <Badge size="xs" color="orange" variant="light" ml="auto">
                {faculties.filter(f => f.college_id === null).length}
              </Badge>
            </Group>
          </Box>
        </HierarchyPanel>

        {/* Column 2: Faculties */}
        <HierarchyPanel
          icon={LuBuilding2} color="#1971c2"
          title="Faculties" subtitle="Led by Dean"
          count={panelFaculties.length} onAdd={() => setShowFacultyModal(true)}
          addLabel={selectedCollegeId ? `Add Faculty to ${selectedCollege?.name.split(' ').slice(0,2).join(' ')}` : 'Add Faculty (no college)'}
          loading={loading}
          isEmpty={!loading && panelFaculties.length === 0}
          emptyText="Select a College on the left, or add a Faculty here."
        >
          {panelFaculties.map(f => (
            <NodeCard key={f.id}
              name={f.name} leaderLabel="Dean"
              leaderName={f.dean?.name ?? '—'} leaderEmail={f.dean?.email ?? ''}
              badge={`${departments.filter(d => d.faculty_id === f.id).length} depts`}
              badgeColor="blue"
              selected={selectedFacultyId === f.id}
              hasChildren
              onSelect={() => setSelectedFacultyId(f.id)}
              onDelete={() => handleDeleteFaculty(f.id)}
            />
          ))}
        </HierarchyPanel>

        {/* Column 3: Departments */}
        <HierarchyPanel
          icon={LuUsers} color="#2f9e44"
          title="Departments" subtitle="Led by Head of Department"
          count={panelDepartments.length} onAdd={() => setShowDeptModal(true)}
          addLabel={selectedFaculty ? `Add Dept to ${selectedFaculty.name.split(' ').slice(0,2).join(' ')}` : 'Add Department'}
          addDisabled={!selectedFacultyId} addHint="Select a Faculty first"
          loading={loading}
          isEmpty={!loading && (!selectedFacultyId || panelDepartments.length === 0)}
          emptyText={!selectedFacultyId ? 'Select a Faculty in the middle panel first.' : 'No departments yet.'}
        >
          {panelDepartments.map(d => (
            <NodeCard key={d.id}
              name={d.name} leaderLabel="HoD"
              leaderName={d.hod?.name ?? '—'} leaderEmail={d.hod?.email ?? ''}
              badge={`${d.students ?? 0} students`} badgeColor="green"
              onDelete={() => handleDeleteDepartment(d.id)}
            />
          ))}
        </HierarchyPanel>
      </SimpleGrid>

      {/* ── College Modal ── */}
      <Modal opened={showCollegeModal} onClose={() => setShowCollegeModal(false)}
        title={<Group gap="xs"><LuLandmark size={17} color="var(--mantine-color-violet-6)" /><Text fw={700}>Create College</Text></Group>}
        centered size="md" overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}>
        <Stack gap="sm">
          {/* Institution context — pulled from localStorage */}
          <Box style={{ background: '#f0f4ff', borderRadius: 8, padding: '8px 12px', border: '1px solid #c5d2fb' }}>
            <Group gap={6}>
              <LuInfo size={13} color="#3b5bdb" />
              <Text size="xs" c="brand.7" fw={600}>Institution</Text>
            </Group>
            <Text size="sm" fw={600} mt={2}>{institutionName}</Text>
            <Text size="xs" c="dimmed" ff="monospace">{institutionId}</Text>
          </Box>

          <TextInput label="College Name" required size="md"
            placeholder="e.g. College of Physical & Life Sciences"
            value={colName} onChange={e => setColName(e.target.value)} />

          <Divider label="Provost (College Head)" labelPosition="center" mt="xs" />

          <TextInput label="Provost Full Name" required size="md"
            placeholder="e.g. Prof. Aliyu Musa"
            value={colDeanName} onChange={e => setColDeanName(e.target.value)} />
          <TextInput label="Provost Email" size="md" type="email"
            placeholder="provost@institution.edu"
            value={colDeanEmail} onChange={e => setColDeanEmail(e.target.value)} />
          <TextInput label="Phone Number" size="md" type="tel"
            placeholder="+234 800 000 0000"
            leftSection={<LuPhone size={14} color="#868e96" />}
            value={colDeanPhone} onChange={e => setColDeanPhone(e.target.value)} />

          <Text size="xs" c="dimmed">A login account will be created for the Provost using the email above.</Text>
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" color="gray" onClick={() => setShowCollegeModal(false)}>Cancel</Button>
            <Button color="violet" loading={savingCol} onClick={saveCollege}
              disabled={!colName.trim() || !colDeanName.trim()}>
              Save &amp; Generate Credentials
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Faculty Modal ── */}
      <Modal opened={showFacultyModal} onClose={() => setShowFacultyModal(false)}
        title={
          <Group gap="xs">
            <LuBuilding2 size={17} color="var(--mantine-color-blue-6)" />
            <Text fw={700}>Create Faculty</Text>
            {selectedCollege && <Badge color="violet" variant="light" size="sm">{selectedCollege.name.split(' ').slice(0,3).join(' ')}</Badge>}
          </Group>
        }
        centered size="md" overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}>
        <Stack gap="sm">
          {/* Institution context */}
          <Box style={{ background: '#f0f4ff', borderRadius: 8, padding: '8px 12px', border: '1px solid #c5d2fb' }}>
            <Group gap={6}>
              <LuInfo size={13} color="#3b5bdb" />
              <Text size="xs" c="brand.7" fw={600}>Institution</Text>
            </Group>
            <Text size="sm" fw={600} mt={2}>{institutionName}</Text>
            <Text size="xs" c="dimmed" ff="monospace">{institutionId}</Text>
          </Box>

          <TextInput label="Faculty Name" required size="md"
            placeholder="e.g. Faculty of Physical Sciences"
            value={facName} onChange={e => setFacName(e.target.value)} />

          <Divider label="Dean (Faculty Leader)" labelPosition="center" mt="xs" />

          <TextInput label="Dean Full Name" required size="md"
            placeholder="e.g. Prof. Ibrahim Rimi"
            value={facDeanName} onChange={e => setFacDeanName(e.target.value)} />
          <TextInput label="Dean Email" size="md" type="email"
            placeholder="dean@institution.edu"
            value={facDeanEmail} onChange={e => setFacDeanEmail(e.target.value)} />
          <TextInput label="Phone Number" size="md" type="tel"
            placeholder="+234 800 000 0000"
            leftSection={<LuPhone size={14} color="#868e96" />}
            value={facDeanPhone} onChange={e => setFacDeanPhone(e.target.value)} />

          <Text size="xs" c="dimmed">A login account will be created for the Dean using the email above.</Text>
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" color="gray" onClick={() => setShowFacultyModal(false)}>Cancel</Button>
            <Button color="brand" loading={savingFac} onClick={saveFaculty}
              disabled={!facName.trim() || !facDeanName.trim()}>
              Save &amp; Generate Credentials
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Department Modal ── */}
      <Modal opened={showDeptModal} onClose={() => setShowDeptModal(false)}
        title={
          <Group gap="xs">
            <LuUsers size={17} color="var(--mantine-color-green-6)" />
            <Text fw={700}>Create Department</Text>
            {selectedFaculty && <Badge color="blue" variant="light" size="sm">{selectedFaculty.name.split(' ').slice(0,3).join(' ')}</Badge>}
          </Group>
        }
        centered size="md" overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}>
        <Stack gap="sm">
          {/* Institution context */}
          <Box style={{ background: '#f0f4ff', borderRadius: 8, padding: '8px 12px', border: '1px solid #c5d2fb' }}>
            <Group gap={6}>
              <LuInfo size={13} color="#3b5bdb" />
              <Text size="xs" c="brand.7" fw={600}>Institution</Text>
            </Group>
            <Text size="sm" fw={600} mt={2}>{institutionName}</Text>
            <Text size="xs" c="dimmed" ff="monospace">{institutionId}</Text>
          </Box>

          <TextInput label="Department Name" required size="md"
            placeholder="e.g. Computer Science"
            value={deptName} onChange={e => setDeptName(e.target.value)} />

          <Divider label="Head of Department (HoD)" labelPosition="center" mt="xs" />

          <TextInput label="HoD Full Name" required size="md"
            placeholder="e.g. Dr. Sani Abdullahi"
            value={deptHodName} onChange={e => setDeptHodName(e.target.value)} />
          <TextInput label="HoD Email" size="md" type="email"
            placeholder="hod@institution.edu"
            value={deptHodEmail} onChange={e => setDeptHodEmail(e.target.value)} />
          <TextInput label="Phone Number" size="md" type="tel"
            placeholder="+234 800 000 0000"
            leftSection={<LuPhone size={14} color="#868e96" />}
            value={deptHodPhone} onChange={e => setDeptHodPhone(e.target.value)} />

          <Text size="xs" c="dimmed">A login account will be created for the HoD using the email above.</Text>
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" color="gray" onClick={() => setShowDeptModal(false)}>Cancel</Button>
            <Button color="green" loading={savingDept} onClick={saveDepartment}
              disabled={!deptName.trim() || !deptHodName.trim()}>
              Save &amp; Generate Credentials
            </Button>
          </Group>
        </Stack>
      </Modal>

      <CredentialModal creds={creds} onClose={() => setCreds(null)} />
    </Box>
  );
}
