import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge, Box, Button, Divider, Group, Paper, Progress,
  Select, SimpleGrid, Stack, Table, Text, Textarea,
  TextInput, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuActivity, LuSparkles, LuCircleCheck, LuX, LuArrowRight,
  LuArrowLeft, LuSave, LuPenLine, LuCopy, LuPlus,
} from 'react-icons/lu';
import { ANALYSIS_RESULTS } from '../studentData';
import type { AnalysisResult } from '../studentData';

type Step = 'context' | 'recommend' | 'results' | 'history';

interface Variable { name: string; type: string; role: string }

const RECOMMEND_TESTS = [
  {
    name: 'Independent Samples t-test',
    recommended: true,
    rationale: 'Your dependent variable (diagnostic accuracy) is continuous and you are comparing two independent groups (FedCliniq vs. centralised). The t-test is the appropriate choice assuming normality.',
    assumptions: ['Normal distribution of accuracy scores', 'Independence of observations', 'Homogeneity of variance (or use Welch correction)'],
  },
  {
    name: 'Mann-Whitney U Test',
    recommended: false,
    rationale: 'A non-parametric alternative to the t-test, appropriate if your accuracy distributions are non-normal or heavily skewed. Robust to outliers.',
    assumptions: ['Ordinal or continuous measurement', 'Independence of observations'],
  },
  {
    name: "Welch's t-test",
    recommended: false,
    rationale: 'A variant of the t-test that does not assume equal variances between groups. Preferred when Levene\'s test indicates unequal variances.',
    assumptions: ['Normal distribution', 'Independence of observations'],
  },
];

function StepIndicator({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'context',   label: 'Research Context' },
    { id: 'recommend', label: 'AI Advisor'       },
    { id: 'results',   label: 'Run Analysis'     },
    { id: 'history',   label: 'History'          },
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
  const [step, setStep]                 = useState<Step>('context');
  const [running, setRunning]           = useState(false);
  const [progress, setProgress]         = useState(0);
  const [selectedResult, setResult]     = useState<AnalysisResult | null>(null);
  const [savedResults, setSaved]        = useState<AnalysisResult[]>(ANALYSIS_RESULTS);
  const [selectedTest, setSelectedTest] = useState(0);

  const [ctx, setCtx] = useState({
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

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(id); return 100; }
        return p + 4;
      });
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (progress >= 100 && running) {
      setTimeout(() => {
        setRunning(false);
        setProgress(0);
        setResult(ANALYSIS_RESULTS[selectedTest] ?? ANALYSIS_RESULTS[0]);
      }, 300);
    }
  }, [progress, running, selectedTest]);

  const handleRunAnalysis = () => {
    setRunning(true);
    setProgress(0);
    setResult(null);
    setStep('results');
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
            <Button color="brand" rightSection={<LuArrowRight size={14} />} onClick={() => setStep('recommend')}>
              Get AI Recommendations
            </Button>
          </Group>
        </Paper>
      )}

      {/* ════════════ STEP: Recommend ════════════ */}
      {step === 'recommend' && (
        <Paper withBorder p="xl" radius="md" bg="white">
          <Group gap="sm" mb="lg">
            <ThemeIcon size={38} radius="md" color="brand" variant="light"><LuSparkles size={18} /></ThemeIcon>
            <Box>
              <Text fw={700} size="md">AI Test Recommendations</Text>
              <Text size="xs" c="dimmed">Based on your research context and variables</Text>
            </Box>
          </Group>
          <Divider mb="lg" />
          <Stack gap="md">
            {RECOMMEND_TESTS.map((test, i) => (
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
          <Group justify="space-between" mt="xl">
            <Button variant="subtle" leftSection={<LuArrowLeft size={14} />} onClick={() => setStep('context')}>Back</Button>
            <Button color="brand" rightSection={<LuArrowRight size={14} />} onClick={handleRunAnalysis}>
              Run {RECOMMEND_TESTS[selectedTest].name}
            </Button>
          </Group>
        </Paper>
      )}

      {/* ════════════ STEP: Results ════════════ */}
      {step === 'results' && (
        <Paper withBorder p="xl" radius="md" bg="white">
          {running || (!selectedResult && !running) ? (
            <Stack gap="md" align="center" py="xl">
              <ThemeIcon size={56} radius="xl" color="brand" variant="light">
                <LuActivity size={28} />
              </ThemeIcon>
              <Text fw={700} size="lg">Running {RECOMMEND_TESTS[selectedTest].name}…</Text>
              <Progress value={progress} color="brand" size="lg" radius="xl" animated style={{ width: '100%', maxWidth: 400 }} />
              <Text size="sm" fw={700}>{progress}%</Text>
            </Stack>
          ) : selectedResult ? (
            <Stack gap="lg">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Box>
                  <Text fw={700} size="lg">{selectedResult.title}</Text>
                  <Text size="xs" c="dimmed">{selectedResult.testType}</Text>
                </Box>
                <Badge color="green" variant="light" leftSection={<LuCircleCheck size={10} />}>Completed</Badge>
              </Group>

              {/* Stats row */}
              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                {[
                  { label: 'Test Statistic', value: `${selectedResult.statistic} = ${selectedResult.statValue}` },
                  { label: 'P-Value',         value: `p = ${selectedResult.pValue}` },
                  { label: 'Effect Size',     value: `${selectedResult.effectSize} = ${selectedResult.effectValue}` },
                  { label: '95% CI',          value: selectedResult.ci ?? 'N/A' },
                ].map(({ label, value }) => (
                  <Box key={label} p="md" ta="center" style={{ background: '#f8f9fa', borderRadius: 10 }}>
                    <Text fw={700} size="sm">{value}</Text>
                    <Text size="xs" c="dimmed" mt={4}>{label}</Text>
                  </Box>
                ))}
              </SimpleGrid>

              {/* Assumptions */}
              {selectedResult.assumptions && (
                <Box>
                  <Text fw={600} size="sm" mb="sm">Assumptions Check</Text>
                  <Stack gap="xs">
                    {selectedResult.assumptions.map(a => (
                      <Group key={a.label} gap="sm" wrap="nowrap">
                        <ThemeIcon size={20} radius="xl" color={a.met ? 'green' : 'red'} variant="light" style={{ flexShrink: 0 }}>
                          {a.met ? <LuCircleCheck size={11} /> : <LuX size={11} />}
                        </ThemeIcon>
                        <Box>
                          <Text size="xs" fw={500}>{a.label}</Text>
                          {a.note && <Text size="xs" c="dimmed">{a.note}</Text>}
                        </Box>
                      </Group>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Interpretation */}
              <Box p="md" style={{ background: '#f8f9ff', borderRadius: 10, borderLeft: '4px solid #3b5bdb' }}>
                <Text size="xs" fw={700} c="brand" mb={4}>STATISTICAL INTERPRETATION</Text>
                <Text size="sm">{selectedResult.interpretation}</Text>
                {selectedResult.plainLanguage && (
                  <Text size="sm" c="dimmed" fs="italic" mt="sm">{selectedResult.plainLanguage}</Text>
                )}
              </Box>

              {/* Draft text */}
              {selectedResult.draftText && (
                <Box>
                  <Text fw={600} size="sm" mb="sm">Ready-to-use Draft Text</Text>
                  <Paper withBorder p="md" radius="md" style={{ background: '#fafafa', border: '1px dashed #dee2e6' }}>
                    <Textarea
                      value={selectedResult.draftText}
                      readOnly
                      rows={4}
                      styles={{ input: { fontFamily: 'Georgia, serif', fontSize: 13, background: 'transparent', border: 'none', cursor: 'text' } }}
                    />
                    <Group gap="xs" mt="sm">
                      <Button size="xs" variant="light"  leftSection={<LuCopy    size={11} />}
                        onClick={() => { navigator.clipboard.writeText(selectedResult.draftText ?? ''); notifications.show({ title: 'Copied', message: 'Draft text copied to clipboard.', color: 'brand' }); }}>
                        Copy to Clipboard
                      </Button>
                      <Button size="xs" color="brand"    leftSection={<LuPenLine size={11} />}
                        onClick={() => notifications.show({ title: 'Text inserted', message: 'Statistical draft inserted into Chapter 4.', color: 'green' })}>
                        Insert into Document
                      </Button>
                    </Group>
                  </Paper>
                </Box>
              )}

              <Group justify="space-between">
                <Button variant="subtle" leftSection={<LuArrowLeft size={14} />} onClick={() => setStep('recommend')}>Back</Button>
                <Group gap="sm">
                  <Button variant="light" leftSection={<LuSave size={14} />}
                    onClick={() => {
                      setSaved(prev => prev.find(r => r.id === selectedResult.id) ? prev : [selectedResult, ...prev]);
                      notifications.show({ title: 'Saved', message: 'Analysis saved to history.', color: 'green' });
                      setStep('history');
                    }}>
                    Save to History
                  </Button>
                </Group>
              </Group>
            </Stack>
          ) : null}
        </Paper>
      )}

      {/* ════════════ STEP: History ════════════ */}
      {step === 'history' && (
        <Paper withBorder p="xl" radius="md" bg="white">
          <Group justify="space-between" align="flex-start" mb="lg">
            <Box>
              <Text fw={700} size="lg">Analysis History</Text>
              <Text size="xs" c="dimmed">{savedResults.length} analyses completed</Text>
            </Box>
            <Button color="brand" leftSection={<LuPlus size={14} />} onClick={() => setStep('context')}>
              New Analysis
            </Button>
          </Group>
          <Divider mb="md" />
          {savedResults.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">No analyses yet. Run your first analysis above.</Text>
          ) : (
            <Stack gap="md">
              {savedResults.map(r => (
                <Paper key={r.id} withBorder p="lg" radius="md" bg="white">
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Group gap="sm" mb={4} wrap="wrap">
                        <Text fw={600} size="sm">{r.title}</Text>
                        <Badge variant="light" size="xs" color="blue">{r.testType}</Badge>
                        <Badge variant="light" size="xs" color="green" leftSection={<LuCircleCheck size={9} />}>Completed</Badge>
                      </Group>
                      <Text size="xs" c="dimmed" mb="sm">{r.summary}</Text>
                      <Group gap="sm">
                        {r.pValue   !== undefined && <Badge variant="outline" size="xs" color="gray">p = {r.pValue}</Badge>}
                        {r.effectValue !== undefined && <Badge variant="outline" size="xs" color="gray">{r.effectSize} = {r.effectValue}</Badge>}
                        <Text size="xs" c="dimmed">{r.createdAt}</Text>
                      </Group>
                    </Box>
                    <Group gap="xs" style={{ flexShrink: 0 }}>
                      <Button size="xs" variant="subtle"
                        onClick={() => { setResult(r); setStep('results'); }}>
                        View Details
                      </Button>
                      <Button size="xs" variant="light" color="brand" leftSection={<LuPenLine size={11} />}
                        onClick={() => notifications.show({ title: 'Inserted', message: `${r.title} inserted into Chapter 4.`, color: 'green' })}>
                        Insert
                      </Button>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
          <Group mt="xl">
            <Button variant="subtle" leftSection={<LuArrowLeft size={14} />} onClick={() => setStep('context')}>
              Back to Context
            </Button>
          </Group>
        </Paper>
      )}
    </Box>
  );
}
