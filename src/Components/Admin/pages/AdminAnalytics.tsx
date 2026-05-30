import {
  Box, Group, Paper, Progress, RingProgress,
  SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuBookOpen, LuTrendingUp, LuActivity, LuBrain, LuAward,
} from 'react-icons/lu';

// ── Static data ────────────────────────────────────────────────────────────────

const PUB_DATA = [
  { dept: 'Computer Sci', pubs: 12 },
  { dept: 'Medicine',     pubs: 9  },
  { dept: 'Env Science',  pubs: 6  },
  { dept: 'Engineering',  pubs: 4  },
  { dept: 'Chemistry',    pubs: 3  },
  { dept: 'Social Sci',   pubs: 3  },
  { dept: 'Biology',      pubs: 1  },
];

const GRANT_DATA = [
  { year: '2022', rate: 28 },
  { year: '2023', rate: 34 },
  { year: '2024', rate: 41 },
  { year: '2025', rate: 45 },
  { year: '2026', rate: 52 },
];

const INTEGRITY_DATA = [
  { faculty: 'Chemistry',    score: 95 },
  { faculty: 'Env Science',  score: 92 },
  { faculty: 'Social Sci',   score: 89 },
  { faculty: 'Medicine',     score: 88 },
  { faculty: 'Engineering',  score: 81 },
  { faculty: 'Computer Sci', score: 79 },
];

const AI_ADOPTION = [
  { name: 'Reviewer Only',      value: 45, color: '#2f9e44' },
  { name: 'Reviewer + Rewrite', value: 35, color: '#f08c00' },
  { name: 'Full AI',            value: 12, color: '#e03131' },
  { name: 'Disabled',           value: 8,  color: '#ced4da' },
];

// ── Inline SVG Charts ──────────────────────────────────────────────────────────

function HBarChart() {
  const BAR_START = 108;
  const BAR_MAX   = 228;
  const MAX_VAL   = 12;

  return (
    <svg viewBox="0 0 390 252" width="100%" height="252">
      {/* vertical gridlines */}
      {[0, 4, 8, 12].map(v => {
        const x = BAR_START + (v / MAX_VAL) * BAR_MAX;
        return (
          <g key={v}>
            <line x1={x} y1={8} x2={x} y2={244} stroke="#f1f3f5" strokeWidth={1} />
            <text x={x} y={6} textAnchor="middle" fontSize={10} fill="#adb5bd">{v}</text>
          </g>
        );
      })}
      {/* bars */}
      {PUB_DATA.map((item, i) => {
        const y    = 14 + i * 32;
        const barW = Math.max((item.pubs / MAX_VAL) * BAR_MAX, 4);
        return (
          <g key={item.dept}>
            <text x={102} y={y + 14} textAnchor="end" fontSize={11} fill="#495057">{item.dept}</text>
            <rect x={BAR_START} y={y} width={barW} height={20} fill="#3b5bdb" rx={4} opacity={0.7 + (item.pubs / MAX_VAL) * 0.3} />
            <text x={BAR_START + barW + 6} y={y + 14} fontSize={11} fill="#868e96">{item.pubs}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart() {
  const cx  = (i: number)    => 44 + i * 84;
  const cy  = (rate: number) => 145 - (rate / 60) * 125;
  const pts = GRANT_DATA.map((d, i) => ({ ...d, x: cx(i), y: cy(d.rate) }));

  const linePts = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = [
    `M ${pts[0].x} ${pts[0].y}`,
    ...pts.slice(1).map(p => `L ${p.x} ${p.y}`),
    `L ${pts[pts.length - 1].x} 145`,
    `L ${pts[0].x} 145 Z`,
  ].join(' ');

  return (
    <svg viewBox="0 0 420 178" width="100%" height="178">
      {/* horizontal gridlines */}
      {[0, 20, 40, 60].map(v => {
        const y = cy(v);
        return (
          <g key={v}>
            <line x1={44} y1={y} x2={392} y2={y} stroke="#f1f3f5" strokeWidth={1} />
            <text x={38} y={y + 4} textAnchor="end" fontSize={10} fill="#adb5bd">{v}</text>
          </g>
        );
      })}
      {/* area fill */}
      <path d={areaPath} fill="rgba(59,91,219,0.07)" />
      {/* line */}
      <polyline points={linePts} fill="none" stroke="#3b5bdb" strokeWidth={2.5} strokeLinejoin="round" />
      {/* dots + value labels */}
      {pts.map(p => (
        <g key={p.year}>
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={10} fill="#3b5bdb" fontWeight="600">{p.rate}%</text>
          <circle cx={p.x} cy={p.y} r={5} fill="white" stroke="#3b5bdb" strokeWidth={2.5} />
        </g>
      ))}
      {/* x-axis labels */}
      {pts.map(p => (
        <text key={`xl-${p.year}`} x={p.x} y={168} textAnchor="middle" fontSize={11} fill="#868e96">{p.year}</text>
      ))}
    </svg>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const totalPubs    = PUB_DATA.reduce((a, d) => a + d.pubs, 0);
  const latestGrant  = GRANT_DATA[GRANT_DATA.length - 1].rate;
  const avgIntegrity = Math.round(INTEGRITY_DATA.reduce((a, d) => a + d.score, 0) / INTEGRITY_DATA.length);
  const topDept      = PUB_DATA[0].dept;

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Analytics</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Research performance and AI adoption metrics across the institution.
        </Text>
      </Box>

      {/* ── KPI cards ── */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        {[
          { icon: LuBookOpen,   label: 'Total Publications',  value: totalPubs,          color: 'brand',  sub: 'This academic year'       },
          { icon: LuTrendingUp, label: 'Grant Success Rate',  value: `${latestGrant}%`,  color: 'teal',   sub: '↑ from 45% last year'     },
          { icon: LuBrain,      label: 'Avg Integrity Score', value: `${avgIntegrity}%`, color: 'violet', sub: 'Across all faculties'      },
          { icon: LuAward,      label: 'Top Department',      value: topDept,            color: 'green',  sub: `${PUB_DATA[0].pubs} publications` },
        ].map(({ icon: Icon, label, value, color, sub }) => (
          <Paper key={label} withBorder p="lg" radius="md" bg="white">
            <Group justify="space-between" mb="sm">
              <ThemeIcon size={42} radius="md" color={color} variant="light">
                <Icon size={20} />
              </ThemeIcon>
              <LuActivity size={14} color="#ced4da" />
            </Group>
            <Text fw={800} lh={1} mb={4} style={{ fontSize: 28 }}>{value}</Text>
            <Text size="sm" c="dimmed" fw={500}>{label}</Text>
            <Text size="xs" c="dimmed" mt={4}>{sub}</Text>
          </Paper>
        ))}
      </SimpleGrid>

      {/* ── Charts grid ── */}
      <SimpleGrid cols={{ base: 1, md: 2 }}>

        {/* Publications by Department */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Text fw={600} mb="md">Publications by Department</Text>
          <HBarChart />
        </Paper>

        {/* Grant Success Rate */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group justify="space-between" mb="md">
            <Text fw={600}>Grant Success Rate (%)</Text>
            <Text size="xs" c="green.7" fw={600}>↑ 24 pts over 4 yrs</Text>
          </Group>
          <LineChart />
        </Paper>

        {/* Avg Integrity Score by Faculty */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Text fw={600} mb="lg">Avg Integrity Score by Faculty</Text>
          <Stack gap="md">
            {INTEGRITY_DATA.map(({ faculty, score }) => {
              const color     = score >= 85 ? 'green'   : score >= 70 ? 'orange'   : 'red';
              const textColor = score >= 85 ? '#2f9e44' : score >= 70 ? '#f08c00' : '#e03131';
              return (
                <Box key={faculty}>
                  <Group justify="space-between" mb={5}>
                    <Text size="sm">{faculty}</Text>
                    <Text size="sm" fw={700} style={{ color: textColor }}>{score}%</Text>
                  </Group>
                  <Progress value={score} color={color} size="sm" radius="xl" />
                </Box>
              );
            })}
          </Stack>
        </Paper>

        {/* AI Adoption Rate */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Text fw={600} mb="lg">AI Adoption Rate</Text>
          <Group justify="center" align="center" gap="xl">
            <RingProgress
              size={168}
              thickness={28}
              roundCaps
              sections={AI_ADOPTION.map(d => ({
                value:   d.value,
                color:   d.color,
                tooltip: `${d.name}: ${d.value}%`,
              }))}
              label={
                <Box ta="center">
                  <Text fw={800} size="xl" lh={1}>92%</Text>
                  <Text size="xs" c="dimmed">AI enabled</Text>
                </Box>
              }
            />
            <Stack gap="md">
              {AI_ADOPTION.map(({ name, value, color }) => (
                <Group key={name} gap="xs" wrap="nowrap">
                  <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <Text size="sm" c="dimmed" style={{ minWidth: 150 }}>{name}</Text>
                  <Text size="sm" fw={700}>{value}%</Text>
                </Group>
              ))}
            </Stack>
          </Group>
        </Paper>

      </SimpleGrid>
    </Box>
  );
}
