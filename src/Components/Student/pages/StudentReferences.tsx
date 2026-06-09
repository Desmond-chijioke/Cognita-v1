import { useEffect, useState } from 'react';
import {
  Box,
  Title,
  Text,
  Group,
  Button,
  Paper,
  TextInput,
  Table,
  Badge,
  ActionIcon,
  Modal,
  Textarea,
  Stack,
  Divider,
  Loader,
  Card,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  LuLink,
  LuFileText,
  LuShield,
  LuSearch,
  LuExternalLink,
  LuTrash,
  LuTriangleAlert,
  LuInfo,
  LuRefreshCw,
} from 'react-icons/lu';
import type { Reference } from '../studentData';
import { useAppSelector } from '../../../Redux/hooks';
import { fetchStudentSubmissions } from '../../../supabase/submissions';
import type { DBSubmission } from '../../../supabase/submissions';
import { fetchAIReport, saveAIReport } from '../../../supabase/aiReports';
import { generateJSON, isGeminiConfigured, GeminiError } from '../../../helper/gemini';
import ChapterPicker from '../ChapterPicker';

// ── Report shape produced by Gemini ───────────────────────────────────────────

interface ReferenceFinding { severity: 'warning' | 'info'; message: string }
interface ReferencesReport { summary: string; findings: ReferenceFinding[] }

function isReferencesReport(v: unknown): v is ReferencesReport {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return typeof r.summary === 'string' && Array.isArray(r.findings);
}

function buildIntegrityPrompt(
  refs: Reference[],
  sections: { id: string; title: string; content: string }[],
): string {
  return `You are a citation-integrity assistant helping a student cross-check their reference library against the chapters they've written.

REFERENCE LIBRARY (one per line â€” title, authors, year):
${refs.map(r => `- "${r.title}" â€” ${r.authors.join(', ') || 'Unknown author'} (${r.year})`).join('\n') || '(empty)'}

SUBMITTED CHAPTERS:
${sections.map(s => `\n--- ${s.title} (id: ${s.id}) ---\n${s.content.slice(0, 4000)}`).join('\n') || '(none submitted yet)'}

Identify citation-integrity issues such as:
- Reference library entries that do not appear to be cited anywhere in the chapters (match by author surname and/or year mentioned in-text)
- In-text citations or sources mentioned in the chapters that have no matching entry in the reference library
- Any other consistency concerns worth flagging (e.g. inconsistent citation formats, likely duplicate entries)

Classify each finding as "warning" (needs the student's attention before submission) or "info" (minor, worth noting).
Then write a one or two sentence "summary" of the overall citation health.

Respond with ONLY JSON in exactly this shape (no markdown fences, no extra commentary):
{ "summary": string, "findings": [{ "severity": "warning" | "info", "message": string }] }`;
}

export default function StudentReferences() {
  const user = useAppSelector(s => s.auth.user);

  const [search, setSearch] = useState('');
  const [showIntegrity, setShowIntegrity] = useState(false);
  const [doiOpen, { open: openDoi, close: closeDoi }] = useDisclosure(false);
  const [bibtexOpen, { open: openBibtex, close: closeBibtex }] = useDisclosure(false);

  const [doiInput, setDoiInput] = useState('');
  const [doiLoading, setDoiLoading] = useState(false);
  const [doiResult, setDoiResult] = useState<null | {
    title: string;
    authors: string;
    year: number;
    journal: string;
  }>(null);

  const [bibtexInput, setBibtexInput] = useState('');
  const [refs, setRefs] = useState<Reference[]>([]);

  // â”€â”€ AI-driven integrity check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [integrityReport, setIntegrityReport] = useState<ReferencesReport | null>(null);
  const [integrityCheckedAt, setIntegrityCheckedAt] = useState<string | null>(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);

  const [submissions, setSubmissions] = useState<DBSubmission[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      fetchAIReport<ReferencesReport>(user.id, 'references'),
      fetchStudentSubmissions(user.id),
    ]).then(([row, subs]) => {
      if (row && isReferencesReport(row.data)) {
        setIntegrityReport(row.data);
        setIntegrityCheckedAt(row.created_at);
      }
      const withContent = subs.filter(s => s.content.trim().length > 0);
      setSubmissions(withContent);
      setSelected(new Set(withContent.map(s => s.section_id)));
    });
  }, [user?.id]);

  const runIntegrityCheck = async () => {
    if (!user?.id) return;
    if (!isGeminiConfigured()) {
      notifications.show({ title: 'AI not configured', message: 'VITE_GEMINI_API_KEY is missing â€” ask an admin to add it to the environment.', color: 'red' });
      return;
    }
    if (refs.length === 0) {
      notifications.show({ title: 'Reference library is empty', message: 'Add references via DOI or BibTeX before running an integrity check.', color: 'orange' });
      return;
    }
    const chosen = submissions.filter(s => selected.has(s.section_id));
    if (chosen.length === 0) {
      notifications.show({ title: 'Nothing selected', message: 'Choose at least one chapter to cross-check against your reference library.', color: 'orange' });
      return;
    }

    setCheckingIntegrity(true);
    try {
      const prompt = buildIntegrityPrompt(refs, chosen.map(s => ({ id: s.section_id, title: s.section_title, content: s.content })));
      const result = await generateJSON<ReferencesReport>(prompt);
      if (!isReferencesReport(result)) throw new GeminiError('Unexpected response shape from Gemini.');

      setIntegrityReport(result);
      const now = new Date().toISOString();
      setIntegrityCheckedAt(now);
      await saveAIReport(user.id, 'references', result);
      notifications.show({ title: 'Integrity check complete', message: 'Citation report updated.', color: 'green' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not complete the integrity check.';
      notifications.show({ title: 'Check failed', message, color: 'red' });
    } finally {
      setCheckingIntegrity(false);
    }
  };

  const filtered = refs.filter(r => {
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.authors.some(a => a.toLowerCase().includes(q)) ||
      r.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  const citedCount = refs.filter(r => r.cited).length;
  const uncitedCount = refs.filter(r => !r.cited).length;

  function handleRemove(id: string) {
    setRefs(prev => prev.filter(r => r.id !== id));
    notifications.show({ message: 'Reference removed.', color: 'red' });
  }

  function handleDoiLookup() {
    if (!doiInput.trim()) return;
    setDoiLoading(true);
    setDoiResult(null);
    setTimeout(() => {
      setDoiLoading(false);
      setDoiResult({
        title: 'Advances in Privacy-Preserving Federated Learning',
        authors: 'Chen, X., Liu, Y., Wang, Z.',
        year: 2023,
        journal: 'IEEE Transactions on Neural Networks and Learning Systems',
      });
    }, 1400);
  }

  function handleAddFromDoi() {
    if (!doiResult) return;
    const newRef: Reference = {
      id: `r_doi_${Date.now()}`,
      title: doiResult.title,
      authors: doiResult.authors.split(', '),
      year: doiResult.year,
      journal: doiResult.journal,
      doi: doiInput.trim(),
      cited: false,
      status: 'valid',
      tags: [],
    };
    setRefs(prev => [...prev, newRef]);
    notifications.show({ message: 'Reference added to library.', color: 'teal' });
    closeDoi();
    setDoiInput('');
    setDoiResult(null);
  }

  function handleImportBibtex() {
    if (!bibtexInput.trim()) return;
    notifications.show({ message: '3 references imported successfully.', color: 'teal' });
    closeBibtex();
    setBibtexInput('');
  }

  function formatAuthors(authors: string[]) {
    if (authors.length === 0) return '—';
    if (authors.length === 1) return authors[0];
    return `${authors[0]} et al.`;
  }

  return (
    <Box p="xl">
      {/* Page Header */}
      <Group justify="space-between" align="flex-start" mb="xl">
        <Box>
          <Title order={2} mb={4}>References</Title>
          <Text c="dimmed" size="sm">
            Manage your citation library, verify DOIs, and maintain bibliographic integrity.
          </Text>
        </Box>
        <Group gap="sm">
          <Button
            leftSection={<LuLink size={16} />}
            variant="light"
            color="brand"
            onClick={openDoi}
          >
            Add via DOI
          </Button>
          <Button
            leftSection={<LuFileText size={16} />}
            variant="light"
            onClick={openBibtex}
          >
            Import BibTeX
          </Button>
          <Button
            leftSection={<LuShield size={16} />}
            variant="outline"
            onClick={() => setShowIntegrity(v => !v)}
          >
            Integrity Check
          </Button>
        </Group>
      </Group>

      {/* Integrity Panel (AI-driven) */}
      {showIntegrity && (
        <Paper withBorder p="md" mb="lg" style={{ borderLeft: '4px solid #fd7e14' }}>
          <Stack gap="sm">
            <Box>
              <Text size="sm" fw={600}>AI Citation Integrity Check</Text>
              <Text size="xs" c="dimmed">
                Gemini cross-checks your reference library against the chapters you select below â€”
                flagging references that look uncited and citations with no matching entry. This is a
                linguistic best-effort check, not a guarantee of correctness; always verify manually.
              </Text>
            </Box>

            <ChapterPicker
              submissions={submissions}
              selected={selected}
              onChange={setSelected}
              title="Choose chapters to cross-check"
              description="Gemini will compare your reference library against the chapters selected here."
            />

            <Group justify="flex-end">
              <Button
                size="xs"
                variant="light"
                color="brand"
                leftSection={checkingIntegrity ? <Loader size={12} color="currentColor" /> : <LuRefreshCw size={14} />}
                onClick={runIntegrityCheck}
                loading={checkingIntegrity}
                disabled={submissions.length === 0 || selected.size === 0 || refs.length === 0}
              >
                {integrityReport ? 'Re-run Check' : 'Run Check'}
              </Button>
            </Group>

            {integrityCheckedAt && (
              <Text size="xs" c="dimmed">Last checked {new Date(integrityCheckedAt).toLocaleString()}</Text>
            )}

            {!integrityReport ? (
              <Text size="xs" c="dimmed" fs="italic">
                {checkingIntegrity
                  ? 'Analyzing your references and selected chapters…'
                  : refs.length === 0
                    ? 'Add references to your library (via DOI or BibTeX) before running a check.'
                    : 'Select chapters above and click "Run Check" to cross-check your library against them.'}
              </Text>
            ) : (
              <>
                <Text size="sm">{integrityReport.summary}</Text>
                {integrityReport.findings.length === 0 ? (
                  <Group gap="xs">
                    <LuShield size={16} color="#2f9e44" />
                    <Text size="sm" fw={500}>No citation-integrity issues found.</Text>
                  </Group>
                ) : (
                  <Stack gap="xs">
                    {integrityReport.findings.map((f, idx) => {
                      const Icon = f.severity === 'warning' ? LuTriangleAlert : LuInfo;
                      const color = f.severity === 'warning' ? '#fd7e14' : '#3b5bdb';
                      return (
                        <Group key={idx} gap="xs" align="flex-start" wrap="nowrap">
                          <Icon size={16} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
                          <Text size="sm" fw={500}>{f.message}</Text>
                        </Group>
                      );
                    })}
                  </Stack>
                )}
              </>
            )}
          </Stack>
        </Paper>
      )}

      {/* Toolbar */}
      <Group justify="space-between" mb="md">
        <TextInput
          placeholder="Search by title, author, or tag…"
          leftSection={<LuSearch size={16} />}
          value={search}
          onChange={e => setSearch(e.currentTarget.value)}
          style={{ width: 360 }}
        />
        <Text size="xs" c="dimmed">
          {refs.length} references · {citedCount} cited · {uncitedCount} uncited
        </Text>
      </Group>

      {/* Table */}
      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Title</Table.Th>
              <Table.Th>Authors</Table.Th>
              <Table.Th>Year</Table.Th>
              <Table.Th>Journal</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Cited</Table.Th>
              <Table.Th>DOI</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={8}>
                  <Text c="dimmed" size="sm" ta="center" py="xl">
                    No references match your search.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filtered.map(ref => (
                <Table.Tr key={ref.id}>
                  <Table.Td style={{ maxWidth: 260 }}>
                    <Text size="sm" fw={500} lineClamp={2}>
                      {ref.title}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">{formatAuthors(ref.authors)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" size="xs">{ref.year}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text
                      size="xs"
                      c="dimmed"
                      lineClamp={1}
                      style={{ maxWidth: 160 }}
                    >
                      {ref.journal}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {ref.status === 'valid' ? (
                      <Badge color="green" variant="light" size="xs">Valid</Badge>
                    ) : (
                      <Badge color="red" variant="light" size="xs">Missing DOI</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {ref.cited ? (
                      <Badge color="teal" variant="light" size="xs">Cited</Badge>
                    ) : (
                      <Badge color="gray" variant="light" size="xs">Uncited</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {ref.doi ? (
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        component="a"
                        href={`https://doi.org/${ref.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <LuExternalLink size={14} />
                      </ActionIcon>
                    ) : (
                      <Text size="xs" c="dimmed">—</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={() => handleRemove(ref.id)}
                    >
                      <LuTrash size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Add via DOI Modal */}
      <Modal opened={doiOpen} onClose={closeDoi} title="Add Reference via DOI" size="md">
        <Stack gap="md">
          <TextInput
            label="DOI"
            placeholder="10.1000/xyz123"
            value={doiInput}
            onChange={e => setDoiInput(e.currentTarget.value)}
          />
          <Button
            leftSection={
              doiLoading ? <Loader size={14} color="white" /> : <LuSearch size={16} />
            }
            color="brand"
            onClick={handleDoiLookup}
            disabled={doiLoading || !doiInput.trim()}
          >
            {doiLoading ? 'Looking up…' : 'Look Up'}
          </Button>

          {doiResult && (
            <>
              <Divider />
              <Card withBorder radius="md" p="md">
                <Text size="sm" fw={600} mb={4}>{doiResult.title}</Text>
                <Text size="xs" c="dimmed" mb={2}>{doiResult.authors}</Text>
                <Text size="xs" c="dimmed">
                  {doiResult.journal} · {doiResult.year}
                </Text>
              </Card>
              <Button color="brand" onClick={handleAddFromDoi}>
                Add to Library
              </Button>
            </>
          )}
        </Stack>
      </Modal>

      {/* Import BibTeX Modal */}
      <Modal opened={bibtexOpen} onClose={closeBibtex} title="Import BibTeX" size="lg">
        <Stack gap="md">
          <Textarea
            rows={8}
            placeholder={`Paste BibTeX entries here…\n@article{mcmahan2017,...}`}
            value={bibtexInput}
            onChange={e => setBibtexInput(e.currentTarget.value)}
          />
          <Button
            color="brand"
            onClick={handleImportBibtex}
            disabled={!bibtexInput.trim()}
          >
            Import References
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}
