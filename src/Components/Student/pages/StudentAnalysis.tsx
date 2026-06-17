import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ActionIcon, Badge, Box, Button, Divider, Group, Loader, Modal, Paper,
  ScrollArea, Select, SimpleGrid, Stack, Table, Tabs, Text, TextInput,
  ThemeIcon, Title, Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAppSelector } from '../../../Redux/hooks';
import { fetchAIReport, saveAIReport } from '../../../supabase/aiReports';
import {
  fetchResultTables, createResultTable, saveResultTable, deleteResultTable,
} from '../../../supabase/resultTables';
import type { DBResultTable } from '../../../supabase/resultTables';
import { notifications } from '@mantine/notifications';
import {
  LuDatabase, LuActivity, LuChartBar, LuPlus, LuTrash2,
  LuUpload, LuDownload, LuSparkles, LuFileText, LuFile,
  LuCircleCheck, LuPencil, LuRefreshCw, LuTable,
  LuCheck, LuX,
} from 'react-icons/lu';
import jsPDF from 'jspdf';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun,
} from 'docx';
import {
  generateEngineJSON, isEngineConfigured,
  AI_ENGINE_OPTIONS, AIEngineError,
} from '../../../helper/aiEngines';
import type { AIEngine } from '../../../helper/aiEngines';
import cognitaLogo from '../../../assets/cognita-logo.png';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Dataset {
  id:        string;
  name:      string;
  source:    'upload' | 'manual';
  headers:   string[];
  rows:      string[][];
  createdAt: string;
}

interface AnalysisFinding {
  title:   string;
  content: string;
}

interface AnalysisResult {
  datasetId:    string;
  datasetName:  string;
  analysisType: 'Quantitative' | 'Qualitative';
  aiEngine:     string;
  generatedAt:  string;
  summary:      string;
  findings:     AnalysisFinding[];
  recommendations: string[];
}

function isValidResult(v: unknown): v is AnalysisResult {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return typeof r.summary === 'string' && Array.isArray(r.findings) && Array.isArray(r.recommendations);
}

// ── CSV parser ─────────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };
  const split = (l: string) =>
    l.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
  return { headers: split(lines[0]), rows: lines.slice(1).map(split) };
}

// ── AI prompt ─────────────────────────────────────────────────────────────────

function buildPrompt(
  dataset: Dataset,
  type: 'Quantitative' | 'Qualitative',
  question: string,
  hypothesis: string,
): string {
  const sample = dataset.rows.slice(0, 8);
  return `You are an expert ${type.toLowerCase()} data analyst helping a student analyze their research dataset.

DATASET: "${dataset.name}"
COLUMNS (${dataset.headers.length}): ${dataset.headers.join(', ')}
SAMPLE DATA (${sample.length} of ${dataset.rows.length} rows):
${sample.map(r => dataset.headers.map((h, i) => `${h}: ${r[i] ?? ''}`).join(' | ')).join('\n')}

${question  ? `RESEARCH QUESTION: ${question}`  : ''}
${hypothesis ? `HYPOTHESIS: ${hypothesis}` : ''}

Perform a comprehensive ${type.toLowerCase()} analysis. Provide:
- An executive summary of the main patterns and insights
- 4-6 key findings with specific, detailed explanations
- 3-5 actionable recommendations for the researcher

Respond ONLY in this exact JSON (no markdown fences, no extra commentary):
{"summary":"...","findings":[{"title":"...","content":"..."}],"recommendations":["..."]}`;
}

// ── PDF download ───────────────────────────────────────────────────────────────

async function downloadPDF(result: AnalysisResult) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW   = doc.internal.pageSize.getWidth();
  const pageH   = doc.internal.pageSize.getHeight();
  const margin  = 18;
  const contentW = pageW - margin * 2;

  const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = cognitaLogo;
  });

  // Faint background watermark
  try {
    doc.saveGraphicsState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.06 }));
    doc.addImage(logoImg, 'PNG', (pageW - 110) / 2, (pageH - 55) / 2, 110, 55);
    doc.restoreGraphicsState();
  } catch { /* watermark is decorative */ }

  // Header bar
  doc.setFillColor(59, 91, 219);
  doc.rect(0, 0, pageW, 26, 'F');
  doc.addImage(logoImg, 'PNG', margin, 3, 28, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Analysis Report', pageW - margin, 13, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated by Cognita AI · ${new Date(result.generatedAt).toLocaleDateString()}`,
    pageW - margin, 20, { align: 'right' },
  );

  let y = 36;

  // Title
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(result.datasetName, margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 110, 110);
  doc.text(
    `Type: ${result.analysisType}  ·  Engine: ${result.aiEngine}  ·  ${new Date(result.generatedAt).toLocaleString()}`,
    margin, y,
  );
  y += 5;

  doc.setDrawColor(59, 91, 219);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Summary
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 55, 55);
  const sumLines = doc.splitTextToSize(result.summary, contentW);
  doc.text(sumLines, margin, y);
  y += sumLines.length * 5 + 8;

  // Findings
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Findings', margin, y);
  y += 7;

  for (let i = 0; i < result.findings.length; i++) {
    const f = result.findings[i];
    const bodyLines = doc.splitTextToSize(f.content, contentW - 6);
    const blockH    = 14 + bodyLines.length * 5;

    if (y + blockH > pageH - 22) { doc.addPage(); y = 18; }

    doc.setFillColor(245, 247, 255);
    doc.roundedRect(margin, y - 4, contentW, blockH, 2, 2, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 91, 219);
    doc.text(`${i + 1}. ${f.title}`, margin + 4, y + 2);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 55, 55);
    doc.text(bodyLines, margin + 4, y);
    y += bodyLines.length * 5 + 7;
  }

  // Recommendations
  if (y > pageH - 40) { doc.addPage(); y = 18; }
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Recommendations', margin, y);
  y += 7;

  for (const rec of result.recommendations) {
    if (y > pageH - 18) { doc.addPage(); y = 18; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 55, 55);
    const recLines = doc.splitTextToSize(`• ${rec}`, contentW);
    doc.text(recLines, margin, y);
    y += recLines.length * 5 + 3;
  }

  // Footer
  doc.setFillColor(245, 247, 255);
  doc.rect(0, pageH - 9, pageW, 9, 'F');
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.text('Powered by Cognita AI · Research Analysis Platform', pageW / 2, pageH - 2.5, { align: 'center' });

  doc.save(`${result.datasetName.replace(/\s+/g, '_')}_Analysis.pdf`);
}

// ── DOCX download ──────────────────────────────────────────────────────────────

async function downloadDOCX(result: AnalysisResult) {
  const logoResp   = await fetch(cognitaLogo);
  const logoBuffer = await logoResp.arrayBuffer();

  const docFile = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: { width: 130, height: 52 },
              type: 'png',
            }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: result.datasetName, bold: true, color: '3B5BDB' })],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Analysis Type: ${result.analysisType}  ·  AI Engine: ${result.aiEngine}  ·  ${new Date(result.generatedAt).toLocaleString()}`,
              color: '888888',
              size: 18,
            }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'Executive Summary', bold: true })],
        }),
        new Paragraph({ children: [new TextRun({ text: result.summary })] }),
        new Paragraph({ text: '' }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'Key Findings', bold: true })],
        }),
        ...result.findings.flatMap((f, i) => [
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun({ text: `${i + 1}. ${f.title}`, bold: true, color: '3B5BDB' })],
          }),
          new Paragraph({ children: [new TextRun({ text: f.content })] }),
          new Paragraph({ text: '' }),
        ]),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'Recommendations', bold: true })],
        }),
        ...result.recommendations.map(rec =>
          new Paragraph({ children: [new TextRun({ text: `• ${rec}` })] }),
        ),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Powered by Cognita AI · Research Analysis Platform',
              color: 'AAAAAA',
              size: 16,
            }),
          ],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(docFile);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${result.datasetName.replace(/\s+/g, '_')}_Analysis.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Inline cell editor (used by result table builder) ─────────────────────────

function Cell({ value, onChange, isHeader = false, placeholder = '' }: {
  value: string; onChange: (v: string) => void;
  isHeader?: boolean; placeholder?: string;
}) {
  return (
    <Box
      component="input"
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.currentTarget.value)}
      placeholder={placeholder}
      style={{
        width: '100%', minWidth: 90, border: 'none', outline: 'none',
        background: 'transparent', fontSize: 13, padding: '6px 8px',
        fontWeight: isHeader ? 700 : 400,
        color: isHeader ? '#1c2840' : '#343a40',
        fontFamily: 'inherit',
      }}
    />
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function StudentAnalysis() {
  const fileRef = useRef<HTMLInputElement>(null);
  const user    = useAppSelector(s => s.auth.user);

  // ── Dataset tab state ──────────────────────────────────────────────────────
  const [datasets,    setDatasets]    = useState<Dataset[]>([]);
  const [isDragging,  setIsDragging]  = useState(false);
  const [loading,     setLoading]     = useState(true);

  // Edit modal state
  const [editDs,       setEditDs]       = useState<Dataset | null>(null);
  const [editHdrs,     setEditHdrs]     = useState<string[]>([]);
  const [editRows,     setEditRows]     = useState<string[][]>([]);
  const [editName,     setEditName]     = useState('');

  // Manual table builder
  const [tableName,    setTableName]    = useState('My Dataset');
  const [manualHdrs,   setManualHdrs]   = useState<string[]>(['Column 1', 'Column 2', 'Column 3']);
  const [manualRows,   setManualRows]   = useState<string[][]>([['', '', ''], ['', '', '']]);

  // ── Analysis Studio state ──────────────────────────────────────────────────
  const [activeTab,        setActiveTab]        = useState<string | null>('dataset');
  const [selectedDataset,  setSelectedDataset]  = useState<string | null>(null);
  const [analysisType,     setAnalysisType]     = useState<'Quantitative' | 'Qualitative'>('Quantitative');
  const [aiEngine,         setAiEngine]         = useState<AIEngine>('gemini');
  const [researchQuestion, setResearchQuestion] = useState('');
  const [hypothesis,       setHypothesis]       = useState('');
  const [running,          setRunning]          = useState(false);

  // ── Result state ───────────────────────────────────────────────────────────
  const [result,       setResult]       = useState<AnalysisResult | null>(null);
  const [downloading,  setDownloading]  = useState<'pdf' | 'docx' | null>(null);

  // ── Result tables state (embedded builder) ─────────────────────────────────
  const [tables,        setTables]        = useState<DBResultTable[]>([]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [hoveredRow,    setHoveredRow]    = useState<number | null>(null);
  const [hoveredCol,    setHoveredCol]    = useState<number | null>(null);
  const [renamingTable, setRenamingTable] = useState(false);
  const [renameVal,     setRenameVal]     = useState('');
  const [newTableOpen,  { open: openNewTable, close: closeNewTable }] = useDisclosure(false);
  const [newTableName,  setNewTableName]  = useState('');
  const [creatingTable, setCreatingTable] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTable = tables.find(t => t.id === activeTableId) ?? null;

  // ── Load from Supabase on mount ────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    Promise.all([
      fetchAIReport<{ datasets: Dataset[] }>(user.id, 'datasets'),
      fetchAIReport<AnalysisResult>(user.id, 'analysis'),
      fetchResultTables(user.id),
    ]).then(([dsRow, resultRow, tbls]) => {
      if (dsRow?.data?.datasets?.length) setDatasets(dsRow.data.datasets);
      if (resultRow?.data && isValidResult(resultRow.data)) setResult(resultRow.data);
      if (tbls.length) { setTables(tbls); setActiveTableId(tbls[0].id); }
    }).finally(() => setLoading(false));
  }, [user?.id]);

  // ── Persist helpers ────────────────────────────────────────────────────────

  function persistDatasets(list: Dataset[]) {
    if (user?.id) saveAIReport(user.id, 'datasets', { datasets: list }).catch(console.error);
  }

  // ── Result table helpers ───────────────────────────────────────────────────

  const scheduleSave = useCallback((id: string, patch: Partial<Pick<DBResultTable, 'name' | 'headers' | 'rows'>>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveResultTable(id, patch), 800);
  }, []);

  const mutateTable = useCallback((id: string, updater: (t: DBResultTable) => DBResultTable) => {
    setTables(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next = updater(t);
      scheduleSave(id, { name: next.name, headers: next.headers, rows: next.rows });
      return next;
    }));
  }, [scheduleSave]);

  const tblUpdateCell   = (ri: number, ci: number, v: string) => activeTableId && mutateTable(activeTableId, t => ({ ...t, rows: t.rows.map((r, i) => i === ri ? r.map((c, j) => j === ci ? v : c) : r) }));
  const tblUpdateHeader = (ci: number, v: string)             => activeTableId && mutateTable(activeTableId, t => ({ ...t, headers: t.headers.map((h, i) => i === ci ? v : h) }));
  const tblAddRow       = ()                                   => activeTableId && activeTable && mutateTable(activeTableId, t => ({ ...t, rows: [...t.rows, Array(t.headers.length).fill('')] }));
  const tblAddColumn    = ()                                   => activeTableId && activeTable && mutateTable(activeTableId, t => ({ ...t, headers: [...t.headers, `Column ${t.headers.length + 1}`], rows: t.rows.map(r => [...r, '']) }));
  const tblDeleteRow    = (ri: number)                         => activeTableId && mutateTable(activeTableId, t => ({ ...t, rows: t.rows.filter((_, i) => i !== ri) }));
  const tblDeleteCol    = (ci: number)                         => activeTableId && mutateTable(activeTableId, t => ({ ...t, headers: t.headers.filter((_, i) => i !== ci), rows: t.rows.map(r => r.filter((_, i) => i !== ci)) }));

  const tblRename = () => {
    if (!activeTableId || !renameVal.trim()) return;
    mutateTable(activeTableId, t => ({ ...t, name: renameVal.trim() }));
    setRenamingTable(false);
  };

  const handleCreateTable = async () => {
    if (!newTableName.trim() || !user?.id) return;
    setCreatingTable(true);
    const created = await createResultTable(user.id, user.institutionId ?? '', newTableName.trim());
    if (created) {
      setTables(prev => [...prev, created]);
      setActiveTableId(created.id);
      notifications.show({ message: `Table "${created.name}" created.`, color: 'teal' });
      closeNewTable();
      setNewTableName('');
    } else {
      notifications.show({ title: 'Could not create table', message: 'Database error — check your Supabase setup.', color: 'red' });
    }
    setCreatingTable(false);
  };

  const handleDeleteTable = async (id: string) => {
    await deleteResultTable(id);
    setTables(prev => {
      const next = prev.filter(t => t.id !== id);
      setActiveTableId(next.length ? next[0].id : null);
      return next;
    });
    notifications.show({ message: 'Table deleted.', color: 'red' });
  };

  function exportTableCSV(table: DBResultTable) {
    const rows = [table.headers, ...table.rows];
    const csv  = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `${table.name}.csv` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Dataset helpers ────────────────────────────────────────────────────────

  function addDataset(name: string, headers: string[], rows: string[][], source: Dataset['source']) {
    const ds: Dataset = {
      id:        crypto.randomUUID(),
      name,
      source,
      headers,
      rows,
      createdAt: new Date().toISOString(),
    };
    setDatasets(prev => {
      const updated = [ds, ...prev];
      persistDatasets(updated);
      return updated;
    });
    notifications.show({ title: 'Dataset added', message: `"${name}" is ready for analysis.`, color: 'green' });
  }

  // ── Edit modal helpers ─────────────────────────────────────────────────────

  function openEdit(ds: Dataset) {
    setEditDs(ds);
    setEditName(ds.name);
    setEditHdrs([...ds.headers]);
    setEditRows(ds.rows.map(r => [...r]));
  }

  function editUpdateHeader(i: number, v: string) {
    setEditHdrs(prev => prev.map((h, idx) => idx === i ? v : h));
  }

  function editAddColumn() {
    setEditHdrs(prev => [...prev, `Column ${prev.length + 1}`]);
    setEditRows(prev => prev.map(r => [...r, '']));
  }

  function editRemoveColumn(i: number) {
    if (editHdrs.length <= 1) return;
    setEditHdrs(prev => prev.filter((_, idx) => idx !== i));
    setEditRows(prev => prev.map(r => r.filter((_, idx) => idx !== i)));
  }

  function editAddRow() {
    setEditRows(prev => [...prev, editHdrs.map(() => '')]);
  }

  function editRemoveRow(i: number) {
    if (editRows.length <= 1) return;
    setEditRows(prev => prev.filter((_, idx) => idx !== i));
  }

  function editUpdateCell(ri: number, ci: number, v: string) {
    setEditRows(prev => prev.map((r, i) => i !== ri ? r : r.map((c, j) => j !== ci ? c : v)));
  }

  function saveEdit() {
    if (!editDs) return;
    const updated: Dataset = { ...editDs, name: editName.trim() || editDs.name, headers: editHdrs, rows: editRows };
    setDatasets(prev => {
      const list = prev.map(d => d.id === updated.id ? updated : d);
      persistDatasets(list);
      return list;
    });
    setEditDs(null);
    notifications.show({ title: 'Dataset saved', message: 'Your changes have been saved.', color: 'green' });
  }

  function handleFileRead(file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (!headers.length) {
        notifications.show({ title: 'Empty file', message: 'No columns found in the file.', color: 'orange' });
        return;
      }
      addDataset(file.name.replace(/\.[^.]+$/, ''), headers, rows, 'upload');
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileRead(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileRead(file);
    e.target.value = '';
  }

  function handleSaveTable() {
    if (!tableName.trim()) {
      notifications.show({ title: 'Name required', message: 'Please enter a name for the dataset.', color: 'orange' });
      return;
    }
    addDataset(tableName.trim(), manualHdrs, manualRows, 'manual');
    setTableName('My Dataset');
    setManualHdrs(['Column 1', 'Column 2', 'Column 3']);
    setManualRows([['', '', ''], ['', '', '']]);
  }

  function updateHeader(i: number, value: string) {
    setManualHdrs(prev => prev.map((h, idx) => idx === i ? value : h));
  }

  function addColumn() {
    setManualHdrs(prev => [...prev, `Column ${prev.length + 1}`]);
    setManualRows(prev => prev.map(r => [...r, '']));
  }

  function removeColumn(i: number) {
    if (manualHdrs.length <= 1) return;
    setManualHdrs(prev => prev.filter((_, idx) => idx !== i));
    setManualRows(prev => prev.map(r => r.filter((_, idx) => idx !== i)));
  }

  function addRow() {
    setManualRows(prev => [...prev, manualHdrs.map(() => '')]);
  }

  function removeRow(i: number) {
    if (manualRows.length <= 1) return;
    setManualRows(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateCell(ri: number, ci: number, value: string) {
    setManualRows(prev => prev.map((r, i) => i !== ri ? r : r.map((c, j) => j !== ci ? c : value)));
  }

  // ── Run analysis ───────────────────────────────────────────────────────────

  async function handleRunAnalysis() {
    if (!selectedDataset) {
      notifications.show({ title: 'No dataset', message: 'Select a dataset first.', color: 'orange' });
      return;
    }
    if (!isEngineConfigured(aiEngine)) {
      notifications.show({ title: 'Engine not configured', message: `Add the API key for ${aiEngine} to your .env file.`, color: 'red' });
      return;
    }
    const ds = datasets.find(d => d.id === selectedDataset);
    if (!ds) return;

    setRunning(true);
    setActiveTab('result');
    try {
      const prompt  = buildPrompt(ds, analysisType, researchQuestion, hypothesis);
      const raw     = await generateEngineJSON<{ summary: string; findings: AnalysisFinding[]; recommendations: string[] }>(prompt, aiEngine);
      if (!isValidResult(raw)) throw new AIEngineError('Unexpected response shape.');

      const opt = AI_ENGINE_OPTIONS.find(o => o.value === aiEngine);
      const analysisResult: AnalysisResult = {
        datasetId:    ds.id,
        datasetName:  ds.name,
        analysisType,
        aiEngine:     opt?.label ?? aiEngine,
        generatedAt:  new Date().toISOString(),
        summary:      raw.summary,
        findings:     raw.findings,
        recommendations: raw.recommendations,
      };
      setResult(analysisResult);
      if (user?.id) await saveAIReport(user.id, 'analysis', analysisResult);
      notifications.show({ title: 'Analysis complete', message: 'Results are ready in the Result tab.', color: 'brand' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed.';
      notifications.show({ title: 'Analysis failed', message: msg, color: 'red' });
      setActiveTab('studio');
    } finally {
      setRunning(false);
    }
  }

  // ── Download helpers ───────────────────────────────────────────────────────

  async function handleDownload(fmt: 'pdf' | 'docx') {
    if (!result) return;
    setDownloading(fmt);
    try {
      if (fmt === 'pdf')  await downloadPDF(result);
      else                await downloadDOCX(result);
    } catch {
      notifications.show({ title: 'Download failed', message: 'Could not generate the file.', color: 'red' });
    } finally {
      setDownloading(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const selectedDs = datasets.find(d => d.id === selectedDataset);

  if (loading) {
    return (
      <Box p="xl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <Loader size={36} color="brand" />
      </Box>
    );
  }

  return (
    <Box p="xl">
      <Group justify="space-between" align="flex-start" mb="xl" wrap="wrap" gap="sm">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Data &amp; Analysis</Title>
          <Text size="sm" c="dimmed" mt={4}>Import or create datasets, run AI-powered analysis, and download your results.</Text>
        </Box>
        {datasets.length > 0 && (
          <Badge color="brand" variant="light" size="lg" leftSection={<LuDatabase size={12} />}>
            {datasets.length} dataset{datasets.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="xl">
          <Tabs.Tab value="dataset"  leftSection={<LuDatabase   size={15} />}>Dataset</Tabs.Tab>
          <Tabs.Tab value="studio"   leftSection={<LuActivity   size={15} />}>Analysis Studio</Tabs.Tab>
          <Tabs.Tab value="result"   leftSection={<LuChartBar  size={15} />}
            rightSection={result ? <LuCircleCheck size={12} color="#2f9e44" /> : undefined}>
            Result
          </Tabs.Tab>
        </Tabs.List>

        {/* ══════════ DATASET TAB ══════════ */}
        <Tabs.Panel value="dataset">
          <Stack gap="xl">

            {/* Upload zone */}
            <Paper withBorder p="xl" radius="md" ta="center"
              style={{
                border:     isDragging ? '2px dashed #3b5bdb' : '2px dashed #dee2e6',
                background: isDragging ? '#f0f4ff' : 'white',
                transition: 'all 0.2s',
                cursor:     'pointer',
              }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
              <ThemeIcon size={52} radius="xl" color="brand" variant="light" mx="auto" mb="md">
                <LuUpload size={24} />
              </ThemeIcon>
              <Text fw={600} size="md" mb={4}>Drop a CSV or Excel file here</Text>
              <Text size="sm" c="dimmed" mb="md">Supports .csv, .xlsx, .xls</Text>
              <Button variant="outline" color="brand" size="sm">Browse Files</Button>
            </Paper>

            {/* Manual table builder */}
            <Paper withBorder p="lg" radius="md" bg="white">
              <Group gap="sm" mb="lg">
                <ThemeIcon size={36} radius="md" color="violet" variant="light">
                  <LuTable size={17} />
                </ThemeIcon>
                <Box>
                  <Text fw={700} size="md">Manual Data Entry</Text>
                  <Text size="xs" c="dimmed">Build a table by typing your data directly</Text>
                </Box>
              </Group>
              <Divider mb="lg" />

              <Group align="flex-end" mb="md" gap="sm">
                <TextInput
                  label="Dataset name"
                  value={tableName}
                  onChange={e => setTableName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button size="sm" variant="light" color="brand" leftSection={<LuPlus size={13} />}
                  onClick={addColumn}>
                  Add column
                </Button>
                <Button size="sm" variant="light" color="teal" leftSection={<LuPlus size={13} />}
                  onClick={addRow}>
                  Add row
                </Button>
              </Group>

              <Paper withBorder radius="md" mb="md" style={{ overflow: 'auto' }}>
                <Table withColumnBorders>
                  <Table.Thead>
                    <Table.Tr style={{ background: '#f8f9fa' }}>
                      <Table.Th style={{ width: 36 }} />
                      {manualHdrs.map((h, ci) => (
                        <Table.Th key={ci}>
                          <Group gap={4} wrap="nowrap">
                            <TextInput
                              value={h}
                              onChange={e => updateHeader(ci, e.target.value)}
                              size="xs"
                              variant="unstyled"
                              styles={{ input: { fontWeight: 600, fontSize: 12 } }}
                            />
                            {manualHdrs.length > 1 && (
                              <ActionIcon size="xs" variant="subtle" color="red" onClick={() => removeColumn(ci)}>
                                <LuTrash2 size={10} />
                              </ActionIcon>
                            )}
                          </Group>
                        </Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {manualRows.map((row, ri) => (
                      <Table.Tr key={ri}>
                        <Table.Td>
                          <Group gap={2} justify="center">
                            <Text size="10px" c="dimmed">{ri + 1}</Text>
                            {manualRows.length > 1 && (
                              <ActionIcon size="xs" variant="subtle" color="red" onClick={() => removeRow(ri)}>
                                <LuTrash2 size={9} />
                              </ActionIcon>
                            )}
                          </Group>
                        </Table.Td>
                        {row.map((cell, ci) => (
                          <Table.Td key={ci} style={{ padding: 4 }}>
                            <TextInput
                              value={cell}
                              onChange={e => updateCell(ri, ci, e.target.value)}
                              size="xs"
                              variant="unstyled"
                              styles={{ input: { fontSize: 12 } }}
                            />
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>

              <Group justify="flex-end">
                <Button color="brand" leftSection={<LuCircleCheck size={14} />} onClick={handleSaveTable}>
                  Save as Dataset
                </Button>
              </Group>
            </Paper>

            {/* Dataset list */}
            {datasets.length > 0 && (
              <Box>
                <Text fw={600} mb="md" size="sm">
                  {datasets.length} dataset{datasets.length !== 1 ? 's' : ''} available
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                  {datasets.map(ds => (
                    <Paper key={ds.id} withBorder p="md" radius="md" bg="white"
                      style={{
                        borderColor: selectedDataset === ds.id ? '#3b5bdb' : undefined,
                        borderWidth: selectedDataset === ds.id ? 2 : 1,
                        cursor: 'pointer',
                        transition: 'box-shadow 0.15s',
                      }}
                      onClick={() => {
                        setSelectedDataset(ds.id);
                        notifications.show({ title: 'Dataset selected', message: `"${ds.name}" is ready for analysis.`, color: 'brand' });
                      }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(59,91,219,0.12)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
                    >
                      <Group gap="sm" mb="sm" wrap="nowrap">
                        <ThemeIcon size={36} radius="md"
                          color={ds.source === 'upload' ? 'teal' : 'violet'}
                          variant="light" style={{ flexShrink: 0 }}>
                          {ds.source === 'upload' ? <LuUpload size={16} /> : <LuPencil size={16} />}
                        </ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" fw={600} lineClamp={1}>{ds.name}</Text>
                          <Group gap="xs" mt={2}>
                            <Badge size="xs" variant="light" color={ds.source === 'upload' ? 'teal' : 'violet'}>
                              {ds.source}
                            </Badge>
                            <Text size="xs" c="dimmed">
                              {ds.headers.length} cols · {ds.rows.length} rows
                            </Text>
                          </Group>
                        </Box>
                        {selectedDataset === ds.id && (
                          <LuCircleCheck size={16} color="#3b5bdb" style={{ flexShrink: 0 }} />
                        )}
                      </Group>
                      <Text size="xs" c="dimmed">
                        {ds.headers.slice(0, 3).join(', ')}{ds.headers.length > 3 ? ` +${ds.headers.length - 3} more` : ''}
                      </Text>
                      <Group gap="xs" mt="sm">
                        <Button size="xs" color="brand" variant="subtle" leftSection={<LuPencil size={11} />}
                          onClick={e => { e.stopPropagation(); openEdit(ds); }}>
                          View / Edit
                        </Button>
                        {selectedDataset !== ds.id && (
                          <Button size="xs" color="teal" variant="subtle"
                            onClick={e => { e.stopPropagation(); setSelectedDataset(ds.id); }}>
                            Select
                          </Button>
                        )}
                        <Button size="xs" color="red" variant="subtle" leftSection={<LuTrash2 size={11} />}
                          onClick={e => {
                            e.stopPropagation();
                            setDatasets(prev => {
                              const updated = prev.filter(d => d.id !== ds.id);
                              persistDatasets(updated);
                              return updated;
                            });
                            if (selectedDataset === ds.id) setSelectedDataset(null);
                          }}>
                          Remove
                        </Button>
                      </Group>
                    </Paper>
                  ))}
                </SimpleGrid>

                {selectedDataset && (
                  <Group justify="flex-end" mt="md">
                    <Button color="brand" rightSection={<LuActivity size={14} />}
                      onClick={() => setActiveTab('studio')}>
                      Go to Analysis Studio
                    </Button>
                  </Group>
                )}
              </Box>
            )}

            {datasets.length === 0 && (
              <Paper withBorder p="xl" radius="md" ta="center" bg="white">
                <Text size="sm" c="dimmed" fs="italic">
                  No datasets yet — upload a CSV/Excel file or create one manually above.
                </Text>
              </Paper>
            )}

            {/* ── Result Tables builder ── */}
            <Box>
              <Divider mb="xl" />
              <Group justify="space-between" align="flex-start" mb="lg">
                <Box>
                  <Group gap="sm" mb={4}>
                    <ThemeIcon size={36} radius="md" color="teal" variant="light">
                      <LuTable size={17} />
                    </ThemeIcon>
                    <Box>
                      <Text fw={700} size="md">Research Tables</Text>
                      <Text size="xs" c="dimmed">Create and edit tables to insert into your thesis editor. Auto-saves as you type.</Text>
                    </Box>
                  </Group>
                </Box>
                <Button size="sm" color="brand" leftSection={<LuPlus size={14} />} onClick={openNewTable}>
                  New Table
                </Button>
              </Group>

              {tables.length === 0 ? (
                <Paper withBorder p="xl" radius="md" ta="center" bg="white">
                  <LuTable size={36} color="#ced4da" style={{ margin: '0 auto 12px' }} />
                  <Text fw={600} mb={4}>No result tables yet</Text>
                  <Text size="sm" c="dimmed" mb="md">Click "New Table" to create your first results table.</Text>
                  <Button size="sm" color="teal" leftSection={<LuPlus size={14} />} onClick={openNewTable}>New Table</Button>
                </Paper>
              ) : (
                <Group align="flex-start" gap="md" wrap="nowrap">

                  {/* Sidebar */}
                  <Paper withBorder p="md" radius="md" style={{ width: 210, flexShrink: 0 }}>
                    <Text size="xs" fw={700} c="dimmed" mb="sm" style={{ letterSpacing: '0.05em' }}>TABLES</Text>
                    <Stack gap={4}>
                      {tables.map(t => (
                        <Group key={t.id} gap={4} wrap="nowrap"
                          style={{
                            borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
                            background: activeTableId === t.id ? '#e6fcf5' : 'transparent',
                            borderLeft: activeTableId === t.id ? '3px solid #0ca678' : '3px solid transparent',
                          }}
                          onClick={() => setActiveTableId(t.id)}
                        >
                          <LuTable size={13} color={activeTableId === t.id ? '#0ca678' : '#adb5bd'} style={{ flexShrink: 0 }} />
                          <Text size="xs" fw={activeTableId === t.id ? 600 : 400} truncate
                            style={{ flex: 1, color: activeTableId === t.id ? '#0ca678' : '#495057' }}>
                            {t.name}
                          </Text>
                          <ActionIcon size="xs" variant="subtle" color="red"
                            onClick={e => { e.stopPropagation(); handleDeleteTable(t.id); }}>
                            <LuTrash2 size={11} />
                          </ActionIcon>
                        </Group>
                      ))}
                    </Stack>
                  </Paper>

                  {/* Table editor */}
                  {activeTable && (
                    <Paper withBorder radius="md" style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                      {/* Toolbar */}
                      <Group justify="space-between" px="md" py="sm"
                        style={{ borderBottom: '1px solid #f1f3f5', background: '#f8f9fa' }}>
                        <Group gap="xs">
                          {renamingTable ? (
                            <Group gap="xs">
                              <TextInput size="xs" value={renameVal}
                                onChange={e => setRenameVal(e.currentTarget.value)}
                                onKeyDown={e => { if (e.key === 'Enter') tblRename(); if (e.key === 'Escape') setRenamingTable(false); }}
                                style={{ width: 200 }} autoFocus />
                              <ActionIcon size="sm" color="teal" variant="light" onClick={tblRename}><LuCheck size={13} /></ActionIcon>
                              <ActionIcon size="sm" color="gray" variant="light" onClick={() => setRenamingTable(false)}><LuX size={13} /></ActionIcon>
                            </Group>
                          ) : (
                            <Group gap={6}>
                              <Text fw={600} size="sm">{activeTable.name}</Text>
                              <ActionIcon size="xs" variant="subtle" color="gray"
                                onClick={() => { setRenameVal(activeTable.name); setRenamingTable(true); }}>
                                <LuPencil size={12} />
                              </ActionIcon>
                            </Group>
                          )}
                          <Text size="xs" c="dimmed">
                            {activeTable.rows.length} rows · {activeTable.headers.length} cols
                          </Text>
                        </Group>
                        <Group gap="xs">
                          <Button size="xs" variant="light" color="teal" leftSection={<LuPlus size={12} />} onClick={tblAddRow}>Row</Button>
                          <Button size="xs" variant="light" color="teal" leftSection={<LuPlus size={12} />} onClick={tblAddColumn}>Column</Button>
                          <Tooltip label="Export CSV" withArrow>
                            <ActionIcon size="sm" variant="light" color="teal" onClick={() => exportTableCSV(activeTable)}>
                              <LuDownload size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>

                      {/* Editable table */}
                      <Box style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 420 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                          <thead>
                            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                              <th style={{ width: 40, padding: '6px 8px', borderRight: '1px solid #dee2e6', color: '#adb5bd', fontSize: 12 }}>#</th>
                              {activeTable.headers.map((h, ci) => (
                                <th key={ci}
                                  style={{ borderRight: ci < activeTable.headers.length - 1 ? '1px solid #dee2e6' : undefined, minWidth: 120, position: 'relative' }}
                                  onMouseEnter={() => setHoveredCol(ci)}
                                  onMouseLeave={() => setHoveredCol(null)}
                                >
                                  <Group gap={2} wrap="nowrap">
                                    <Cell value={h} onChange={v => tblUpdateHeader(ci, v)} isHeader placeholder={`Column ${ci + 1}`} />
                                    {hoveredCol === ci && activeTable.headers.length > 1 && (
                                      <ActionIcon size="xs" variant="subtle" color="red" style={{ flexShrink: 0, marginRight: 4 }}
                                        onClick={() => tblDeleteCol(ci)}>
                                        <LuX size={11} />
                                      </ActionIcon>
                                    )}
                                  </Group>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {activeTable.rows.map((row, ri) => (
                              <tr key={ri}
                                style={{ borderBottom: '1px solid #f1f3f5', background: hoveredRow === ri ? '#f0fdf8' : 'white' }}
                                onMouseEnter={() => setHoveredRow(ri)}
                                onMouseLeave={() => setHoveredRow(null)}
                              >
                                <td style={{ width: 40, padding: '0 8px', borderRight: '1px solid #f1f3f5', textAlign: 'center' }}>
                                  {hoveredRow === ri && activeTable.rows.length > 1 ? (
                                    <ActionIcon size="xs" variant="subtle" color="red" onClick={() => tblDeleteRow(ri)}>
                                      <LuX size={11} />
                                    </ActionIcon>
                                  ) : (
                                    <Text size="xs" c="dimmed">{ri + 1}</Text>
                                  )}
                                </td>
                                {row.map((cell, ci) => (
                                  <td key={ci} style={{ borderRight: ci < row.length - 1 ? '1px solid #f1f3f5' : undefined }}>
                                    <Cell value={cell} onChange={v => tblUpdateCell(ri, ci, v)} placeholder="—" />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Box>
                    </Paper>
                  )}
                </Group>
              )}
            </Box>
          </Stack>
        </Tabs.Panel>

        {/* ══════════ ANALYSIS STUDIO TAB ══════════ */}
        <Tabs.Panel value="studio">
          <Paper withBorder p="xl" radius="md" bg="white">
            <Group gap="sm" mb="lg">
              <ThemeIcon size={38} radius="md" color="brand" variant="light">
                <LuSparkles size={18} />
              </ThemeIcon>
              <Box>
                <Text fw={700} size="md">Analysis Studio</Text>
                <Text size="xs" c="dimmed">Configure and run your AI-powered analysis</Text>
              </Box>
            </Group>
            <Divider mb="lg" />

            {datasets.length === 0 ? (
              <Box ta="center" py="xl">
                <Text size="sm" c="dimmed" mb="md">No datasets yet. Go to the Dataset tab to add one first.</Text>
                <Button variant="light" color="brand" leftSection={<LuDatabase size={14} />}
                  onClick={() => setActiveTab('dataset')}>
                  Add a Dataset
                </Button>
              </Box>
            ) : (
              <Stack gap="lg">
                {/* Dataset selector */}
                <Select
                  label="Select Dataset"
                  description="Choose the dataset you want to analyse"
                  placeholder="Pick a dataset…"
                  value={selectedDataset}
                  onChange={setSelectedDataset}
                  data={datasets.map(d => ({
                    value: d.id,
                    label: `${d.name} (${d.headers.length} cols · ${d.rows.length} rows)`,
                  }))}
                />

                {/* Dataset preview */}
                {selectedDs && (
                  <Paper withBorder radius="md" style={{ overflow: 'auto', background: '#f8f9fa' }}>
                    <Text size="xs" fw={600} c="dimmed" p="xs">
                      PREVIEW — {selectedDs.name}
                    </Text>
                    <Table withColumnBorders>
                      <Table.Thead>
                        <Table.Tr style={{ background: '#f1f3f5' }}>
                          {selectedDs.headers.map(h => (
                            <Table.Th key={h}><Text size="xs" fw={600}>{h}</Text></Table.Th>
                          ))}
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {selectedDs.rows.slice(0, 5).map((row, i) => (
                          <Table.Tr key={i}>
                            {row.map((cell, j) => (
                              <Table.Td key={j}><Text size="xs">{cell}</Text></Table.Td>
                            ))}
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                    {selectedDs.rows.length > 5 && (
                      <Text size="10px" c="dimmed" p="xs">
                        …showing 5 of {selectedDs.rows.length} rows
                      </Text>
                    )}
                  </Paper>
                )}

                {/* Analysis type */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  {(['Quantitative', 'Qualitative'] as const).map(type => (
                    <Paper key={type} withBorder p="md" radius="md"
                      style={{
                        cursor:      'pointer',
                        border:      analysisType === type ? '2px solid #3b5bdb' : undefined,
                        background:  analysisType === type ? '#f0f4ff' : 'white',
                        transition:  'all 0.15s',
                      }}
                      onClick={() => setAnalysisType(type)}
                    >
                      <Group gap="sm" wrap="nowrap">
                        <ThemeIcon size={32} radius="md" color={type === 'Quantitative' ? 'brand' : 'violet'} variant="light">
                          <LuChartBar size={15} />
                        </ThemeIcon>
                        <Box>
                          <Text size="sm" fw={700}>{type}</Text>
                          <Text size="xs" c="dimmed">
                            {type === 'Quantitative'
                              ? 'Numbers, statistics, patterns & trends'
                              : 'Themes, narratives, context & meaning'}
                          </Text>
                        </Box>
                        {analysisType === type && <LuCircleCheck size={16} color="#3b5bdb" style={{ marginLeft: 'auto' }} />}
                      </Group>
                    </Paper>
                  ))}
                </SimpleGrid>

                {/* Context (optional) */}
                <Box>
                  <Text size="sm" fw={600} mb="xs">Research Context <Text span c="dimmed" size="xs">(optional)</Text></Text>
                  <Stack gap="sm">
                    <TextInput
                      label="Research Question"
                      placeholder="e.g. Does variable X correlate with variable Y?"
                      value={researchQuestion}
                      onChange={e => setResearchQuestion(e.target.value)}
                    />
                    <TextInput
                      label="Hypothesis"
                      placeholder="e.g. H₁: There is a significant relationship between…"
                      value={hypothesis}
                      onChange={e => setHypothesis(e.target.value)}
                    />
                  </Stack>
                </Box>

                {/* AI Engine */}
                <Select
                  label="AI Engine"
                  description="Select the model that will run your analysis"
                  value={aiEngine}
                  onChange={v => setAiEngine((v ?? 'gemini') as AIEngine)}
                  data={AI_ENGINE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                  renderOption={({ option }) => {
                    const opt = AI_ENGINE_OPTIONS.find(o => o.value === option.value)!;
                    const ok  = isEngineConfigured(opt.value);
                    return (
                      <Group gap="xs" wrap="nowrap" style={{ width: '100%' }}>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" fw={500} truncate>{opt.label}</Text>
                          <Text size="10px" c="dimmed">{opt.description}</Text>
                        </Box>
                        {opt.free && <Badge size="xs" color="teal" variant="light">Free</Badge>}
                        {!ok       && <Badge size="xs" color="gray" variant="outline">No key</Badge>}
                      </Group>
                    );
                  }}
                />
                {!isEngineConfigured(aiEngine) && (
                  <Text size="xs" c="orange">
                    Add {
                      aiEngine === 'openai'  ? 'VITE_OPENAI_API_KEY'  :
                      aiEngine === 'groq'    ? 'VITE_GROQ_API_KEY'    :
                      aiEngine === 'mistral' ? 'VITE_MISTRAL_API_KEY' :
                                              'VITE_GEMINI_API_KEY'
                    } to your .env file to use this engine.
                  </Text>
                )}

                <Group justify="flex-end">
                  <Button
                    size="md"
                    color="brand"
                    leftSection={running ? <Loader size={14} color="white" /> : <LuSparkles size={15} />}
                    loading={running}
                    disabled={!selectedDataset}
                    onClick={handleRunAnalysis}
                  >
                    Run Analysis
                  </Button>
                </Group>
              </Stack>
            )}
          </Paper>
        </Tabs.Panel>

        {/* ══════════ RESULT TAB ══════════ */}
        <Tabs.Panel value="result">
          {!result && !running ? (
            <Paper withBorder p="xl" radius="md" ta="center" bg="white">
              <ThemeIcon size={52} radius="xl" color="gray" variant="light" mx="auto" mb="md">
                <LuChartBar size={24} />
              </ThemeIcon>
              <Text size="sm" c="dimmed" mb="md">No results yet — set up your analysis in the Analysis Studio tab.</Text>
              <Button variant="light" color="brand" leftSection={<LuActivity size={14} />}
                onClick={() => setActiveTab('studio')}>
                Go to Analysis Studio
              </Button>
            </Paper>
          ) : running ? (
            <Paper withBorder p="xl" radius="md" ta="center" bg="white">
              <Loader size={40} color="brand" mx="auto" mb="md" />
              <Text fw={600}>Running analysis…</Text>
              <Text size="sm" c="dimmed" mt={4}>The AI is analysing your dataset. This may take a moment.</Text>
            </Paper>
          ) : result && (
            <Stack gap="lg">
              {/* Result header */}
              <Paper withBorder p="xl" radius="md" bg="white"
                style={{ position: 'relative', overflow: 'hidden' }}>
                {/* Faint logo watermark */}
                <Box style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none', zIndex: 0,
                }}>
                  <img src={cognitaLogo} alt=""
                    style={{ width: 280, opacity: 0.04, userSelect: 'none' }} />
                </Box>

                <Box style={{ position: 'relative', zIndex: 1 }}>
                  <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm" mb="md">
                    <Group gap="sm">
                      <img src={cognitaLogo} alt="Cognita" style={{ height: 32 }} />
                      <Divider orientation="vertical" />
                      <Box>
                        <Text fw={700} size="lg">{result.datasetName}</Text>
                        <Group gap="xs" mt={2}>
                          <Badge size="xs" color="brand" variant="light">{result.analysisType}</Badge>
                          <Badge size="xs" color="gray"  variant="light">{result.aiEngine}</Badge>
                          <Text size="xs" c="dimmed">{new Date(result.generatedAt).toLocaleString()}</Text>
                        </Group>
                      </Box>
                    </Group>
                    <Group gap="xs">
                      <Button size="sm" variant="light" color="brand"
                        leftSection={downloading === 'pdf' ? <Loader size={12} color="currentColor" /> : <LuFile size={14} />}
                        loading={downloading === 'pdf'}
                        onClick={() => handleDownload('pdf')}>
                        Download PDF
                      </Button>
                      <Button size="sm" variant="light" color="blue"
                        leftSection={downloading === 'docx' ? <Loader size={12} color="currentColor" /> : <LuFileText size={14} />}
                        loading={downloading === 'docx'}
                        onClick={() => handleDownload('docx')}>
                        Download DOCX
                      </Button>
                      <Button size="sm" variant="subtle" color="gray"
                        leftSection={<LuRefreshCw size={13} />}
                        onClick={() => setActiveTab('studio')}>
                        Re-run
                      </Button>
                    </Group>
                  </Group>

                  <Divider mb="lg" />

                  {/* Summary */}
                  <Box mb="lg" p="md"
                    style={{ background: '#f8f9ff', borderRadius: 10, borderLeft: '4px solid #3b5bdb' }}>
                    <Text size="xs" fw={700} c="brand" mb={4} style={{ letterSpacing: 1 }}>EXECUTIVE SUMMARY</Text>
                    <Text size="sm">{result.summary}</Text>
                  </Box>

                  {/* Findings */}
                  <Text fw={700} size="md" mb="sm">Key Findings</Text>
                  <Stack gap="sm" mb="lg">
                    {result.findings.map((f, i) => (
                      <Group key={i} gap="sm" align="flex-start" wrap="nowrap" p="md"
                        style={{ border: '1px solid #f1f3f5', borderRadius: 10, background: 'white' }}>
                        <ThemeIcon size={28} radius="xl" color="brand" variant="light" style={{ flexShrink: 0 }}>
                          <Text size="xs" fw={700}>{i + 1}</Text>
                        </ThemeIcon>
                        <Box style={{ flex: 1 }}>
                          <Text size="sm" fw={600} mb={2}>{f.title}</Text>
                          <Text size="sm" c="dimmed">{f.content}</Text>
                        </Box>
                      </Group>
                    ))}
                  </Stack>

                  {/* Recommendations */}
                  <Text fw={700} size="md" mb="sm">Recommendations</Text>
                  <Stack gap="xs">
                    {result.recommendations.map((rec, i) => (
                      <Group key={i} gap="sm" align="flex-start" wrap="nowrap">
                        <LuCircleCheck size={15} color="#2f9e44" style={{ flexShrink: 0, marginTop: 2 }} />
                        <Text size="sm">{rec}</Text>
                      </Group>
                    ))}
                  </Stack>

                  {/* Dataset table at the bottom of result */}
                  {datasets.find(d => d.id === result.datasetId) && (() => {
                    const ds = datasets.find(d => d.id === result.datasetId)!;
                    return (
                      <Box mt="xl">
                        <Divider mb="lg" />
                        <Text fw={700} size="md" mb="sm">
                          Dataset — {ds.name}
                        </Text>
                        <Paper withBorder radius="md" style={{ overflow: 'auto' }}>
                          <Table withColumnBorders>
                            <Table.Thead>
                              <Table.Tr style={{ background: '#f1f3f5' }}>
                                {ds.headers.map(h => (
                                  <Table.Th key={h}><Text size="xs" fw={600}>{h}</Text></Table.Th>
                                ))}
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {ds.rows.slice(0, 10).map((row, i) => (
                                <Table.Tr key={i}>
                                  {row.map((cell, j) => (
                                    <Table.Td key={j}><Text size="xs">{cell}</Text></Table.Td>
                                  ))}
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                          {ds.rows.length > 10 && (
                            <Text size="10px" c="dimmed" p="xs">Showing 10 of {ds.rows.length} rows</Text>
                          )}
                        </Paper>
                      </Box>
                    );
                  })()}

                  <Group justify="center" mt="xl">
                    <Text size="xs" c="dimmed">Powered by Cognita AI · Research Analysis Platform</Text>
                  </Group>
                </Box>
              </Paper>

              {/* Download actions (sticky bottom) */}
              <Paper withBorder p="md" radius="md" bg="white">
                <Group justify="center" gap="md">
                  <LuDownload size={16} />
                  <Text size="sm" fw={600}>Download your analysis result</Text>
                  <Button size="sm" color="red" variant="light"
                    leftSection={downloading === 'pdf' ? <Loader size={12} color="currentColor" /> : <LuFile size={14} />}
                    loading={downloading === 'pdf'}
                    onClick={() => handleDownload('pdf')}>
                    PDF
                  </Button>
                  <Button size="sm" color="blue" variant="light"
                    leftSection={downloading === 'docx' ? <Loader size={12} color="currentColor" /> : <LuFileText size={14} />}
                    loading={downloading === 'docx'}
                    onClick={() => handleDownload('docx')}>
                    DOCX
                  </Button>
                </Group>
              </Paper>
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>

      {/* ══════════ NEW TABLE MODAL ══════════ */}
      <Modal opened={newTableOpen} onClose={closeNewTable} title="Create New Table" size="sm">
        <Stack gap="md">
          <TextInput
            label="Table name"
            placeholder="e.g. Table 1: Model Accuracy Comparison"
            value={newTableName}
            onChange={e => setNewTableName(e.currentTarget.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateTable()}
            autoFocus
          />
          <Button color="teal" loading={creatingTable} disabled={!newTableName.trim()} onClick={handleCreateTable}>
            Create Table
          </Button>
        </Stack>
      </Modal>

      {/* ══════════ EDIT DATASET MODAL ══════════ */}
      <Modal
        opened={editDs !== null}
        onClose={() => setEditDs(null)}
        title={
          <Group gap="sm">
            <ThemeIcon size={28} radius="md" color="brand" variant="light"><LuTable size={14} /></ThemeIcon>
            <TextInput
              value={editName}
              onChange={e => setEditName(e.target.value)}
              variant="unstyled"
              styles={{ input: { fontWeight: 700, fontSize: 16 } }}
              placeholder="Dataset name"
            />
          </Group>
        }
        size="90%"
        styles={{ body: { padding: 0 } }}
      >
        {editDs && (
          <Stack gap={0}>
            {/* Toolbar */}
            <Group p="md" gap="xs" style={{ borderBottom: '1px solid #f1f3f5', background: '#f8f9fa' }}>
              <Button size="xs" variant="light" color="brand" leftSection={<LuPlus size={12} />}
                onClick={editAddColumn}>
                Add column
              </Button>
              <Button size="xs" variant="light" color="teal" leftSection={<LuPlus size={12} />}
                onClick={editAddRow}>
                Add row
              </Button>
              <Text size="xs" c="dimmed" ml="auto">
                {editHdrs.length} cols · {editRows.length} rows
              </Text>
            </Group>

            {/* Table editor */}
            <ScrollArea style={{ maxHeight: 'calc(80vh - 180px)' }} p="md">
              <Table withColumnBorders style={{ minWidth: editHdrs.length * 130 }}>
                <Table.Thead>
                  <Table.Tr style={{ background: '#f1f3f5' }}>
                    <Table.Th style={{ width: 44 }} />
                    {editHdrs.map((h, ci) => (
                      <Table.Th key={ci} style={{ minWidth: 120 }}>
                        <Group gap={4} wrap="nowrap">
                          <TextInput
                            value={h}
                            onChange={e => editUpdateHeader(ci, e.target.value)}
                            size="xs"
                            variant="unstyled"
                            styles={{ input: { fontWeight: 600, fontSize: 12, color: '#3b5bdb' } }}
                          />
                          {editHdrs.length > 1 && (
                            <ActionIcon size="xs" variant="subtle" color="red"
                              onClick={() => editRemoveColumn(ci)}>
                              <LuTrash2 size={10} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {editRows.map((row, ri) => (
                    <Table.Tr key={ri}>
                      <Table.Td style={{ textAlign: 'center', padding: '4px 8px' }}>
                        <Group gap={2} justify="center" wrap="nowrap">
                          <Text size="10px" c="dimmed" style={{ userSelect: 'none' }}>{ri + 1}</Text>
                          {editRows.length > 1 && (
                            <ActionIcon size="xs" variant="subtle" color="red"
                              onClick={() => editRemoveRow(ri)}>
                              <LuTrash2 size={9} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Table.Td>
                      {row.map((cell, ci) => (
                        <Table.Td key={ci} style={{ padding: 4 }}>
                          <TextInput
                            value={cell}
                            onChange={e => editUpdateCell(ri, ci, e.target.value)}
                            size="xs"
                            variant="unstyled"
                            styles={{ input: { fontSize: 12 } }}
                          />
                        </Table.Td>
                      ))}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            {/* Footer */}
            <Group p="md" justify="flex-end" gap="sm" style={{ borderTop: '1px solid #f1f3f5' }}>
              <Button variant="subtle" color="gray" onClick={() => setEditDs(null)}>Cancel</Button>
              <Button color="brand" leftSection={<LuCircleCheck size={14} />} onClick={saveEdit}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
