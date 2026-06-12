import { useEffect, useState } from 'react';
import {
  Anchor, Badge, Box, Button, Checkbox, Divider, Group, Loader, Paper, Progress,
  SimpleGrid, Stack, Tabs, Text, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuShield, LuCircleCheck, LuTriangleAlert,
  LuX, LuBot, LuChevronDown, LuChevronUp, LuInfo, LuFileText, LuLink,
} from 'react-icons/lu';
import { useAppSelector } from '../../Redux/hooks';
import { fetchSectionDrafts } from '../../supabase/drafts';
import type { DBDraft } from '../../supabase/drafts';
import { fetchAIReport } from '../../supabase/aiReports';
import { runInternalScan } from '../../supabase/plagiarismEngine';
import type { PlagiarismReport, SourceMatch } from '../../supabase/plagiarismEngine';

// ── Commented out — restore when Gemini API key is ready ─────────────────────
// import { generateJSON, isGeminiConfigured, GeminiError } from '../../helper/gemini';
//
// function buildGeminiPrompt(sections: { id: string; title: string; content: string }[]): string {
//   return `You are an academic-integrity assistant helping a researcher review their own work.
// Analyse the sections below for similar phrasing, weak paraphrasing, and AI-like writing style.
// You do NOT have web search — base scores purely on linguistic characteristics.
// Respond with ONLY JSON:
// { "overallSimilarity": number, "overallAi": number, "summary": string,
//   "sections": [{ "sectionId": string, "sectionTitle": string, "similarity": number,
//                  "aiScore": number, "flags": string[], "notes": string }] }
// SECTIONS: ${sections.map(s => `\n--- ${s.title} ---\n${s.content.slice(0, 6000)}`).join('\n')}`;
// }
//
// Gemini scan (restore when API key is set):
// const runGeminiScan = async (sections, userId, saveReport) => {
//   if (!isGeminiConfigured()) {
//     notifications.show({ title: 'AI not configured', message: 'VITE_GEMINI_API_KEY missing.', color: 'red' });
//     return null;
//   }
//   const prompt = buildGeminiPrompt(sections);
//   const result = await generateJSON<PlagiarismReport>(prompt);
//   if (!isPlagiarismReport(result)) throw new GeminiError('Unexpected response shape.');
//   await saveReport(userId, 'plagiarism', { ...result, engine: 'gemini' });
//   return result;
// };

// ── Helpers ───────────────────────────────────────────────────────────────────

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
       : v <= 35 ? { label: 'Borderline', color: '#f08c00' }
       :           { label: 'Critical',   color: '#e03131' };
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

// ── Sources list ──────────────────────────────────────────────────────────────

function SourcesList({ sources }: { sources: SourceMatch[] }) {
  if (sources.length === 0) return (
    <Paper withBorder p="xl" radius="md" ta="center" bg="white">
      <LuLink size={32} color="#ced4da" style={{ margin: '0 auto 12px' }} />
      <Text size="sm" c="dimmed">No related academic sources found for the scanned content.</Text>
    </Paper>
  );
  return (
    <Stack gap="sm">
      <Paper withBorder p="sm" radius="md" style={{ background: '#f8f9ff', border: '1px dashed #748ffc' }}>
        <Group gap="xs" align="flex-start" wrap="nowrap">
          <LuInfo size={14} color="#748ffc" style={{ flexShrink: 0, marginTop: 2 }} />
          <Text size="xs" c="dimmed">
            Academically published papers matched via CrossRef (140M+ papers). Not evidence of copying —
            useful for confirming citations and checking undisclosed source overlap.
          </Text>
        </Group>
      </Paper>
      {sources.map((s, i) => (
        <Paper key={i} withBorder p="md" radius="md" bg="white">
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <ThemeIcon size={30} radius="md" color="brand" variant="light" style={{ flexShrink: 0, marginTop: 2 }}>
              <LuLink size={14} />
            </ThemeIcon>
            <Box style={{ minWidth: 0 }}>
              <Text size="sm" fw={600} lineClamp={2} mb={4}>{s.title}</Text>
              <Anchor size="xs" href={s.url} target="_blank" rel="noopener noreferrer"
                style={{ wordBreak: 'break-all' }}>
                {s.url}
              </Anchor>
            </Box>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}

// ── Draft picker ──────────────────────────────────────────────────────────────

function DraftPicker({ drafts, selected, onChange }: {
  drafts:   DBDraft[];
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
          <Text size="xs" c="dimmed">The engine analyses only the sections you select below.</Text>
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
                <Checkbox checked={checked} onChange={() => toggle(d.section_id)}
                  onClick={e => e.stopPropagation()} radius="sm" color="brand" />
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ResearchPlagiarism() {
  const user = useAppSelector(s => s.auth.user);

  const [loading,    setLoading]    = useState(true);
  const [scanning,   setScanning]   = useState(false);
  const [report,     setReport]     = useState<PlagiarismReport | null>(null);
  const [scannedAt,  setScannedAt]  = useState<string | null>(null);
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
    if (!user?.id || !user.institutionId) return;

    const chosen = drafts.filter(d => selected.has(d.section_id));
    if (chosen.length === 0) {
      notifications.show({ title: 'Nothing selected', message: 'Choose at least one section to scan.', color: 'orange' });
      return;
    }

    setScanning(true);
    try {
      const result = await runInternalScan({
        studentId:     user.id,
        institutionId: user.institutionId,
        sections: chosen.map(d => ({ id: d.section_id, title: d.section_title, content: d.content })),
      });

      setReport(result);
      setScannedAt(result.scannedAt ?? new Date().toISOString());
      notifications.show({ title: 'Scan complete', message: 'Integrity report updated.', color: 'green' });
    } catch (err) {
      notifications.show({
        title: 'Scan failed',
        message: err instanceof Error ? err.message : 'Could not complete the scan.',
        color: 'red',
      });
    } finally { setScanning(false); }
  };

  const overallSim = report?.overallSimilarity ?? 0;
  const overallAi  = report?.overallAi ?? 0;
  const simColor   = simRisk(overallSim).color;
  const aiColor    = aiRisk(overallAi).color;
  const sections   = report?.sections ?? [];
  const sources    = report?.sources   ?? [];

  return (
    <Box p="xl">
      <Group justify="space-between" align="flex-start" mb="xl" wrap="wrap" gap="sm">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Integrity Report</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Internal similarity check · AI detection · Academic source matching
          </Text>
        </Box>
        <Group gap="xs" align="center">
          {report?.engine && (
            <Badge size="xs" variant="light" color={report.engine === 'internal' ? 'teal' : 'violet'}>
              {report.engine === 'internal' ? 'Internal Engine' : 'Gemini AI'}
            </Badge>
          )}
          <Text size="xs" c="dimmed">
            {scannedAt ? `Last scanned ${new Date(scannedAt).toLocaleString()}` : 'Not scanned yet'}
          </Text>
        </Group>
      </Group>

      {/* Info banner */}
      <Paper withBorder p="sm" radius="md" mb="xl" style={{ background: '#f8f9ff', border: '1px dashed #748ffc' }}>
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <LuInfo size={14} color="#748ffc" style={{ flexShrink: 0, marginTop: 2 }} />
          <Text size="xs" c="dimmed">
            Powered by Cognita's internal engine: phrasing similarity is computed against submissions in your
            institution, AI detection uses an open-source classifier (HuggingFace), and related papers are
            retrieved from CrossRef. Use alongside formal checks before submitting.
          </Text>
        </Group>
      </Paper>

      {/* Draft picker + scan */}
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

      {/* Empty state */}
      {!loading && !report && (
        <Paper withBorder p="xl" radius="md" bg="white" ta="center">
          <ThemeIcon size={48} radius="xl" variant="light" color="brand" mx="auto" mb="md">
            <LuShield size={22} />
          </ThemeIcon>
          <Text fw={600} mb={4}>No integrity report yet</Text>
          <Text size="sm" c="dimmed">Select sections above and run a scan to get originality, AI detection, and source analysis.</Text>
        </Paper>
      )}

      {/* Results */}
      {!loading && report && (
        <>
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
                    {[
                      { label: '≤ 20%  Acceptable', color: '#2f9e44' },
                      { label: '21–35%  Borderline', color: '#f08c00' },
                      { label: '> 35%  Critical',    color: '#e03131' },
                    ].map(({ label, color }) => (
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
                  <Text size="xs" c="dimmed" mb="sm">Likelihood the writing reads as AI-generated or AI-paraphrased</Text>
                  <Stack gap={4}>
                    {[
                      { label: '≤ 20%  Low',      color: '#2f9e44' },
                      { label: '21–45%  Moderate', color: '#f08c00' },
                      { label: '> 45%  High',      color: '#e03131' },
                    ].map(({ label, color }) => (
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

          <Tabs defaultValue="similarity">
            <Tabs.List mb="lg">
              <Tabs.Tab value="similarity" leftSection={<LuShield size={14} />}>Originality</Tabs.Tab>
              <Tabs.Tab value="ai"         leftSection={<LuBot    size={14} />}>AI Writing Style</Tabs.Tab>
              <Tabs.Tab value="sources"    leftSection={<LuLink   size={14} />}>
                Academic Sources
                {sources.length > 0 && <Badge size="xs" ml={6} variant="light" color="brand">{sources.length}</Badge>}
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="similarity">
              <Paper withBorder p="sm" radius="md" mb="md" style={{ background: '#f8f9ff', border: '1px dashed #748ffc' }}>
                <Text size="xs" c="dimmed">
                  Scores above <strong>20%</strong> indicate phrasing overlap with other submissions.
                  Above <strong>35%</strong>, consider rewriting in your own analytical voice.
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
                          <Text size="xs" c="dimmed" mb="xs">{sec.notes}</Text>
                          {sec.sources && sec.sources.length > 0 && (
                            <Box mt="xs">
                              <Text size="xs" fw={600} c="dimmed" mb={4}>Related papers:</Text>
                              <Stack gap={4}>
                                {sec.sources.map((src, i) => (
                                  <Anchor key={i} size="xs" href={src.url} target="_blank" rel="noopener noreferrer" lineClamp={1}>
                                    {src.title}
                                  </Anchor>
                                ))}
                              </Stack>
                            </Box>
                          )}
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
                  Scores above <strong>20%</strong> indicate AI-like characteristics. Above <strong>45%</strong>, consider substantially rewriting.
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

            <Tabs.Panel value="sources">
              <SourcesList sources={sources} />
            </Tabs.Panel>
          </Tabs>

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
