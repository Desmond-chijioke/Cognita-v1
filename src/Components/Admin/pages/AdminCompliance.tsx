import { useEffect, useState } from 'react';
import {
  Badge, Box, Center, Group, Loader, Pagination, Paper, Progress,
  SimpleGrid, Stack, Table, Tabs, Text, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuShield, LuBot, LuBookOpen, LuFileText,
  LuCircleCheck, LuTriangleAlert, LuConstruction,
} from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import { supabase } from '../../../supabase/client';

// ── Types ──────────────────────────────────────────────────────────────────────

type Severity = 'safe' | 'warning' | 'critical';

interface ProjectIntegrity {
  projectTitle: string;
  studentName:  string;
  department:   string;
  total:        number;
  approved:     number;
  pending:      number;
  revision:     number;
  integrity:    number;
  severity:     Severity;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SEV_STYLE = {
  safe:     { bg: '#f4fce3', border: '#94d82d30', iconColor: 'green'  as const, icon: LuCircleCheck  },
  warning:  { bg: '#fff9db', border: '#fab00530', iconColor: 'orange' as const, icon: LuTriangleAlert },
  critical: { bg: '#fff5f5', border: '#ff636330', iconColor: 'red'    as const, icon: LuTriangleAlert },
};

function severityOf(integrity: number): Severity {
  return integrity >= 70 ? 'safe' : integrity >= 40 ? 'warning' : 'critical';
}
function riskColor(s: Severity) {
  return s === 'safe' ? 'green' : s === 'warning' ? 'orange' : 'red';
}
function riskText(s: Severity) {
  return s === 'safe' ? '#2f9e44' : s === 'warning' ? '#f08c00' : '#e03131';
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

function ComingSoon({ label }: { label: string }) {
  return (
    <Center py={64}>
      <Stack align="center" gap="sm">
        <ThemeIcon size={52} radius="xl" color="gray" variant="light">
          <LuConstruction size={26} />
        </ThemeIcon>
        <Text fw={600} c="dimmed">{label} tracking not yet available</Text>
        <Text size="sm" c="dimmed" ta="center" maw={360}>
          This tab will surface real data once the relevant analysis integrations are connected to the platform.
        </Text>
      </Stack>
    </Center>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const PER_PAGE = 10;

export default function AdminCompliance() {
  const [tab, setTab]         = useState('integrity');
  const [projects, setProjects] = useState<ProjectIntegrity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);

  const institutionId = useAppSelector(s => s.auth.user?.institutionId);

  useEffect(() => {
    if (!institutionId) { setLoading(false); return; }

    async function load() {
      setLoading(true);
      try {
        const { data: students } = await supabase
          .from('users')
          .select('id, name, department, project_title')
          .eq('institution_id', institutionId!)
          .in('role', ['Student', 'PhD Student', "Master's Student", 'Undergraduate Student', 'Researcher']);

        const studentIds = (students ?? []).map(s => s.id);
        if (!studentIds.length) { setProjects([]); return; }

        const { data: subs } = await supabase
          .from('submissions')
          .select('student_id, status')
          .in('student_id', studentIds);

        const subsByStudent = new Map<string, { total: number; approved: number; pending: number; revision: number }>();
        for (const sub of subs ?? []) {
          const cur = subsByStudent.get(sub.student_id) ?? { total: 0, approved: 0, pending: 0, revision: 0 };
          cur.total++;
          if (sub.status === 'approved')       cur.approved++;
          else if (sub.status === 'pending')   cur.pending++;
          else if (sub.status === 'needs-revision') cur.revision++;
          subsByStudent.set(sub.student_id, cur);
        }

        const result: ProjectIntegrity[] = (students ?? [])
          .filter(s => !!s.project_title)
          .map(s => {
            const counts   = subsByStudent.get(s.id) ?? { total: 0, approved: 0, pending: 0, revision: 0 };
            const integrity = counts.total > 0
              ? Math.round((counts.approved / counts.total) * 100)
              : 0;
            return {
              projectTitle: s.project_title!,
              studentName:  s.name,
              department:   s.department ?? 'Unassigned',
              ...counts,
              integrity,
              severity: severityOf(integrity),
            };
          })
          .sort((a, b) => a.integrity - b.integrity);

        setProjects(result);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [institutionId]);

  const criticalCount = projects.filter(p => p.severity === 'critical').length;
  const warningCount  = projects.filter(p => p.severity === 'warning').length;
  const cleanCount    = projects.filter(p => p.severity === 'safe').length;
  const totalSubs     = projects.reduce((a, p) => a + p.total, 0);

  const totalPages = Math.max(1, Math.ceil(projects.length / PER_PAGE));
  const paged      = projects.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Compliance</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Monitor submission integrity and academic progress across all institution projects.
        </Text>
      </Box>

      {/* ── Summary chips ── */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl">
        <SummaryChip value={projects.length} label="Tracked Projects" color="#4c6ef5" />
        <SummaryChip value={totalSubs}       label="Total Submissions" color="#7950f2" />
        <SummaryChip value={warningCount + criticalCount} label="Needs Attention" color="#f08c00" />
        <SummaryChip value={cleanCount}      label="On Track"          color="#2f9e44" />
      </SimpleGrid>

      {/* ── Tabs ── */}
      <Tabs value={tab} onChange={v => setTab(v ?? 'integrity')}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="integrity"  leftSection={<LuFileText  size={14} />}>Integrity Metrics</Tabs.Tab>
          <Tabs.Tab value="ai"         leftSection={<LuBot       size={14} />}>AI Usage</Tabs.Tab>
          <Tabs.Tab value="citations"  leftSection={<LuBookOpen  size={14} />}>Citations</Tabs.Tab>
          <Tabs.Tab value="ethics"     leftSection={<LuShield    size={14} />}>Ethics</Tabs.Tab>
        </Tabs.List>

        {/* Integrity Metrics */}
        <Tabs.Panel value="integrity">
          <Paper
            p="sm" radius="md" mb="md"
            style={{ background: '#f8f9fa', border: '1px dashed #dee2e6' }}
          >
            <Text size="xs" c="dimmed">
              Integrity score = approved chapters ÷ total submissions.
              Below 40% is critical · 40–69% needs attention · 70%+ on track.
            </Text>
          </Paper>

          {loading ? (
            <Center py="xl"><Loader size="sm" color="brand" /></Center>
          ) : projects.length === 0 ? (
            <Center py={64}>
              <Stack align="center" gap="sm">
                <ThemeIcon size={52} radius="xl" color="gray" variant="light">
                  <LuFileText size={26} />
                </ThemeIcon>
                <Text fw={600} c="dimmed">No project data yet</Text>
                <Text size="sm" c="dimmed" ta="center" maw={360}>
                  Integrity scores will appear once students with projects have submitted chapters for review.
                </Text>
              </Stack>
            </Center>
          ) : (
            <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
              <Table highlightOnHover verticalSpacing="md">
                <Table.Thead>
                  <Table.Tr style={{ background: '#f8f9fa' }}>
                    {['Project', 'Student', 'Department', 'Submissions', 'Approved', 'Pending', 'Revision', 'Integrity', 'Status'].map(h => (
                      <Table.Th key={h}>
                        <Text size="xs" c="dimmed" fw={600}>{h}</Text>
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paged.map(p => {
                    const SevIcon = SEV_STYLE[p.severity].icon;
                    return (
                      <Table.Tr key={`${p.studentName}-${p.projectTitle}`}>
                        <Table.Td>
                          <Text size="sm" fw={500} lineClamp={1} style={{ maxWidth: 180 }}>{p.projectTitle}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{p.studentName}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed" lineClamp={1} style={{ maxWidth: 120 }}>{p.department}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={600} ta="center">{p.total}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="green" variant="light" size="sm" radius="sm">{p.approved}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="yellow" variant="light" size="sm" radius="sm">{p.pending}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="red" variant="light" size="sm" radius="sm">{p.revision}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" fw={700} mb={4} style={{ color: riskText(p.severity) }}>
                            {p.total > 0 ? `${p.integrity}%` : '—'}
                          </Text>
                          {p.total > 0 && (
                            <Progress value={p.integrity} color={riskColor(p.severity)} size="xs" radius="xl" style={{ width: 80 }} />
                          )}
                        </Table.Td>
                        <Table.Td>
                          <ThemeIcon size={28} radius="xl" color={SEV_STYLE[p.severity].iconColor} variant="light">
                            <SevIcon size={14} />
                          </ThemeIcon>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Paper>
          )}
          {!loading && totalPages > 1 && (
            <Group justify="space-between" mt="md">
              <Text size="sm" c="dimmed">
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, projects.length)} of {projects.length} projects
              </Text>
              <Pagination total={totalPages} value={page} onChange={setPage} color="brand" radius="md" size="sm" />
            </Group>
          )}
        </Tabs.Panel>

        {/* AI Usage */}
        <Tabs.Panel value="ai">
          <ComingSoon label="AI usage" />
        </Tabs.Panel>

        {/* Citations */}
        <Tabs.Panel value="citations">
          <ComingSoon label="Citation" />
        </Tabs.Panel>

        {/* Ethics */}
        <Tabs.Panel value="ethics">
          <ComingSoon label="Ethics review" />
        </Tabs.Panel>

      </Tabs>
    </Box>
  );
}
