import { useState } from 'react';
import {
  Badge, Box, Button, Divider, Group, Paper, Progress,
  SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuSparkles, LuCircleCheck, LuTriangleAlert, LuClock,
  LuArrowRight, LuRefreshCw, LuX,
} from 'react-icons/lu';
import { REVIEW_SCORES, REVIEW_ISSUES } from '../studentData';
import type { IssueSeverity } from '../studentData';

type SeverityFilter = 'all' | IssueSeverity;

function severityColor(s: IssueSeverity) {
  return s === 'critical' ? 'red' : s === 'major' ? 'orange' : s === 'minor' ? 'yellow' : 'blue';
}
function severityIcon(s: IssueSeverity) {
  return s === 'critical' ? LuX : s === 'major' ? LuTriangleAlert : s === 'minor' ? LuClock : LuSparkles;
}

export default function StudentAIReviewer() {
  const [running, setRunning]   = useState(false);
  const [filter, setFilter]     = useState<SeverityFilter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalScore = REVIEW_SCORES.reduce((s, r) => s + r.score, 0);
  const maxTotal   = REVIEW_SCORES.reduce((s, r) => s + r.maxScore, 0);
  const pct        = Math.round((totalScore / maxTotal) * 100);

  const counts = {
    critical:   REVIEW_ISSUES.filter(i => i.severity === 'critical').length,
    major:      REVIEW_ISSUES.filter(i => i.severity === 'major').length,
    minor:      REVIEW_ISSUES.filter(i => i.severity === 'minor').length,
    suggestion: REVIEW_ISSUES.filter(i => i.severity === 'suggestion').length,
  };

  const filtered = filter === 'all' ? REVIEW_ISSUES : REVIEW_ISSUES.filter(i => i.severity === filter);

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      notifications.show({ title: 'Review complete', message: 'AI review updated with latest section content.', color: 'brand' });
    }, 2500);
  };

  return (
    <Box p="xl">
      <Group justify="space-between" align="flex-start" mb="xl">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>AI Reviewer</Title>
          <Text size="sm" c="dimmed" mt={4}>Automated quality review across all document sections.</Text>
        </Box>
        <Button color="brand" leftSection={<LuRefreshCw size={14} />} loading={running} onClick={handleRun}>
          Run AI Review
        </Button>
      </Group>

      {/* ── Score summary ── */}
      <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">

        {/* Overall score */}
        <Paper withBorder p="xl" radius="md" bg="white">
          <Group gap="xl" align="flex-start" wrap="nowrap">
            <Box ta="center" style={{ flexShrink: 0 }}>
              <Text style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, color: pct >= 70 ? '#2f9e44' : pct >= 50 ? '#f08c00' : '#e03131' }}>
                {totalScore}
              </Text>
              <Text size="sm" c="dimmed">/ {maxTotal}</Text>
              <Progress value={pct} color={pct >= 70 ? 'green' : pct >= 50 ? 'orange' : 'red'} size="sm" radius="xl" mt="xs" style={{ width: 80 }} />
              <Text size="xs" c="dimmed" mt={4}>{pct}%</Text>
            </Box>
            <Box style={{ flex: 1 }}>
              <Text fw={700} mb="md">Category Breakdown</Text>
              <Stack gap="sm">
                {REVIEW_SCORES.map(r => {
                  const p = Math.round((r.score / r.maxScore) * 100);
                  return (
                    <Box key={r.category}>
                      <Group justify="space-between" mb={4}>
                        <Text size="xs" fw={500}>{r.category}</Text>
                        <Text size="xs" c="dimmed">{r.score}/{r.maxScore}</Text>
                      </Group>
                      <Progress value={p} color={p >= 70 ? 'green' : p >= 50 ? 'orange' : 'red'} size="xs" radius="xl" />
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          </Group>
        </Paper>

        {/* Issue counts */}
        <Paper withBorder p="xl" radius="md" bg="white">
          <Text fw={700} mb="lg">Issue Breakdown</Text>
          <SimpleGrid cols={2} spacing="sm" mb="lg">
            {([
              { label: 'Critical',   count: counts.critical,   bg: '#fff5f5', color: '#e03131' },
              { label: 'Major',      count: counts.major,      bg: '#fff8f0', color: '#f08c00' },
              { label: 'Minor',      count: counts.minor,      bg: '#fffde7', color: '#f59f00' },
              { label: 'Suggestion', count: counts.suggestion, bg: '#f0f4ff', color: '#3b5bdb' },
            ] as const).map(({ label, count, bg, color }) => (
              <Box key={label} p="md" ta="center" style={{ background: bg, borderRadius: 10, border: `1px solid ${color}28` }}>
                <Text fw={800} style={{ fontSize: 32, lineHeight: 1, color }}>{count}</Text>
                <Text size="xs" c="dimmed" mt={6} fw={500}>{label}</Text>
              </Box>
            ))}
          </SimpleGrid>
          <Text size="xs" c="dimmed">Run a new review to update scores based on latest edits.</Text>
        </Paper>
      </SimpleGrid>

      {/* ── Issues list ── */}
      <Paper withBorder radius="md" bg="white" style={{ overflow: 'hidden' }}>
        <Box px="lg" py="md" style={{ borderBottom: '1px solid #f1f3f5' }}>
          <Group justify="space-between" wrap="wrap" gap="sm">
            <Group gap="xs">
              <Text fw={600}>Detailed Issues</Text>
              <Badge variant="light" color="brand" size="sm">{REVIEW_ISSUES.length} total</Badge>
            </Group>
            <Group gap={4}>
              {(['all', 'critical', 'major', 'minor', 'suggestion'] as const).map(f => (
                <Button key={f} size="compact-xs"
                  variant={filter === f ? 'filled' : 'subtle'}
                  color={f === 'all' ? 'brand' : f === 'critical' ? 'red' : f === 'major' ? 'orange' : f === 'minor' ? 'yellow' : 'blue'}
                  onClick={() => setFilter(f)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {f === 'all' ? `All (${REVIEW_ISSUES.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f as IssueSeverity]})`}
                </Button>
              ))}
            </Group>
          </Group>
        </Box>

        {filtered.length === 0 ? (
          <Box p="xl" ta="center">
            <LuCircleCheck size={40} color="#2f9e44" />
            <Text size="sm" c="dimmed" mt="md">No issues in this category.</Text>
          </Box>
        ) : (
          <Stack gap={0} px="lg" py="sm">
            {filtered.map((issue, idx) => {
              const Icon = severityIcon(issue.severity);
              const isOpen = expanded === issue.id;
              return (
                <Box key={issue.id}>
                  {idx > 0 && <Divider />}
                  <Box py="md">
                    <Group gap="sm" mb={6} wrap="nowrap">
                      <Badge variant="light" color={severityColor(issue.severity)} size="sm" style={{ flexShrink: 0, textTransform: 'capitalize' }}>
                        {issue.severity}
                      </Badge>
                      <Group gap={4} style={{ cursor: 'pointer' }}
                        onClick={() => notifications.show({ title: 'Navigate to section', message: `Opening ${issue.sectionTitle}`, color: 'brand' })}>
                        <Text size="xs" c="brand" fw={500}>Jump to: {issue.sectionTitle}</Text>
                        <LuArrowRight size={11} color="#3b5bdb" />
                      </Group>
                    </Group>
                    <Group gap="sm" align="flex-start" wrap="nowrap">
                      <ThemeIcon size={22} radius="xl" color={severityColor(issue.severity)} variant="light" style={{ flexShrink: 0, marginTop: 2 }}>
                        <Icon size={11} />
                      </ThemeIcon>
                      <Box style={{ flex: 1 }}>
                        <Text size="sm">{issue.message}</Text>
                        {issue.suggestion && (
                          <Button size="compact-xs" variant="subtle" color="brand" mt={6}
                            onClick={() => setExpanded(isOpen ? null : issue.id)}>
                            {isOpen ? 'Hide suggestion' : 'View suggestion'}
                          </Button>
                        )}
                        {isOpen && issue.suggestion && (
                          <Box mt="sm" p="sm" style={{ background: '#f8f9ff', borderRadius: 8, border: '1px dashed #748ffc' }}>
                            <Group gap="xs" mb={6}>
                              <LuSparkles size={12} color="#3b5bdb" />
                              <Text size="xs" fw={600} c="brand">AI Suggestion</Text>
                            </Group>
                            <Text size="xs" c="dimmed" fs="italic">{issue.suggestion}</Text>
                            <Button size="xs" variant="light" color="brand" mt="sm"
                              onClick={() => { setExpanded(null); notifications.show({ title: 'Suggestion noted', message: 'Navigate to the section to apply this suggestion.', color: 'green' }); }}>
                              Apply Suggestion
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </Group>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
