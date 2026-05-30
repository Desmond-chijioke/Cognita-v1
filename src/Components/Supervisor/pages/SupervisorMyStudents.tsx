import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar, Badge, Box, Group, Paper, Progress,
  Table, Tabs, Text, TextInput, ThemeIcon, Title, SimpleGrid,
} from '@mantine/core';
import {
  LuUsers, LuSearch, LuGraduationCap, LuActivity,
  LuTriangleAlert, LuCircleCheck, LuBookOpen, LuArrowRight,
} from 'react-icons/lu';
import { SUPERVISED_STUDENTS } from '../supervisorData';
import type { SupervisedStudent, ComplianceStatus, DegreeLevel } from '../supervisorData';
import { useAppSelector } from '../../../Redux/hooks';
import type { StoredUser } from '../../../Redux/slices/usersSlice';

const MANTINE_COLORS = ['blue', 'teal', 'green', 'grape', 'orange', 'cyan', 'indigo', 'red', 'pink', 'yellow'];
function nameToColor(name: string) {
  let h = 0;
  for (const c of name) h = (h << 5) - h + c.charCodeAt(0);
  return MANTINE_COLORS[Math.abs(h) % MANTINE_COLORS.length];
}

function reduxUserToStudent(u: StoredUser): SupervisedStudent {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    matricNo: u.matricNo ?? 'N/A',
    degreeLevel: (u.degreeLevel as DegreeLevel) ?? 'PhD',
    projectTitle: u.projectTitle ?? 'Untitled Research',
    stage: 'Proposal',
    progress: 0,
    similarityIndex: 0,
    aiDetectionScore: 0,
    integrityScore: 0,
    complianceStatus: 'Good' as ComplianceStatus,
    department: u.department ?? 'Unassigned',
    wordCount: 0,
    targetWordCount: 80000,
    deadline: 'TBD',
    lastActivity: 'Just joined',
    color: nameToColor(u.name),
    stages: [],
    sections: [],
    analyses: [],
    feedbackThreads: [],
    alerts: [],
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function complianceColor(s: ComplianceStatus) {
  return s === 'Good' ? 'green' : s === 'Warning' ? 'orange' : 'red';
}

function degreeBadgeColor(level: string) {
  return level === 'PhD' ? 'blue' : level === "Master's" ? 'violet' : 'teal';
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
            {['Student', 'Project', 'Stage', 'Progress', 'Integrity', 'Compliance', 'Last Active', ''].map(h => (
              <Table.Th key={h}><Text size="xs" c="dimmed" fw={600}>{h}</Text></Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {students.map(st => (
            <Table.Tr
              key={st.id}
              onClick={() => onRowClick(st.id)}
              style={{ cursor: 'pointer' }}
            >
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
                <Text
                  size="sm" fw={700}
                  style={{ color: st.integrityScore >= 85 ? '#2f9e44' : st.integrityScore >= 70 ? '#f08c00' : '#e03131' }}
                >
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
                <LuArrowRight size={16} color="#adb5bd" />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupervisorMyStudents() {
  const navigate       = useNavigate();
  const currentUser    = useAppSelector(s => s.auth.user);
  const allReduxUsers  = useAppSelector(s => s.users.list);
  const [search, setSearch] = useState('');
  const [tab, setTab]       = useState('all');

  // If this supervisor was created via Redux (real account), show only their Redux students.
  // If they logged in via the demo role dropdown (no Redux account), fall back to mock data.
  const allStudents = useMemo<SupervisedStudent[]>(() => {
    const isReduxSupervisor = allReduxUsers.some(u => u.id === currentUser?.id);
    const reduxStudents     = allReduxUsers
      .filter(u => u.supervisorId === currentUser?.id)
      .map(reduxUserToStudent);

    return isReduxSupervisor ? reduxStudents : [...SUPERVISED_STUDENTS, ...reduxStudents];
  }, [allReduxUsers, currentUser?.id]);

  const byTab = tab === 'ug'
    ? allStudents.filter(s => s.degreeLevel === 'Undergraduate')
    : tab === 'pg'
    ? allStudents.filter(s => s.degreeLevel !== 'Undergraduate')
    : allStudents;

  const filtered = byTab.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.projectTitle.toLowerCase().includes(search.toLowerCase()) ||
    s.matricNo.toLowerCase().includes(search.toLowerCase())
  );

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

      {/* ── Tabs ── */}
      <Tabs value={tab} onChange={v => setTab(v ?? 'all')}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="all" leftSection={<LuUsers         size={14} />}>
            All Students ({allStudents.length})
          </Tabs.Tab>
          <Tabs.Tab value="ug"  leftSection={<LuBookOpen      size={14} />}>
            Undergraduate ({allStudents.filter(s => s.degreeLevel === 'Undergraduate').length})
          </Tabs.Tab>
          <Tabs.Tab value="pg"  leftSection={<LuGraduationCap size={14} />}>
            Postgraduate ({allStudents.filter(s => s.degreeLevel !== 'Undergraduate').length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="all"><StudentTable students={filtered} onRowClick={id => navigate(`/supervisor/students/${id}`)} /></Tabs.Panel>
        <Tabs.Panel value="ug" ><StudentTable students={filtered} onRowClick={id => navigate(`/supervisor/students/${id}`)} /></Tabs.Panel>
        <Tabs.Panel value="pg" ><StudentTable students={filtered} onRowClick={id => navigate(`/supervisor/students/${id}`)} /></Tabs.Panel>
      </Tabs>

      {/* ── Legend ── */}
      <Paper
        withBorder p="sm" radius="md" mt="lg"
        style={{ background: '#f8f9fa', border: '1px dashed #dee2e6' }}
      >
        <Group gap="xl">
          {[
            { icon: LuCircleCheck,   color: '#2f9e44', label: 'Good — integrity ≥ 85%' },
            { icon: LuTriangleAlert, color: '#f08c00', label: 'Warning — integrity 70–84% or AI score 25–35%' },
            { icon: LuActivity,      color: '#e03131', label: 'Critical — integrity < 70% or AI score > 35%' },
          ].map(({ icon: Icon, color, label }) => (
            <Group key={label} gap="xs">
              <Icon size={13} style={{ color }} />
              <Text size="xs" c="dimmed">{label}</Text>
            </Group>
          ))}
        </Group>
      </Paper>

    </Box>
  );
}
