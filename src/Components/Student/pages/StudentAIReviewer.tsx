import { useEffect, useState } from 'react';
import {
  Badge, Box, Button, Divider, Group, Loader, Paper, Progress,
  SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuSparkles, LuCircleCheck, LuTriangleAlert, LuClock,
  LuArrowRight, LuRefreshCw, LuX, LuShield,
} from 'react-icons/lu';
import type { IssueSeverity } from '../studentData';
import { useAppSelector } from '../../../Redux/hooks';
import { fetchStudentSubmissions } from '../../../supabase/submissions';
import type { DBSubmission } from '../../../supabase/submissions';
import { fetchAIReport, saveAIReport } from '../../../supabase/aiReports';
import { generateJSON, isGeminiConfigured, GeminiError } from '../../../helper/gemini';
import ChapterPicker from '../ChapterPicker';

// ── Report shape produced by Gemini ───────────────────────────────────────────

interface ReviewScoreAI { category: string; score: number; maxScore: number }
interface ReviewIssueAI {
  sectionId:    string;
  sectionTitle: string;
  severity:     IssueSeverity;
  message:      string;
  suggestion:   string | null;
}
interface AIReviewReport {
  scores:  ReviewScoreAI[];
  issues:  ReviewIssueAI[];
  summary: string;
}

function isAIReviewReport(v: unknown): v is AIReviewReport {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return Array.isArray(r.scores) && Array.isArray(r.issues) && typeof r.summary === 'string';
}

type SeverityFilter = 'all' | IssueSeverity;

function severityColor(s: IssueSeverity) {
  return s === 'critical' ? 'red' : s === 'major' ? 'orange' : s === 'minor' ? 'yellow' : 'blue';
}
function severityIcon(s: IssueSeverity) {
  return s === 'critical' ? LuX : s === 'major' ? LuTriangleAlert : s === 'minor' ? LuClock : LuSparkles;
}

function buildPrompt(sections: { id: string; title: string; content: string }[]): string {
  return `You are an academic writing reviewer giving a student feedback on their research project before they submit it to their supervisor.

Read the chapters below and produce a quality review.

1. Score the document 0-10 (maxScore always 10) on whichever of these categories are relevant to the content provided â€” omit a category entirely if there is nothing relevant to judge it on:
   "Clarity & Writing", "Literature Review", "Methodology", "Structure & Organisation", "Argumentation & Analysis"

2. List specific issues found, each with:
   - "sectionId" / "sectionTitle": which chapter it's in (use the id/title given below)
   - "severity": one of "critical" | "major" | "minor" | "suggestion"
   - "message": a concise, specific description of the problem (quote or paraphrase the relevant part where useful)
   - "suggestion": a concrete, actionable rewrite or fix the student could apply (or null if the issue doesn't need one)

3. Write a short overall "summary" of the document's quality and the most important things to address first.

Respond with ONLY JSON in exactly this shape (no markdown fences, no extra commentary):
{
  "scores": [{ "category": string, "score": number, "maxScore": number }],
  "issues": [{ "sectionId": string, "sectionTitle": string, "severity": "critical"|"major"|"minor"|"suggestion", "message": string, "suggestion": string | null }],
  "summary": string
}

CHAPTERS TO REVIEW:
${sections.map(s => `\n--- ${s.title} (id: ${s.id}) ---\n${s.content.slice(0, 6000)}`).join('\n')}`;
}

export default function StudentAIReviewer() {
  const user = useAppSelector(s => s.auth.user);

  const [loading,  setLoading]  = useState(true);
  const [running,  setRunning]  = useState(false);
  const [report,   setReport]   = useState<AIReviewReport | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [filter,   setFilter]   = useState<SeverityFilter>('all');
  const [expanded, setExpanded] = useState<number | null>(null);

  const [submissions, setSubmissions] = useState<DBSubmission[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    Promise.all([
      fetchAIReport<AIReviewReport>(user.id, 'ai_review'),
      fetchStudentSubmissions(user.id),
    ]).then(([row, subs]) => {
      if (row && isAIReviewReport(row.data)) {
        setReport(row.data);
        setReviewedAt(row.created_at);
      }
      const withContent = subs.filter(s => s.content.trim().length > 0);
      setSubmissions(withContent);
      setSelected(new Set(withContent.map(s => s.section_id)));
    }).finally(() => setLoading(false));
  }, [user?.id]);

  const handleRun = async () => {
    if (!user?.id) return;
    if (!isGeminiConfigured()) {
      notifications.show({ title: 'AI not configured', message: 'VITE_GEMINI_API_KEY is missing â€” ask an admin to add it to the environment.', color: 'red' });
      return;
    }

    const chosen = submissions.filter(s => selected.has(s.section_id));
    if (chosen.length === 0) {
      notifications.show({ title: 'Nothing selected', message: 'Choose at least one chapter to review.', color: 'orange' });
      return;
    }

    setRunning(true);
    try {
      const prompt = buildPrompt(chosen.map(s => ({ id: s.section_id, title: s.section_title, content: s.content })));
      const result = await generateJSON<AIReviewReport>(prompt);
      if (!isAIReviewReport(result)) throw new GeminiError('Unexpected response shape from Gemini.');

      setReport(result);
      const now = new Date().toISOString();
      setReviewedAt(now);
      setExpanded(null);
      await saveAIReport(user.id, 'ai_review', result);

      notifications.show({ title: 'Review complete', message: 'AI review updated for your selected chapters.', color: 'brand' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not complete the review.';
      notifications.show({ title: 'Review failed', message, color: 'red' });
    } finally {
      setRunning(false);
    }
  };

  const scores = report?.scores ?? [];
  const issues = report?.issues ?? [];

  const totalScore = scores.reduce((s, r) => s + r.score, 0);
  const maxTotal   = scores.reduce((s, r) => s + r.maxScore, 0) || 1;
  const pct        = Math.round((totalScore / maxTotal) * 100);

  const counts = {
    critical:   issues.filter(i => i.severity === 'critical').length,
    major:      issues.filter(i => i.severity === 'major').length,
    minor:      issues.filter(i => i.severity === 'minor').length,
    suggestion: issues.filter(i => i.severity === 'suggestion').length,
  };

  const filtered = filter === 'all' ? issues : issues.filter(i => i.severity === filter);

  return (
    <Box p="xl">
      <Group justify="space-between" align="flex-start" mb="xl">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>AI Reviewer</Title>
          <Text size="sm" c="dimmed" mt={4}>AI-driven quality review of your submitted chapters.</Text>
        </Box>
        <Text size="xs" c="dimmed">{reviewedAt ? `Reviewed ${new Date(reviewedAt).toLocaleString()}` : 'Not reviewed yet'}</Text>
      </Group>

      {loading ? (
        <Group justify="center" py="xl"><Loader size="sm" color="brand" /></Group>
      ) : (
        <Paper withBorder p="lg" radius="md" bg="white" mb="xl">
          <ChapterPicker
            submissions={submissions}
            selected={selected}
            onChange={setSelected}
            title="Choose chapters to review"
            description="The AI gives feedback only on the chapters you select below."
          />
          <Group justify="flex-end" mt="md">
            <Button color="brand" leftSection={<LuRefreshCw size={14} />} loading={running}
              disabled={submissions.length === 0 || selected.size === 0} onClick={handleRun}>
              {report ? 'Re-run Review' : 'Run AI Review'}
            </Button>
          </Group>
        </Paper>
      )}

      {loading ? null : !report ? (
        <Paper withBorder p="xl" radius="md" bg="white" ta="center">
          <ThemeIcon size={48} radius="xl" variant="light" color="brand" mx="auto" mb="md"><LuSparkles size={22} /></ThemeIcon>
          <Text fw={600} mb={4}>No AI review yet</Text>
          <Text size="sm" c="dimmed">Select chapters above and run a review to get AI-driven feedback and a category breakdown.</Text>
        </Paper>
      ) : (
        <>
          {/* â”€â”€ Score summary â”€â”€ */}
          <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">
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
                    {scores.map(r => {
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
              <Text size="xs" c="dimmed">Run a new review to update scores based on your latest submitted chapters.</Text>
            </Paper>
          </SimpleGrid>

          <Paper withBorder p="md" radius="md" mb="xl" bg="white">
            <Group gap="xs" mb={4}>
              <LuShield size={14} color="#3b5bdb" />
              <Text size="sm" fw={600}>Overall summary</Text>
            </Group>
            <Text size="sm" c="dimmed">{report.summary}</Text>
          </Paper>

          {/* â”€â”€ Issues list â”€â”€ */}
          <Paper withBorder radius="md" bg="white" style={{ overflow: 'hidden' }}>
            <Box px="lg" py="md" style={{ borderBottom: '1px solid #f1f3f5' }}>
              <Group justify="space-between" wrap="wrap" gap="sm">
                <Group gap="xs">
                  <Text fw={600}>Detailed Issues</Text>
                  <Badge variant="light" color="brand" size="sm">{issues.length} total</Badge>
                </Group>
                <Group gap={4}>
                  {(['all', 'critical', 'major', 'minor', 'suggestion'] as const).map(f => (
                    <Button key={f} size="compact-xs"
                      variant={filter === f ? 'filled' : 'subtle'}
                      color={f === 'all' ? 'brand' : f === 'critical' ? 'red' : f === 'major' ? 'orange' : f === 'minor' ? 'yellow' : 'blue'}
                      onClick={() => setFilter(f)}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {f === 'all' ? `All (${issues.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f as IssueSeverity]})`}
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
                  const isOpen = expanded === idx;
                  return (
                    <Box key={`${issue.sectionId}-${idx}`}>
                      {idx > 0 && <Divider />}
                      <Box py="md">
                        <Group gap="sm" mb={6} wrap="nowrap">
                          <Badge variant="light" color={severityColor(issue.severity)} size="sm" style={{ flexShrink: 0, textTransform: 'capitalize' }}>
                            {issue.severity}
                          </Badge>
                          <Group gap={4}>
                            <Text size="xs" c="brand" fw={500}>In: {issue.sectionTitle}</Text>
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
                                onClick={() => setExpanded(isOpen ? null : idx)}>
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
        </>
      )}
    </Box>
  );
}
