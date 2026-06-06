import { useEffect, useMemo, useState } from 'react';
import {
  Badge, Box, Button, Checkbox, Divider, Group, Loader, Paper, Progress,
  Radio, SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuFileText, LuFile, LuCode, LuDownload, LuCircleCheck,
  LuClock, LuSettings, LuLock, LuCircleCheckBig, LuClock3, LuCircleAlert,
} from 'react-icons/lu';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
import { useAppSelector } from '../../../Redux/hooks';
import { fetchStudentSubmissions } from '../../../supabase/submissions';
import type { DBSubmission } from '../../../supabase/submissions';
import type { ExportFormat, CitationStyle, ExportRecord } from '../studentData';

// ── Constants ──────────────────────────────────────────────────────────────────

const FORMATS: { id: ExportFormat; label: string; ext: string; icon: React.ElementType; color: string }[] = [
  { id: 'docx',  label: 'Microsoft Word', ext: '.docx', icon: LuFileText, color: '#2b6cb0' },
  { id: 'pdf',   label: 'PDF Document',   ext: '.pdf',  icon: LuFile,     color: '#e03131' },
  { id: 'latex', label: 'LaTeX Source',   ext: '.tex',  icon: LuCode,     color: '#2f9e44' },
];

const COMPILE_STEPS = ['Compiling chapters…', 'Formatting citations…', 'Embedding figures…', 'Finalising output…'];

const STATUS_META: Record<string, { label: string; color: string }> = {
  approved:         { label: 'Approved',       color: 'green'  },
  pending:          { label: 'Pending Review', color: 'yellow' },
  'needs-revision': { label: 'Needs Revision', color: 'red'    },
};

const FONT = 'Times New Roman';

// ── Document builders ──────────────────────────────────────────────────────────

function buildPDF(
  chapters: DBSubmission[],
  meta: { name: string; includeCover: boolean; includeToc: boolean },
  fileName: string,
) {
  const doc    = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();
  const mL = 25.4, mR = 25.4, mT = 25.4, mB = 25.4;
  const cW = pageW - mL - mR;
  let y = mT;

  const lh = (pt: number, spacing = 1.8) => pt * 0.3528 * spacing;

  const checkPage = (needed: number) => {
    if (y + needed > pageH - mB) { doc.addPage(); y = mT; }
  };

  const writePara = (text: string, pt: number, bold = false, align: 'left' | 'center' = 'left') => {
    doc.setFont('times', bold ? 'bold' : 'normal');
    doc.setFontSize(pt);
    const lines = doc.splitTextToSize(text, cW);
    const lineHeight = lh(pt);
    lines.forEach((line: string) => {
      checkPage(lineHeight);
      doc.text(line, align === 'center' ? pageW / 2 : mL, y, { align });
      y += lineHeight;
    });
  };

  // Cover page
  if (meta.includeCover) {
    writePara('THESIS', 28, true, 'center');
    y += 8;
    writePara(meta.name, 18, false, 'center');
    y += 4;
    writePara(
      new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }),
      12, false, 'center',
    );
    doc.addPage();
    y = mT;
  }

  // Table of contents
  if (meta.includeToc) {
    writePara('Table of Contents', 16, true);
    y += 4;
    chapters.forEach((ch, i) => {
      writePara(`${i + 1}.  ${ch.section_title}`, 12);
    });
    doc.addPage();
    y = mT;
  }

  // Chapters
  chapters.forEach((ch, idx) => {
    if (idx > 0) { doc.addPage(); y = mT; }

    writePara(ch.section_title, 16, true);
    y += 5;

    ch.content.split(/\n{2,}/).forEach(para => {
      if (!para.trim()) return;
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(para.trim(), cW);
      lines.forEach((line: string) => {
        checkPage(lh(12));
        doc.text(line, mL, y);
        y += lh(12);
      });
      y += lh(12) * 0.5;
    });
  });

  doc.save(fileName);
}

async function buildDocx(
  chapters: DBSubmission[],
  meta: { name: string; includeCover: boolean; includeToc: boolean },
): Promise<Blob> {
  const sz  = 24;   // 12pt in half-points
  const hSz = 32;   // 16pt

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [];

  if (meta.includeCover) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 3600, after: 400 },
        children: [new TextRun({ text: 'THESIS', bold: true, size: 56, font: FONT })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: meta.name, size: 36, font: FONT })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({
          text: new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }),
          size: sz, font: FONT,
        })],
      }),
      new Paragraph({ children: [new PageBreak()] }),
    );
  }

  if (meta.includeToc) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Table of Contents', bold: true, size: hSz, font: FONT })],
      }),
    );
    chapters.forEach((ch, i) => {
      children.push(new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: `${i + 1}.  ${ch.section_title}`, size: sz, font: FONT })],
      }));
    });
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  chapters.forEach((ch, idx) => {
    if (idx > 0) children.push(new Paragraph({ children: [new PageBreak()] }));

    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 240 },
      children: [new TextRun({ text: ch.section_title, bold: true, size: hSz, font: FONT })],
    }));

    ch.content.split(/\n{2,}/).forEach(para => {
      if (!para.trim()) return;
      children.push(new Paragraph({
        spacing: { line: 480, after: 200 },
        children: [new TextRun({ text: para.trim(), size: sz, font: FONT })],
      }));
    });
  });

  const wordDoc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT, size: sz } },
      },
    },
    sections: [{ children }],
  });

  return Packer.toBlob(wordDoc);
}

function buildLatex(
  chapters: DBSubmission[],
  meta: { name: string; includeCover: boolean; includeToc: boolean; citation: CitationStyle },
): string {
  const date   = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const esc    = (s: string) => s.replace(/[&%$#_{}~^\\]/g, m => `\\${m}`);
  const citeLib =
    meta.citation === 'ieee'    ? '\\usepackage[style=ieee]{biblatex}' :
    meta.citation === 'chicago' ? '\\usepackage[style=chicago-authordate]{biblatex}' :
                                  '\\usepackage[style=apa]{biblatex}';

  const lines = [
    '\\documentclass[12pt,a4paper]{report}',
    '\\usepackage[utf8]{inputenc}',
    '\\usepackage[T1]{fontenc}',
    '\\usepackage{mathptmx}',   // Times New Roman
    '\\usepackage{geometry}',
    '\\geometry{margin=2.5cm}',
    '\\usepackage{setspace}',
    '\\doublespacing',
    citeLib,
    '',
    `\\title{${esc(meta.name)} --- Thesis}`,
    `\\author{${esc(meta.name)}}`,
    `\\date{${esc(date)}}`,
    '',
    '\\begin{document}',
    '',
  ];

  if (meta.includeCover) lines.push('\\maketitle', '');
  if (meta.includeToc)   lines.push('\\tableofcontents', '\\newpage', '');

  chapters.forEach(ch => {
    const isChap = /^chapter\s*\d+/i.test(ch.section_title);
    if (isChap) {
      const heading = ch.section_title.replace(/^chapter\s*\d+:\s*/i, '').trim();
      lines.push(`\\chapter{${esc(heading)}}`);
    } else {
      lines.push(`\\chapter*{${esc(ch.section_title)}}`);
    }
    lines.push('');
    ch.content.split(/\n{2,}/).forEach(para => {
      if (para.trim()) lines.push(esc(para.trim()), '');
    });
  });

  lines.push('\\end{document}');
  return lines.join('\n');
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function sortByTitle(a: DBSubmission, b: DBSubmission): number {
  return a.section_title.localeCompare(b.section_title);
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function StudentExport() {
  const authUser = useAppSelector(s => s.auth.user);

  // ── Supabase data ──────────────────────────────────────────────────────────
  const [submissions, setSubmissions] = useState<DBSubmission[]>([]);
  const [sbLoading,   setSbLoading]   = useState(false);

  const approved = useMemo(() => submissions.filter(s => s.status === 'approved').sort(sortByTitle), [submissions]);
  const locked   = useMemo(() => submissions.filter(s => s.status !== 'approved').sort(sortByTitle),  [submissions]);

  useEffect(() => {
    if (!authUser?.id) return;
    setSbLoading(true);
    fetchStudentSubmissions(authUser.id)
      .then(setSubmissions)
      .finally(() => setSbLoading(false));
  }, [authUser?.id]);

  // ── Chapter selection ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedIds(new Set(approved.map(s => s.id)));
  }, [approved]);

  const selectedChapters = useMemo(
    () => approved.filter(s => selectedIds.has(s.id)),
    [approved, selectedIds],
  );

  const totalWords = useMemo(
    () => selectedChapters.reduce((sum, s) => sum + countWords(s.content), 0),
    [selectedChapters],
  );

  function toggleChapter(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === approved.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(approved.map(s => s.id)));
  }

  // ── Export state ───────────────────────────────────────────────────────────
  const [format,         setFormat]         = useState<ExportFormat>('pdf');
  const [citationStyle,  setCitationStyle]  = useState<CitationStyle>('apa');
  const [includeCover,   setIncludeCover]   = useState(true);
  const [includeToc,     setIncludeToc]     = useState(true);
  const [includeFigures, setIncludeFigures] = useState(true);
  const [exporting,      setExporting]      = useState(false);
  const [progress,       setProgress]       = useState(0);
  const [done,           setDone]           = useState(false);
  const [stepIdx,        setStepIdx]        = useState(0);
  const [history,        setHistory]        = useState<ExportRecord[]>([]);

  useEffect(() => {
    if (!exporting) return;
    const prog = setInterval(() => {
      setProgress(p => { if (p >= 100) { clearInterval(prog); return 100; } return p + 3; });
    }, 75);
    const step = setInterval(() => setStepIdx(i => (i + 1) % COMPILE_STEPS.length), 700);
    return () => { clearInterval(prog); clearInterval(step); };
  }, [exporting]);

  useEffect(() => {
    if (progress >= 100 && exporting) {
      setTimeout(() => { setExporting(false); setDone(true); }, 300);
    }
  }, [progress, exporting]);

  const fmt      = FORMATS.find(f => f.id === format)!;
  const userName = authUser?.name ?? 'Student';
  const fileBase = userName.replace(/\s+/g, '_');
  const fileName = `${fileBase}_Thesis_v${history.length + 1}${fmt.ext}`;

  const canGenerate = selectedChapters.length > 0;

  function handleGenerate() {
    setDone(false); setProgress(0); setStepIdx(0); setExporting(true);
  }

  async function handleDownload() {
    try {
      const meta = { name: userName, includeCover, includeToc, citation: citationStyle };

      if (format === 'pdf') {
        buildPDF(selectedChapters, meta, fileName);
      } else if (format === 'docx') {
        const blob = await buildDocx(selectedChapters, meta);
        triggerBlobDownload(blob, fileName);
      } else {
        const tex  = buildLatex(selectedChapters, meta);
        triggerBlobDownload(new Blob([tex], { type: 'text/plain' }), fileName);
      }

      setHistory(prev => [{
        id: `ex${Date.now()}`, format, citationStyle, fileName, createdAt: 'Just now',
      }, ...prev]);
      setDone(false);
      notifications.show({ title: 'Download started', message: `${fileName} saved to your downloads.`, color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Export failed', message: String(err), color: 'red' });
    }
  }

  const allChecked  = approved.length > 0 && selectedIds.size === approved.length;
  const someChecked = selectedIds.size > 0 && selectedIds.size < approved.length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box p="xl">
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Export Centre</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Download your approved chapters as Word, PDF, or LaTeX. Only supervisor-approved chapters can be exported.
          All exports use <strong>Times New Roman</strong> 12pt.
        </Text>
      </Box>

      {/* ── Format cards ── */}
      <Text fw={600} mb="md">Select Format</Text>
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
        {FORMATS.map(f => (
          <Paper
            key={f.id}
            withBorder p="xl" radius="md" ta="center"
            style={{
              cursor: 'pointer',
              border:     format === f.id ? `2px solid #3b5bdb` : '1px solid #dee2e6',
              background: format === f.id ? '#f0f4ff' : 'white',
              transition: 'all 0.15s',
            }}
            onClick={() => setFormat(f.id)}
          >
            <ThemeIcon size={52} radius="xl" variant="light" mx="auto" style={{ background: f.color + '18' }}>
              <f.icon size={24} color={f.color} />
            </ThemeIcon>
            <Text fw={700} mt="md" mb={6}>{f.label}</Text>
            <Badge variant="light" size="sm" style={{ background: f.color + '18', color: f.color }}>{f.ext}</Badge>
          </Paper>
        ))}
      </SimpleGrid>

      {/* ── Chapter selection ── */}
      <Paper withBorder p="xl" radius="md" mb="xl" bg="white">
        <Group justify="space-between" mb="lg">
          <Box>
            <Text fw={700}>Chapter Selection</Text>
            <Text size="xs" c="dimmed">
              {approved.length === 0
                ? 'No chapters have been approved yet'
                : `${selectedIds.size} of ${approved.length} approved chapter${approved.length !== 1 ? 's' : ''} selected`}
            </Text>
          </Box>
          {approved.length > 0 && (
            <Checkbox
              label={allChecked ? 'Deselect all' : 'Select all'}
              checked={allChecked}
              indeterminate={someChecked}
              onChange={toggleAll}
              color="brand"
            />
          )}
        </Group>
        <Divider mb="md" />

        {sbLoading ? (
          <Box ta="center" py="xl"><Loader size="sm" color="brand" /></Box>
        ) : submissions.length === 0 ? (
          <Box ta="center" py="xl">
            <Text c="dimmed" size="sm">No submitted chapters found.</Text>
            <Text size="xs" c="dimmed" mt={4}>Submit chapters for supervisor review from the Writing section.</Text>
          </Box>
        ) : (
          <Stack gap="xs">
            {/* Approved chapters */}
            {approved.map(ch => (
              <Paper
                key={ch.id}
                withBorder p="md" radius="md"
                style={{
                  background:  selectedIds.has(ch.id) ? '#f0fdf4' : 'white',
                  borderColor: selectedIds.has(ch.id) ? '#2f9e44' : '#dee2e6',
                  transition: 'all 0.12s',
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap">
                    <Checkbox checked={selectedIds.has(ch.id)} onChange={() => toggleChapter(ch.id)} color="green" />
                    <Box>
                      <Text size="sm" fw={600}>{ch.section_title}</Text>
                      <Group gap="xs" mt={2}>
                        <Badge size="xs" color="green" variant="light">Approved</Badge>
                        <Text size="xs" c="dimmed">
                          {countWords(ch.content) > 0 ? `${countWords(ch.content).toLocaleString()} words` : 'No content'}
                        </Text>
                        {ch.reviewed_at && (
                          <Text size="xs" c="dimmed">
                            · {new Date(ch.reviewed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </Text>
                        )}
                      </Group>
                    </Box>
                  </Group>
                  <LuCircleCheckBig size={18} color="#2f9e44" style={{ flexShrink: 0 }} />
                </Group>
              </Paper>
            ))}

            {/* Locked chapters */}
            {locked.map(ch => {
              const meta = STATUS_META[ch.status] ?? STATUS_META['pending'];
              return (
                <Paper key={ch.id} withBorder p="md" radius="md"
                  style={{ background: '#f8f9fa', borderColor: '#dee2e6', opacity: 0.65 }}>
                  <Group gap="sm" wrap="nowrap">
                    <LuLock size={16} color="#adb5bd" style={{ flexShrink: 0, marginLeft: 2 }} />
                    <Box>
                      <Text size="sm" fw={600} c="dimmed">{ch.section_title}</Text>
                      <Group gap="xs" mt={2}>
                        <Badge size="xs" color={meta.color} variant="light">{meta.label}</Badge>
                        <Text size="xs" c="dimmed">Cannot be exported until approved</Text>
                      </Group>
                    </Box>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* ── Export options ── */}
      <Paper withBorder p="xl" radius="md" mb="xl" bg="white">
        <Group gap="sm" mb="lg">
          <ThemeIcon size={36} radius="md" color="brand" variant="light"><LuSettings size={17} /></ThemeIcon>
          <Box>
            <Text fw={700}>Export Options</Text>
            <Text size="xs" c="dimmed">Customise your output</Text>
          </Box>
        </Group>
        <Divider mb="lg" />

        <Text size="sm" fw={500} mb="sm">Citation Style</Text>
        <Radio.Group value={citationStyle} onChange={v => setCitationStyle(v as CitationStyle)} mb="lg">
          <Group gap="md">
            <Radio value="apa"     label="APA 7th Edition" color="brand" />
            <Radio value="ieee"    label="IEEE"            color="brand" />
            <Radio value="chicago" label="Chicago"         color="brand" />
          </Group>
        </Radio.Group>

        <Text size="sm" fw={500} mb="sm">Include in Export</Text>
        <Group gap="lg">
          <Checkbox label="Cover page"           checked={includeCover}   onChange={e => setIncludeCover(e.currentTarget.checked)}   color="brand" />
          <Checkbox label="Table of contents"    checked={includeToc}     onChange={e => setIncludeToc(e.currentTarget.checked)}     color="brand" />
          <Checkbox label="Embed figures inline" checked={includeFigures} onChange={e => setIncludeFigures(e.currentTarget.checked)} color="brand" />
        </Group>
      </Paper>

      {/* ── Generate / progress / done ── */}
      <Paper withBorder p="xl" radius="md" mb="xl" bg="white">
        {!exporting && !done && (
          <Stack gap="md" align="center">
            <Group gap="xl">
              {[
                { label: 'Approved Chapters', value: approved.length.toString() },
                { label: 'Words Selected',    value: totalWords.toLocaleString() },
                { label: 'Chapters Selected', value: selectedChapters.length.toString() },
              ].map(({ label, value }) => (
                <Box key={label} ta="center">
                  <Text fw={800} size="xl" style={{ color: '#3b5bdb' }}>{sbLoading ? '…' : value}</Text>
                  <Text size="xs" c="dimmed">{label}</Text>
                </Box>
              ))}
            </Group>

            {selectedChapters.length > 0 && (
              <Box w="100%">
                <Divider mb="sm" />
                <Text size="xs" c="dimmed" fw={600} mb="xs" style={{ textTransform: 'uppercase', letterSpacing: 0.7 }}>
                  Chapters to export
                </Text>
                <Group gap="xs">
                  {selectedChapters.map(ch => (
                    <Badge key={ch.id} size="sm" color="green" variant="light">{ch.section_title}</Badge>
                  ))}
                </Group>
              </Box>
            )}

            <Divider style={{ width: '100%' }} />
            <Button
              color="brand" size="lg" leftSection={<LuDownload size={16} />}
              fullWidth onClick={handleGenerate} disabled={!canGenerate}
            >
              {canGenerate
                ? `Generate ${fmt.ext} Export`
                : 'Select at least one approved chapter'}
            </Button>
            {!canGenerate && approved.length === 0 && (
              <Text size="xs" c="dimmed" ta="center">
                Chapters must be submitted and approved by your supervisor before they can be exported.
              </Text>
            )}
          </Stack>
        )}

        {exporting && (
          <Stack gap="md">
            <Text size="sm" fw={600}>{COMPILE_STEPS[stepIdx]}</Text>
            <Progress value={progress} color="brand" size="lg" radius="xl" animated />
            <Text size="sm" fw={700} ta="center">{progress}%</Text>
          </Stack>
        )}

        {done && (
          <Stack gap="md" align="center">
            <ThemeIcon size={56} radius="xl" color="green" variant="light">
              <LuCircleCheck size={28} />
            </ThemeIcon>
            <Text fw={700} size="lg">Export ready!</Text>
            <Text size="sm" c="dimmed">{fileName}</Text>
            <Text size="xs" c="dimmed">
              {selectedChapters.length} chapter{selectedChapters.length !== 1 ? 's' : ''} · {totalWords.toLocaleString()} words · Times New Roman 12pt
            </Text>
            <Button color="green" size="md" leftSection={<LuDownload size={15} />} onClick={handleDownload}>
              Download {fmt.ext}
            </Button>
            <Button variant="subtle" color="gray" size="sm" onClick={() => setDone(false)}>
              Generate another
            </Button>
          </Stack>
        )}
      </Paper>

      {/* ── Export history ── */}
      <Paper withBorder p="xl" radius="md" bg="white">
        <Group gap="sm" mb="lg">
          <ThemeIcon size={36} radius="md" color="brand" variant="light"><LuClock size={17} /></ThemeIcon>
          <Box>
            <Text fw={700}>Export History</Text>
            <Text size="xs" c="dimmed">{history.length} export{history.length !== 1 ? 's' : ''} this session</Text>
          </Box>
        </Group>
        <Divider mb="md" />
        {history.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="lg">No exports yet this session.</Text>
        ) : (
          <Stack gap="sm">
            {history.map(rec => {
              const f = FORMATS.find(x => x.id === rec.format) ?? FORMATS[1];
              return (
                <Group key={rec.id} justify="space-between" wrap="nowrap" py="xs"
                  style={{ borderBottom: '1px solid #f1f3f5' }}>
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon size={32} radius="md" variant="light" style={{ background: f.color + '18', flexShrink: 0 }}>
                      <f.icon size={15} color={f.color} />
                    </ThemeIcon>
                    <Box>
                      <Text size="sm" fw={600}>{rec.fileName}</Text>
                      <Group gap="xs" mt={2}>
                        <Badge size="xs" variant="light" style={{ background: f.color + '18', color: f.color }}>
                          {rec.format.toUpperCase()}
                        </Badge>
                        <Badge size="xs" variant="light" color="gray">{rec.citationStyle.toUpperCase()}</Badge>
                        <Text size="xs" c="dimmed">{rec.createdAt}</Text>
                      </Group>
                    </Box>
                  </Group>
                  <Button size="compact-xs" variant="subtle" leftSection={<LuDownload size={11} />}
                    onClick={() => notifications.show({ title: 'Re-generate needed', message: 'Click Generate Export to create a new download.', color: 'brand' })}>
                    Re-export
                  </Button>
                </Group>
              );
            })}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}

// suppress unused-icon lint for LuClock3 / LuCircleAlert used in STATUS_META values
void LuClock3; void LuCircleAlert;
