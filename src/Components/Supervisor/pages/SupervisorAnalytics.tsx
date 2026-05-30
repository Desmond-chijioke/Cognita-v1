import {
  Box, Group, Paper, Progress,
  SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuUsers, LuTrendingUp, LuBrain, LuShield,
  LuActivity, LuBookOpen,
} from 'react-icons/lu';

// ── Mock data ──────────────────────────────────────────────────────────────────

const STUDENTS = [
  { id: '1', name: 'Amara Osei',       degreeLevel: 'PhD',           stage: 'Data Collection',   progress: 65, similarityIndex: 12, aiDetectionScore: 8,  integrityScore: 92, complianceStatus: 'Good'     as const, wordCount: 18400, targetWordCount: 80000 },
  { id: '2', name: 'Kofi Mensah',      degreeLevel: "Master's",      stage: 'Analysis',          progress: 78, similarityIndex: 19, aiDetectionScore: 14, integrityScore: 88, complianceStatus: 'Good'     as const, wordCount: 24100, targetWordCount: 40000 },
  { id: '3', name: 'Fatima Al-Rashid', degreeLevel: 'PhD',           stage: 'Writing Up',        progress: 88, similarityIndex: 7,  aiDetectionScore: 5,  integrityScore: 96, complianceStatus: 'Good'     as const, wordCount: 52000, targetWordCount: 80000 },
  { id: '4', name: 'Emeka Okafor',     degreeLevel: 'Undergraduate', stage: 'Proposal',          progress: 30, similarityIndex: 34, aiDetectionScore: 41, integrityScore: 58, complianceStatus: 'Critical' as const, wordCount: 4800,  targetWordCount: 15000 },
  { id: '5', name: 'Ngozi Adeyemi',    degreeLevel: 'Undergraduate', stage: 'Literature Review', progress: 45, similarityIndex: 22, aiDetectionScore: 18, integrityScore: 82, complianceStatus: 'Good'     as const, wordCount: 7200,  targetWordCount: 15000 },
  { id: '6', name: 'Taiwo Bakare',     degreeLevel: "Master's",      stage: 'Methodology',       progress: 58, similarityIndex: 28, aiDetectionScore: 32, integrityScore: 72, complianceStatus: 'Warning'  as const, wordCount: 13600, targetWordCount: 40000 },
];

const STAGE_COLOR: Record<string, string> = {
  Proposal:           '#3b5bdb',
  'Literature Review':'#7950f2',
  Methodology:        '#0c8599',
  'Data Collection':  '#2f9e44',
  Analysis:           '#f08c00',
  'Writing Up':       '#e64980',
};

// ── Inline SVG ─────────────────────────────────────────────────────────────────

function WordCountChart() {
  const BAR_START = 120;
  const BAR_MAX   = 230;

  return (
    <svg viewBox="0 0 420 220" width="100%" height="220">
      {[0, 25, 50, 75, 100].map(v => {
        const x = BAR_START + (v / 100) * BAR_MAX;
        return (
          <g key={v}>
            <line x1={x} y1={8} x2={x} y2={210} stroke="#f1f3f5" strokeWidth={1} />
            <text x={x} y={6} textAnchor="middle" fontSize={10} fill="#adb5bd">{v}%</text>
          </g>
        );
      })}
      {STUDENTS.map((st, i) => {
        const y    = 14 + i * 32;
        const pct  = Math.min((st.wordCount / st.targetWordCount) * 100, 100);
        const barW = Math.max((pct / 100) * BAR_MAX, 4);
        const color = pct >= 70 ? '#2f9e44' : pct >= 40 ? '#f08c00' : '#e03131';
        const label = st.name.split(' ')[0] + ' ' + st.name.split(' ').slice(-1)[0][0] + '.';
        return (
          <g key={st.id}>
            <text x={114} y={y + 14} textAnchor="end" fontSize={11} fill="#495057">{label}</text>
            <rect x={BAR_START} y={y} width={barW} height={20} fill={color} rx={4} opacity={0.75} />
            <text x={BAR_START + barW + 6} y={y + 14} fontSize={10} fill="#868e96">
              {st.wordCount.toLocaleString()} / {st.targetWordCount.toLocaleString()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <Paper withBorder p="lg" radius="md" bg="white">
      <Group justify="space-between" mb="sm">
        <ThemeIcon size={42} radius="md" color={color} variant="light">
          <Icon size={20} />
        </ThemeIcon>
        <LuActivity size={14} color="#ced4da" />
      </Group>
      <Text fw={800} lh={1} mb={4} style={{ fontSize: 28 }}>{value}</Text>
      <Text size="sm" c="dimmed" fw={500}>{label}</Text>
      {sub && <Text size="xs" c="dimmed" mt={4}>{sub}</Text>}
    </Paper>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupervisorAnalytics() {
  const avgProgress    = Math.round(STUDENTS.reduce((a, s) => a + s.progress, 0) / STUDENTS.length);
  const avgIntegrity   = Math.round(STUDENTS.reduce((a, s) => a + s.integrityScore, 0) / STUDENTS.length);
  const avgSimilarity  = Math.round(STUDENTS.reduce((a, s) => a + s.similarityIndex, 0) / STUDENTS.length);
  const avgAI          = Math.round(STUDENTS.reduce((a, s) => a + s.aiDetectionScore, 0) / STUDENTS.length);

  const stageCounts = Object.entries(
    STUDENTS.reduce<Record<string, number>>((acc, s) => {
      acc[s.stage] = (acc[s.stage] ?? 0) + 1;
      return acc;
    }, {})
  );

  const byLevel = [
    { label: 'PhD',           color: '#3b5bdb', students: STUDENTS.filter(s => s.degreeLevel === 'PhD') },
    { label: "Master's",      color: '#7950f2', students: STUDENTS.filter(s => s.degreeLevel === "Master's") },
    { label: 'Undergraduate', color: '#0c8599', students: STUDENTS.filter(s => s.degreeLevel === 'Undergraduate') },
  ].filter(g => g.students.length > 0).map(g => ({
    ...g,
    avgProgress:   Math.round(g.students.reduce((a, s) => a + s.progress, 0) / g.students.length),
    avgIntegrity:  Math.round(g.students.reduce((a, s) => a + s.integrityScore, 0) / g.students.length),
  }));

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Analytics</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Performance, integrity, and AI usage metrics across your supervised students.
        </Text>
      </Box>

      {/* ── KPI cards ── */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        <KPICard icon={LuUsers}      label="Total Students"    value={STUDENTS.length}   color="brand"  sub="Under active supervision" />
        <KPICard icon={LuTrendingUp} label="Avg Progress"      value={`${avgProgress}%`} color="teal"   sub="Across all degree levels" />
        <KPICard icon={LuShield}     label="Avg Integrity"     value={`${avgIntegrity}%`}color="green"  sub={`Similarity avg: ${avgSimilarity}%`} />
        <KPICard icon={LuBrain}      label="Avg AI Score"      value={`${avgAI}%`}       color={avgAI > 30 ? 'red' : 'violet'} sub="AI detection average" />
      </SimpleGrid>

      {/* ── Charts row ── */}
      <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">

        {/* Word Count Progress */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Text fw={600} mb="md">Word Count Progress</Text>
          <WordCountChart />
        </Paper>

        {/* Stage distribution */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Text fw={600} mb="lg">Students by Research Stage</Text>
          <Stack gap="md">
            {stageCounts.map(([stage, count]) => (
              <Box key={stage}>
                <Group justify="space-between" mb={5}>
                  <Text size="sm" c="dimmed">{stage}</Text>
                  <Text size="sm" fw={700}>{count} student{count !== 1 ? 's' : ''}</Text>
                </Group>
                <Progress
                  value={(count / STUDENTS.length) * 100}
                  color={STAGE_COLOR[stage] ?? '#3b5bdb'}
                  size="sm" radius="xl"
                />
              </Box>
            ))}
          </Stack>
        </Paper>

      </SimpleGrid>

      {/* ── Bottom row ── */}
      <SimpleGrid cols={{ base: 1, md: 2 }}>

        {/* Performance by degree level */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="lg">
            <LuBookOpen size={16} color="#4c6ef5" />
            <Text fw={600}>Performance by Degree Level</Text>
          </Group>
          <Stack gap="lg">
            {byLevel.map(({ label, color, avgProgress: ap, avgIntegrity: ai }) => (
              <Box key={label}>
                <Group justify="space-between" mb={6}>
                  <Group gap="xs">
                    <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                    <Text size="sm" fw={500}>{label}</Text>
                  </Group>
                  <Group gap="md">
                    <Text size="xs" c="dimmed">Progress: <strong>{ap}%</strong></Text>
                    <Text size="xs" c="dimmed">Integrity: <strong>{ai}%</strong></Text>
                  </Group>
                </Group>
                <Progress value={ap} color={color} size="sm" radius="xl" />
              </Box>
            ))}
          </Stack>
        </Paper>

        {/* Per-student compliance grid */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="lg">
            <LuShield size={16} color="#4c6ef5" />
            <Text fw={600}>Compliance by Student</Text>
          </Group>
          <Stack gap="md">
            {STUDENTS.map(st => {
              const intColor = st.integrityScore >= 85 ? '#2f9e44' : st.integrityScore >= 70 ? '#f08c00' : '#e03131';
              return (
                <Box key={st.id}>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm" fw={500}>{st.name}</Text>
                    <Group gap="md">
                      <Text size="xs" c="dimmed">Sim: {st.similarityIndex}%</Text>
                      <Text size="xs" c="dimmed">AI: {st.aiDetectionScore}%</Text>
                      <Text size="xs" fw={700} style={{ color: intColor }}>{st.integrityScore}%</Text>
                    </Group>
                  </Group>
                  <Progress
                    value={st.integrityScore}
                    color={st.integrityScore >= 85 ? 'green' : st.integrityScore >= 70 ? 'orange' : 'red'}
                    size="xs" radius="xl"
                  />
                </Box>
              );
            })}
          </Stack>
        </Paper>

      </SimpleGrid>
    </Box>
  );
}
