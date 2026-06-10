import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar, Badge, Box, Group, Loader, Paper, Progress,
  Table, Tabs, Text, TextInput, ThemeIcon, Title, SimpleGrid,
} from '@mantine/core';
import {
  LuUsers, LuSearch, LuGraduationCap, LuActivity,
  LuTriangleAlert, LuCircleCheck, LuUserX,
} from 'react-icons/lu';
import type { SupervisedStudent, ComplianceStatus, DegreeLevel } from '../supervisorData';
import { useAppSelector } from '../../../Redux/hooks';
import { supabase } from '../../../supabase/client';

const MANTINE_COLORS = ['blue', 'teal', 'green', 'grape', 'orange', 'cyan', 'indigo', 'red', 'pink', 'yellow'];
function nameToColor(name: string) {
  let h = 0;
  for (const c of name) h = (h << 5) - h + c.charCodeAt(0);
  return MANTINE_COLORS[Math.abs(h) % MANTINE_COLORS.length];
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function complianceColor(s: ComplianceStatus) {
  return s === 'Good' ? 'green' : s === 'Warning' ? 'orange' : 'red';
}

function degreeBadgeColor(level: string) {
  if (level.includes('PhD'))           return 'blue';
  if (level.includes("Master"))        return 'violet';
  if (level.includes('Undergraduate')) return 'teal';
  if (level.includes('Postgraduate'))  return 'indigo';
  return 'gray';
}

function roleTabColor(role: string) {
  if (role.includes('PhD'))           return 'blue';
  if (role.includes("Master"))        return 'violet';
  if (role.includes('Undergraduate')) return 'teal';
  if (role.includes('Postgraduate'))  return 'indigo';
  return 'gray';
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryChip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <Box p="md" style={{ borderRadius: 10, background: `${color}10`, border: `1.5px solid ${color}28`, textAlign: 'center' }}>
      <Text fw={800} size="xl" lh={1} style={{ color }}>{value}</Text>
      <Text size="xs" c="dimmed" mt={6} fw={500}>{label}</Text>
    </Box>
  );
}

interface StudentTableProps { students: SupervisedStudent[]; onRowClick: (id: string) => void }

function StudentTable({ students, onRowClick }: StudentTableProps) {
  if (students.length === 0) {
    return <Text size="sm" c="dimmed" ta="center" py="xl">No students match this filter.</Text>;
  }
  return (
    <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
      <Table highlightOnHover verticalSpacing="md">
        <Table.Thead>
          <Table.Tr style={{ background: '#f8f9fa' }}>
            {['Student', 'Project', 'Level / Stage', 'Progress', 'Integrity', 'Compliance', 'Last Active', ''].map(h => (
              <Table.Th key={h}><Text size="xs" c="dimmed" fw={600}>{h}</Text></Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {students.map(st => (
            <Table.Tr key={st.id} onClick={() => onRowClick(st.id)} style={{ cursor: 'pointer' }}>
              <Table.Td>
                <Group gap="sm" wrap="nowrap">
                  <Avatar color={st.color} radius="xl" size="sm">{getInitials(st.name)}</Avatar>
                  <Box style={{ minWidth: 0 }}>
                    <Text size="sm" fw={600} lineClamp={1}>{st.name}</Text>
                    <Text size="xs" c="dimmed">{st.matricNo}</Text>
                  </Box>
                </Group>
              </Table.Td>
              <Table.Td>
                <Text size="xs" lineClamp={2} style={{ maxWidth: 200 }}>{st.projectTitle}</Text>
              </Table.Td>
              <Table.Td>
                <Badge variant="light" color={degreeBadgeColor(st.degreeLevel)} size="xs" radius="sm" mb={4}>
                  {st.degreeLevel}
                </Badge>
                <Text size="xs" c="dimmed">{st.stage}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs" fw={700} mb={4}>{st.progress}%</Text>
                <Progress
                  value={st.progress}
                  color={st.progress >= 70 ? 'green' : st.progress >= 40 ? 'orange' : 'red'}
                  size="xs" radius="xl" style={{ width: 80 }}
                />
              </Table.Td>
              <Table.Td>
                <Text size="sm" fw={700}
                  style={{ color: st.integrityScore >= 85 ? '#2f9e44' : st.integrityScore >= 70 ? '#f08c00' : '#e03131' }}>
                  {st.integrityScore}%
                </Text>
              </Table.Td>
              <Table.Td>
                <Badge variant="light" color={complianceColor(st.complianceStatus)} size="sm" radius="sm">
                  {st.complianceStatus}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="xs" c="dimmed">{st.lastActivity}</Text>
              </Table.Td>
              <Table.Td>
                <LuGraduationCap size={16} color="#adb5bd" />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const FETCH_ROLES = ['PhD Student', "Master's Student", 'Undergraduate Student', 'Postgraduate Student'];

export default function SupervisorMyStudents() {
  const navigate    = useNavigate();
  const currentUser = useAppSelector(s => s.auth.user);

  const [search,     setSearch]     = useState('');
  const [tab,        setTab]        = useState('all');
  const [sbStudents, setSbStudents] = useState<SupervisedStudent[]>([]);
  const [loading,    setLoading]    = useState(true);

  // ── Fetch students assigned to this supervisor ────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;
    setLoading(true);
    supabase
      .from('users')
      .select('id, name, email, matric_no, project_title, role, degree_level, department, created_at')
      .eq('supervisor_id', currentUser.id)
      .in('role', FETCH_ROLES)
      .order('name')
      .then(({ data }) => {
        setLoading(false);
        if (!data || data.length === 0) return;
        const mapped = (data as Record<string, string>[]).map(u => ({
          id:               u.id,
          name:             u.name,
          email:            u.email,
          matricNo:         u.matric_no     ?? 'N/A',
          degreeLevel:      (u.role ?? u.degree_level ?? 'PhD Student') as DegreeLevel,
          projectTitle:     u.project_title ?? 'Untitled Research',
          stage:            'Proposal' as const,
          progress:         0,
          similarityIndex:  0,
          aiDetectionScore: 0,
          integrityScore:   0,
          complianceStatus: 'Good' as ComplianceStatus,
          department:       u.department ?? 'Unassigned',
          wordCount:        0,
          targetWordCount:  80000,
          deadline:         '',
          lastActivity:     'Active',
          color:            nameToColor(u.name),
          stages:           [],
          sections:         [],
          analyses:         [],
          feedbackThreads:  [],
          alerts:           [],
        }));
        setSbStudents(mapped);
      });
  }, [currentUser?.id]);

  const allStudents = useMemo<SupervisedStudent[]>(() => sbStudents, [sbStudents]);

  // Unique roles present in the loaded data — drives the dynamic tabs
  const roles = useMemo(
    () => [...new Set(allStudents.map(s => s.degreeLevel))].sort(),
    [allStudents],
  );

  // Reset tab if the selected role no longer exists in the data
  useEffect(() => {
    if (tab !== 'all' && !roles.includes(tab as DegreeLevel)) {
      setTab('all');
    }
  }, [roles, tab]);

  // Search filter applied first (independent of tab)
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allStudents;
    return allStudents.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.projectTitle.toLowerCase().includes(q) ||
      s.matricNo.toLowerCase().includes(q),
    );
  }, [allStudents, search]);

  // Tab scope applied on top of search results
  const filtered = useMemo(
    () => tab === 'all' ? baseFiltered : baseFiltered.filter(s => s.degreeLevel === tab),
    [baseFiltered, tab],
  );

  // Per-role counts that update as search changes
  const roleCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of baseFiltered) {
      map[s.degreeLevel] = (map[s.degreeLevel] ?? 0) + 1;
    }
    return map;
  }, [baseFiltered]);

  const critical = allStudents.filter(s => s.complianceStatus === 'Critical').length;
  const warning  = allStudents.filter(s => s.complianceStatus === 'Warning').length;
  const good     = allStudents.filter(s => s.complianceStatus === 'Good').length;

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>My Students</Title>
        <Text size="sm" c="dimmed" mt={4}>
          View and monitor all students currently under your supervision. Click a row to open the student detail.
        </Text>
      </Box>

      {loading ? (
        <Box ta="center" py="xl"><Loader size="sm" color="brand" /></Box>
      ) : allStudents.length === 0 ? (
        <Paper withBorder p="xl" radius="md" ta="center">
          <LuUserX size={32} color="#adb5bd" style={{ marginBottom: 8 }} />
          <Text fw={600} c="dimmed">No students assigned yet</Text>
          <Text size="sm" c="dimmed" mt={4}>
            Students assigned to you by your HOD will appear here.
          </Text>
        </Paper>
      ) : (
        <>
          {/* ── Summary chips ── */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
            <SummaryChip value={good}     label="Good Standing" color="#2f9e44" />
            <SummaryChip value={warning}  label="Warnings"      color="#f08c00" />
            <SummaryChip value={critical} label="Critical"      color="#e03131" />
          </SimpleGrid>

          {/* ── Toolbar ── */}
          <Paper withBorder p="md" radius="md" bg="white" mb="lg">
            <Group justify="space-between" wrap="nowrap">
              <TextInput
                placeholder="Search by name, project, or matric no…"
                leftSection={<LuSearch size={14} color="#adb5bd" />}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, maxWidth: 420 }}
              />
              <Group gap="xs">
                <ThemeIcon size={34} radius="md" color="brand" variant="light">
                  <LuUsers size={16} />
                </ThemeIcon>
                <Box>
                  <Text size="sm" fw={700}>{allStudents.length}</Text>
                  <Text size="xs" c="dimmed" lh={1}>total</Text>
                </Box>
              </Group>
            </Group>
          </Paper>

          {/* ── Dynamic role tabs ── */}
          <Tabs value={tab} onChange={v => setTab(v ?? 'all')}>
            <Tabs.List mb="lg" style={{ flexWrap: 'wrap' }}>

              {/* All tab */}
              <Tabs.Tab
                value="all"
                leftSection={<LuUsers size={14} />}
                rightSection={
                  <Badge size="xs" variant="filled" color="brand" radius="xl">
                    {baseFiltered.length}
                  </Badge>
                }
              >
                All Students
              </Tabs.Tab>

              {/* One tab per role present in data */}
              {roles.map(role => (
                <Tabs.Tab
                  key={role}
                  value={role}
                  leftSection={<LuGraduationCap size={14} />}
                  rightSection={
                    <Badge size="xs" variant="filled" color={roleTabColor(role)} radius="xl">
                      {roleCount[role] ?? 0}
                    </Badge>
                  }
                >
                  {role}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            {/* Single shared table — driven by `filtered` */}
            <StudentTable
              students={filtered}
              onRowClick={id => navigate(`/supervisor/students/${id}`)}
            />
          </Tabs>

          {/* ── Legend ── */}
          <Paper
            withBorder p="sm" radius="md" mt="lg"
            style={{ background: '#f8f9fa', border: '1px dashed #dee2e6' }}
          >
            <Group gap="xl">
              {[
                { icon: LuCircleCheck,   color: '#2f9e44', label: 'Good — integrity ≥ 85%' },
                { icon: LuTriangleAlert, color: '#f08c00', label: 'Warning — integrity 70–84%' },
                { icon: LuActivity,      color: '#e03131', label: 'Critical — integrity < 70%' },
              ].map(({ icon: Icon, color, label }) => (
                <Group key={label} gap="xs">
                  <Icon size={13} style={{ color }} />
                  <Text size="xs" c="dimmed">{label}</Text>
                </Group>
              ))}
            </Group>
          </Paper>
        </>
      )}

    </Box>
  );
}
