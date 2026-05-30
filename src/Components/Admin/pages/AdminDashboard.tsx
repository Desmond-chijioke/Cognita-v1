import { Badge, Box, Group, Paper, RingProgress, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { LuFolder, LuFileText, LuBot, LuClipboard, LuTrendingUp, LuArrowRight } from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';

// ── Static data ────────────────────────────────────────────────────────────────

const STATS = [
  { label: 'Active Projects',     value: 67, icon: LuFolder,   color: '#228be6' },
  { label: 'Similarity Alerts',   value: 2,  icon: LuFileText, color: '#fab005' },
  { label: 'AI Detection Alerts', value: 3,  icon: LuBot,      color: '#fa5252' },
  { label: 'Publications',        value: 38, icon: LuClipboard,color: '#40c057' },
];

const AI_USAGE = [
  { dept: 'Computer',      value: 5   },
  { dept: 'Biology',       value: 0.5 },
  { dept: 'Chemistry',     value: 0.3 },
  { dept: 'Physics',       value: 0.2 },
  { dept: 'Environmental', value: 1.5 },
];

const PROJECT_STATUS = [
  { label: 'Draft',       count: 1, pct: 12.5, color: '#dee2e6' },
  { label: 'In Progress', count: 4, pct: 50,   color: '#1864ab' },
  { label: 'Review',      count: 1, pct: 12.5, color: '#f59f00' },
  { label: 'Submitted',   count: 1, pct: 12.5, color: '#2f9e44' },
  { label: 'Exported',    count: 1, pct: 12.5, color: '#ced4da' },
];

const ALERTS = [
  { severity: 'critical', message: 'High AI rewrite usage detected in "CRISPR-Cas9 Gene Editing" project',        time: '2 hours ago', arrow: true  },
  { severity: 'warning',  message: 'Missing citations in 2 projects (Engineering, Computer Science)',              time: '5 hours ago', arrow: false },
  { severity: 'critical', message: 'AI generation mode used extensively in "Neural Machine Translation" project', time: '1 day ago',   arrow: true  },
  { severity: 'warning',  message: '3 projects have not been reviewed in over 30 days',                           time: '2 days ago',  arrow: false },
];

// ── Bar chart (inline SVG) ─────────────────────────────────────────────────────

const MAX_Y   = 8;
const CHART_H = 120;
const BOTTOM  = 140;
const BAR_W   = 44;
const GAP     = 30;
const START_X = 44;

function BarChart() {
  return (
    <svg viewBox="0 0 420 195" width="100%" height="195">
      {/* gridlines + y labels */}
      {[0, 2, 4, 6, 8].map(v => {
        const y = BOTTOM - (v / MAX_Y) * CHART_H;
        return (
          <g key={v}>
            <line x1={36} y1={y} x2={410} y2={y} stroke="#f1f3f5" strokeWidth={1} />
            <text x={30} y={y + 4} textAnchor="end" fontSize={11} fill="#adb5bd">{v}</text>
          </g>
        );
      })}

      {/* bars + x labels */}
      {AI_USAGE.map((item, i) => {
        const x  = START_X + i * (BAR_W + GAP);
        const bh = Math.max((item.value / MAX_Y) * CHART_H, 3);
        return (
          <g key={item.dept}>
            <rect x={x} y={BOTTOM - bh} width={BAR_W} height={bh} fill="#1864ab" rx={3} />
            <text x={x + BAR_W / 2} y={183} textAnchor="middle" fontSize={10} fill="#868e96">
              {item.dept}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const user = useAppSelector(s => s.auth.user);
  const institutionName = user?.institutionName ?? 'Institution';

  return (
    <Box p="xl">

      {/* Page title */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>{institutionName}</Title>
        <Text size="sm" c="dimmed">Institutional Research Overview</Text>
      </Box>

      {/* ── Stat cards ── */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        {STATS.map(({ label, value, icon: Icon, color }) => (
          <Paper key={label} withBorder p="lg" radius="md" bg="white">
            <Group justify="space-between" mb="xs">
              <Icon size={22} color={color} />
              <LuTrendingUp size={15} color="#ced4da" />
            </Group>
            <Text fw={800} lh={1} mb={6} style={{ fontSize: 32 }}>{value}</Text>
            <Text size="sm" c="dimmed">{label}</Text>
          </Paper>
        ))}
      </SimpleGrid>

      {/* ── Charts ── */}
      <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">

        {/* Bar chart */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Text fw={600} mb="md">AI Usage by Department</Text>
          <BarChart />
        </Paper>

        {/* Donut chart */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Text fw={600} mb="md">Project Status Breakdown</Text>
          <Group justify="center" align="center" gap="xl" mt="sm">
            <RingProgress
              size={160}
              thickness={30}
              sections={PROJECT_STATUS.map(s => ({ value: s.pct, color: s.color }))}
            />
            <Stack gap={8}>
              {PROJECT_STATUS.map(({ label, count, color }) => (
                <Group key={label} gap="xs" wrap="nowrap">
                  <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <Text size="sm" c="dimmed" style={{ minWidth: 90 }}>{label}</Text>
                  <Text size="sm" fw={600}>{count}</Text>
                </Group>
              ))}
            </Stack>
          </Group>
        </Paper>

      </SimpleGrid>

      {/* ── Recent Alerts ── */}
      <Paper withBorder p="lg" radius="md" bg="white">
        <Group justify="space-between" mb="md">
          <Text fw={600}>Recent Alerts</Text>
          <Group gap={4} style={{ cursor: 'pointer' }}>
            <Text size="sm" c="blue">View All</Text>
            <LuArrowRight size={14} color="#228be6" />
          </Group>
        </Group>

        {ALERTS.map((alert, i) => (
          <Box
            key={i}
            py="sm"
            style={{ borderTop: i === 0 ? '1px solid #f1f3f5' : '1px solid #f1f3f5' }}
          >
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <Badge
                color={alert.severity === 'critical' ? 'red' : 'yellow'}
                radius="sm"
                size="sm"
                variant="filled"
                style={{ flexShrink: 0, marginTop: 2 }}
              >
                {alert.severity}
              </Badge>
              <Box>
                <Group gap={4} wrap="nowrap">
                  <Text size="sm">{alert.message}</Text>
                  {alert.arrow && <LuArrowRight size={13} style={{ flexShrink: 0 }} />}
                </Group>
                <Text size="xs" c="dimmed" mt={2}>{alert.time}</Text>
              </Box>
            </Group>
          </Box>
        ))}
      </Paper>

    </Box>
  );
}
