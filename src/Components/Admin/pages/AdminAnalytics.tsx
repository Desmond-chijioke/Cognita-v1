import { useEffect, useState } from 'react';
import {
  Box, Group, Loader, Paper, Progress, RingProgress,
  SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuBookOpen, LuTrendingUp, LuActivity, LuUsers, LuAward,
} from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import { fetchAnalyticsData } from '../../../supabase/adminStats';
import type { AnalyticsData } from '../../../supabase/adminStats';

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

function MonthlyTrendChart({ data }: { data: { month: string; count: number }[] }) {
  if (!data.length || data.every(d => d.count === 0)) {
    return <Text size="sm" c="dimmed" ta="center" py={40}>No submissions recorded yet.</Text>;
  }

  const maxVal = Math.max(...data.map(d => d.count), 1);
  const W = 420, H = 160, padL = 36, padB = 24, padT = 16, padR = 16;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const stepX  = data.length > 1 ? chartW / (data.length - 1) : chartW;

  const cx = (i: number) => padL + i * stepX;
  const cy = (v: number) => padT + chartH - (v / maxVal) * chartH;

  const pts    = data.map((d, i) => ({ ...d, x: cx(i), y: cy(d.count) }));
  const linePts = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = [
    `M ${pts[0].x} ${pts[0].y}`,
    ...pts.slice(1).map(p => `L ${p.x} ${p.y}`),
    `L ${pts[pts.length - 1].x} ${padT + chartH}`,
    `L ${pts[0].x} ${padT + chartH} Z`,
  ].join(' ');

  const gridVals = [0, Math.round(maxVal / 2), maxVal];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
      {gridVals.map(v => {
        const y = cy(v);
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#f1f3f5" strokeWidth={1} />
            <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={10} fill="#adb5bd">{v}</text>
          </g>
        );
      })}
      <path d={areaPath} fill="rgba(59,91,219,0.07)" />
      <polyline points={linePts} fill="none" stroke="#3b5bdb" strokeWidth={2.5} strokeLinejoin="round" />
      {pts.map(p => (
        <g key={p.month}>
          {p.count > 0 && (
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize={10} fill="#3b5bdb" fontWeight="600">{p.count}</text>
          )}
          <circle cx={p.x} cy={p.y} r={4} fill="white" stroke="#3b5bdb" strokeWidth={2} />
          <text x={p.x} y={H - 4} textAnchor="middle" fontSize={10} fill="#868e96">{p.month}</text>
        </g>
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

  const avgIntegrity = data?.integrityData.length
    ? Math.round(data.integrityData.reduce((a, d) => a + d.score, 0) / data.integrityData.length)
    : 0;

  const statusSections = data && data.totalSubs > 0
    ? [
        { value: Math.round((data.totalPubs    / data.totalSubs) * 100), color: '#2f9e44', label: 'Approved',  count: data.totalPubs    },
        { value: Math.round((data.pendingCount / data.totalSubs) * 100), color: '#4c6ef5', label: 'Pending',   count: data.pendingCount  },
        { value: Math.round((data.revisionCount / data.totalSubs) * 100), color: '#f08c00', label: 'Revision', count: data.revisionCount },
      ]
    : [];

  const approvedPct = data && data.totalSubs > 0
    ? Math.round((data.totalPubs / data.totalSubs) * 100)
    : 0;

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Analytics</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Research performance and submission metrics across the institution.
        </Text>
      </Box>

      {loading ? (
        <Group justify="center" py={80}><Loader size="md" color="brand" /></Group>
      ) : (
        <>
          {/* ── KPI cards ── */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
            {[
              { icon: LuBookOpen,   label: 'Approved Sections',  value: data?.totalPubs ?? 0,                         color: 'brand',  sub: 'Total approved chapters'        },
              { icon: LuUsers,      label: 'Total Students',     value: data?.totalStudents ?? 0,                     color: 'violet', sub: 'Enrolled in this institution'   },
              { icon: LuTrendingUp, label: 'Avg Approval Rate',  value: avgIntegrity > 0 ? `${avgIntegrity}%` : '—', color: 'teal',   sub: 'Across all departments'         },
              { icon: LuAward,      label: 'Top Department',     value: data?.topDept ?? '—',                         color: 'green',  sub: `${data?.pubData[0]?.pubs ?? 0} approved sections` },
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

            {/* Approved Sections by Department */}
            <Paper withBorder p="lg" radius="md" bg="white">
              <Text fw={600} mb="md">Approved Sections by Department</Text>
              <HBarChart data={data?.pubData ?? []} />
            </Paper>

            {/* Monthly Submission Trend — real data */}
            <Paper withBorder p="lg" radius="md" bg="white">
              <Group justify="space-between" mb="md">
                <Text fw={600}>Monthly Submissions (Last 6 Months)</Text>
                <Text size="xs" c="dimmed" fw={600}>{data?.totalSubs ?? 0} total</Text>
              </Group>
              <MonthlyTrendChart data={data?.monthlyTrend ?? []} />
            </Paper>

            {/* Approval Rate by Department */}
            <Paper withBorder p="lg" radius="md" bg="white">
              <Text fw={600} mb="lg">Approval Rate by Department</Text>
              {(data?.integrityData ?? []).length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py={40}>No submission data yet.</Text>
              ) : (
                <Stack gap="md">
                  {(data?.integrityData ?? []).map(({ faculty, score }) => {
                    const color     = score >= 70 ? 'green'   : score >= 40 ? 'orange'  : 'red';
                    const textColor = score >= 70 ? '#2f9e44' : score >= 40 ? '#f08c00' : '#e03131';
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

            {/* Submission Status Breakdown — real data */}
            <Paper withBorder p="lg" radius="md" bg="white">
              <Text fw={600} mb="lg">Submission Status Breakdown</Text>
              {data?.totalSubs === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py={40}>No submissions yet.</Text>
              ) : (
                <Group justify="center" align="center" gap="xl">
                  <RingProgress
                    size={168}
                    thickness={28}
                    roundCaps
                    sections={statusSections.map(s => ({
                      value:   s.value,
                      color:   s.color,
                      tooltip: `${s.label}: ${s.count}`,
                    }))}
                    label={
                      <Box ta="center">
                        <Text fw={800} size="xl" lh={1}>{approvedPct}%</Text>
                        <Text size="xs" c="dimmed">approved</Text>
                      </Box>
                    }
                  />
                  <Stack gap="md">
                    {statusSections.map(({ label, count, color }) => (
                      <Group key={label} gap="xs" wrap="nowrap">
                        <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <Text size="sm" c="dimmed" style={{ minWidth: 80 }}>{label}</Text>
                        <Text size="sm" fw={700}>{count}</Text>
                      </Group>
                    ))}
                    <Group gap="xs" wrap="nowrap">
                      <Box style={{ width: 10, height: 10, borderRadius: '50%', background: '#ced4da', flexShrink: 0 }} />
                      <Text size="sm" c="dimmed" style={{ minWidth: 80 }}>Total</Text>
                      <Text size="sm" fw={700}>{data?.totalSubs ?? 0}</Text>
                    </Group>
                  </Stack>
                </Group>
              )}
            </Paper>

          </SimpleGrid>
        </>
      )}

    </Box>
  );
}
