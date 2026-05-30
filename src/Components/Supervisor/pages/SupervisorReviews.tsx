import { useState } from 'react';
import {
  Avatar, Badge, Box, Group, Paper,
  Table, Tabs, Text, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuCircleCheck, LuClock, LuRefreshCw,
  LuList, LuActivity,
} from 'react-icons/lu';

// ── Mock data ──────────────────────────────────────────────────────────────────

type ReviewStatus = 'Pending' | 'Reviewed' | 'Revision Requested';

interface Review {
  id: string;
  student: string;
  studentColor: string;
  section: string;
  degreeLevel: string;
  submittedOn: string;
  wordCount: number;
  status: ReviewStatus;
  feedback?: string;
}

const REVIEWS: Review[] = [
  { id: 'r1',  student: 'Amara Osei',       studentColor: 'blue',   section: 'Chapter 3 — Methodology',       degreeLevel: 'PhD',           submittedOn: '2026-05-24', wordCount: 4200, status: 'Pending'             },
  { id: 'r2',  student: 'Kofi Mensah',      studentColor: 'teal',   section: 'Literature Review Update',      degreeLevel: "Master's",      submittedOn: '2026-05-23', wordCount: 3800, status: 'Pending'             },
  { id: 'r3',  student: 'Emeka Okafor',     studentColor: 'orange', section: 'Research Proposal (Draft 2)',   degreeLevel: 'Undergraduate', submittedOn: '2026-05-22', wordCount: 1200, status: 'Pending'             },
  { id: 'r4',  student: 'Fatima Al-Rashid', studentColor: 'violet', section: 'Chapter 5 — Discussion',        degreeLevel: 'PhD',           submittedOn: '2026-05-20', wordCount: 5100, status: 'Reviewed',           feedback: 'Well-structured argument. Please address the limitations section in more detail before final submission.' },
  { id: 'r5',  student: 'Ngozi Adeyemi',    studentColor: 'green',  section: 'Chapter 2 — Literature Review', degreeLevel: 'Undergraduate', submittedOn: '2026-05-18', wordCount: 2900, status: 'Reviewed',           feedback: 'Good coverage of foundational works. Consider adding more recent papers from 2023–2025.' },
  { id: 'r6',  student: 'Taiwo Bakare',     studentColor: 'red',    section: 'Chapter 3 — Methodology',       degreeLevel: "Master's",      submittedOn: '2026-05-15', wordCount: 3100, status: 'Revision Requested', feedback: 'The research design needs to justify the choice of qualitative methods more rigorously. Please revise and resubmit.' },
  { id: 'r7',  student: 'Amara Osei',       studentColor: 'blue',   section: 'Chapter 2 — Literature Review', degreeLevel: 'PhD',           submittedOn: '2026-05-10', wordCount: 6200, status: 'Reviewed',           feedback: 'Comprehensive review. Minor APA formatting issues noted. Ready to proceed.' },
];

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function degreeBadgeColor(level: string) {
  return level === 'PhD' ? 'blue' : level === "Master's" ? 'violet' : 'teal';
}

function statusColor(s: ReviewStatus) {
  return s === 'Pending' ? 'orange' : s === 'Reviewed' ? 'green' : 'red';
}

function statusIcon(s: ReviewStatus) {
  return s === 'Pending' ? LuClock : s === 'Reviewed' ? LuCircleCheck : LuRefreshCw;
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

function ReviewTable({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="xl">
        No reviews in this category.
      </Text>
    );
  }
  return (
    <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
      <Table highlightOnHover verticalSpacing="md">
        <Table.Thead>
          <Table.Tr style={{ background: '#f8f9fa' }}>
            {['Student', 'Section / Chapter', 'Level', 'Word Count', 'Submitted', 'Status'].map(h => (
              <Table.Th key={h}><Text size="xs" c="dimmed" fw={600}>{h}</Text></Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {reviews.map(r => {
            const Icon = statusIcon(r.status);
            return (
              <Table.Tr key={r.id}>
                <Table.Td>
                  <Group gap="sm" wrap="nowrap">
                    <Avatar color={r.studentColor} radius="xl" size="sm">{getInitials(r.student)}</Avatar>
                    <Text size="sm" fw={600}>{r.student}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" lineClamp={2} style={{ maxWidth: 220 }}>{r.section}</Text>
                  {r.feedback && (
                    <Text size="xs" c="dimmed" lineClamp={1} mt={2}>{r.feedback}</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color={degreeBadgeColor(r.degreeLevel)} size="xs" radius="sm">
                    {r.degreeLevel}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{r.wordCount.toLocaleString()} wds</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">{r.submittedOn}</Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    <ThemeIcon size={24} radius="xl" color={statusColor(r.status)} variant="light">
                      <Icon size={12} />
                    </ThemeIcon>
                    <Badge variant="light" color={statusColor(r.status)} size="sm" radius="sm">
                      {r.status}
                    </Badge>
                  </Group>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupervisorReviews() {
  const [tab, setTab] = useState('pending');

  const pending  = REVIEWS.filter(r => r.status === 'Pending');
  const reviewed = REVIEWS.filter(r => r.status === 'Reviewed');
  const revision = REVIEWS.filter(r => r.status === 'Revision Requested');

  const byTab =
    tab === 'pending'  ? pending  :
    tab === 'reviewed' ? reviewed :
    tab === 'revision' ? revision : REVIEWS;

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Reviews</Title>
        <Text size="sm" c="dimmed" mt={4}>
          All student chapter and section submissions awaiting or completed review.
        </Text>
      </Box>

      {/* ── Summary chips ── */}
      <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
        <SummaryChip value={pending.length}  label="Pending Review"      color="#f08c00" />
        <SummaryChip value={reviewed.length} label="Reviewed"            color="#2f9e44" />
        <SummaryChip value={revision.length} label="Revision Requested"  color="#e03131" />
      </Box>

      {/* ── Tabs ── */}
      <Tabs value={tab} onChange={v => setTab(v ?? 'pending')}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="pending"  leftSection={<LuClock      size={14} />}>Pending ({pending.length})</Tabs.Tab>
          <Tabs.Tab value="reviewed" leftSection={<LuCircleCheck size={14} />}>Reviewed ({reviewed.length})</Tabs.Tab>
          <Tabs.Tab value="revision" leftSection={<LuRefreshCw  size={14} />}>Revision Requested ({revision.length})</Tabs.Tab>
          <Tabs.Tab value="all"      leftSection={<LuList       size={14} />}>All ({REVIEWS.length})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="pending" ><ReviewTable reviews={byTab} /></Tabs.Panel>
        <Tabs.Panel value="reviewed"><ReviewTable reviews={byTab} /></Tabs.Panel>
        <Tabs.Panel value="revision"><ReviewTable reviews={byTab} /></Tabs.Panel>
        <Tabs.Panel value="all"     ><ReviewTable reviews={byTab} /></Tabs.Panel>
      </Tabs>

      {/* ── Info note ── */}
      {pending.length > 0 && (
        <Paper
          withBorder p="sm" radius="md" mt="lg"
          style={{ background: '#fff9db', border: '1.5px solid #fab00530' }}
        >
          <Group gap="xs">
            <LuActivity size={13} color="#f08c00" />
            <Text size="xs" c="dimmed">
              You have <strong>{pending.length} pending review{pending.length > 1 ? 's' : ''}</strong>. Students are waiting for your feedback.
            </Text>
          </Group>
        </Paper>
      )}

    </Box>
  );
}
