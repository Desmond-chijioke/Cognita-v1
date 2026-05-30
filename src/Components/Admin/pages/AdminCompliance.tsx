import { useState } from 'react';
import {
  Badge, Box, Group, Paper, Progress, SimpleGrid,
  Stack, Table, Tabs, Text, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuShield, LuBot, LuBookOpen, LuFileText,
  LuCircleCheck, LuTriangleAlert,
} from 'react-icons/lu';

// ── Types ──────────────────────────────────────────────────────────────────────

type Severity = 'safe' | 'warning' | 'critical';

const SEV = {
  safe:     { bg: '#f4fce3', border: '#94d82d30', iconColor: 'green'  as const, textColor: '#2f9e44', icon: LuCircleCheck  },
  warning:  { bg: '#fff9db', border: '#fab00530', iconColor: 'orange' as const, textColor: '#f08c00', icon: LuTriangleAlert },
  critical: { bg: '#fff5f5', border: '#ff636330', iconColor: 'red'    as const, textColor: '#e03131', icon: LuTriangleAlert },
};

// ── Static data ────────────────────────────────────────────────────────────────

const INTEGRITY_PROJECTS = [
  { title: 'CRISPR-Cas9 Gene Editing',         researcher: 'Dr. Kwame Asante',  similarity: 38, ai: 52, integrity: 64 },
  { title: 'Neural Machine Translation',        researcher: 'Dr. Ibrahim Musa',  similarity: 41, ai: 48, integrity: 62 },
  { title: 'AI-Based Crop Disease Detection',   researcher: 'Dr. Fatima Hassan', similarity: 22, ai: 28, integrity: 78 },
  { title: 'Renewable Energy Integration',      researcher: 'Dr. Michael Obi',   similarity: 15, ai: 18, integrity: 88 },
  { title: 'Microplastic Contamination',        researcher: 'Dr. Sarah Chen',    similarity: 8,  ai: 5,  integrity: 96 },
  { title: 'Social Media Misinformation',       researcher: 'Dr. Amina Yusuf',   similarity: 11, ai: 10, integrity: 92 },
  { title: 'Antibiotic Resistance Patterns',    researcher: 'Dr. Grace Ndegwa',  similarity: 6,  ai: 8,  integrity: 94 },
];

const AI_USAGE = [
  { researcher: 'Dr. Kwame Asante',  project: 'CRISPR-Cas9 Gene Editing',       level: 'High',     mode: 'Reviewer + Rewrite + Generation', severity: 'critical' as Severity, detail: 'Extensive AI generation detected in 2 sections. 34% of literature review appears AI-generated.' },
  { researcher: 'Dr. Ibrahim Musa',  project: 'Neural Machine Translation',      level: 'High',     mode: 'Reviewer + Rewrite + Generation', severity: 'critical' as Severity, detail: 'AI generation mode activated 12 times. Related work section flagged for excessive AI content.' },
  { researcher: 'Dr. Fatima Hassan', project: 'AI-Based Crop Disease Detection', level: 'Moderate', mode: 'Reviewer + Rewrite Suggestions',  severity: 'warning'  as Severity, detail: 'Applied suggested rewrites 8 times. All within acceptable thresholds.' },
  { researcher: 'Dr. Michael Obi',   project: 'Renewable Energy Integration',    level: 'Moderate', mode: 'Reviewer + Rewrite Suggestions',  severity: 'warning'  as Severity, detail: 'Moderate AI usage. 5 rewrite suggestions applied across chapters.' },
  { researcher: 'Dr. Sarah Chen',    project: 'Microplastic Contamination',      level: 'Low',      mode: 'Reviewer Only',                   severity: 'safe'     as Severity, detail: 'AI used only for review scoring. No rewrites applied.' },
];

const CITATIONS = [
  { researcher: 'Dr. Kwame Asante',  project: 'CRISPR-Cas9 Gene Editing',       issue: '3 uncited claims found in introduction section',        severity: 'critical' as Severity },
  { researcher: 'Dr. Michael Obi',   project: 'Renewable Energy Integration',   issue: 'Missing citations in methodology section',               severity: 'warning'  as Severity },
  { researcher: 'Dr. Ibrahim Musa',  project: 'Neural Machine Translation',     issue: '3 references are missing DOI identifiers',               severity: 'warning'  as Severity },
  { researcher: 'Dr. Fatima Hassan', project: 'AI-Based Crop Disease',          issue: '1 reference missing DOI (FAO Report 2023)',              severity: 'safe'     as Severity },
];

const ETHICS = [
  { researcher: 'Dr. Kwame Asante', project: 'CRISPR-Cas9 Gene Editing',        issue: 'Human gene therapy research — ethics review pending',        severity: 'critical' as Severity },
  { researcher: 'Dr. Amina Yusuf',  project: 'Social Media Misinformation',     issue: 'Human subjects data — IRB approval confirmed',               severity: 'safe'     as Severity },
  { researcher: 'Dr. Grace Ndegwa', project: 'Antibiotic Resistance Patterns',  issue: 'Clinical data — ethics clearance valid until Dec 2027',      severity: 'safe'     as Severity },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function risk(val: number, lo: number, hi: number): Severity {
  return val <= lo ? 'safe' : val <= hi ? 'warning' : 'critical';
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

interface AlertItem {
  researcher: string;
  project: string;
  severity: Severity;
  detail?: string;
  issue?: string;
  mode?: string;
  level?: string;
}

function AlertCard({ item }: { item: AlertItem }) {
  const cfg  = SEV[item.severity];
  const Icon = cfg.icon;
  return (
    <Paper p="md" radius="md" style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
      <Group gap="sm" align="flex-start" wrap="nowrap">
        <ThemeIcon size={34} radius="md" color={cfg.iconColor} variant="light" style={{ flexShrink: 0, marginTop: 2 }}>
          <Icon size={16} />
        </ThemeIcon>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap={6} mb={6} wrap="nowrap">
            <Text size="sm" fw={600}>{item.researcher}</Text>
            <Text size="xs" c="dimmed">·</Text>
            <Text size="xs" c="dimmed" lineClamp={1}>{item.project}</Text>
          </Group>
          <Text size="sm" mb={item.mode ? 'xs' : 0}>{item.detail ?? item.issue}</Text>
          {item.mode && (
            <Group gap="xs" mt={6}>
              <Badge variant="outline" size="xs" radius="sm">{item.mode}</Badge>
              <Badge
                color={item.level === 'High' ? 'red' : item.level === 'Moderate' ? 'orange' : 'green'}
                variant="light"
                size="xs"
                radius="sm"
              >
                {item.level}
              </Badge>
            </Group>
          )}
        </Box>
      </Group>
    </Paper>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminCompliance() {
  const [tab, setTab] = useState('integrity');

  const allItems     = [...AI_USAGE, ...CITATIONS, ...ETHICS];
  const criticalCount = allItems.filter(i => i.severity === 'critical').length;
  const warningCount  = allItems.filter(i => i.severity === 'warning').length;
  const ethicsPending = ETHICS.filter(i => i.severity === 'critical').length;
  const cleanProjects = INTEGRITY_PROJECTS.filter(p => p.similarity <= 20 && p.ai <= 20).length;

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Compliance</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Monitor AI usage, citation integrity, and ethics across all institution projects.
        </Text>
      </Box>

      {/* ── Summary chips ── */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl">
        <SummaryChip value={criticalCount} label="Critical Issues"  color="#e03131" />
        <SummaryChip value={warningCount}  label="Warnings"         color="#f08c00" />
        <SummaryChip value={ethicsPending} label="Ethics Pending"   color="#7950f2" />
        <SummaryChip value={cleanProjects} label="Clean Projects"   color="#2f9e44" />
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
            p="sm"
            radius="md"
            mb="md"
            style={{ background: '#f8f9fa', border: '1px dashed #dee2e6' }}
          >
            <Text size="xs" c="dimmed">
              Real-time similarity and AI detection scores synced from researcher scans.
              Thresholds: ≤ 20% safe · ≤ 35% borderline · above 35% critical.
            </Text>
          </Paper>

          <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
            <Table highlightOnHover verticalSpacing="md">
              <Table.Thead>
                <Table.Tr style={{ background: '#f8f9fa' }}>
                  {['Project', 'Researcher', 'Similarity', 'AI Score', 'Integrity', 'Status'].map(h => (
                    <Table.Th key={h}>
                      <Text size="xs" c="dimmed" fw={600}>{h}</Text>
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {INTEGRITY_PROJECTS.map(p => {
                  const simSev     = risk(p.similarity, 20, 35);
                  const aiSev      = risk(p.ai,         20, 45);
                  const overallSev: Severity =
                    simSev === 'critical' || aiSev === 'critical' ? 'critical' :
                    simSev === 'warning'  || aiSev === 'warning'  ? 'warning'  : 'safe';
                  const OverallIcon = SEV[overallSev].icon;

                  return (
                    <Table.Tr key={p.title}>
                      <Table.Td>
                        <Text size="sm" fw={500} lineClamp={1} style={{ maxWidth: 200 }}>{p.title}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">{p.researcher}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" fw={700} mb={4} style={{ color: riskText(simSev) }}>{p.similarity}%</Text>
                        <Progress value={p.similarity} color={riskColor(simSev)} size="xs" radius="xl" style={{ width: 80 }} />
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" fw={700} mb={4} style={{ color: riskText(aiSev) }}>{p.ai}%</Text>
                        <Progress value={p.ai} color={riskColor(aiSev)} size="xs" radius="xl" style={{ width: 80 }} />
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={700}>{p.integrity}</Text>
                      </Table.Td>
                      <Table.Td>
                        <ThemeIcon size={28} radius="xl" color={SEV[overallSev].iconColor} variant="light">
                          <OverallIcon size={14} />
                        </ThemeIcon>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        {/* AI Usage */}
        <Tabs.Panel value="ai">
          <Stack gap="sm">
            {AI_USAGE.map((item, i) => <AlertCard key={i} item={item} />)}
          </Stack>
        </Tabs.Panel>

        {/* Citations */}
        <Tabs.Panel value="citations">
          <Stack gap="sm">
            {CITATIONS.map((item, i) => <AlertCard key={i} item={item} />)}
          </Stack>
        </Tabs.Panel>

        {/* Ethics */}
        <Tabs.Panel value="ethics">
          <Stack gap="sm">
            {ETHICS.map((item, i) => <AlertCard key={i} item={item} />)}
          </Stack>
        </Tabs.Panel>

      </Tabs>
    </Box>
  );
}
