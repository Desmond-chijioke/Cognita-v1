import { useEffect, useState } from 'react';
import {
  Badge, Box, Button, Checkbox, Divider, Group, Loader, Paper, Progress,
  SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuShield, LuCircleCheck, LuTriangleAlert,
  LuX, LuBot, LuChevronDown, LuChevronUp, LuInfo, LuFileText,
} from 'react-icons/lu';
import { useAppSelector } from '../../Redux/hooks';
import { fetchSectionDrafts } from '../../supabase/drafts';
import type { DBDraft } from '../../supabase/drafts';
import { fetchAIReport, saveAIReport } from '../../supabase/aiReports';
import { generateJSON, isGeminiConfigured, GeminiError } from '../../helper/gemini';

// ── Report shape produced by Gemini ───────────────────────────────────────────

interface SectionFinding {
  sectionId:    string;
  sectionTitle: string;
  similarity:   number;
  aiScore:      number;
  flags:        string[];
  notes:        string;
}

interface PlagiarismReport {
  overallSimilarity: number;
  overallAi:         number;
  summary:           string;
  sections:          SectionFinding[];
}

function isPlagiarismReport(v: unknown): v is PlagiarismReport {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return typeof r.overallSimilarity === 'number'
    && typeof r.overallAi === 'number'
    && typeof r.summary === 'string'
    && Array.isArray(r.sections);
}

function simRisk(v: number) {
  return v <= 20 ? { label: 'Acceptable', color: '#2f9e44' }
       : v <= 35 ? { label: 'Borderline',  color: '#f08c00' }
       :           { label: 'Critical',    color: '#e03131' };
}
function aiRisk(v: number) {
  return v <= 20 ? { label: 'Low',      color: '#2f9e44' }
       : v <= 45 ? { label: 'Moderate', color: '#f08c00' }
       :           { label: 'High',     color: '#e03131' };
}

function DonutRing({ value, color }: { value: number; color: string }) {
  const r = 44, cx = 56, cy = 56;
  const circumference = 2 * Math.PI * r;
  const dash = Math.min(value / 100, 1) * circumference;
  return (
    <svg width={112} height={112} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f3f5" strokeWidth={10} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round" />
    </svg>
  );
}

function wordCount(text: string) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

const META_PREFIXES = ['template_def_', 'proj_meta_'];
function isMetaRow(draft: DBDraft) {
  return META_PREFIXES.some(p => draft.section_id.startsWith(p));
}

function buildPrompt(sections: { id: string; title: string; content: string }[]): string {
  return `You are an academic-integrity assistant helping a researcher review their own research before submission.

Analyse the sections below for:
- Similar phrasing or repeated ideas (within the document, or that closely mirror common phrasing found in published academic work on similar topics)
- Weak paraphrasing (text that closely mirrors typical source phrasing without being substantially reworded or critically engaged with)
- Suspicious "AI-like" or formulaic writing style (generic templated structure, repetitive sentence patterns, lack of a personal analytical voice)
- Whether the section reads as original work or looks unoriginal / copied / AI-generated

You do NOT have web search or access to a plagiarism database — do not invent matched sources, titles, or percentages from real documents. Base every score purely on the linguistic characteristics of the text itself.

For each section return:
- "similarity": 0-100 risk score for unoriginal / closely-mirrored phrasing (0 = clearly original voice, 100 = reads as copied)
- "aiScore": 0-100 likelihood the text reads as AI-generated or AI-paraphrased (0 = clearly human/personal voice, 100 = reads as machine-generated)
- "flags": short array of specific concerns spotted, e.g. ["weak paraphrasing", "repeated transition phrases", "generic templated structure"] (empty array if none)
- "notes": one or two plain-language sentences explaining the score, with a concrete suggestion for improving originality where relevant

Then provide an overall verdict across the whole document.

Respond with ONLY JSON in exactly this shape (no markdown fences, no extra commentary):
{
  "overallSimilarity": number,
  "overallAi": number,
  "summary": string,
  "sections": [
    { "sectionId": string, "sectionTitle": string, "similarity": number, "aiScore": number, "flags": string[], "notes": string }
  ]
}

SECTIONS TO ANALYSE:
${sections.map(s => `\n--- ${s.title} (id: ${s.id}) ---\n${s.content.slice(0, 6000)}`).join('\n')}`;
}

// ── Inline draft picker ────────────────────────────────────────────────────────

function DraftPicker({ drafts, selected, onChange }: {
  drafts: DBDraft[];
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
}) {
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next);
  };

  if (drafts.length === 0) {
    return (
      <Paper withBorder p="lg" radius="md" ta="center" style={{ background: '#f8f9fa' }}>
        <Text size="sm" c="dimmed">No saved drafts yet — write and save content in the Editor first.</Text>
      </Paper>
    );
  }

  return (
    <Box>
      <Group justify="space-between" align="flex-start" mb="sm">
        <Box>
          <Text size="sm" fw={600}>Choose sections to scan</Text>
          <Text size="xs" c="dimmed">The AI analyses only the sections you select below.</Text>
        </Box>
        <Group gap={6}>
          <Button size="compact-xs" variant="subtle" onClick={() => onChange(new Set(drafts.map(d => d.section_id)))}>
            Select all
          </Button>
          <Button size="compact-xs" variant="subtle" color="gray" onClick={() => onChange(new Set())}>
            Clear
          </Button>
        </Group>
      </Group>
      <Stack gap={6}>
        {drafts.map(d => {
          const checked = selected.has(d.section_id);
          return (
            <Paper key={d.section_id} withBorder p="sm" radius="md"
              onClick={() => toggle(d.section_id)}
              style={{
                cursor: 'pointer',
                background: checked ? '#f0f4ff' : 'white',
                border: checked ? '1.5px solid #3b5bdb' : undefined,
              }}>
              <Group gap="sm" wrap="nowrap">
                <Checkbox
                  checked={checked}
                  onChange={() => toggle(d.section_id)}
                  onClick={e => e.stopPropagation()}
                  radius="sm"
                  color="brand"
                />
                <LuFileText size={15} color="#748ffc" style={{ flexShrink: 0 }} />
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" fw={500} truncate>{d.section_title}</Text>
                </Box>
                <Badge variant="light" size="xs" color="gray">{wordCount(d.content)} words</Badge>
              </Group>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ResearchPlagiarism() {
  const user = useAppSelector(s => s.auth.user);

  const [loading,   setLoading]   = useState(true);
  const [scanning,  setScanning]  = useState(false);
  const [report,    setReport]    = useState<PlagiarismReport | null>(null);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [expandedSim, setExpandedSim] = useState<string | null>(null);
  const [expandedAi,  setExpandedAi]  = useState<string | null>(null);

  const [drafts,   setDrafts]   = useState<DBDraft[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    Promise.all([
      fetchAIReport<PlagiarismReport>(user.id, 'plagiarism'),
      fetchSectionDrafts(user.id),
    ]).then(([row, allDrafts]) => {
      if (row && isPlagiarismReport(row.data)) {
        setReport(row.data);
        setScannedAt(row.created_at);
      }
      const usable = allDrafts.filter(d => !isMetaRow(d) && d.content.trim().length > 0);
      setDrafts(usable);
      setSelected(new Set(usable.map(d => d.section_id)));
    }).finally(() => setLoading(false));
  }, [user?.id]);

  const runScan = async () => {
    if (!user?.id) return;
    if (!isGeminiConfigured()) {
      notifications.show({ title: 'AI not configured', message: 'VITE_GEMINI_API_KEY is missing — ask an admin to add it to the environment.', color: 'red' });
      return;
    }

    const chosen = drafts.filter(d => selected.has(d.section_id));
    if (chosen.length === 0) {
      notifications.show({ title: 'Nothing selected', message: 'Choose at least one section to scan.', color: 'orange' });
      return;
    }

    setScanning(true);
    try {
      const prompt = buildPrompt(chosen.map(d => ({ id: d.section_id, title: d.section_title, content: d.content })));
      const result = await generateJSON<PlagiarismReport>(prompt);

      if (!isPlagiarismReport(result)) throw new GeminiError('Unexpected response shape from Gemini.');

      setReport(result);
      const now = new Date().toISOString();
      setScannedAt(now);
      await saveAIReport(user.id, 'plagiarism', result);

      notifications.show({ title: 'Scan complete', message: 'Integrity report updated.', color: 'green' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not complete the scan.';
      notifications.show({ title: 'Scan failed', message, color: 'red' });
    } finally {
      setScanning(false);
    }
  };

  const overallSim = report?.overallSimilarity ?? 0;
  const overallAi  = report?.overallAi ?? 0;
  const simColor   = simRisk(overallSim).color;
  const aiColor    = aiRisk(overallAi).color;
  const sections   = report?.sections ?? [];

  return (
    <Box p="xl">
      <Group justify="space-between" align="flex-start" mb="xl" wrap="wrap" gap="sm">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Integrity Report</Title>
          <Text size="sm" c="dimmed" mt={4}>AI-driven originality and writing-style analysis of your saved research drafts.</Text>
        </Box>
        <Text size="xs" c="dimmed">
          {scannedAt ? `Last scanned ${new Date(scannedAt).toLocaleString()}` : 'Not scanned yet'}
        </Text>
      </Group>

      <Paper withBorder p="sm" radius="md" mb="xl" style={{ background: '#f8f9ff', border: '1px dashed #748ffc' }}>
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <LuInfo size={14} color="#748ffc" style={{ flexShrink: 0, marginTop: 2 }} />
          <Text size="xs" c="dimmed">
            This report is generated by AI from the linguistic characteristics of your writing — phrasing patterns, paraphrasing strength, and stylistic
            originality. It does not cross-check against a web or database index of real sources, so treat scores as a self-review aid, not a formal
            plagiarism-database result.
          </Text>
        </Group>
      </Paper>

      {loading ? (
        <Group justify="center" py="xl"><Loader size="sm" color="brand" /></Group>
      ) : (
        <Paper withBorder p="lg" radius="md" bg="white" mb="xl">
          <DraftPicker drafts={drafts} selected={selected} onChange={setSelected} />
          <Group justify="flex-end" mt="md">
            <Button color="brand" leftSection={<LuShield size={14} />} loading={scanning}
              disabled={drafts.length === 0 || selected.size === 0} onClick={runScan}>
              {report ? 'Re-run Scan' : 'Run Scan'}
            </Button>
          </Group>
        </Paper>
      )}

      {loading ? null : !report ? (
        <Paper withBorder p="xl" radius="md" bg="white" ta="center">
          <ThemeIcon size={48} radius="xl" variant="light" color="brand" mx="auto" mb="md"><LuShield size={22} /></ThemeIcon>
          <Text fw={600} mb={4}>No integrity report yet</Text>
          <Text size="sm" c="dimmed">Select sections above and run a scan to get an AI-driven originality and AI-writing-style analysis.</Text>
        </Paper>
      ) : (
        <>
          {/* ── Score cards ── */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} mb="xl">
            <Paper withBorder p="xl" radius="md" bg="white">
              <Group gap="xl" align="center" wrap="nowrap">
                <Box style={{ position: 'relative', flexShrink: 0 }}>
                  <DonutRing value={overallSim} color={simColor} />
                  <Box style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text fw={800} style={{ fontSize: 22, color: simColor }}>{overallSim}%</Text>
                  </Box>
                </Box>
                <Box style={{ flex: 1 }}>
                  <Text fw={700} size="lg" mb={4}>Originality Risk</Text>
                  <Badge variant="light" size="sm" mb="sm" style={{ background: simColor + '20', color: simColor }}>
                    {simRisk(overallSim).label}
                  </Badge>
                  <Text size="xs" c="dimmed" mb="sm">{sections.length} section{sections.length !== 1 ? 's' : ''} analysed</Text>
                  <Stack gap={4}>
                    {[{ label: '<= 20%  Safe', color: '#2f9e44' }, { label: '21-35%  Borderline', color: '#f08c00' }, { label: '> 35%   Critical', color: '#e03131' }].map(({ label, color }) => (
                      <Group key={label} gap="xs">
                        <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <Text size="xs" c="dimmed">{label}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Box>
              </Group>
            </Paper>

            <Paper withBorder p="xl" radius="md" bg="white">
              <Group gap="xl" align="center" wrap="nowrap">
                <Box style={{ position: 'relative', flexShrink: 0 }}>
                  <DonutRing value={overallAi} color={aiColor} />
                  <Box style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text fw={800} style={{ fontSize: 22, color: aiColor }}>{overallAi}%</Text>
                  </Box>
                </Box>
                <Box style={{ flex: 1 }}>
                  <Text fw={700} size="lg" mb={4}>AI Writing-Style Score</Text>
                  <Badge variant="light" size="sm" mb="sm" style={{ background: aiColor + '20', color: aiColor }}>
                    {aiRisk(overallAi).label}
                  </Badge>
                  <Text size="xs" c="dimmed" mb="sm">Reflects how strongly the writing reads as AI-generated or AI-paraphrased</Text>
                  <Stack gap={4}>
                    {[{ label: '<= 20%  Low', color: '#2f9e44' }, { label: '21-45%  Moderate', color: '#f08c00' }, { label: '> 45%   High', color: '#e03131' }].map(({ label, color }) => (
                      <Group key={label} gap="xs">
                        <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <Text size="xs" c="dimmed">{label}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Box>
              </Group>
            </Paper>
          </SimpleGrid>

          <Paper withBorder p="md" radius="md" mb="xl" bg="white">
            <Text size="sm" fw={600} mb={4}>Overall verdict</Text>
            <Text size="sm" c="dimmed">{report.summary}</Text>
          </Paper>

          {/* ── Section breakdown ── */}
          <Tabs defaultValue="similarity">
            <Tabs.List mb="lg">
              <Tabs.Tab value="similarity" leftSection={<LuShield size={14} />}>Originality</Tabs.Tab>
              <Tabs.Tab value="ai"         leftSection={<LuBot    size={14} />}>AI Writing Style</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="similarity">
              <Paper withBorder p="sm" radius="md" mb="md" style={{ background: '#f8f9ff', border: '1px dashed #748ffc' }}>
                <Text size="xs" c="dimmed">
                  Scores above <strong>20%</strong> are worth a closer look. Above <strong>35%</strong>, consider rewriting in your own analytical voice and ensuring proper citation.
                </Text>
              </Paper>
              <Stack gap="sm">
                {sections.map(sec => {
                  const { color } = simRisk(sec.similarity);
                  const isOpen = expandedSim === sec.sectionId;
                  return (
                    <Paper key={sec.sectionId} withBorder p="md" radius="md" bg="white"
                      style={{ cursor: 'pointer' }} onClick={() => setExpandedSim(isOpen ? null : sec.sectionId)}>
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                          <ThemeIcon size={26} radius="xl" variant="light"
                            color={sec.similarity <= 20 ? 'green' : sec.similarity <= 35 ? 'orange' : 'red'}
                            style={{ flexShrink: 0 }}>
                            {sec.similarity <= 20 ? <LuCircleCheck size={13} /> : sec.similarity <= 35 ? <LuTriangleAlert size={13} /> : <LuX size={13} />}
                          </ThemeIcon>
                          <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="sm" fw={500}>{sec.sectionTitle}</Text>
                            <Group gap="sm" mt={4}>
                              <Progress value={sec.similarity} color={sec.similarity <= 20 ? 'green' : sec.similarity <= 35 ? 'orange' : 'red'} size="xs" radius="xl" style={{ width: 120 }} />
                              <Text size="xs" fw={700} style={{ color }}>{sec.similarity}%</Text>
                            </Group>
                          </Box>
                        </Group>
                        {isOpen ? <LuChevronUp size={16} color="#adb5bd" /> : <LuChevronDown size={16} color="#adb5bd" />}
                      </Group>
                      {isOpen && (
                        <Box mt="md" pt="md" style={{ borderTop: '1px solid #f1f3f5' }}>
                          {sec.flags.length > 0 && (
                            <Group gap={6} mb="xs">
                              {sec.flags.map((f, i) => <Badge key={i} size="xs" variant="light" color="orange">{f}</Badge>)}
                            </Group>
                          )}
                          <Text size="xs" c="dimmed">{sec.notes}</Text>
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="ai">
              <Paper withBorder p="sm" radius="md" mb="md" style={{ background: '#f8f9ff', border: '1px dashed #748ffc' }}>
                <Text size="xs" c="dimmed">
                  Scores above <strong>20%</strong> indicate AI-like characteristics. Above <strong>45%</strong>, consider substantially rewriting in your own voice.
                </Text>
              </Paper>
              <Stack gap="sm">
                {sections.map(sec => {
                  const { color } = aiRisk(sec.aiScore);
                  const isOpen = expandedAi === sec.sectionId;
                  return (
                    <Paper key={sec.sectionId} withBorder p="md" radius="md" bg="white"
                      style={{ cursor: 'pointer' }} onClick={() => setExpandedAi(isOpen ? null : sec.sectionId)}>
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                          <ThemeIcon size={26} radius="xl" variant="light"
                            color={sec.aiScore <= 20 ? 'green' : sec.aiScore <= 45 ? 'orange' : 'red'}
                            style={{ flexShrink: 0 }}>
                            {sec.aiScore <= 20 ? <LuCircleCheck size={13} /> : <LuBot size={13} />}
                          </ThemeIcon>
                          <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="sm" fw={500}>{sec.sectionTitle}</Text>
                            <Group gap="sm" mt={4}>
                              <Progress value={sec.aiScore} color={sec.aiScore <= 20 ? 'green' : sec.aiScore <= 45 ? 'orange' : 'red'} size="xs" radius="xl" style={{ width: 120 }} />
                              <Text size="xs" fw={700} style={{ color }}>{sec.aiScore}%</Text>
                            </Group>
                          </Box>
                        </Group>
                        {isOpen ? <LuChevronUp size={16} color="#adb5bd" /> : <LuChevronDown size={16} color="#adb5bd" />}
                      </Group>
                      {isOpen && (
                        <Box mt="md" pt="md" style={{ borderTop: '1px solid #f1f3f5' }}>
                          {sec.flags.length > 0 && (
                            <Group gap={6} mb="xs">
                              {sec.flags.map((f, i) => <Badge key={i} size="xs" variant="light" color="orange">{f}</Badge>)}
                            </Group>
                          )}
                          <Text size="xs" c="dimmed">{sec.notes}</Text>
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Stack>
            </Tabs.Panel>
          </Tabs>

          {/* ── Legend ── */}
          <Paper withBorder p="sm" radius="md" mt="lg" style={{ background: '#f8f9fa', border: '1px dashed #dee2e6' }}>
            <Group gap="xl" wrap="wrap">
              {[
                { icon: LuCircleCheck,   color: '#2f9e44', label: 'Safe — within acceptable thresholds' },
                { icon: LuTriangleAlert, color: '#f08c00', label: 'Borderline — review recommended' },
                { icon: LuX,             color: '#e03131', label: 'Critical — revision required' },
              ].map(({ icon: Icon, color, label }) => (
                <Group key={label} gap="xs">
                  <Icon size={13} style={{ color }} />
                  <Text size="xs" c="dimmed">{label}</Text>
                </Group>
              ))}
            </Group>
          </Paper>

          <Divider my="xl" />
        </>
      )}
    </Box>
  );
}
