import { useEffect, useMemo, useState } from 'react';
import {
  Badge, Box, Button, Checkbox, Divider, Group, Loader,
  Paper, Select, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { LuFileText, LuDownload, LuCircleCheck, LuFlaskConical } from 'react-icons/lu';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { useAppSelector } from '../../Redux/hooks';
import { fetchSectionDrafts } from '../../supabase/drafts';
import type { DBDraft } from '../../supabase/drafts';

const FONT = 'Times New Roman';

type ExportFormat = 'docx' | 'pdf';

// Strip rows that are metadata (templates, project metadata)
function isContentRow(d: DBDraft) {
  return (
    !d.section_id.startsWith('template_def_') &&
    !d.section_id.startsWith('proj_meta_') &&
    d.content.trim().length > 0
  );
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── DOCX export ──────────────────────────────────────────────────────────────
async function exportDocx(sections: DBDraft[], authorName: string) {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      text: `Research Document — ${authorName}`,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: '' }),
  );

  for (const sec of sections) {
    children.push(
      new Paragraph({
        text: sec.section_title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
    );
    const lines = sec.content.split('\n');
    for (const line of lines) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, font: FONT, size: 24 })],
          spacing: { after: 160 },
        }),
      );
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = new Blob([await Packer.toBlob(doc)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `research_${authorName.replace(/\s+/g, '_')}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF export ───────────────────────────────────────────────────────────────
function exportPdf(sections: DBDraft[], authorName: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxW = pageW - margin * 2;
  let y = margin;

  function addPage() {
    doc.addPage();
    y = margin;
  }

  function checkY(needed: number) {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) addPage();
  }

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.text(`Research Document`, pageW / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(12);
  doc.text(authorName, pageW / 2, y, { align: 'center' });
  y += 14;
  doc.setDrawColor(180);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  for (const sec of sections) {
    checkY(20);
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text(sec.section_title, margin, y);
    y += 8;

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(sec.content, maxW);
    for (const line of lines) {
      checkY(6);
      doc.text(line, margin, y);
      y += 6;
    }
    y += 6;
  }

  doc.save(`research_${authorName.replace(/\s+/g, '_')}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ResearchExport() {
  const authUser = useAppSelector(s => s.auth.user);
  const [drafts,  setDrafts]  = useState<DBDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [format,  setFormat]  = useState<ExportFormat>('docx');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!authUser?.id) return;
    setLoading(true);
    fetchSectionDrafts(authUser.id)
      .then(rows => {
        const content = rows.filter(isContentRow);
        setDrafts(content);
        setSelected(new Set(content.map(d => d.section_id)));
      })
      .finally(() => setLoading(false));
  }, [authUser?.id]);

  const selectedSections = useMemo(
    () => drafts.filter(d => selected.has(d.section_id)),
    [drafts, selected],
  );

  const totalWords = useMemo(
    () => selectedSections.reduce((sum, d) => sum + countWords(d.content), 0),
    [selectedSections],
  );

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleExport() {
    if (!selectedSections.length) {
      notifications.show({ title: 'Nothing selected', message: 'Pick at least one section.', color: 'orange' });
      return;
    }
    setExporting(true);
    try {
      const name = authUser?.name ?? 'Researcher';
      if (format === 'docx') await exportDocx(selectedSections, name);
      else exportPdf(selectedSections, name);
      notifications.show({ title: 'Export complete', message: 'Your document has been downloaded.', color: 'green' });
    } catch {
      notifications.show({ title: 'Export failed', message: 'Could not generate the document.', color: 'red' });
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <Loader size="md" color="brand" />
      </Box>
    );
  }

  return (
    <Box p="lg" maw={800} mx="auto">
      {/* Header */}
      <Group mb="lg" gap="sm" align="center">
        <ThemeIcon size="lg" radius="md" color="brand" variant="light">
          <LuFlaskConical size={18} />
        </ThemeIcon>
        <Box>
          <Title order={3} style={{ fontFamily: 'Playfair Display, serif' }}>Export Research</Title>
          <Text size="sm" c="dimmed">Download your research sections as a formatted document</Text>
        </Box>
      </Group>

      {drafts.length === 0 ? (
        <Paper p="xl" radius="md" withBorder ta="center">
          <LuFileText size={40} color="#adb5bd" style={{ marginBottom: 12 }} />
          <Text fw={600} mb={4}>No content yet</Text>
          <Text size="sm" c="dimmed">Write some sections in the Editor, then come back to export.</Text>
        </Paper>
      ) : (
        <Stack gap="md">
          {/* Format picker */}
          <Paper p="md" radius="md" withBorder>
            <Text fw={600} size="sm" mb={10}>Export Format</Text>
            <Select
              data={[
                { value: 'docx', label: 'Microsoft Word (.docx)' },
                { value: 'pdf',  label: 'PDF Document (.pdf)' },
              ]}
              value={format}
              onChange={v => v && setFormat(v as ExportFormat)}
              w={280}
              comboboxProps={{ withinPortal: true }}
            />
          </Paper>

          {/* Section list */}
          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" mb={12}>
              <Text fw={600} size="sm">Select Sections</Text>
              <Group gap={8}>
                <Button size="xs" variant="subtle" onClick={() => setSelected(new Set(drafts.map(d => d.section_id)))}>
                  All
                </Button>
                <Button size="xs" variant="subtle" color="gray" onClick={() => setSelected(new Set())}>
                  None
                </Button>
              </Group>
            </Group>

            <Stack gap={6}>
              {drafts.map(d => {
                const words = countWords(d.content);
                return (
                  <Box
                    key={d.section_id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 8,
                      background: selected.has(d.section_id) ? '#f0f4ff' : '#f8f9fa',
                      border: `1px solid ${selected.has(d.section_id) ? '#4c6ef5' : '#e9ecef'}`,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggle(d.section_id)}
                  >
                    <Checkbox
                      checked={selected.has(d.section_id)}
                      onChange={() => toggle(d.section_id)}
                      onClick={e => e.stopPropagation()}
                      color="brand"
                    />
                    <Box style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>{d.section_title}</Text>
                    </Box>
                    <Badge size="xs" color="gray" variant="light">{words.toLocaleString()} words</Badge>
                    {selected.has(d.section_id) && <LuCircleCheck size={15} color="#4c6ef5" />}
                  </Box>
                );
              })}
            </Stack>
          </Paper>

          {/* Summary + Export */}
          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" align="center">
              <Box>
                <Text size="sm" fw={600}>{selectedSections.length} section{selectedSections.length !== 1 ? 's' : ''} selected</Text>
                <Text size="xs" c="dimmed">{totalWords.toLocaleString()} words total</Text>
              </Box>
              <Button
                color="brand"
                leftSection={<LuDownload size={15} />}
                onClick={handleExport}
                loading={exporting}
                disabled={selectedSections.length === 0}
              >
                Export {format.toUpperCase()}
              </Button>
            </Group>
          </Paper>

          <Divider />
          <Text size="xs" c="dimmed" ta="center">
            Exports your latest saved drafts. Make sure you save your work in the Editor first.
          </Text>
        </Stack>
      )}
    </Box>
  );
}
