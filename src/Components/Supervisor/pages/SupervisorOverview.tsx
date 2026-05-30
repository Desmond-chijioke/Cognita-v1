import {
  Avatar, Badge, Box, Divider, Group, Paper, Progress,
  RingProgress, SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuUsers, LuTrendingUp, LuTriangleAlert, LuCircleCheck,
  LuCalendar, LuActivity, LuGraduationCap, LuBookOpen,
  LuBrain, LuClock,
} from 'react-icons/lu';

// ── Mock data ──────────────────────────────────────────────────────────────────

const STUDENTS = [
  { id: '1', name: 'Amara Osei',       degreeLevel: 'PhD',           projectTitle: 'Deep Learning for Medical Imaging',       stage: 'Data Collection',  progress: 65, similarityIndex: 12, aiDetectionScore: 8,  integrityScore: 92, complianceStatus: 'Good'     as const, lastActivity: '2 days ago', color: 'blue'   },
  { id: '2', name: 'Kofi Mensah',      degreeLevel: "Master's",      projectTitle: 'NLP for Low-Resource Languages',          stage: 'Analysis',         progress: 78, similarityIndex: 19, aiDetectionScore: 14, integrityScore: 88, complianceStatus: 'Good'     as const, lastActivity: '1 day ago',  color: 'teal'   },
  { id: '3', name: 'Fatima Al-Rashid', degreeLevel: 'PhD',           projectTitle: 'Federated Learning for Privacy',          stage: 'Writing Up',       progress: 88, similarityIndex: 7,  aiDetectionScore: 5,  integrityScore: 96, complianceStatus: 'Good'     as const, lastActivity: 'Today',      color: 'violet' },
  { id: '4', name: 'Emeka Okafor',     degreeLevel: 'Undergraduate', projectTitle: 'IoT-Based Smart Campus System',           stage: 'Proposal',         progress: 30, similarityIndex: 34, aiDetectionScore: 41, integrityScore: 58, complianceStatus: 'Critical' as const, lastActivity: '5 days ago', color: 'orange' },
  { id: '5', name: 'Ngozi Adeyemi',    degreeLevel: 'Undergraduate', projectTitle: 'Blockchain for Academic Records',         stage: 'Literature Review',progress: 45, similarityIndex: 22, aiDetectionScore: 18, integrityScore: 82, complianceStatus: 'Good'     as const, lastActivity: 'Yesterday', color: 'green'  },
  { id: '6', name: 'Taiwo Bakare',     degreeLevel: "Master's",      projectTitle: 'Graph Neural Networks for Fraud Detection', stage: 'Methodology',   progress: 58, similarityIndex: 28, aiDetectionScore: 32, integrityScore: 72, complianceStatus: 'Warning'  as const, lastActivity: '3 days ago', color: 'red'    },
];

const STAGE_ORDER = ['Proposal', 'Literature Review', 'Methodology', 'Data Collection', 'Analysis', 'Writing Up', 'Submitted'];
const STAGE_COLOR: Record<string, string> = {
  Proposal:           '#3b5bdb',
  'Literature Review':'#7950f2',
  Methodology:        '#0c8599',
  'Data Collection':  '#2f9e44',
  Analysis:           '#f08c00',
  'Writing Up':       '#e64980',
  Submitted:          '#868e96',
};

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string;
}

function StatCard({ icon: Icon, label, value, sub, color }: StatCardProps) {
  return (
    <Paper withBorder p="lg" radius="md" bg="white">
      <Group justify="space-between" mb="sm">
        <ThemeIcon size={42} radius="md" color={color} variant="light">
          <Icon size={20} />
        </ThemeIcon>
        <LuActivity size={14} color="#ced4da" />
      </Group>
      <Text fw={800} lh={1} mb={4} style={{ fontSize: 32 }}>{value}</Text>
      <Text size="sm" c="dimmed" fw={500}>{label}</Text>
      {sub && <Text size="xs" c="dimmed" mt={6}>{sub}</Text>}
    </Paper>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupervisorOverview() {
  const avgProgress    = Math.round(STUDENTS.reduce((a, s) => a + s.progress, 0) / STUDENTS.length);
  const needsAttention = STUDENTS.filter(s => s.complianceStatus !== 'Good').length;
  const onTrack        = STUDENTS.filter(s => s.complianceStatus === 'Good').length;
  const phd            = STUDENTS.filter(s => s.degreeLevel === 'PhD').length;
  const masters        = STUDENTS.filter(s => s.degreeLevel === "Master's").length;
  const ug             = STUDENTS.filter(s => s.degreeLevel === 'Undergraduate').length;

  const stageCounts = STAGE_ORDER.map(stage => ({
    stage,
    count: STUDENTS.filter(s => s.stage === stage).length,
  })).filter(s => s.count > 0);

  const flagged = STUDENTS.filter(s => s.complianceStatus !== 'Good');

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Overview</Title>
          <Text size="sm" c="dimmed" mt={2}>
            Live summary of your students' progress and research activity.
          </Text>
        </Box>
        <Group gap="xs" align="center">
          <LuCalendar size={14} color="#adb5bd" />
          <Text size="sm" c="dimmed">{today}</Text>
        </Group>
      </Group>

      {/* ── KPI Cards ── */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        <StatCard icon={LuUsers}        label="Total Students"    value={STUDENTS.length} color="brand"  sub={`${phd} PhD · ${masters} MSc · ${ug} UG`} />
        <StatCard icon={LuTrendingUp}   label="Avg Progress"      value={`${avgProgress}%`} color="teal"   sub="Across all active students" />
        <StatCard icon={LuCircleCheck}  label="On Track"          value={onTrack}         color="green"  sub="Students with good compliance" />
        <StatCard icon={LuTriangleAlert}label="Needs Attention"   value={needsAttention}  color={needsAttention > 0 ? 'red' : 'green'} sub="Warning or critical flags" />
      </SimpleGrid>

      {/* ── Middle row ── */}
      <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">

        {/* Stage Distribution */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuBookOpen size={16} color="#4c6ef5" />
            <Text fw={600}>Stage Distribution</Text>
          </Group>
          <Divider mb="md" />
          <Stack gap="md">
            {stageCounts.map(({ stage, count }) => (
              <Box key={stage}>
                <Group justify="space-between" mb={5}>
                  <Text size="sm" c="dimmed">{stage}</Text>
                  <Text size="sm" fw={700}>{count} student{count !== 1 ? 's' : ''}</Text>
                </Group>
                <Progress
                  value={(count / STUDENTS.length) * 100}
                  color={STAGE_COLOR[stage] ?? '#3b5bdb'}
                  size="sm"
                  radius="xl"
                />
              </Box>
            ))}
          </Stack>
        </Paper>

        {/* Progress by degree level */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuGraduationCap size={16} color="#4c6ef5" />
            <Text fw={600}>Average Progress by Level</Text>
          </Group>
          <Divider mb="md" />
          <Group justify="center" align="center" gap="xl" mt="sm">
            <RingProgress
              size={160}
              thickness={26}
              roundCaps
              sections={[
                { value: avgProgress, color: '#3b5bdb', tooltip: `Overall: ${avgProgress}%` },
                { value: 100 - avgProgress, color: '#e9ecef' },
              ]}
              label={
                <Box ta="center">
                  <Text fw={800} size="lg" lh={1}>{avgProgress}%</Text>
                  <Text size="xs" c="dimmed">avg</Text>
                </Box>
              }
            />
            <Stack gap="md">
              {[
                { label: 'PhD',           color: '#3b5bdb', avg: phd ? Math.round(STUDENTS.filter(s => s.degreeLevel === 'PhD').reduce((a, s) => a + s.progress, 0) / phd) : 0 },
                { label: "Master's",      color: '#7950f2', avg: masters ? Math.round(STUDENTS.filter(s => s.degreeLevel === "Master's").reduce((a, s) => a + s.progress, 0) / masters) : 0 },
                { label: 'Undergraduate', color: '#0c8599', avg: ug ? Math.round(STUDENTS.filter(s => s.degreeLevel === 'Undergraduate').reduce((a, s) => a + s.progress, 0) / ug) : 0 },
              ].map(({ label, color, avg }) => (
                <Group key={label} gap="xs" wrap="nowrap">
                  <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <Text size="sm" c="dimmed" style={{ minWidth: 100 }}>{label}</Text>
                  <Text size="sm" fw={700}>{avg}%</Text>
                </Group>
              ))}
            </Stack>
          </Group>
        </Paper>

      </SimpleGrid>

      {/* ── Recent activity ── */}
      <SimpleGrid cols={{ base: 1, md: 2 }} mb={flagged.length > 0 ? 'xl' : 0}>

        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuClock size={16} color="#4c6ef5" />
            <Text fw={600}>Recent Activity</Text>
          </Group>
          <Divider mb="md" />
          <Stack gap={0}>
            {[...STUDENTS].sort((a, b) => a.lastActivity.localeCompare(b.lastActivity)).map(st => (
              <Group
                key={st.id}
                justify="space-between"
                py="xs"
                wrap="nowrap"
                style={{ borderBottom: '1px solid #f1f3f5' }}
              >
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <Avatar color={st.color} radius="xl" size="sm">{getInitials(st.name)}</Avatar>
                  <Box style={{ minWidth: 0 }}>
                    <Text size="sm" fw={600} lineClamp={1}>{st.name}</Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>{st.projectTitle}</Text>
                  </Box>
                </Group>
                <Text size="xs" c="dimmed" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>{st.lastActivity}</Text>
              </Group>
            ))}
          </Stack>
        </Paper>

        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuBrain size={16} color="#4c6ef5" />
            <Text fw={600}>AI & Integrity Summary</Text>
          </Group>
          <Divider mb="md" />
          <Stack gap="md">
            {STUDENTS.map(st => {
              const status = st.complianceStatus;
              const color  = status === 'Good' ? '#2f9e44' : status === 'Warning' ? '#f08c00' : '#e03131';
              return (
                <Box key={st.id}>
                  <Group justify="space-between" mb={4}>
                    <Group gap="xs">
                      <Avatar color={st.color} radius="xl" size="xs">{getInitials(st.name)}</Avatar>
                      <Text size="sm" fw={500}>{st.name}</Text>
                    </Group>
                    <Badge
                      color={status === 'Good' ? 'green' : status === 'Warning' ? 'orange' : 'red'}
                      variant="light" size="xs" radius="sm"
                    >
                      {status}
                    </Badge>
                  </Group>
                  <Progress value={st.integrityScore} color={st.integrityScore >= 85 ? 'green' : st.integrityScore >= 70 ? 'orange' : 'red'} size="xs" radius="xl" />
                  <Group justify="space-between" mt={3}>
                    <Text size="xs" c="dimmed">Similarity: {st.similarityIndex}%</Text>
                    <Text size="xs" c="dimmed">AI: {st.aiDetectionScore}%</Text>
                    <Text size="xs" fw={600} style={{ color }}>Integrity: {st.integrityScore}%</Text>
                  </Group>
                </Box>
              );
            })}
          </Stack>
        </Paper>

      </SimpleGrid>

      {/* ── Accountability flags ── */}
      {flagged.length > 0 && (
        <Paper
          withBorder p="lg" radius="md"
          style={{ borderColor: '#ffa94d', background: '#fff9f0' }}
        >
          <Group gap="sm" mb="md">
            <LuTriangleAlert size={18} color="#f08c00" />
            <Text fw={600} c="orange.8">
              {flagged.length} Student{flagged.length > 1 ? 's' : ''} Require Immediate Review
            </Text>
          </Group>
          <Divider color="orange.2" mb="md" />
          <Stack gap="sm">
            {flagged.map(st => (
              <Group key={st.id} justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <Avatar color={st.color} radius="xl" size="sm">{getInitials(st.name)}</Avatar>
                  <Box style={{ minWidth: 0 }}>
                    <Text size="sm" fw={500} lineClamp={1}>{st.name}</Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>{st.projectTitle}</Text>
                  </Box>
                </Group>
                <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                  <Text size="xs" c="dimmed">Similarity: {st.similarityIndex}%</Text>
                  <Text size="xs" c="dimmed">AI: {st.aiDetectionScore}%</Text>
                  <Badge
                    variant="light"
                    color={st.complianceStatus === 'Warning' ? 'orange' : 'red'}
                    size="sm"
                  >
                    {st.complianceStatus}
                  </Badge>
                </Group>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}

    </Box>
  );
}
