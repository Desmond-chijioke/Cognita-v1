import { useEffect, useState } from 'react';
import {
  Box, Group, Loader, Paper, Progress, RingProgress,
  SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuBookOpen, LuTrendingUp, LuActivity, LuBrain, LuAward,
} from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import { fetchAnalyticsData } from '../../../supabase/adminStats';
import type { AnalyticsData } from '../../../supabase/adminStats';

// ── Static data (not yet in DB) ────────────────────────────────────────────────

const GRANT_DATA = [
  { year: '2022', rate: 28 },
  { year: '2023', rate: 34 },
  { year: '2024', rate: 41 },
  { year: '2025', rate: 45 },
  { year: '2026', rate: 52 },
];

const AI_ADOPTION = [
  { name: 'Reviewer Only',      value: 45, color: '#2f9e44' },
  { name: 'Reviewer + Rewrite', value: 35, color: '#f08c00' },
  { name: 'Full AI',            value: 12, color: '#e03131' },
  { name: 'Disabled',           value: 8,  color: '#ced4da' },
];

// ── Inline SVG Charts ──────────────────────────────────────────────────────────

function HBarChart({ data }: { data: { dept: string; pubs: number }[] }) {
  if (!data.length) return <Text size="sm" c="dimmed" ta="center" py={40}>No approved submissions yet.</Text>;

  const BAR_START = 108;
  const BAR_MAX   = 228;
  const maxVal    = Math.max(...data.map(d => d.pubs), 1);
  const rowH      = 32;
  const totalH    = data.length * rowH + 20;

  return (
    <svg viewBox={`0 0 390 ${totalH}`} width="100%" height={totalH}>
      {[0, Math.round(maxVal * 0.5), maxVal].map(v => {
        const x = BAR_START + (v / maxVal) * BAR_MAX;
        return (
          <g key={v}>
            <line x1={x} y1={8} x2={x} y2={totalH - 8} stroke="#f1f3f5" strokeWidth={1} />
            <text x={x} y={6} textAnchor="middle" fontSize={10} fill="#adb5bd">{v}</text>
          </g>
        );
      })}
      {data.map((item, i) => {
        const y    = 14 + i * rowH;
        const barW = Math.max((item.pubs / maxVal) * BAR_MAX, 4);
        return (
          <g key={item.dept}>
            <text x={102} y={y + 14} textAnchor="end" fontSize={11} fill="#495057">{item.dept}</text>
            <rect x={BAR_START} y={y} width={barW} height={20} fill="#3b5bdb" rx={4} opacity={0.7 + (item.pubs / maxVal) * 0.3} />
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
      {[0, 20, 40, 60].map(v => {
        const y = cy(v);
        return (
          <g key={v}>
            <line x1={44} y1={y} x2={392} y2={y} stroke="#f1f3f5" strokeWidth={1} />
            <text x={38} y={y + 4} textAnchor="end" fontSize={10} fill="#adb5bd">{v}</text>
          </g>
        );
      })}
      <path d={areaPath} fill="rgba(59,91,219,0.07)" />
      <polyline points={linePts} fill="none" stroke="#3b5bdb" strokeWidth={2.5} strokeLinejoin="round" />
      {pts.map(p => (
        <g key={p.year}>
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={10} fill="#3b5bdb" fontWeight="600">{p.rate}%</text>
          <circle cx={p.x} cy={p.y} r={5} fill="white" stroke="#3b5bdb" strokeWidth={2.5} />
        </g>
      ))}
      {pts.map(p => (
        <text key={`xl-${p.year}`} x={p.x} y={168} textAnchor="middle" fontSize={11} fill="#868e96">{p.year}</text>
      ))}
    </svg>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const user          = useAppSelector(s => s.auth.user);
  const institutionId = user?.institutionId;

  const [data,    setData]    = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData(institutionId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [institutionId]);

  const latestGrant = GRANT_DATA[GRANT_DATA.length - 1].rate;

  // Avg integrity from real data
  const avgIntegrity = data?.integrityData.length
    ? Math.round(data.integrityData.reduce((a, d) => a + d.score, 0) / data.integrityData.length)
    : 0;

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Analytics</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Research performance and AI adoption metrics across the institution.
        </Text>
      </Box>

      {loading ? (
        <Group justify="center" py={80}><Loader size="md" /></Group>
      ) : (
        <>
          {/* ── KPI cards ── */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
            {[
              { icon: LuBookOpen,   label: 'Total Publications',  value: data?.totalPubs ?? 0,         color: 'brand',  sub: 'Approved sections'        },
              { icon: LuTrendingUp, label: 'Grant Success Rate',  value: `${latestGrant}%`,            color: 'teal',   sub: '↑ from 45% last year'     },
              { icon: LuBrain,      label: 'Avg Approval Rate',   value: avgIntegrity > 0 ? `${avgIntegrity}%` : '—', color: 'violet', sub: 'Across all departments' },
              { icon: LuAward,      label: 'Top Department',      value: data?.topDept ?? '—',         color: 'green',  sub: `${data?.pubData[0]?.pubs ?? 0} publications` },
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
              <Text fw={600} mb="md">Approved Sections by Department</Text>
              <HBarChart data={data?.pubData ?? []} />
            </Paper>

            {/* Grant Success Rate (static) */}
            <Paper withBorder p="lg" radius="md" bg="white">
              <Group justify="space-between" mb="md">
                <Text fw={600}>Grant Success Rate (%)</Text>
                <Text size="xs" c="green.7" fw={600}>↑ 24 pts over 4 yrs</Text>
              </Group>
              <LineChart />
            </Paper>

            {/* Approval Rate by Department (real) */}
            <Paper withBorder p="lg" radius="md" bg="white">
              <Text fw={600} mb="lg">Approval Rate by Department</Text>
              {(data?.integrityData ?? []).length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py={40}>No submission data yet.</Text>
              ) : (
                <Stack gap="md">
                  {(data?.integrityData ?? []).map(({ faculty, score }) => {
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
              )}
            </Paper>

            {/* AI Adoption Rate (static) */}
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
        </>
      )}

    </Box>
  );
}
