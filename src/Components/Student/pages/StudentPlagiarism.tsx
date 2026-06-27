import { useEffect, useState } from 'react';
import {
  Anchor, Badge, Box, Button, Divider, Group, Loader, Modal, Paper,
  Select, SimpleGrid, Stack, Table, Tabs, Text, ThemeIcon, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  LuShield, LuCircleCheck, LuTriangleAlert,
  LuX, LuBot, LuInfo, LuLink, LuExternalLink, LuSparkles, LuFileDown,
} from 'react-icons/lu';
import jsPDF from 'jspdf';
import cognitaLogo from '../../../assets/cognita-logo.png';
import { useAppSelector } from '../../../Redux/hooks';
import { fetchStudentSubmissions } from '../../../supabase/submissions';
import type { DBSubmission } from '../../../supabase/submissions';
import { fetchAIReport, saveAIReport } from '../../../supabase/aiReports';
import { runInternalScan } from '../../../supabase/plagiarismEngine';
import type { PlagiarismReport, SourceMatch } from '../../../supabase/plagiarismEngine';
import {
  generateEngineJSON, isEngineConfigured, AI_ENGINE_OPTIONS, AIEngineError,
} from '../../../helper/aiEngines';
import type { AIEngine } from '../../../helper/aiEngines';
import ChapterPicker from '../ChapterPicker';

// ── Claude AI prompt ──────────────────────────────────────────────────────────

function buildClaudePrompt(sections: { id: string; title: string; content: string }[]): string {
  return `You are an academic-integrity assistant helping a student review their own research project.
Analyse the sections below for: similar or repetitive phrasing, weak paraphrasing, over-reliance on sources, and AI-like writing style.
You do NOT have web search — base your scores purely on the linguistic characteristics of the text provided.

Respond with ONLY JSON in exactly this shape (no markdown fences, no extra commentary):
{
  "overallSimilarity": number,
  "overallAi": number,
  "summary": string,
  "sections": [
    {
      "sectionId": string,
      "sectionTitle": string,
      "similarity": number,
      "aiScore": number,
      "flags": string[],
      "notes": string
    }
  ]
}

- overallSimilarity: 0-100 estimate of how much the writing resembles other academic texts (not original)
- overallAi: 0-100 estimate of AI-generated/paraphrased writing likelihood
- similarity / aiScore: per-section equivalents
- flags: short phrases identifying specific issues (e.g. "Formulaic sentence structure", "Passive voice overuse")
- notes: 1-2 sentence actionable note for that section

SECTIONS:
${sections.map(s => `\n--- ${s.title} (id: ${s.id}) ---\n${s.content.slice(0, 6000)}`).join('\n')}`;
}

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

// ── Sources list sub-component ────────────────────────────────────────────────

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
            These are academically published papers whose titles matched phrases in your submitted content.
            They are retrieved from CrossRef (140M+ papers) — not evidence of copying, but useful for citation review.
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

// ── Engine options ────────────────────────────────────────────────────────────

const EXTERNAL_ENGINES = [
  { value: 'queltext', label: 'Queltext — Free',  reliability: 45,  paid: false, url: 'https://queltext.com' },
  { value: 'unicheck', label: 'Unicheck — Paid',  reliability: 85,  paid: true,  url: 'https://unicheck.com' },
  { value: 'turnitin', label: 'Turnitin — Paid',  reliability: 100, paid: true,  url: 'https://www.turnitin.com' },
] as const;

// ── PDF export ─────────────────────────────────────────────────────────────────

async function exportIntegrityPDF(opts: {
  report:    PlagiarismReport;
  scannedAt: string | null;
  authorName: string;
}) {
  const { report, scannedAt, authorName } = opts;

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();
  const margin = 18;
  const cW     = pageW - margin * 2;

  const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = cognitaLogo;
  });

  const dateStr = scannedAt
    ? new Date(scannedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleString();

  const addPageHeader = () => {
    // Faint watermark
    try {
      doc.saveGraphicsState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).setGState(new (doc as any).GState({ opacity: 0.05 }));
      doc.addImage(logoImg, 'PNG', (pageW - 110) / 2, (pageH - 55) / 2, 110, 55);
      doc.restoreGraphicsState();
    } catch { /* decorative */ }

    doc.setFillColor(59, 91, 219);
    doc.rect(0, 0, pageW, 26, 'F');
    doc.addImage(logoImg, 'PNG', margin, 3, 28, 18);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Cognita's Integrity Report", pageW - margin, 11, { align: 'right' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Cognita Research Intelligence Engine', pageW - margin, 18, { align: 'right' });
    doc.text(dateStr, pageW - margin, 23, { align: 'right' });
  };

  const addPageFooter = (pageNum: number, total?: number) => {
    const footerY = pageH - 8;
    doc.setDrawColor(59, 91, 219);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 4, pageW - margin, footerY - 4);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    doc.text('Powered by Cognita Research Intelligence Engine', margin, footerY);
    doc.addImage(logoImg, 'PNG', pageW - margin - 18, footerY - 7, 18, 9);
    if (total) {
      doc.text(`${pageNum} / ${total}`, pageW / 2, footerY, { align: 'center' });
    }
  };

  const overallSim = report.overallSimilarity ?? 0;
  const overallAi  = report.overallAi ?? 0;
  const sections   = report.sections ?? [];

  // ── Page 1 ──
  addPageHeader();
  let y = 34;

  // Title block
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(19);
  doc.setFont('helvetica', 'bold');
  doc.text("Cognita's Integrity Report", margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  if (authorName) { doc.text(`Author: ${authorName}`, margin, y); y += 5; }
  doc.text(`Date & Time Generated: ${dateStr}`, margin, y); y += 5;
  doc.text(`Platform: Cognita AI Research Platform`, margin, y); y += 2;

  doc.setDrawColor(59, 91, 219);
  doc.setLineWidth(0.4);
  doc.line(margin, y + 2, pageW - margin, y + 2);
  y += 10;

  // Score cards
  const simRiskLabel = overallSim <= 20 ? 'Acceptable' : overallSim <= 35 ? 'Borderline' : 'Unacceptable';
  const simRiskColor: [number,number,number] = overallSim <= 20 ? [47,158,68] : overallSim <= 35 ? [240,140,0] : [224,49,49];
  const aiRiskLabel  = overallAi  <= 20 ? 'Acceptable' : overallAi  <= 45 ? 'Borderline' : 'Unacceptable';
  const aiRiskColor: [number,number,number]  = overallAi  <= 20 ? [47,158,68] : overallAi  <= 45 ? [240,140,0] : [224,49,49];

  const halfW = (cW - 6) / 2;

  // Similarity Index card
  doc.setFillColor(245, 247, 255);
  doc.roundedRect(margin, y, halfW, 32, 3, 3, 'F');
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(simRiskColor[0], simRiskColor[1], simRiskColor[2]);
  doc.text(`${overallSim}%`, margin + halfW / 2, y + 16, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('SIMILARITY INDEX', margin + halfW / 2, y + 22, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(simRiskColor[0], simRiskColor[1], simRiskColor[2]);
  doc.text(simRiskLabel, margin + halfW / 2, y + 28, { align: 'center' });

  // AI Detection card
  const card2x = margin + halfW + 6;
  doc.setFillColor(245, 247, 255);
  doc.roundedRect(card2x, y, halfW, 32, 3, 3, 'F');
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(aiRiskColor[0], aiRiskColor[1], aiRiskColor[2]);
  doc.text(`${overallAi}%`, card2x + halfW / 2, y + 16, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('AI DETECTION', card2x + halfW / 2, y + 22, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(aiRiskColor[0], aiRiskColor[1], aiRiskColor[2]);
  doc.text(aiRiskLabel, card2x + halfW / 2, y + 28, { align: 'center' });

  y += 40;

  // Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('Overall Verdict', margin, y);
  y += 6;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 55, 55);
  const sumLines = doc.splitTextToSize(report.summary ?? '', cW);
  doc.text(sumLines, margin, y);
  y += sumLines.length * 5 + 10;

  // 1. Similarity Index — Section Breakdown
  if (y > pageH - 40) { addPageFooter(1); doc.addPage(); addPageHeader(); y = 34; }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('1. Similarity Index — Section Breakdown', margin, y);
  y += 4;

  // Legend
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(47,158,68); doc.text('● 0–20% Acceptable', margin, y + 4);
  doc.setTextColor(240,140,0); doc.text('● 21–35% Borderline', margin + 34, y + 4);
  doc.setTextColor(224,49,49); doc.text('● 36%+ Unacceptable', margin + 68, y + 4);
  y += 9;

  // Table header
  const sc1=48, sc2=24, sc3=28, sc4=cW-sc1-sc2-sc3;
  doc.setFillColor(59, 91, 219);
  doc.rect(margin, y, cW, 7, 'F');
  doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
  doc.text('Section',          margin+2,        y+5);
  doc.text('Similarity',       margin+sc1+2,    y+5);
  doc.text('Status',           margin+sc1+sc2+2,y+5);
  doc.text('Matching Sources', margin+sc1+sc2+sc3+2, y+5);
  y += 8;

  let pageNum = 1;
  for (const sec of sections) {
    const risk = sec.similarity <= 20 ? { label:'Acceptable', rgb:[47,158,68] as [number,number,number] }
               : sec.similarity <= 35 ? { label:'Borderline', rgb:[240,140,0] as [number,number,number] }
               :                        { label:'Critical',   rgb:[224,49,49] as [number,number,number] };
    const srcNames = (sec.sources ?? []).map(s => s.title).join('; ') || '—';
    const srcLines = doc.splitTextToSize(srcNames, sc4 - 4);
    const rowH = Math.max(srcLines.length, 1) * 4.5 + 5;

    if (y + rowH > pageH - 18) {
      addPageFooter(pageNum);
      pageNum++;
      doc.addPage(); addPageHeader(); y = 34;
      doc.setFillColor(59, 91, 219);
      doc.rect(margin, y, cW, 7, 'F');
      doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
      doc.text('Section', margin+2, y+5);
      doc.text('Similarity', margin+sc1+2, y+5);
      doc.text('Status', margin+sc1+sc2+2, y+5);
      doc.text('Matching Sources', margin+sc1+sc2+sc3+2, y+5);
      y += 8;
    }

    const rowIdx = sections.indexOf(sec);
    if (rowIdx % 2 === 0) { doc.setFillColor(248,249,255); doc.rect(margin, y-1, cW, rowH, 'F'); }

    doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(20,20,20);
    const secTitleLines = doc.splitTextToSize(sec.sectionTitle, sc1-4);
    doc.text(secTitleLines, margin+2, y+4);

    doc.setFont('helvetica','bold'); doc.setTextColor(risk.rgb[0],risk.rgb[1],risk.rgb[2]);
    doc.text(`${sec.similarity}%`, margin+sc1+2, y+4);

    doc.setFillColor(risk.rgb[0],risk.rgb[1],risk.rgb[2]);
    doc.roundedRect(margin+sc1+sc2+1, y+1, sc3-3, 5, 1,1,'F');
    doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
    doc.text(risk.label, margin+sc1+sc2+1+(sc3-3)/2, y+4.8, { align:'center' });

    doc.setFontSize(7.5); doc.setFont('helvetica','normal'); doc.setTextColor(80,80,80);
    doc.text(srcLines, margin+sc1+sc2+sc3+2, y+4);

    doc.setDrawColor(230,230,230); doc.setLineWidth(0.2);
    doc.line(margin, y+rowH-1, pageW-margin, y+rowH-1);
    y += rowH;
  }

  // 2. AI Detection — Section Breakdown
  if (y > pageH - 40) { addPageFooter(pageNum); pageNum++; doc.addPage(); addPageHeader(); y = 34; }
  else { y += 8; }

  doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(20,20,20);
  doc.text('2. AI Detection — Section Breakdown', margin, y);
  y += 4;

  doc.setFontSize(7.5); doc.setFont('helvetica','normal');
  doc.setTextColor(47,158,68);  doc.text('● 0–20% Acceptable', margin, y+4);
  doc.setTextColor(240,140,0);  doc.text('● 21–45% Borderline', margin+34, y+4);
  doc.setTextColor(224,49,49);  doc.text('● 46%+ Unacceptable', margin+68, y+4);
  y += 9;

  const ac1=48, ac2=24, ac3=28, ac4=cW-ac1-ac2-ac3;
  doc.setFillColor(59,91,219); doc.rect(margin, y, cW, 7, 'F');
  doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
  doc.text('Section',  margin+2,          y+5);
  doc.text('AI %',     margin+ac1+2,      y+5);
  doc.text('Status',   margin+ac1+ac2+2,  y+5);
  doc.text('Details',  margin+ac1+ac2+ac3+2, y+5);
  y += 8;

  for (const sec of sections) {
    const risk = sec.aiScore <= 20 ? { label:'Acceptable', rgb:[47,158,68] as [number,number,number] }
               : sec.aiScore <= 45 ? { label:'Borderline', rgb:[240,140,0] as [number,number,number] }
               :                     { label:'High',       rgb:[224,49,49] as [number,number,number] };
    const notesLines = doc.splitTextToSize(sec.notes || '—', ac4-4);
    const rowH = Math.max(notesLines.length, 1) * 4.5 + 5;

    if (y + rowH > pageH - 18) {
      addPageFooter(pageNum); pageNum++;
      doc.addPage(); addPageHeader(); y = 34;
      doc.setFillColor(59,91,219); doc.rect(margin, y, cW, 7, 'F');
      doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
      doc.text('Section',  margin+2,          y+5);
      doc.text('AI %',     margin+ac1+2,      y+5);
      doc.text('Status',   margin+ac1+ac2+2,  y+5);
      doc.text('Details',  margin+ac1+ac2+ac3+2, y+5);
      y += 8;
    }

    const rowIdx = sections.indexOf(sec);
    if (rowIdx % 2 === 0) { doc.setFillColor(248,249,255); doc.rect(margin, y-1, cW, rowH, 'F'); }

    doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(20,20,20);
    const secTLines = doc.splitTextToSize(sec.sectionTitle, ac1-4);
    doc.text(secTLines, margin+2, y+4);

    doc.setFont('helvetica','bold'); doc.setTextColor(risk.rgb[0],risk.rgb[1],risk.rgb[2]);
    doc.text(`${sec.aiScore}%`, margin+ac1+2, y+4);

    doc.setFillColor(risk.rgb[0],risk.rgb[1],risk.rgb[2]);
    doc.roundedRect(margin+ac1+ac2+1, y+1, ac3-3, 5, 1,1,'F');
    doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
    doc.text(risk.label, margin+ac1+ac2+1+(ac3-3)/2, y+4.8, { align:'center' });

    doc.setFontSize(7.5); doc.setFont('helvetica','normal'); doc.setTextColor(80,80,80);
    doc.text(notesLines, margin+ac1+ac2+ac3+2, y+4);

    doc.setDrawColor(230,230,230); doc.setLineWidth(0.2);
    doc.line(margin, y+rowH-1, pageW-margin, y+rowH-1);
    y += rowH;
  }

  addPageFooter(pageNum, pageNum);

  const fileDateStr = scannedAt
    ? new Date(scannedAt).toISOString().slice(0,10)
    : new Date().toISOString().slice(0,10);
  doc.save(`Cognita-Integrity-Report-${fileDateStr}.pdf`);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudentPlagiarism() {
  const user = useAppSelector(s => s.auth.user);

  const [loading,    setLoading]    = useState(true);
  const [scanning,   setScanning]   = useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [report,     setReport]     = useState<PlagiarismReport | null>(null);
  const [scannedAt,  setScannedAt]  = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<DBSubmission[]>([]);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());

  // 'cognita' | AIEngine | external engine value
  const [engine,    setEngine]    = useState<string>('cognita');
  const [aiEngine,  setAiEngine]  = useState<AIEngine>('claude');
  const [extOpen,   { open: openExt, close: closeExt }] = useDisclosure(false);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    Promise.all([
      fetchAIReport<PlagiarismReport>(user.id, 'plagiarism'),
      fetchStudentSubmissions(user.id),
    ]).then(([row, subs]) => {
      if (row && isPlagiarismReport(row.data)) {
        setReport(row.data);
        setScannedAt(row.created_at);
      }
      const withContent = subs.filter(s => s.content.trim().length > 0);
      setSubmissions(withContent);
      setSelected(new Set(withContent.map(s => s.section_id)));
    }).finally(() => setLoading(false));
  }, [user?.id]);

  const runScan = async () => {
    if (!user?.id || !user.institutionId) return;

    const chosen = submissions.filter(s => selected.has(s.section_id));
    if (chosen.length === 0) {
      notifications.show({ title: 'Nothing selected', message: 'Choose at least one chapter to scan.', color: 'orange' });
      return;
    }

    // External engines — redirect user
    if (EXTERNAL_ENGINES.some(e => e.value === engine)) { openExt(); return; }

    // Claude AI scan
    if (engine === 'ai') {
      if (!isEngineConfigured(aiEngine)) {
        const keyName = AI_ENGINE_OPTIONS.find(o => o.value === aiEngine)?.label ?? aiEngine;
        notifications.show({ title: 'Engine not configured', message: `Add the API key for ${keyName} to your .env file.`, color: 'red' });
        return;
      }
      setScanning(true);
      try {
        const prompt = buildClaudePrompt(chosen.map(s => ({ id: s.section_id, title: s.section_title, content: s.content })));
        const raw    = await generateEngineJSON<PlagiarismReport>(prompt, aiEngine);
        if (!isPlagiarismReport(raw)) throw new AIEngineError('Unexpected response shape from AI.');
        const result: PlagiarismReport = { ...raw, engine: aiEngine, scannedAt: new Date().toISOString() };
        setReport(result);
        setScannedAt(result.scannedAt ?? new Date().toISOString());
        await saveAIReport(user.id, 'plagiarism', result);
        notifications.show({ title: 'AI Scan complete', message: 'Integrity report updated.', color: 'green' });
      } catch (err) {
        notifications.show({ title: 'AI Scan failed', message: err instanceof Error ? err.message : 'Could not complete the scan.', color: 'red' });
      } finally { setScanning(false); }
      return;
    }

    // Cognita internal scan
    setScanning(true);
    try {
      const result = await runInternalScan({
        studentId:     user.id,
        institutionId: user.institutionId,
        sections: chosen.map(s => ({ id: s.section_id, title: s.section_title, content: s.content })),
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

  const handleExportPDF = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportIntegrityPDF({
        report,
        scannedAt,
        authorName: user?.name ?? user?.email ?? '',
      });
    } catch {
      notifications.show({ title: 'Export failed', message: 'Could not generate PDF.', color: 'red' });
    } finally {
      setExporting(false);
    }
  };

  const selectedExtEngine = EXTERNAL_ENGINES.find(e => e.value === engine);

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
              {report.engine === 'internal' ? 'Internal Engine' : report.engine}
            </Badge>
          )}
          {report && (
            <Button
              size="xs"
              variant="light"
              color="brand"
              leftSection={<LuFileDown size={13} />}
              loading={exporting}
              onClick={handleExportPDF}
            >
              Export PDF
            </Button>
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
            Powered by Cognita's internal engine: phrasing similarity is computed against other submissions in your
            institution, AI detection uses an open-source classifier (HuggingFace), and related academic papers are
            retrieved from CrossRef. Treat scores as a self-review aid alongside formal submission checks.
          </Text>
        </Group>
      </Paper>

      {/* Chapter picker + scan button */}
      {loading ? (
        <Group justify="center" py="xl"><Loader size="sm" color="brand" /></Group>
      ) : (
        <Paper withBorder p="lg" radius="md" bg="white" mb="xl">
          {/* Engine selector */}
          <Box mb="lg">
            <Text size="sm" fw={600} mb={6}>Integrity Check Engine</Text>
            <Group gap="md" align="flex-end" wrap="wrap">
              <Select
                data={[
                  { value: 'cognita', label: 'Cognita Engine — Free  (20% reliability)' },
                  { value: 'ai',      label: 'AI Analysis (Claude / GPT / Groq…)' },
                  ...EXTERNAL_ENGINES.map(e => ({ value: e.value, label: `${e.label}  (${e.reliability}% reliability)` })),
                ]}
                value={engine}
                onChange={v => setEngine(v ?? 'cognita')}
                style={{ flex: 1, minWidth: 280 }}
                size="sm"
              />
              <Group gap={6}>
                {engine === 'cognita' && <Badge size="sm" variant="light" color="blue">20% reliability</Badge>}
                {engine === 'ai'      && <Badge size="sm" variant="light" color="violet">AI-powered</Badge>}
                {selectedExtEngine && (
                  <>
                    <Badge size="sm" variant="light" color={selectedExtEngine.reliability >= 85 ? 'green' : 'yellow'}>
                      {selectedExtEngine.reliability}% reliability
                    </Badge>
                    <Badge size="sm" variant="light" color="grape">Paid</Badge>
                  </>
                )}
              </Group>
            </Group>

            {/* AI engine sub-selector */}
            {engine === 'ai' && (
              <Box mt="sm">
                <Select
                  label="AI Engine"
                  description="Choose which AI model performs the linguistic analysis"
                  value={aiEngine}
                  onChange={v => setAiEngine((v ?? 'claude') as AIEngine)}
                  data={AI_ENGINE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                  size="sm"
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
                        {!ok      && <Badge size="xs" color="gray" variant="outline">No key</Badge>}
                      </Group>
                    );
                  }}
                />
                {!isEngineConfigured(aiEngine) && (
                  <Text size="xs" c="orange" mt={4}>
                    Add {AI_ENGINE_OPTIONS.find(o => o.value === aiEngine)?.label ?? aiEngine} API key to your .env to use this engine.
                  </Text>
                )}
                <Paper withBorder p="sm" radius="md" mt="sm" style={{ background: '#f8f9ff', border: '1px dashed #748ffc' }}>
                  <Group gap="xs" wrap="nowrap" align="flex-start">
                    <LuSparkles size={13} color="#748ffc" style={{ flexShrink: 0, marginTop: 2 }} />
                    <Text size="xs" c="dimmed">
                      AI analysis scores writing style, paraphrasing quality, and formulaic phrasing using the selected language model.
                      Scores are estimates — not evidence of plagiarism.
                    </Text>
                  </Group>
                </Paper>
              </Box>
            )}

            {EXTERNAL_ENGINES.some(e => e.value === engine) && (
              <Text size="xs" c="dimmed" mt={6}>
                This engine is an external service. Clicking "Run Scan" will guide you to submit your document there.
              </Text>
            )}
          </Box>

          <ChapterPicker
            submissions={submissions}
            selected={selected}
            onChange={setSelected}
            title="Choose chapters to scan"
            description="The engine analyses only the chapters you select below."
          />
          <Group justify="flex-end" mt="md">
            <Button color="brand" leftSection={<LuShield size={14} />} loading={scanning}
              disabled={submissions.length === 0 || selected.size === 0} onClick={runScan}>
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
          <Text size="sm" c="dimmed">Select chapters above and run a scan to get originality, AI detection, and source analysis.</Text>
        </Paper>
      )}

      {/* Results */}
      {!loading && report && (
        <>
          {/* Report header */}
          <Paper withBorder p="md" radius="md" mb="lg" style={{ background: '#f8f9fa' }}>
            <Group justify="space-between" wrap="wrap" gap="xs">
              <Text size="sm" fw={600}>Integrity Report</Text>
              <Group gap="xl" wrap="wrap">
                <Box>
                  <Text size="xs" c="dimmed" fw={500}>Date &amp; Time Generated</Text>
                  <Text size="xs">{scannedAt ? new Date(scannedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" fw={500}>Sections Analysed</Text>
                  <Text size="xs">{sections.length}</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" fw={500}>Engine</Text>
                  <Text size="xs">{report.engine === 'internal' ? 'Cognita Internal' : (report.engine ?? 'Cognita')}</Text>
                </Box>
              </Group>
            </Group>
          </Paper>

          {/* Score cards */}
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
                  <Text size="xs" c="dimmed" mb="sm">{sections.length} chapter{sections.length !== 1 ? 's' : ''} analysed</Text>
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

          {/* Section breakdown + Sources tabs */}
          <Tabs defaultValue="similarity">
            <Tabs.List mb="lg">
              <Tabs.Tab value="similarity" leftSection={<LuShield size={14} />}>Originality</Tabs.Tab>
              <Tabs.Tab value="ai"         leftSection={<LuBot    size={14} />}>AI Writing Style</Tabs.Tab>
              <Tabs.Tab value="sources"    leftSection={<LuLink   size={14} />}>
                Academic Sources
                {sources.length > 0 && <Badge size="xs" ml={6} variant="light" color="brand">{sources.length}</Badge>}
              </Tabs.Tab>
            </Tabs.List>

            {/* Originality tab */}
            <Tabs.Panel value="similarity">
              <Box mb="sm">
                <Text size="xs" c="dimmed" mb={6}>
                  <span style={{ color: '#2f9e44' }}>● 0–20% Acceptable</span>
                  {'  '}
                  <span style={{ color: '#f08c00' }}>● 21–35% Borderline</span>
                  {'  '}
                  <span style={{ color: '#e03131' }}>● 36%+ Unacceptable</span>
                </Text>
              </Box>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead style={{ background: '#f0f4ff' }}>
                  <Table.Tr>
                    <Table.Th>Section</Table.Th>
                    <Table.Th style={{ width: 90 }}>Similarity</Table.Th>
                    <Table.Th style={{ width: 120 }}>Status</Table.Th>
                    <Table.Th>Matching Sources</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sections.map(sec => {
                    const risk = simRisk(sec.similarity);
                    const secSources = sec.sources ?? [];
                    return (
                      <Table.Tr key={sec.sectionId}>
                        <Table.Td>
                          <Text size="sm" fw={500}>{sec.sectionTitle}</Text>
                          {sec.flags.length > 0 && (
                            <Group gap={4} mt={4}>
                              {sec.flags.map((f, i) => (
                                <Badge key={i} size="xs" variant="light" color="orange">{f}</Badge>
                              ))}
                            </Group>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={700} style={{ color: risk.color }}>{sec.similarity}%</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="sm" variant="light" style={{ background: risk.color + '20', color: risk.color }}>
                            {risk.label}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {secSources.length > 0 ? (
                            <Stack gap={2}>
                              {secSources.map((src, i) => (
                                <Anchor key={i} size="xs" href={src.url} target="_blank" rel="noopener noreferrer" lineClamp={1}>
                                  {src.title}
                                </Anchor>
                              ))}
                            </Stack>
                          ) : (
                            <Text size="xs" c="dimmed">—</Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Tabs.Panel>

            {/* AI Writing Style tab */}
            <Tabs.Panel value="ai">
              <Box mb="sm">
                <Text size="xs" c="dimmed" mb={6}>
                  <span style={{ color: '#2f9e44' }}>● 0–20% Acceptable</span>
                  {'  '}
                  <span style={{ color: '#f08c00' }}>● 21–45% Borderline</span>
                  {'  '}
                  <span style={{ color: '#e03131' }}>● 46%+ Unacceptable</span>
                </Text>
              </Box>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead style={{ background: '#f0f4ff' }}>
                  <Table.Tr>
                    <Table.Th>Section</Table.Th>
                    <Table.Th style={{ width: 90 }}>AI %</Table.Th>
                    <Table.Th style={{ width: 120 }}>Status</Table.Th>
                    <Table.Th>Details</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sections.map(sec => {
                    const risk = aiRisk(sec.aiScore);
                    return (
                      <Table.Tr key={sec.sectionId}>
                        <Table.Td>
                          <Text size="sm" fw={500}>{sec.sectionTitle}</Text>
                          {sec.flags.length > 0 && (
                            <Group gap={4} mt={4}>
                              {sec.flags.map((f, i) => (
                                <Badge key={i} size="xs" variant="light" color="orange">{f}</Badge>
                              ))}
                            </Group>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={700} style={{ color: risk.color }}>{sec.aiScore}%</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="sm" variant="light" style={{ background: risk.color + '20', color: risk.color }}>
                            {risk.label}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">{sec.notes || '—'}</Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Tabs.Panel>

            {/* Sources tab */}
            <Tabs.Panel value="sources">
              <SourcesList sources={sources} />
            </Tabs.Panel>
          </Tabs>

          {/* Legend */}
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

          {/* ── Bottom export bar ── */}
          <Group justify="flex-end" mb="xl">
            <Button
              variant="light"
              color="brand"
              leftSection={<LuFileDown size={14} />}
              loading={exporting}
              onClick={handleExportPDF}
            >
              Export Integrity Report as PDF
            </Button>
          </Group>
        </>
      )}

      {/* ── External engine modal ── */}
      <Modal
        opened={extOpen}
        onClose={closeExt}
        title={
          <Group gap="xs">
            <LuShield size={16} />
            <Text fw={600} size="sm">{selectedExtEngine?.label ?? ''}</Text>
            <Badge size="xs" variant="light" color={selectedExtEngine?.paid ? 'grape' : 'teal'}>
              {selectedExtEngine?.paid ? 'Paid' : 'Free'}
            </Badge>
          </Group>
        }
        size="md"
        centered
      >
        <Stack gap="md">
          <Paper withBorder p="md" radius="md" style={{ background: '#f8f9ff' }}>
            <Group gap="xs" wrap="nowrap" align="flex-start">
              <LuInfo size={15} color="#748ffc" style={{ flexShrink: 0, marginTop: 2 }} />
              <Text size="sm" c="dimmed">
                <strong>{selectedExtEngine?.label}</strong> is an external service not integrated directly into Cognita.
                To use it, submit your document on their platform and record the results manually.
              </Text>
            </Group>
          </Paper>

          <Stack gap="xs">
            <Group gap="sm">
              <Badge variant="filled" color={selectedExtEngine && selectedExtEngine.reliability >= 85 ? 'green' : 'yellow'} size="sm">
                {selectedExtEngine?.reliability}% reliability
              </Badge>
              <Text size="xs" c="dimmed">Industry reliability score as rated by academic institutions</Text>
            </Group>
          </Stack>

          <Text size="sm" fw={500}>Steps to use {selectedExtEngine?.label.split('—')[0].trim()}:</Text>
          <Stack gap={6}>
            {['Download or copy your chapter content from the Results Builder or Editor.',
              `Visit the ${selectedExtEngine?.label.split('—')[0].trim()} website and create / log in to your account.`,
              'Submit your document for scanning and wait for the report.',
              'Note your similarity and AI scores from their report.',
            ].map((step, i) => (
              <Group key={i} gap="xs" align="flex-start" wrap="nowrap">
                <Badge size="xs" circle variant="light" color="brand" style={{ flexShrink: 0, marginTop: 2 }}>{i + 1}</Badge>
                <Text size="sm">{step}</Text>
              </Group>
            ))}
          </Stack>

          {selectedExtEngine?.url && (
            <Button
              component="a"
              href={selectedExtEngine.url}
              target="_blank"
              rel="noopener noreferrer"
              leftSection={<LuExternalLink size={14} />}
              color="brand"
              variant="light"
            >
              Open {selectedExtEngine.label.split('—')[0].trim()} Website
            </Button>
          )}

          <Button variant="subtle" color="gray" onClick={closeExt}>Close</Button>
        </Stack>
      </Modal>
    </Box>
  );
}
