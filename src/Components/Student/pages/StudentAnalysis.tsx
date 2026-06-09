import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge, Box, Button, Divider, Group, Loader, Paper,
  Select, SimpleGrid, Stack, Table, Text,
  TextInput, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuActivity, LuSparkles, LuCircleCheck, LuTriangleAlert, LuX, LuArrowRight,
  LuArrowLeft, LuPlus, LuRefreshCw,
} from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import { fetchStudentSubmissions } from '../../../supabase/submissions';
import type { DBSubmission } from '../../../supabase/submissions';
import { fetchAIReport, saveAIReport } from '../../../supabase/aiReports';
import { generateJSON, isGeminiConfigured, GeminiError } from '../../../helper/gemini';
import ChapterPicker from '../ChapterPicker';

type Step = 'context' | 'recommend' | 'review';

interface Variable { name: string; type: string; role: string }

interface ResearchContext {
  researchType: string;
  studyDesign:  string;
  question:     string;
  hypothesis:   string;
}

// ── Report shape produced by Gemini ───────────────────────────────────────────

interface RecommendedTestAI {
  name:        string;
  recommended: boolean;
  rationale:   string;
  assumptions: string[];
}

type AnalysisVerdict = 'strong' | 'needs-work' | 'missing';

interface ChapterAnalysisFinding {
  aspect:  string;
  verdict: AnalysisVerdict;
  comment: string;
}

interface ChapterAnalysisReview {
  chapterId:    string;
  chapterTitle: string;
  summary:      string;
  findings:     ChapterAnalysisFinding[];
}

interface AnalysisAdvisorReport {
  tests:         RecommendedTestAI[];
  chapterReview: ChapterAnalysisReview | null;
}

function isAnalysisAdvisorReport(v: unknown): v is AnalysisAdvisorReport {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return Array.isArray(r.tests);
}

function isChapterReviewPayload(v: unknown): v is { summary: string; findings: ChapterAnalysisFinding[] } {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return typeof r.summary === 'string' && Array.isArray(r.findings);
}

function buildAdvisorPrompt(ctx: ResearchContext, variables: Variable[]): string {
  return `You are a statistical-methods advisor helping a student choose the right statistical test(s) for their research project.

RESEARCH CONTEXT:
- Research type: ${ctx.researchType}
- Study design: ${ctx.studyDesign}
- Research question: ${ctx.question}
- Hypothesis: ${ctx.hypothesis}

VARIABLES:
${variables.map(v => `- ${v.name} (measurement type: ${v.type}, role: ${v.role})`).join('\n')}

Recommend 2-4 candidate statistical tests suited to this context. For each one provide:
- "name": the test's name
- "recommended": true for the single best-fit test given this context, false for the alternatives
- "rationale": a concise, plain-language explanation of why this test fits (or how it compares to the recommended one)
- "assumptions": a short list of the statistical assumptions the student should verify before relying on this test

Respond with ONLY JSON in exactly this shape (no markdown fences, no extra commentary):
{ "tests": [{ "name": string, "recommended": boolean, "rationale": string, "assumptions": string[] }] }`;
}

function buildChapterReviewPrompt(
  chapter: { id: string; title: string; content: string },
  ctx: ResearchContext,
): string {
  return `You are an academic-analysis reviewer helping a student assess how well they have written up their results/analysis in one chapter, given their research context.

RESEARCH CONTEXT:
- Research type: ${ctx.researchType}
- Study design: ${ctx.studyDesign}
- Research question: ${ctx.question}
- Hypothesis: ${ctx.hypothesis}

CHAPTER TO REVIEW: "${chapter.title}"
${chapter.content.slice(0, 8000)}

You do NOT have access to the student's raw datasets, statistical software output, or real numerical results — you can only judge how the analysis is WRITTEN UP, not whether the underlying numbers are correct. Do not invent statistics, p-values, or results that aren't already in the text.

Assess how well the chapter communicates its analysis/results. Only include aspects that are actually relevant to what's written (omit ones the chapter doesn't attempt) from this list, or a closely related one if more fitting:
- "Statistical/analytical reporting" — are methods, tests, and outputs described clearly and precisely?
- "Interpretation of results" — are findings explained in plain language and connected back to the research question/hypothesis?
- "Evidence for claims" — are conclusions supported by what's actually presented, without overstating?
- "Structure & clarity" — is the analysis easy to follow, well-organised, and unambiguous?

For each aspect included, give:
- "aspect": its name
- "verdict": "strong" | "needs-work" | "missing"
- "comment": one or two concrete, specific sentences explaining the verdict and how to improve it

Then write a short overall "summary" of how well this chapter presents its analysis and what to prioritise improving.

Respond with ONLY JSON in exactly this shape (no markdown fences, no extra commentary):
{ "summary": string, "findings": [{ "aspect": string, "verdict": "strong" | "needs-work" | "missing", "comment": string }] }`;
}

function verdictMeta(v: AnalysisVerdict) {
  return v === 'strong'      ? { color: 'green',  Icon: LuCircleCheck   }
       : v === 'needs-work'  ? { color: 'orange', Icon: LuTriangleAlert }
       :                       { color: 'red',    Icon: LuX             };
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'context',   label: 'Research Context' },
    { id: 'recommend', label: 'AI Advisor'       },
    { id: 'review',    label: 'Analysis Review'  },
  ];
  const idx = steps.findIndex(s => s.id === step);
  return (
    <Group gap={0} mb="xl" wrap="nowrap">
      {steps.map((s, i) => {
        const done    = i < idx;
        const current = i === idx;
        return (
          <Group key={s.id} gap={0} wrap="nowrap" style={{ flex: i < steps.length - 1 ? 1 : 0 }}>
            <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
              <Box style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: done ? '#3b5bdb' : current ? 'white' : '#f1f3f5',
                border: current ? '2px solid #3b5bdb' : done ? 'none' : '2px solid #dee2e6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {done
                  ? <LuCircleCheck size={14} color="white" />
                  : <Text size="xs" fw={700} style={{ color: current ? '#3b5bdb' : '#adb5bd' }}>{i + 1}</Text>
                }
              </Box>
              <Text size="xs" fw={current ? 700 : 400} style={{ color: current ? '#3b5bdb' : done ? '#495057' : '#adb5bd', whiteSpace: 'nowrap' }}>
                {s.label}
              </Text>
            </Group>
            {i < steps.length - 1 && (
              <Box style={{ flex: 1, height: 2, background: done ? '#3b5bdb' : '#f1f3f5', margin: '0 8px' }} />
            )}
          </Group>
        );
      })}
    </Group>
  );
}

export default function StudentAnalysis() {
  const navigate = useNavigate();
  const user = useAppSelector(s => s.auth.user);

  const [step, setStep]                 = useState<Step>('context');
  const [selectedTest, setSelectedTest] = useState(0);

  const [ctx, setCtx] = useState<ResearchContext>({
    researchType: 'Quantitative',
    studyDesign:  'Comparative',
    question:     'Does FedCliniq achieve diagnostic accuracy comparable to centralised learning while preserving patient privacy?',
    hypothesis:   'H₁: No significant difference in diagnostic accuracy between FedCliniq and centralised baseline (α = .05).',
  });

  const [variables, setVariables] = useState<Variable[]>([
    { name: 'Diagnostic Accuracy', type: 'number',   role: 'DV'      },
    { name: 'Training Method',     type: 'category', role: 'IV'      },
    { name: 'Hospital Site',       type: 'category', role: 'Control' },
  ]);

  // ── AI Advisor (Gemini-driven test recommendations) ─────────────────────────
  const [advisorReport, setAdvisorReport]         = useState<AnalysisAdvisorReport | null>(null);
  const [advisorGeneratedAt, setAdvisorGeneratedAt] = useState<string | null>(null);
  const [generatingAdvisor, setGeneratingAdvisor] = useState(false);

  const tests         = advisorReport?.tests ?? [];
  const chapterReview = advisorReport?.chapterReview ?? null;

  // ── Chapters available for the analysis-writing review ───────────────────────
  const [submissions, setSubmissions] = useState<DBSubmission[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      fetchAIReport<AnalysisAdvisorReport>(user.id, 'analysis'),
      fetchStudentSubmissions(user.id),
    ]).then(([row, subs]) => {
      if (row && isAnalysisAdvisorReport(row.data)) {
        setAdvisorReport(row.data);
        setAdvisorGeneratedAt(row.created_at);
      }
      setSubmissions(subs.filter(s => s.content.trim().length > 0));
    });
  }, [user?.id]);

  const handleGetRecommendations = async () => {
    setStep('recommend');
    if (!user?.id) return;
    if (!isGeminiConfigured()) {
      notifications.show({ title: 'AI not configured', message: 'VITE_GEMINI_API_KEY is missing — ask an admin to add it to the environment.', color: 'red' });
      return;
    }

    setGeneratingAdvisor(true);
    try {
      const prompt = buildAdvisorPrompt(ctx, variables);
      const result = await generateJSON<{ tests: RecommendedTestAI[] }>(prompt);
      if (!isAnalysisAdvisorReport(result)) throw new GeminiError('Unexpected response shape from Gemini.');

      const merged: AnalysisAdvisorReport = { tests: result.tests, chapterReview };
      setAdvisorReport(merged);
      setSelectedTest(0);
      const now = new Date().toISOString();
      setAdvisorGeneratedAt(now);
      await saveAIReport(user.id, 'analysis', merged);
      notifications.show({ title: 'Recommendations ready', message: 'AI advisor generated test recommendations for your research context.', color: 'brand' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not generate recommendations.';
      notifications.show({ title: 'Recommendation failed', message, color: 'red' });
    } finally {
      setGeneratingAdvisor(false);
    }
  };

  const handleReviewChapter = async () => {
    if (!user?.id) return;
    if (!isGeminiConfigured()) {
      notifications.show({ title: 'AI not configured', message: 'VITE_GEMINI_API_KEY is missing — ask an admin to add it to the environment.', color: 'red' });
      return;
    }
    const chapterId = [...selectedChapter][0];
    const chapter = submissions.find(s => s.section_id === chapterId);
    if (!chapter) {
      notifications.show({ title: 'Nothing selected', message: 'Choose the chapter that presents your results/analysis.', color: 'orange' });
      return;
    }

    setReviewing(true);
    try {
      const prompt = buildChapterReviewPrompt({ id: chapter.section_id, title: chapter.section_title, content: chapter.content }, ctx);
      const payload = await generateJSON<{ summary: string; findings: ChapterAnalysisFinding[] }>(prompt);
      if (!isChapterReviewPayload(payload)) throw new GeminiError('Unexpected response shape from Gemini.');

      const review: ChapterAnalysisReview = {
        chapterId:    chapter.section_id,
        chapterTitle: chapter.section_title,
        summary:      payload.summary,
        findings:     payload.findings,
      };
      const merged: AnalysisAdvisorReport = { tests, chapterReview: review };
      setAdvisorReport(merged);
      const now = new Date().toISOString();
      setAdvisorGeneratedAt(now);
      await saveAIReport(user.id, 'analysis', merged);
      notifications.show({ title: 'Review complete', message: `AI feedback ready for "${chapter.section_title}".`, color: 'brand' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not complete the review.';
      notifications.show({ title: 'Review failed', message, color: 'red' });
    } finally {
      setReviewing(false);
    }
  };

  return (
    <Box p="xl">
      <Group justify="space-between" align="flex-start" mb="xl" wrap="wrap" gap="sm">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Analysis Studio</Title>
          <Text size="sm" c="dimmed" mt={4}>AI-guided statistical analysis with step-by-step workflow.</Text>
        </Box>
        <Button variant="light" color="brand" leftSection={<LuActivity size={14} />}
          onClick={() => navigate('/app/data-files')}>
          Manage Datasets
        </Button>
      </Group>

      <StepIndicator step={step} />

      {/* ════════════ STEP: Context ════════════ */}
      {step === 'context' && (
        <Paper withBorder p="xl" radius="md" bg="white">
          <Group gap="sm" mb="lg">
            <ThemeIcon size={38} radius="md" color="brand" variant="light"><LuActivity size={18} /></ThemeIcon>
            <Box>
              <Text fw={700} size="md">Define Your Research Context</Text>
              <Text size="xs" c="dimmed">Help the AI recommend the right statistical tests</Text>
            </Box>
          </Group>
          <Divider mb="lg" />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
            <Select label="Research Type"  value={ctx.researchType}
              onChange={v => setCtx(p => ({ ...p, researchType: v ?? p.researchType }))}
              data={['Quantitative', 'Qualitative', 'Mixed Methods']} />
            <Select label="Study Design"   value={ctx.studyDesign}
              onChange={v => setCtx(p => ({ ...p, studyDesign: v ?? p.studyDesign }))}
              data={['Comparative', 'Experimental', 'Correlational', 'Survey', 'Case Study']} />
          </SimpleGrid>
          <TextInput label="Research Question" value={ctx.question}  onChange={e => setCtx(p => ({ ...p, question: e.target.value }))}  mb="md" />
          <TextInput label="Primary Hypothesis" value={ctx.hypothesis} onChange={e => setCtx(p => ({ ...p, hypothesis: e.target.value }))} mb="xl" />

          <Text size="sm" fw={600} mb="sm">Variables</Text>
          <Paper withBorder radius="md" mb="md" style={{ overflow: 'hidden' }}>
            <Table>
              <Table.Thead>
                <Table.Tr style={{ background: '#f8f9fa' }}>
                  {['Variable Name', 'Type', 'Role'].map(h => <Table.Th key={h}><Text size="xs" fw={600} c="dimmed">{h}</Text></Table.Th>)}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {variables.map((v, i) => (
                  <Table.Tr key={i}>
                    <Table.Td><Text size="sm">{v.name}</Text></Table.Td>
                    <Table.Td><Badge variant="light" size="xs" color={v.type === 'number' ? 'blue' : 'teal'}>{v.type}</Badge></Table.Td>
                    <Table.Td><Badge variant="light" size="xs" color={v.role === 'DV' ? 'brand' : v.role === 'IV' ? 'violet' : 'gray'}>{v.role}</Badge></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
          <Button size="xs" variant="subtle" leftSection={<LuPlus size={12} />}
            onClick={() => setVariables(prev => [...prev, { name: 'New Variable', type: 'number', role: 'DV' }])}>
            Add Variable
          </Button>

          <Group justify="flex-end" mt="xl">
            <Button color="brand" rightSection={<LuArrowRight size={14} />} loading={generatingAdvisor} onClick={handleGetRecommendations}>
              Get AI Recommendations
            </Button>
          </Group>
        </Paper>
      )}

      {/* ════════════ STEP: Recommend ════════════ */}
      {step === 'recommend' && (
        <Paper withBorder p="xl" radius="md" bg="white">
          <Group justify="space-between" align="flex-start" mb="lg">
            <Group gap="sm">
              <ThemeIcon size={38} radius="md" color="brand" variant="light"><LuSparkles size={18} /></ThemeIcon>
              <Box>
                <Text fw={700} size="md">AI Test Recommendations</Text>
                <Text size="xs" c="dimmed">
                  {advisorGeneratedAt ? `Generated ${new Date(advisorGeneratedAt).toLocaleString()} · based on your research context and variables` : 'Based on your research context and variables'}
                </Text>
              </Box>
            </Group>
            <Button size="xs" variant="light" color="brand" leftSection={generatingAdvisor ? <Loader size={12} color="currentColor" /> : <LuRefreshCw size={14} />}
              loading={generatingAdvisor} onClick={handleGetRecommendations}>
              {advisorReport ? 'Regenerate' : 'Generate'}
            </Button>
          </Group>
          <Divider mb="lg" />

          {tests.length === 0 ? (
            <Box ta="center" py="xl">
              <Text size="sm" c="dimmed" fs="italic">
                {generatingAdvisor ? 'Asking the AI advisor for test recommendations…' : 'No recommendations yet — click "Generate" to have the AI advisor suggest tests based on your context.'}
              </Text>
            </Box>
          ) : (
            <Stack gap="md">
              {tests.map((test, i) => (
                <Paper key={test.name} withBorder p="lg" radius="md"
                  style={{
                    background: selectedTest === i ? '#f0f4ff' : 'white',
                    border: selectedTest === i ? '1.5px solid #3b5bdb' : undefined,
                  }}>
                  <Group justify="space-between" align="flex-start" mb="sm" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                      <Text fw={700} size="sm">{test.name}</Text>
                      {test.recommended && <Badge color="green" variant="light" size="xs">Recommended</Badge>}
                    </Group>
                    <Button size="xs" color="brand" variant={selectedTest === i ? 'filled' : 'light'}
                      onClick={() => setSelectedTest(i)}>
                      {selectedTest === i ? 'Selected' : 'Select'}
                    </Button>
                  </Group>
                  <Text size="xs" c="dimmed" mb="sm">{test.rationale}</Text>
                  <Text size="xs" fw={600} c="dimmed" mb={4}>Assumptions:</Text>
                  <Stack gap={2}>
                    {test.assumptions.map(a => (
                      <Group key={a} gap="xs">
                        <LuCircleCheck size={11} color="#2f9e44" />
                        <Text size="xs" c="dimmed">{a}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}

          <Group justify="space-between" mt="xl">
            <Button variant="subtle" leftSection={<LuArrowLeft size={14} />} onClick={() => setStep('context')}>Back</Button>
            <Button color="brand" rightSection={<LuArrowRight size={14} />} disabled={tests.length === 0} onClick={handleRunAnalysis}>
              {tests[selectedTest] ? `Run ${tests[selectedTest].name}` : 'Run Analysis'}
            </Button>
          </Group>
        </Paper>
      )}

      {/* ════════════ STEP: Analysis Review ════════════ */}
      {step === 'review' && (
        <Paper withBorder p="xl" radius="md" bg="white">
          <Group justify="space-between" align="flex-start" mb="lg">
            <Group gap="sm">
              <ThemeIcon size={38} radius="md" color="brand" variant="light"><LuActivity size={18} /></ThemeIcon>
              <Box>
                <Text fw={700} size="md">AI Analysis-Writing Review</Text>
                <Text size="xs" c="dimmed">
                  {advisorGeneratedAt && chapterReview
                    ? `Reviewed "${chapterReview.chapterTitle}" · ${new Date(advisorGeneratedAt).toLocaleString()}`
                    : 'Pick the chapter where you present your results/analysis for AI feedback on how it’s written up'}
                </Text>
              </Box>
            </Group>
          </Group>
          <Divider mb="lg" />

          <Paper withBorder p="sm" radius="md" mb="lg" style={{ background: '#f8f9ff', border: '1px dashed #748ffc' }}>
            <Text size="xs" c="dimmed">
              The AI cannot see your raw datasets or computed statistics — it reviews how clearly and rigorously your analysis is{' '}
              <strong>written up</strong> (reporting, interpretation, evidence for claims, structure), not whether the underlying numbers are correct.
            </Text>
          </Paper>

          <ChapterPicker
            submissions={submissions}
            selected={selectedChapter}
            onChange={setSelectedChapter}
            multiple={false}
            title="Choose the chapter to review"
            description="Select the chapter that presents your results or analysis (e.g. Chapter 4: Results & Analysis)."
          />

          <Group justify="flex-end" mt="md" mb="xl">
            <Button color="brand" leftSection={<LuSparkles size={14} />} loading={reviewing}
              disabled={submissions.length === 0 || selectedChapter.size === 0} onClick={handleReviewChapter}>
              {chapterReview ? 'Re-run Review' : 'Review Chapter'}
            </Button>
          </Group>

          {chapterReview && (
            <Stack gap="md">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Box>
                  <Text fw={700} size="md">{chapterReview.chapterTitle}</Text>
                  <Text size="xs" c="dimmed">AI feedback on how this chapter's analysis is written up</Text>
                </Box>
                <Badge color="green" variant="light" leftSection={<LuCircleCheck size={10} />}>Reviewed</Badge>
              </Group>

              <Box p="md" style={{ background: '#f8f9ff', borderRadius: 10, borderLeft: '4px solid #3b5bdb' }}>
                <Text size="xs" fw={700} c="brand" mb={4}>OVERALL SUMMARY</Text>
                <Text size="sm">{chapterReview.summary}</Text>
              </Box>

              <Stack gap="xs">
                {chapterReview.findings.map((f, i) => {
                  const { color, Icon } = verdictMeta(f.verdict);
                  return (
                    <Group key={i} gap="sm" align="flex-start" wrap="nowrap" p="md" style={{ border: '1px solid #f1f3f5', borderRadius: 10 }}>
                      <ThemeIcon size={26} radius="xl" color={color} variant="light" style={{ flexShrink: 0 }}>
                        <Icon size={13} />
                      </ThemeIcon>
                      <Box style={{ flex: 1 }}>
                        <Group gap="xs" mb={2}>
                          <Text size="sm" fw={600}>{f.aspect}</Text>
                          <Badge size="xs" variant="light" color={color} style={{ textTransform: 'capitalize' }}>
                            {f.verdict.replace('-', ' ')}
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed">{f.comment}</Text>
                      </Box>
                    </Group>
                  );
                })}
              </Stack>
            </Stack>
          )}

          <Group justify="space-between" mt="xl">
            <Button variant="subtle" leftSection={<LuArrowLeft size={14} />} onClick={() => setStep('recommend')}>Back</Button>
          </Group>
        </Paper>
      )}
    </Box>
  );
}
