import { useState } from 'react';
import {
  Avatar, Badge, Box, Button, Checkbox, Group,
  Paper, Progress, SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import {
  LuCircleCheck, LuClock, LuTriangleAlert, LuPenLine, LuBook,
  LuActivity, LuBot, LuShield, LuDownload, LuTarget,
  LuFileText, LuHash, LuTrendingUp,
} from 'react-icons/lu';
import {
  PROJECT, STUDENT_SECTIONS, CHECKLIST, ACTIVITIES, REVIEW_ISSUES,
} from '../studentData';

// ── helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today  = new Date('2026-05-26');
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ── status icon ───────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed')
    return <LuCircleCheck size={16} color="#2f9e44" />;
  if (status === 'in-progress')
    return <LuClock size={16} color="#3b5bdb" />;
  if (status === 'needs-revision')
    return <LuTriangleAlert size={16} color="#f08c00" />;
  return (
    <svg width={16} height={16} viewBox="0 0 16 16">
      <circle cx={8} cy={8} r={7} fill="none" stroke="#ced4da" strokeWidth={1.5} />
    </svg>
  );
}

// ── KPI chip ──────────────────────────────────────────────────────────────────

function KpiChip({ icon: Icon, value, label }: {
  icon: React.ElementType; value: string | number; label: string;
}) {
  return (
    <Paper withBorder p="md" radius="md" bg="white">
      <Group gap="sm" mb={6}>
        <ThemeIcon size={32} radius="md" color="brand" variant="light">
          <Icon size={15} />
        </ThemeIcon>
      </Group>
      <Text fw={800} size="xl" c="brand" lh={1.1}>{value}</Text>
      <Text size="xs" c="dimmed" mt={4} fw={500}>{label}</Text>
    </Paper>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const navigate = useNavigate();

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    Object.fromEntries(CHECKLIST.map(c => [c.id, c.checked]))
  );

  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const daysLeft       = daysUntil(PROJECT.deadline);

  const criticalOrMajor = REVIEW_ISSUES.filter(
    i => i.severity === 'critical' || i.severity === 'major',
  );

  return (
    <Box p="xl">

      {/* ── Hero project card ── */}
      <Paper
        withBorder
        radius="md"
        p="xl"
        mb="lg"
        bg="white"
        style={{ borderLeft: '4px solid #3b5bdb' }}
      >
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          {/* Left */}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" mb={8}>
              <Badge color="brand" variant="light" size="sm">{PROJECT.discipline}</Badge>
              <Badge color="green" variant="light" size="sm">{PROJECT.status}</Badge>
            </Group>
            <Title
              order={2}
              lh={1.25}
              mb="sm"
              style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.35rem' }}
            >
              {PROJECT.title}
            </Title>
            <Group gap="xl" mt="md" wrap="wrap">
              <Box>
                <Text size="xs" c="dimmed" fw={500} mb={4}>Overall Progress</Text>
                <Group gap="xs" align="center" mb={4}>
                  <Text size="sm" fw={700} c="brand">{PROJECT.progress}%</Text>
                </Group>
                <Progress value={PROJECT.progress} color="brand" size="sm" radius="xl" w={200} />
              </Box>
              <Box>
                <Text size="xs" c="dimmed" fw={500} mb={2}>Word Count</Text>
                <Text size="sm" fw={600}>
                  {PROJECT.wordCount.toLocaleString()}
                  <Text span size="xs" c="dimmed" fw={400}>
                    {' '}/ {PROJECT.targetWordCount.toLocaleString()} words
                  </Text>
                </Text>
                <Progress
                  value={(PROJECT.wordCount / PROJECT.targetWordCount) * 100}
                  color="teal"
                  size="xs"
                  radius="xl"
                  mt={4}
                  w={200}
                />
              </Box>
            </Group>
          </Box>

          {/* Right */}
          <Stack gap="xs" align="flex-end" style={{ flexShrink: 0, minWidth: 160 }}>
            <Paper
              radius="md"
              p="xs"
              style={{ background: '#f1f8f4', textAlign: 'center', minWidth: 110 }}
            >
              <Text size="xs" c="dimmed" fw={500}>Integrity</Text>
              <Text fw={800} size="xl" c="green">{PROJECT.integrityScore}%</Text>
            </Paper>
            <Paper
              radius="md"
              p="xs"
              style={{ background: '#edf2ff', textAlign: 'center', minWidth: 110 }}
            >
              <Text size="xs" c="dimmed" fw={500}>Deadline</Text>
              <Text fw={700} size="md" c="brand">{daysLeft} days</Text>
              <Text size="10px" c="dimmed">until {PROJECT.deadline}</Text>
            </Paper>
            <Button
              color="brand"
              size="sm"
              leftSection={<LuPenLine size={14} />}
              onClick={() => navigate('/app/editor')}
              mt={4}
            >
              Open Editor
            </Button>
          </Stack>
        </Group>
      </Paper>

      {/* ── 4 KPI chips ── */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="lg">
        <KpiChip icon={LuFileText}   value={STUDENT_SECTIONS.length} label="Sections" />
        <KpiChip icon={LuBook}       value={12}                       label="References" />
        <KpiChip icon={LuHash}       value="4,282"                    label="Word Count" />
        <KpiChip icon={LuTrendingUp} value={`${PROJECT.integrityScore}%`} label="Integrity" />
      </SimpleGrid>

      {/* ── Two-column layout ── */}
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">

        {/* Left (2/3) */}
        <Box style={{ gridColumn: 'span 2' }}>
          <Stack gap="lg">

            {/* Document Sections */}
            <Paper withBorder radius="md" p="lg" bg="white">
              <Group justify="space-between" mb="md">
                <Text fw={700} size="md">Document Sections</Text>
                <Text
                  size="xs"
                  c="brand"
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => navigate('/app/editor')}
                >
                  Open Editor
                </Text>
              </Group>
              <Stack gap={0}>
                {STUDENT_SECTIONS.map((sec, idx) => (
                  <Group
                    key={sec.id}
                    justify="space-between"
                    py={10}
                    wrap="nowrap"
                    style={idx < STUDENT_SECTIONS.length - 1
                      ? { borderBottom: '1px solid #f1f3f5' }
                      : undefined}
                  >
                    <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                      <StatusIcon status={sec.status} />
                      <Text size="sm" fw={sec.status === 'completed' ? 600 : 400}
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {sec.title}
                      </Text>
                      {sec.approved && (
                        <LuCircleCheck size={13} color="#2f9e44" title="Approved" />
                      )}
                    </Group>
                    <Text size="xs" c="dimmed" style={{ flexShrink: 0, marginLeft: 8 }}>
                      {sec.wordCount > 0 ? `${sec.wordCount.toLocaleString()} w` : '—'}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Paper>

            {/* Project Checklist */}
            <Paper withBorder radius="md" p="lg" bg="white">
              <Group justify="space-between" mb="md">
                <Text fw={700} size="md">Project Checklist</Text>
                <Badge color="brand" variant="light" size="sm">
                  {completedCount} / {CHECKLIST.length} completed
                </Badge>
              </Group>
              <Stack gap="xs">
                {CHECKLIST.map(item => (
                  <Checkbox
                    key={item.id}
                    checked={checkedItems[item.id] ?? false}
                    onChange={e =>
                      setCheckedItems(prev => ({ ...prev, [item.id]: e.currentTarget.checked }))
                    }
                    color="brand"
                    label={
                      <Text
                        size="sm"
                        style={checkedItems[item.id]
                          ? { textDecoration: 'line-through', color: '#adb5bd' }
                          : undefined}
                      >
                        {item.label}
                      </Text>
                    }
                  />
                ))}
              </Stack>
            </Paper>

          </Stack>
        </Box>

        {/* Right (1/3) */}
        <Stack gap="lg">

          {/* Supervisor card */}
          <Paper
            withBorder
            radius="md"
            p="lg"
            bg="white"
            style={{
              background: 'linear-gradient(135deg, #edf2ff 0%, #f8f9fe 100%)',
            }}
          >
            <Group gap="md" mb="md" wrap="nowrap">
              <Avatar color="brand" radius="xl" size="md">
                {getInitials('Adebayo Ogundimu')}
              </Avatar>
              <Box style={{ minWidth: 0 }}>
                <Text fw={700} size="sm" lh={1.2}>Dr. Adebayo Ogundimu</Text>
                <Text size="xs" c="dimmed">Senior Lecturer, Computer Science</Text>
              </Box>
            </Group>
            <Text size="xs" c="dimmed" mb="sm">a.ogundimu@university.ac.ng</Text>
            <Button
              variant="light"
              color="brand"
              size="xs"
              fullWidth
              leftSection={<LuPenLine size={12} />}
              onClick={() => navigate('/app/messages')}
            >
              Message Supervisor
            </Button>
          </Paper>

          {/* Quick Actions */}
          <Paper withBorder radius="md" p="lg" bg="white">
            <Text fw={700} size="md" mb="md">Quick Actions</Text>
            <SimpleGrid cols={2} spacing="xs">
              {[
                { label: 'Editor',     Icon: LuPenLine,   path: '/app/editor'           },
                { label: 'References', Icon: LuBook,      path: '/app/references'       },
                { label: 'Analysis',   Icon: LuActivity,  path: '/app/analysis'         },
                { label: 'AI Review',  Icon: LuBot,       path: '/app/ai-reviewer'      },
                { label: 'Plagiarism', Icon: LuShield,    path: '/app/plagiarism-checker'},
                { label: 'Export',     Icon: LuDownload,  path: '/app/export'           },
              ].map(({ label, Icon, path }) => (
                <Button
                  key={label}
                  variant="light"
                  color="brand"
                  size="xs"
                  leftSection={<Icon size={13} />}
                  onClick={() => navigate(path)}
                  styles={{ root: { justifyContent: 'flex-start' } }}
                >
                  {label}
                </Button>
              ))}
            </SimpleGrid>
          </Paper>

          {/* Activity Log */}
          <Paper withBorder radius="md" p="lg" bg="white">
            <Group justify="space-between" mb="md">
              <Text fw={700} size="md">Activity Log</Text>
              <ThemeIcon size={22} radius="xl" color="brand" variant="light">
                <LuTarget size={12} />
              </ThemeIcon>
            </Group>
            <Stack gap={0}>
              {ACTIVITIES.slice(0, 6).map((act, idx) => (
                <Group
                  key={act.id}
                  justify="space-between"
                  py={8}
                  wrap="nowrap"
                  align="flex-start"
                  style={idx < 5 ? { borderBottom: '1px solid #f8f9fa' } : undefined}
                >
                  <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    <Box
                      style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#edf2ff', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Text size="9px" fw={700} c="brand">{idx + 1}</Text>
                    </Box>
                    <Text size="xs" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Text span fw={600} size="xs">{act.user}</Text>
                      {' '}{act.action}{' '}
                      <Text span size="xs" c="dimmed">{act.target}</Text>
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed" style={{ flexShrink: 0, marginLeft: 6 }}>
                    {act.timestamp}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Paper>

        </Stack>
      </SimpleGrid>

      {/* ── AI Issues banner ── */}
      {criticalOrMajor.length > 0 && (
        <Paper
          withBorder
          radius="md"
          p="md"
          mt="lg"
          bg="white"
          style={{ borderLeft: '4px solid #f08c00' }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <LuTriangleAlert size={18} color="#f08c00" />
              <Box>
                <Text size="sm" fw={600}>
                  {criticalOrMajor.filter(i => i.severity === 'critical').length} critical and{' '}
                  {criticalOrMajor.filter(i => i.severity === 'major').length} major issues
                  {' '}detected by the AI Reviewer
                </Text>
                <Text size="xs" c="dimmed" mt={1}>
                  Address these issues to improve your submission readiness.
                </Text>
              </Box>
            </Group>
            <Text
              size="xs"
              c="brand"
              fw={600}
              style={{ cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}
              onClick={() => navigate('/app/ai-reviewer')}
            >
              View in AI Reviewer
            </Text>
          </Group>
        </Paper>
      )}

    </Box>
  );
}
