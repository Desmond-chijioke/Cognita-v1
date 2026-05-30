import { useState } from 'react';
import {
  Badge, Box, Divider, Group, Paper, Select,
  Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuBell, LuTriangleAlert, LuCircleCheck, LuFileText,
  LuUserCheck, LuClock, LuRefreshCw,
} from 'react-icons/lu';

// ── Mock data ──────────────────────────────────────────────────────────────────

type NType = 'submission' | 'compliance' | 'approval' | 'review' | 'system';

interface Notification {
  id: string;
  type: NType;
  title: string;
  body: string;
  student?: string;
  time: string;
  read: boolean;
}

const INITIAL: Notification[] = [
  { id: 'n1',  type: 'submission',  title: 'New Chapter Submitted',           body: 'Amara Osei has submitted Chapter 3 — Methodology for your review.',                                        student: 'Amara Osei',       time: '10 min ago',  read: false },
  { id: 'n2',  type: 'compliance',  title: 'Compliance Flag — Critical',       body: 'Emeka Okafor\'s project has been flagged. AI detection score: 41%, Similarity: 34%. Immediate review required.', student: 'Emeka Okafor',     time: '1 hour ago',  read: false },
  { id: 'n3',  type: 'approval',    title: 'New Approval Request',             body: 'Kofi Mensah has submitted a Topic Change Request for your approval.',                                        student: 'Kofi Mensah',      time: '3 hours ago', read: false },
  { id: 'n4',  type: 'submission',  title: 'Literature Review Submitted',      body: 'Kofi Mensah has submitted a Literature Review Update for review.',                                           student: 'Kofi Mensah',      time: 'Yesterday',   read: true  },
  { id: 'n5',  type: 'compliance',  title: 'Compliance Warning',               body: 'Taiwo Bakare\'s AI detection score reached 32%, approaching the institution threshold of 35%.',             student: 'Taiwo Bakare',     time: 'Yesterday',   read: true  },
  { id: 'n6',  type: 'review',      title: 'Review Reminder',                  body: 'Emeka Okafor\'s proposal draft has been waiting for review for 4 days.',                                    student: 'Emeka Okafor',     time: '2 days ago',  read: true  },
  { id: 'n7',  type: 'approval',    title: 'Submission Approval Requested',    body: 'Fatima Al-Rashid has requested final thesis submission approval.',                                           student: 'Fatima Al-Rashid', time: '3 days ago',  read: true  },
  { id: 'n8',  type: 'system',      title: 'Weekly Integrity Report',          body: 'Your department integrity report for the week of 19–25 May 2026 is now available.',                         time: '3 days ago',          read: true  },
  { id: 'n9',  type: 'review',      title: 'Revision Submitted',               body: 'Taiwo Bakare has resubmitted Chapter 3 after your revision request.',                                       student: 'Taiwo Bakare',     time: '5 days ago',  read: true  },
  { id: 'n10', type: 'system',      title: 'Platform Maintenance Scheduled',   body: 'CognitaAI will undergo scheduled maintenance on 1 Jun 2026 from 02:00–04:00 WAT.',                          time: '1 week ago',          read: true  },
];

const TYPE_CONFIG: Record<NType, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  submission: { icon: LuFileText,    color: '#3b5bdb', bg: '#edf2ff', border: '#4c6ef520' },
  compliance: { icon: LuTriangleAlert, color: '#e03131', bg: '#fff5f5', border: '#ff636320' },
  approval:   { icon: LuUserCheck,   color: '#f08c00', bg: '#fff9db', border: '#fab00520' },
  review:     { icon: LuRefreshCw,   color: '#7950f2', bg: '#f3f0ff', border: '#7950f220' },
  system:     { icon: LuBell,        color: '#0c8599', bg: '#e3fafc', border: '#0c859920' },
};

const TYPE_LABELS: Record<NType, string> = {
  submission: 'Submission',
  compliance: 'Compliance',
  approval:   'Approval',
  review:     'Review',
  system:     'System',
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupervisorNotifications() {
  const [items, setItems]     = useState(INITIAL);
  const [filter, setFilter]   = useState<string | null>('all');

  const unread  = items.filter(n => !n.read).length;
  const filtered = filter === 'all' || !filter
    ? items
    : items.filter(n => n.type === filter);

  const markAllRead = () => setItems(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Notifications</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Stay updated on student activity, compliance flags, and system alerts.
          </Text>
        </Box>
        {unread > 0 && (
          <Group gap="xs" align="center">
            <Badge color="brand" size="lg" radius="sm" variant="light">{unread} unread</Badge>
            <Text
              size="xs" c="dimmed"
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={markAllRead}
            >
              Mark all read
            </Text>
          </Group>
        )}
      </Group>

      {/* ── Summary row ── */}
      <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 28 }}>
        {(Object.entries(TYPE_CONFIG) as [NType, typeof TYPE_CONFIG[NType]][]).map(([type, cfg]) => {
          const count = items.filter(n => n.type === type).length;
          return (
            <Box
              key={type}
              p="sm"
              style={{
                borderRadius: 10,
                background: cfg.bg,
                border: `1.5px solid ${cfg.border}`,
                textAlign: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setFilter(type)}
            >
              <Group justify="center" gap={4} mb={4}>
                <cfg.icon size={13} style={{ color: cfg.color }} />
              </Group>
              <Text fw={800} lh={1} style={{ color: cfg.color }}>{count}</Text>
              <Text size="xs" c="dimmed" mt={4} fw={500}>{TYPE_LABELS[type]}</Text>
            </Box>
          );
        })}
      </Box>

      {/* ── Filter toolbar ── */}
      <Paper withBorder p="md" radius="md" bg="white" mb="lg">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <LuClock size={14} color="#adb5bd" />
            <Text size="sm" c="dimmed">{filtered.length} notification{filtered.length !== 1 ? 's' : ''}</Text>
          </Group>
          <Select
            placeholder="Filter by type"
            value={filter}
            onChange={setFilter}
            data={[
              { value: 'all',        label: 'All Types' },
              { value: 'submission', label: 'Submissions' },
              { value: 'compliance', label: 'Compliance' },
              { value: 'approval',   label: 'Approvals' },
              { value: 'review',     label: 'Reviews' },
              { value: 'system',     label: 'System' },
            ]}
            size="xs"
            style={{ width: 160 }}
            clearable
          />
        </Group>
      </Paper>

      {/* ── Feed ── */}
      {filtered.length === 0 ? (
        <Paper withBorder p="xl" radius="md" style={{ background: '#f4fce3', border: '1.5px solid #94d82d30' }}>
          <Group gap="sm" justify="center">
            <ThemeIcon size={34} radius="md" color="green" variant="light">
              <LuCircleCheck size={16} />
            </ThemeIcon>
            <Text size="sm" fw={600}>No notifications in this category.</Text>
          </Group>
        </Paper>
      ) : (
        <Stack gap="sm">
          {filtered.map((n, i) => {
            const cfg = TYPE_CONFIG[n.type];
            const Icon = cfg.icon;
            return (
              <Paper
                key={n.id}
                withBorder
                p="md"
                radius="md"
                style={{
                  background: n.read ? 'white' : cfg.bg,
                  border: n.read ? '1px solid #dee2e6' : `1.5px solid ${cfg.border}`,
                  borderLeft: n.read ? undefined : `4px solid ${cfg.color}`,
                }}
                onClick={() => setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                style-data-index={i}
              >
                <Group gap="sm" align="flex-start" wrap="nowrap">
                  <ThemeIcon size={34} radius="md" style={{ background: cfg.bg, color: cfg.color, flexShrink: 0, marginTop: 2 }}>
                    <Icon size={15} />
                  </ThemeIcon>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group justify="space-between" wrap="nowrap" mb={4}>
                      <Group gap="xs">
                        <Text size="sm" fw={n.read ? 500 : 700}>{n.title}</Text>
                        {!n.read && (
                          <Box style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                        )}
                      </Group>
                      <Text size="xs" c="dimmed" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>{n.time}</Text>
                    </Group>
                    <Text size="sm" c="dimmed">{n.body}</Text>
                    {n.student && (
                      <Badge variant="outline" size="xs" radius="sm" mt={6} style={{ borderColor: cfg.color, color: cfg.color }}>
                        {n.student}
                      </Badge>
                    )}
                  </Box>
                </Group>
                {i < filtered.length - 1 && <Divider mt="sm" />}
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
