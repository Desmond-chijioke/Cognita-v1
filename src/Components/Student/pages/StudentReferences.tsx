import { useEffect, useState } from 'react';
import {
  Box, Title, Text, Group, Button, Paper, TextInput,
  Table, Badge, ActionIcon, Modal, Textarea, Stack,
  Divider, Loader, Card, NumberInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  LuLink, LuFileText, LuShield, LuSearch, LuExternalLink,
  LuTrash, LuTriangleAlert, LuInfo, LuRefreshCw, LuPlus,
} from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import { fetchStudentSubmissions } from '../../../supabase/submissions';
import type { DBSubmission } from '../../../supabase/submissions';
import { fetchAIReport, saveAIReport } from '../../../supabase/aiReports';
import { generateEngineJSON, isEngineConfigured, AIEngineError } from '../../../helper/aiEngines';
import {
  fetchRefs, addRef, deleteRef,
  lookupDOI, parseBibtex,
} from '../../../supabase/references';
import type { DBReference } from '../../../supabase/references';
import ChapterPicker from '../ChapterPicker';

// ── AI usage Detection shape ─────────────────────────────────────────────────────

interface ReferenceFinding { severity: 'warning' | 'info'; message: string }
interface ReferencesReport { summary: string; findings: ReferenceFinding[] }

function isReferencesReport(v: unknown): v is ReferencesReport {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return typeof r.summary === 'string' && Array.isArray(r.findings);
}

function buildIntegrityPrompt(
  refs: DBReference[],
  sections: { id: string; title: string; content: string }[],
): string {
  return `You are a citation-integrity assistant helping a student cross-check their reference library against the chapters they've written.

REFERENCE LIBRARY:
${refs.map(r => `- "${r.title}" — ${r.authors.join(', ') || 'Unknown'} (${r.year ?? '?'})`).join('\n') || '(empty)'}

SUBMITTED CHAPTERS:
${sections.map(s => `\n--- ${s.title} ---\n${s.content.slice(0, 4000)}`).join('\n') || '(none)'}

Identify citation-integrity issues: uncited references, in-text citations without a matching entry, inconsistent formats.
Classify each as "warning" or "info". Write a one-sentence "summary" of overall citation health.

Respond with ONLY JSON:
{ "summary": string, "findings": [{ "severity": "warning" | "info", "message": string }] }`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAuthors(authors: string[]) {
  if (!authors.length) return '—';
  if (authors.length === 1) return authors[0];
  return `${authors[0]} et al.`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StudentReferences() {
  const user = useAppSelector(s => s.auth.user);

  // ── Refs state ────────────────────────────────────────────────────────────
  const [refs,       setRefs]       = useState<DBReference[]>([]);
  const [refsLoading, setRefsLoading] = useState(true);
  const [search,     setSearch]     = useState('');

  // ── Integrity check ───────────────────────────────────────────────────────
  const [showIntegrity,     setShowIntegrity]     = useState(false);
  const [integrityReport,   setIntegrityReport]   = useState<ReferencesReport | null>(null);
  const [integrityCheckedAt,setIntegrityCheckedAt]= useState<string | null>(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [submissions,       setSubmissions]       = useState<DBSubmission[]>([]);
  const [selected,          setSelected]          = useState<Set<string>>(new Set());

  // ── DOI modal ─────────────────────────────────────────────────────────────
  const [doiOpen, { open: openDoi, close: closeDoi }] = useDisclosure(false);
  const [doiInput,   setDoiInput]   = useState('');
  const [doiLoading, setDoiLoading] = useState(false);
  const [doiResult,  setDoiResult]  = useState<{ title: string; authors: string[]; year: number | null; journal: string | null; doi: string } | null>(null);
  const [doiError,   setDoiError]   = useState('');

  // ── BibTeX modal ──────────────────────────────────────────────────────────
  const [bibtexOpen, { open: openBibtex, close: closeBibtex }] = useDisclosure(false);
  const [bibtexInput,   setBibtexInput]   = useState('');
  const [bibtexParsed,  setBibtexParsed]  = useState<{ title: string; authors: string[]; year: number | null; journal: string | null; doi?: string | null }[]>([]);
  const [bibtexSaving,  setBibtexSaving]  = useState(false);

  // ── Manual add modal ──────────────────────────────────────────────────────
  const [manualOpen, { open: openManual, close: closeManual }] = useDisclosure(false);
  const [manTitle,   setManTitle]   = useState('');
  const [manAuthors, setManAuthors] = useState('');
  const [manYear,    setManYear]    = useState<number | string>('');
  const [manJournal, setManJournal] = useState('');
  const [manDoi,     setManDoi]     = useState('');
  const [manSaving,  setManSaving]  = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    setRefsLoading(true);
    Promise.all([
      fetchRefs(user.id),
      fetchAIReport<ReferencesReport>(user.id, 'references'),
      fetchStudentSubmissions(user.id),
    ]).then(([dbRefs, row, subs]) => {
      setRefs(dbRefs);
      if (row && isReferencesReport(row.data)) {
        setIntegrityReport(row.data);
        setIntegrityCheckedAt(row.created_at);
      }
      const withContent = subs.filter(s => s.content.trim().length > 0);
      setSubmissions(withContent);
      setSelected(new Set(withContent.map(s => s.section_id)));
    }).finally(() => setRefsLoading(false));
  }, [user?.id]);

  // ── DOI lookup ────────────────────────────────────────────────────────────
  const handleDoiLookup = async () => {
    if (!doiInput.trim()) return;
    setDoiLoading(true);
    setDoiResult(null);
    setDoiError('');
    try {
      const result = await lookupDOI(doiInput.trim());
      setDoiResult(result);
    } catch (err) {
      setDoiError(err instanceof Error ? err.message : 'Lookup failed.');
    } finally {
      setDoiLoading(false);
    }
  };

  const handleAddFromDoi = async () => {
    if (!doiResult || !user?.id) return;
    const saved = await addRef(user.id, user.institutionId ?? '', {
      title:   doiResult.title,
      authors: doiResult.authors,
      year:    doiResult.year,
      journal: doiResult.journal,
      doi:     doiResult.doi,
      tags:    [],
      cited:   false,
    });
    if (saved) {
      setRefs(prev => [...prev, saved]);
      notifications.show({ message: 'Reference added to library.', color: 'teal' });
    }
    closeDoi();
    setDoiInput('');
    setDoiResult(null);
  };

  // ── BibTeX parse + import ─────────────────────────────────────────────────
  const handleParseBibtex = () => {
    const parsed = parseBibtex(bibtexInput);
    setBibtexParsed(parsed);
    if (!parsed.length) {
      notifications.show({ message: 'No valid BibTeX entries found. Check the format and try again.', color: 'orange' });
    }
  };

  const handleImportBibtex = async () => {
    if (!bibtexParsed.length || !user?.id) return;
    setBibtexSaving(true);
    let count = 0;
    for (const ref of bibtexParsed) {
      const saved = await addRef(user.id, user.institutionId ?? '', { ...ref, doi: ref.doi ?? null, tags: [], cited: false });
      if (saved) { setRefs(prev => [...prev, saved]); count++; }
    }
    setBibtexSaving(false);
    notifications.show({ message: `${count} reference${count !== 1 ? 's' : ''} imported.`, color: 'teal' });
    closeBibtex();
    setBibtexInput('');
    setBibtexParsed([]);
  };

  // ── Manual add ────────────────────────────────────────────────────────────
  const handleManualAdd = async () => {
    if (!manTitle.trim() || !user?.id) return;
    setManSaving(true);
    const saved = await addRef(user.id, user.institutionId ?? '', {
      title:   manTitle.trim(),
      authors: manAuthors.split(',').map(a => a.trim()).filter(Boolean),
      year:    manYear ? Number(manYear) : null,
      journal: manJournal.trim() || null,
      doi:     manDoi.trim() || null,
      tags:    [],
      cited:   false,
    });
    if (saved) {
      setRefs(prev => [...prev, saved]);
      notifications.show({ message: 'Reference added.', color: 'teal' });
    }
    setManSaving(false);
    closeManual();
    setManTitle(''); setManAuthors(''); setManYear(''); setManJournal(''); setManDoi('');
  };

  // ── Remove ────────────────────────────────────────────────────────────────
  const handleRemove = async (id: string) => {
    setRefs(prev => prev.filter(r => r.id !== id));
    await deleteRef(id);
    notifications.show({ message: 'Reference removed.', color: 'red' });
  };

  // ── Integrity check ───────────────────────────────────────────────────────
  const runIntegrityCheck = async () => {
    if (!user?.id) return;
    if (!isEngineConfigured('claude')) {
      notifications.show({ title: 'AI not configured', message: 'VITE_CLAUDE_API_KEY is missing.', color: 'red' });
      return;
    }
    if (!refs.length) {
      notifications.show({ title: 'Library empty', message: 'Add references before running an integrity check.', color: 'orange' });
      return;
    }
    const chosen = submissions.filter(s => selected.has(s.section_id));
    if (!chosen.length) {
      notifications.show({ title: 'Nothing selected', message: 'Select at least one chapter.', color: 'orange' });
      return;
    }
    setCheckingIntegrity(true);
    try {
      const prompt = buildIntegrityPrompt(refs, chosen.map(s => ({ id: s.section_id, title: s.section_title, content: s.content })));
      const result = await generateEngineJSON<ReferencesReport>(prompt, 'claude');
      if (!isReferencesReport(result)) throw new AIEngineError('Unexpected response shape.');
      setIntegrityReport(result);
      const now = new Date().toISOString();
      setIntegrityCheckedAt(now);
      await saveAIReport(user.id, 'references', result);
      notifications.show({ title: 'Integrity check complete', message: 'All references have been reviewed.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Check failed', message: err instanceof Error ? err.message : 'Error', color: 'red' });
    } finally {
      setCheckingIntegrity(false);
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = refs.filter(r => {
    const q = search.toLowerCase();
    return r.title.toLowerCase().includes(q) || r.authors.some(a => a.toLowerCase().includes(q));
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box p="xl">
      {/* Header */}
      <Group justify="space-between" align="flex-start" mb="xl">
        <Box>
          <Title order={2} mb={4}>References</Title>
          <Text c="dimmed" size="sm">
            Manage your citation library. References added here appear in the editor's Citation tab.
          </Text>
        </Box>
        <Group gap="sm">
          <Button leftSection={<LuLink size={16} />} variant="light" color="brand" onClick={openDoi}>
            Add via DOI
          </Button>
          <Button leftSection={<LuFileText size={16} />} variant="light" onClick={openBibtex}>
            Import BibTeX
          </Button>
          <Button leftSection={<LuPlus size={16} />} variant="light" color="teal" onClick={openManual}>
            Add Manually
          </Button>
          <Button leftSection={<LuShield size={16} />} variant="outline" onClick={() => setShowIntegrity(v => !v)}>
            Integrity Check
          </Button>
        </Group>
      </Group>

      {/* Integrity panel */}
      {showIntegrity && (
        <Paper withBorder p="md" mb="lg" style={{ borderLeft: '4px solid #fd7e14' }}>
          <Stack gap="sm">
            <Box>
              <Text size="sm" fw={600}>AI Citation Integrity Check</Text>
              <Text size="xs" c="dimmed">
                Gemini cross-checks your reference library against selected chapters — flagging uncited entries and in-text citations with no matching reference.
              </Text>
            </Box>
            <ChapterPicker submissions={submissions} selected={selected} onChange={setSelected}
              title="Choose chapters to cross-check"
              description="Gemini will compare your reference library against the chapters selected here." />
            <Group justify="flex-end">
              <Button size="xs" variant="light" color="brand"
                leftSection={checkingIntegrity ? <Loader size={12} color="currentColor" /> : <LuRefreshCw size={14} />}
                onClick={runIntegrityCheck} loading={checkingIntegrity}
                disabled={!submissions.length || !selected.size || !refs.length}>
                {integrityReport ? 'Re-run Check' : 'Run Check'}
              </Button>
            </Group>
            {integrityCheckedAt && (
              <Text size="xs" c="dimmed">Last checked {new Date(integrityCheckedAt).toLocaleString()}</Text>
            )}
            {!integrityReport ? (
              <Text size="xs" c="dimmed" fs="italic">
                {checkingIntegrity ? 'Analysing…'
                  : !refs.length ? 'Add references first.'
                  : 'Select chapters and click "Run Check".'}
              </Text>
            ) : (
              <>
                <Text size="sm">{integrityReport.summary}</Text>
                {!integrityReport.findings.length ? (
                  <Group gap="xs">
                    <LuShield size={16} color="#2f9e44" />
                    <Text size="sm" fw={500}>No citation-integrity issues found.</Text>
                  </Group>
                ) : (
                  <Stack gap="xs">
                    {integrityReport.findings.map((f, i) => {
                      const Icon = f.severity === 'warning' ? LuTriangleAlert : LuInfo;
                      const color = f.severity === 'warning' ? '#fd7e14' : '#3b5bdb';
                      return (
                        <Group key={i} gap="xs" align="flex-start" wrap="nowrap">
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
        <TextInput placeholder="Search by title or author…" leftSection={<LuSearch size={16} />}
          value={search} onChange={e => setSearch(e.currentTarget.value)} style={{ width: 360 }} />
        <Text size="xs" c="dimmed">{refs.length} references</Text>
      </Group>

      {/* Table */}
      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        {refsLoading ? (
          <Box ta="center" py="xl"><Loader size="sm" color="brand" /></Box>
        ) : (
          <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>Title</Table.Th>
                <Table.Th>Authors</Table.Th>
                <Table.Th>Year</Table.Th>
                <Table.Th>Journal / Conference</Table.Th>
                <Table.Th>DOI</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {!filtered.length ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed" size="sm" ta="center" py="xl">
                      {!refs.length
                        ? 'No references yet — add one via DOI, BibTeX, or manually.'
                        : 'No references match your search.'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filtered.map((ref, i) => (
                  <Table.Tr key={ref.id}>
                    <Table.Td><Text size="xs" c="dimmed">{i + 1}</Text></Table.Td>
                    <Table.Td style={{ maxWidth: 280 }}>
                      <Text size="sm" fw={500} lineClamp={2}>{ref.title}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">{formatAuthors(ref.authors)}</Text>
                    </Table.Td>
                    <Table.Td>
                      {ref.year ? <Badge variant="light" size="xs">{ref.year}</Badge> : <Text size="xs" c="dimmed">—</Text>}
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed" lineClamp={1} style={{ maxWidth: 180 }}>
                        {ref.journal ?? '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {ref.doi ? (
                        <ActionIcon size="xs" variant="subtle" component="a"
                          href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer">
                          <LuExternalLink size={14} />
                        </ActionIcon>
                      ) : <Text size="xs" c="dimmed">—</Text>}
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon size="xs" variant="subtle" color="red" onClick={() => handleRemove(ref.id)}>
                        <LuTrash size={14} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      {/* ── DOI Modal ─────────────────────────────────────────────────────── */}
      <Modal opened={doiOpen} onClose={closeDoi} title="Add Reference via DOI" size="md">
        <Stack gap="md">
          <TextInput label="DOI" placeholder="10.1000/xyz123 or full URL"
            value={doiInput} onChange={e => setDoiInput(e.currentTarget.value)}
            onKeyDown={e => e.key === 'Enter' && handleDoiLookup()} />
          {doiError && <Text size="sm" c="red">{doiError}</Text>}
          <Button leftSection={doiLoading ? <Loader size={14} color="white" /> : <LuSearch size={16} />}
            color="brand" onClick={handleDoiLookup} disabled={doiLoading || !doiInput.trim()}>
            {doiLoading ? 'Looking up…' : 'Look Up'}
          </Button>
          {doiResult && (
            <>
              <Divider />
              <Card withBorder radius="md" p="md">
                <Text size="sm" fw={600} mb={4}>{doiResult.title}</Text>
                <Text size="xs" c="dimmed" mb={2}>{doiResult.authors.join(', ') || '—'}</Text>
                <Text size="xs" c="dimmed">{doiResult.journal ?? ''} {doiResult.year ? `· ${doiResult.year}` : ''}</Text>
              </Card>
              <Button color="brand" onClick={handleAddFromDoi}>Add to Library</Button>
            </>
          )}
        </Stack>
      </Modal>

      {/* ── BibTeX Modal ──────────────────────────────────────────────────── */}
      <Modal opened={bibtexOpen} onClose={closeBibtex} title="Import BibTeX" size="lg">
        <Stack gap="md">
          <Textarea rows={8} placeholder={'Paste BibTeX entries…\n@article{mcmahan2017,\n  title={...},\n  author={...},\n  year={2017},\n  journal={...}\n}'}
            value={bibtexInput} onChange={e => setBibtexInput(e.currentTarget.value)} />
          <Group gap="sm">
            <Button variant="light" onClick={handleParseBibtex} disabled={!bibtexInput.trim()}>
              Preview ({bibtexParsed.length} found)
            </Button>
            {bibtexParsed.length > 0 && (
              <Button color="brand" loading={bibtexSaving} onClick={handleImportBibtex}>
                Import {bibtexParsed.length} Reference{bibtexParsed.length !== 1 ? 's' : ''}
              </Button>
            )}
          </Group>
          {bibtexParsed.length > 0 && (
            <Stack gap="xs">
              {bibtexParsed.map((r, i) => (
                <Card key={i} withBorder radius="sm" p="sm">
                  <Text size="sm" fw={500}>{r.title}</Text>
                  <Text size="xs" c="dimmed">{r.authors.join(', ')} {r.year ? `· ${r.year}` : ''}</Text>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </Modal>

      {/* ── Manual Add Modal ──────────────────────────────────────────────── */}
      <Modal opened={manualOpen} onClose={closeManual} title="Add Reference Manually" size="md">
        <Stack gap="md">
          <TextInput label="Title *" placeholder="Enter the full title of the work"
            value={manTitle} onChange={e => setManTitle(e.currentTarget.value)} required />
          <TextInput label="Authors" placeholder="Smith, J., Jones, A. (comma-separated)"
            value={manAuthors} onChange={e => setManAuthors(e.currentTarget.value)} />
          <NumberInput label="Year" placeholder="2024" min={1000} max={2100}
            value={manYear} onChange={setManYear} />
          <TextInput label="Journal / Conference / Publisher"
            placeholder="IEEE Transactions on Neural Networks…"
            value={manJournal} onChange={e => setManJournal(e.currentTarget.value)} />
          <TextInput label="DOI (optional)" placeholder="10.1000/xyz123"
            value={manDoi} onChange={e => setManDoi(e.currentTarget.value)} />
          <Button color="brand" loading={manSaving}
            disabled={!manTitle.trim()} onClick={handleManualAdd}>
            Add to Library
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}
