import { useEffect, useState } from 'react';
import {
  Badge, Box, Button, Divider, Group, Loader, Paper, Progress,
  Select, SimpleGrid, Stack, Table, Text, ThemeIcon, Title, Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import {
  LuSparkles, LuCircleCheck, LuTriangleAlert, LuClock,
  LuArrowRight, LuRefreshCw, LuX, LuShield, LuFileDown,
} from 'react-icons/lu';
import jsPDF from 'jspdf';
import type { IssueSeverity } from '../studentData';
import { useAppSelector } from '../../../Redux/hooks';
import { fetchStudentSubmissions } from '../../../supabase/submissions';
import type { DBSubmission } from '../../../supabase/submissions';
import { fetchAIReport, saveAIReport } from '../../../supabase/aiReports';
import {
  generateEngineJSON, isEngineConfigured, AI_ENGINE_OPTIONS, AIEngineError,
} from '../../../helper/aiEngines';
import type { AIEngine } from '../../../helper/aiEngines';
import ChapterPicker from '../ChapterPicker';
import { APPROUTE_LIST } from '../../../Route/types';
import cognitaLogo from '../../../assets/cognita-logo.png';

// ── Report shape produced by AI ───────────────────────────────────────────────

interface ReviewScoreAI { category: string; score: number; maxScore: number }
interface ReviewIssueAI {
  sectionId:    string;
  sectionTitle: string;
  severity:     IssueSeverity;
  message:      string;
  suggestion:   string | null;
}
interface AIReviewReport {
  scores:  ReviewScoreAI[];
  issues:  ReviewIssueAI[];
  summary: string;
}

function isAIReviewReport(v: unknown): v is AIReviewReport {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return Array.isArray(r.scores) && Array.isArray(r.issues) && typeof r.summary === 'string';
}

type SeverityFilter = 'all' | IssueSeverity;

function severityColor(s: IssueSeverity) {
  return s === 'critical' ? 'red' : s === 'major' ? 'orange' : s === 'minor' ? 'yellow' : 'blue';
}
function severityHex(s: IssueSeverity) {
  return s === 'critical' ? '#e03131' : s === 'major' ? '#f08c00' : s === 'minor' ? '#f59f00' : '#3b5bdb';
}
function severityIcon(s: IssueSeverity) {
  return s === 'critical' ? LuX : s === 'major' ? LuTriangleAlert : s === 'minor' ? LuClock : LuSparkles;
}

function buildPrompt(sections: { id: string; title: string; content: string }[]): string {
  return `You are an academic writing reviewer giving a student feedback on their research project before they submit it to their supervisor.

Read the chapters below and produce a quality review.

1. Score the document 0-10 (maxScore always 10) on whichever of these categories are relevant to the content provided — omit a category entirely if there is nothing relevant to judge it on:
   "Clarity & Writing", "Literature Review", "Methodology", "Structure & Organisation", "Argumentation & Analysis"

2. List specific issues found, each with:
   - "sectionId" / "sectionTitle": which chapter it's in (use the id/title given below)
   - "severity": one of "critical" | "major" | "minor" | "suggestion"
   - "message": a concise, specific description of the problem (quote or paraphrase the relevant part where useful)
   - "suggestion": a concrete, actionable rewrite or fix the student could apply (or null if the issue doesn't need one)

3. Write a short overall "summary" of the document's quality and the most important things to address first.

Respond with ONLY JSON in exactly this shape (no markdown fences, no extra commentary):
{
  "scores": [{ "category": string, "score": number, "maxScore": number }],
  "issues": [{ "sectionId": string, "sectionTitle": string, "severity": "critical"|"major"|"minor"|"suggestion", "message": string, "suggestion": string | null }],
  "summary": string
}

CHAPTERS TO REVIEW:
${sections.map(s => `\n--- ${s.title} (id: ${s.id}) ---\n${s.content.slice(0, 6000)}`).join('\n')}`;
}

// ── PDF export ─────────────────────────────────────────────────────────────────

async function exportReviewPDF(opts: {
  report:     AIReviewReport;
  reviewedAt: string | null;
  authorName: string;
  totalScore: number;
  maxTotal:   number;
  pct:        number;
}) {
  const { report, reviewedAt, authorName, totalScore, maxTotal, pct } = opts;

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();
  const margin = 18;
  const cW     = pageW - margin * 2;

  // Load logo
  const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = cognitaLogo;
  });

  const addPageHeader = () => {
    // Faint watermark
    try {
      doc.saveGraphicsState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).setGState(new (doc as any).GState({ opacity: 0.05 }));
      doc.addImage(logoImg, 'PNG', (pageW - 110) / 2, (pageH - 55) / 2, 110, 55);
      doc.restoreGraphicsState();
    } catch { /* decorative */ }

    // Header bar
    doc.setFillColor(59, 91, 219);
    doc.rect(0, 0, pageW, 26, 'F');
    doc.addImage(logoImg, 'PNG', margin, 3, 28, 18);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Cognita's Peer Reviewer Report", pageW - margin, 11, { align: 'right' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Cognita Research Intelligence Engine', pageW - margin, 18, { align: 'right' });
    doc.text(
      reviewedAt
        ? new Date(reviewedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleString(),
      pageW - margin, 23, { align: 'right' },
    );
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

  // ── Page 1 ──
  addPageHeader();
  let y = 34;

  // Report title block
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(19);
  doc.setFont('helvetica', 'bold');
  doc.text("Cognita's Peer Reviewer Report", margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  if (authorName) {
    doc.text(`Author: ${authorName}`, margin, y);
    y += 5;
  }
  doc.text(
    `Date & Time Generated: ${reviewedAt
      ? new Date(reviewedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—'}`,
    margin, y,
  );
  y += 5;
  doc.text(`Platform: Cognita AI Research Platform`, margin, y);
  y += 2;

  doc.setDrawColor(59, 91, 219);
  doc.setLineWidth(0.4);
  doc.line(margin, y + 2, pageW - margin, y + 2);
  y += 9;

  // Score summary box
  doc.setFillColor(245, 247, 255);
  doc.roundedRect(margin, y, cW, 26, 3, 3, 'F');
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(pct >= 70 ? 47 : pct >= 50 ? 240 : 224, pct >= 70 ? 158 : pct >= 50 ? 140 : 49, pct >= 70 ? 68 : pct >= 50 ? 0 : 49);
  doc.text(`${totalScore}/${maxTotal}`, margin + 10, y + 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Overall Score  (${pct}%)`, margin + 10, y + 22);

  // Category scores
  let cx = margin + 55;
  for (const sc of report.scores) {
    const sp = Math.round((sc.score / sc.maxScore) * 100);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 91, 219);
    doc.text(`${sc.score}/${sc.maxScore}`, cx, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const catLines = doc.splitTextToSize(sc.category, 28);
    doc.text(catLines, cx, y + 15);
    const barColor = sp >= 70 ? [47, 158, 68] : sp >= 50 ? [240, 140, 0] : [224, 49, 49];
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.rect(cx, y + 21, (28 * sp) / 100, 2, 'F');
    doc.setFillColor(220, 220, 220);
    doc.rect(cx + (28 * sp) / 100, y + 21, 28 - (28 * sp) / 100, 2, 'F');
    cx += 33;
    if (cx > pageW - margin - 10) break;
  }
  y += 32;

  // Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('Overall Summary', margin, y);
  y += 6;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 55, 55);
  const sumLines = doc.splitTextToSize(report.summary, cW);
  doc.text(sumLines, margin, y);
  y += sumLines.length * 5 + 8;

  // Issue counts
  const counts = {
    critical:   report.issues.filter(i => i.severity === 'critical').length,
    major:      report.issues.filter(i => i.severity === 'major').length,
    minor:      report.issues.filter(i => i.severity === 'minor').length,
    suggestion: report.issues.filter(i => i.severity === 'suggestion').length,
  };

  const countCols = [
    { label: 'Critical',   count: counts.critical,   color: [224, 49, 49] as [number,number,number] },
    { label: 'Major',      count: counts.major,      color: [240, 140, 0] as [number,number,number] },
    { label: 'Minor',      count: counts.minor,      color: [245, 159, 0] as [number,number,number] },
    { label: 'Suggestion', count: counts.suggestion, color: [59, 91, 219] as [number,number,number] },
  ];

  const colW = cW / 4;
  for (let i = 0; i < countCols.length; i++) {
    const col = countCols[i];
    const bx = margin + i * colW;
    doc.setFillColor(col.color[0], col.color[1], col.color[2]);
    doc.setDrawColor(col.color[0], col.color[1], col.color[2]);
    doc.roundedRect(bx, y, colW - 4, 20, 2, 2, 'FD');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(String(col.count), bx + (colW - 4) / 2, y + 11, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(col.label, bx + (colW - 4) / 2, y + 17, { align: 'center' });
  }
  y += 28;

  addPageFooter(1);

  // ── Page 2+ : Issues table ──
  doc.addPage();
  addPageHeader();
  y = 34;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('Detailed Issues', margin, y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${report.issues.length} issue${report.issues.length !== 1 ? 's' : ''} found`, margin + 35, y);
  y += 7;

  // Table header
  const col1 = 38, col2 = 22, col3 = 65, col4 = cW - col1 - col2 - col3;
  doc.setFillColor(59, 91, 219);
  doc.rect(margin, y, cW, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Section',          margin + 2,                  y + 5);
  doc.text('Severity',         margin + col1 + 2,           y + 5);
  doc.text('Issue',            margin + col1 + col2 + 2,    y + 5);
  doc.text('Suggestion',       margin + col1 + col2 + col3 + 2, y + 5);
  y += 8;

  let pageNum = 2;
  for (const issue of report.issues) {
    const msgLines = doc.splitTextToSize(issue.message,    col3 - 4);
    const sugLines = doc.splitTextToSize(issue.suggestion ?? '—', col4 - 4);
    const rowH     = Math.max(msgLines.length, sugLines.length, 2) * 4.5 + 5;

    if (y + rowH > pageH - 18) {
      addPageFooter(pageNum);
      pageNum++;
      doc.addPage();
      addPageHeader();
      y = 34;
      // Re-draw table header on new page
      doc.setFillColor(59, 91, 219);
      doc.rect(margin, y, cW, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Section',      margin + 2,                  y + 5);
      doc.text('Severity',     margin + col1 + 2,           y + 5);
      doc.text('Issue',        margin + col1 + col2 + 2,    y + 5);
      doc.text('Suggestion',   margin + col1 + col2 + col3 + 2, y + 5);
      y += 8;
    }

    // Row background (alternating)
    const rowIdx = report.issues.indexOf(issue);
    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 249, 255);
      doc.rect(margin, y - 1, cW, rowH, 'F');
    }

    const hex  = severityHex(issue.severity);
    const rgb  = [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    const secLines = doc.splitTextToSize(issue.sectionTitle, col1 - 4);
    doc.text(secLines, margin + 2, y + 4);

    // Severity badge background
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.roundedRect(margin + col1 + 1, y + 1, col2 - 3, 5, 1, 1, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(
      issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1),
      margin + col1 + 1 + (col2 - 3) / 2, y + 4.8, { align: 'center' },
    );

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(msgLines, margin + col1 + col2 + 2, y + 4);

    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.text(sugLines, margin + col1 + col2 + col3 + 2, y + 4);

    // Row separator
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(margin, y + rowH - 1, pageW - margin, y + rowH - 1);

    y += rowH;
  }

  addPageFooter(pageNum, pageNum);

  const dateStr = reviewedAt
    ? new Date(reviewedAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  doc.save(`Cognita-Peer-Reviewer-Report-${dateStr}.pdf`);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StudentAIReviewer() {
  const user     = useAppSelector(s => s.auth.user);
  const navigate = useNavigate();

  const [loading,    setLoading]    = useState(true);
  const [running,    setRunning]    = useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [report,     setReport]     = useState<AIReviewReport | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [filter,     setFilter]     = useState<SeverityFilter>('all');
  const [aiEngine,   setAiEngine]   = useState<AIEngine>('claude');

  const [submissions, setSubmissions] = useState<DBSubmission[]>([]);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    Promise.all([
      fetchAIReport<AIReviewReport>(user.id, 'ai_review'),
      fetchStudentSubmissions(user.id),
    ]).then(([row, subs]) => {
      if (row && isAIReviewReport(row.data)) {
        setReport(row.data);
        setReviewedAt(row.created_at);
      }
      const withContent = subs.filter(s => s.content.trim().length > 0);
      setSubmissions(withContent);
      setSelected(new Set(withContent.map(s => s.section_id)));
    }).finally(() => setLoading(false));
  }, [user?.id]);

  const handleRun = async () => {
    if (!user?.id) return;
    if (!isEngineConfigured(aiEngine)) {
      const label = AI_ENGINE_OPTIONS.find(o => o.value === aiEngine)?.label ?? aiEngine;
      notifications.show({ title: 'AI not configured', message: `Add the API key for ${label} to your .env file.`, color: 'red' });
      return;
    }

    const chosen = submissions.filter(s => selected.has(s.section_id));
    if (chosen.length === 0) {
      notifications.show({ title: 'Nothing selected', message: 'Choose at least one chapter to review.', color: 'orange' });
      return;
    }

    setRunning(true);
    try {
      const prompt = buildPrompt(chosen.map(s => ({ id: s.section_id, title: s.section_title, content: s.content })));
      const result = await generateEngineJSON<AIReviewReport>(prompt, aiEngine);
      if (!isAIReviewReport(result)) throw new AIEngineError('Unexpected response shape from AI.');

      setReport(result);
      const now = new Date().toISOString();
      setReviewedAt(now);
      await saveAIReport(user.id, 'ai_review', result);

      notifications.show({ title: 'Review complete', message: 'AI review updated for your selected chapters.', color: 'brand' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not complete the review.';
      notifications.show({ title: 'Review failed', message, color: 'red' });
    } finally {
      setRunning(false);
    }
  };

  const handleExportPDF = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportReviewPDF({
        report,
        reviewedAt,
        authorName: user?.name ?? user?.email ?? '',
        totalScore,
        maxTotal,
        pct,
      });
    } catch {
      notifications.show({ title: 'Export failed', message: 'Could not generate PDF.', color: 'red' });
    } finally {
      setExporting(false);
    }
  };

  // Navigate to editor at the matching section
  const handleIssueClick = (issue: ReviewIssueAI) => {
    navigate(`${APPROUTE_LIST.STUDENT_EDITOR}?section=${encodeURIComponent(issue.sectionId)}`);
  };

  const scores = report?.scores ?? [];
  const issues = report?.issues ?? [];

  const totalScore = scores.reduce((s, r) => s + r.score, 0);
  const maxTotal   = scores.reduce((s, r) => s + r.maxScore, 0) || 1;
  const pct        = Math.round((totalScore / maxTotal) * 100);

  const counts = {
    critical:   issues.filter(i => i.severity === 'critical').length,
    major:      issues.filter(i => i.severity === 'major').length,
    minor:      issues.filter(i => i.severity === 'minor').length,
    suggestion: issues.filter(i => i.severity === 'suggestion').length,
  };

  const filtered = filter === 'all' ? issues : issues.filter(i => i.severity === filter);

  return (
    <Box p="xl">
      <Group justify="space-between" align="flex-start" mb="xl">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>AI Reviewer</Title>
          <Text size="sm" c="dimmed" mt={4}>AI-driven quality review of your submitted chapters.</Text>
        </Box>
        <Group gap="xs">
          {report && (
            <>
              <Badge size="xs" variant="light" color="violet">
                {AI_ENGINE_OPTIONS.find(o => o.value === aiEngine)?.label ?? aiEngine}
              </Badge>
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
            </>
          )}
          <Text size="xs" c="dimmed">{reviewedAt ? `Reviewed ${new Date(reviewedAt).toLocaleString()}` : 'Not reviewed yet'}</Text>
        </Group>
      </Group>

      {loading ? (
        <Group justify="center" py="xl"><Loader size="sm" color="brand" /></Group>
      ) : (
        <Paper withBorder p="lg" radius="md" bg="white" mb="xl">
          <ChapterPicker
            submissions={submissions}
            selected={selected}
            onChange={setSelected}
            title="Choose chapters to review"
            description="The AI gives feedback only on the chapters you select below."
          />
          {/* AI Engine selector */}
          <Box mt="lg">
            <Select
              label="AI Engine"
              description="Choose which model performs the review"
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
                    {opt.free && <Badge size="xs" color="teal"  variant="light">Free</Badge>}
                    {!ok      && <Badge size="xs" color="gray"  variant="outline">No key</Badge>}
                  </Group>
                );
              }}
            />
            {!isEngineConfigured(aiEngine) && (
              <Text size="xs" c="orange" mt={4}>
                Add the API key for {AI_ENGINE_OPTIONS.find(o => o.value === aiEngine)?.label ?? aiEngine} to your .env file.
              </Text>
            )}
          </Box>
          <Group justify="flex-end" mt="md">
            <Button color="brand" leftSection={<LuRefreshCw size={14} />} loading={running}
              disabled={submissions.length === 0 || selected.size === 0} onClick={handleRun}>
              {report ? 'Re-run Review' : 'Run AI Review'}
            </Button>
          </Group>
        </Paper>
      )}

      {loading ? null : !report ? (
        <Paper withBorder p="xl" radius="md" bg="white" ta="center">
          <ThemeIcon size={48} radius="xl" variant="light" color="brand" mx="auto" mb="md"><LuSparkles size={22} /></ThemeIcon>
          <Text fw={600} mb={4}>No AI review yet</Text>
          <Text size="sm" c="dimmed">Select chapters above and run a review to get AI-driven feedback and a category breakdown.</Text>
        </Paper>
      ) : (
        <>
          {/* ── Score summary ── */}
          <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">
            <Paper withBorder p="xl" radius="md" bg="white">
              <Group gap="xl" align="flex-start" wrap="nowrap">
                <Box ta="center" style={{ flexShrink: 0 }}>
                  <Text style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, color: pct >= 70 ? '#2f9e44' : pct >= 50 ? '#f08c00' : '#e03131' }}>
                    {totalScore}
                  </Text>
                  <Text size="sm" c="dimmed">/ {maxTotal}</Text>
                  <Progress value={pct} color={pct >= 70 ? 'green' : pct >= 50 ? 'orange' : 'red'} size="sm" radius="xl" mt="xs" style={{ width: 80 }} />
                  <Text size="xs" c="dimmed" mt={4}>{pct}%</Text>
                </Box>
                <Box style={{ flex: 1 }}>
                  <Text fw={700} mb="md">Category Breakdown</Text>
                  <Stack gap="sm">
                    {scores.map(r => {
                      const p = Math.round((r.score / r.maxScore) * 100);
                      return (
                        <Box key={r.category}>
                          <Group justify="space-between" mb={4}>
                            <Text size="xs" fw={500}>{r.category}</Text>
                            <Text size="xs" c="dimmed">{r.score}/{r.maxScore}</Text>
                          </Group>
                          <Progress value={p} color={p >= 70 ? 'green' : p >= 50 ? 'orange' : 'red'} size="xs" radius="xl" />
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              </Group>
            </Paper>

            <Paper withBorder p="xl" radius="md" bg="white">
              <Text fw={700} mb="lg">Issue Breakdown</Text>
              <SimpleGrid cols={2} spacing="sm" mb="lg">
                {([
                  { label: 'Critical',   count: counts.critical,   bg: '#fff5f5', color: '#e03131' },
                  { label: 'Major',      count: counts.major,      bg: '#fff8f0', color: '#f08c00' },
                  { label: 'Minor',      count: counts.minor,      bg: '#fffde7', color: '#f59f00' },
                  { label: 'Suggestion', count: counts.suggestion, bg: '#f0f4ff', color: '#3b5bdb' },
                ] as const).map(({ label, count, bg, color }) => (
                  <Box key={label} p="md" ta="center" style={{ background: bg, borderRadius: 10, border: `1px solid ${color}28` }}>
                    <Text fw={800} style={{ fontSize: 32, lineHeight: 1, color }}>{count}</Text>
                    <Text size="xs" c="dimmed" mt={6} fw={500}>{label}</Text>
                  </Box>
                ))}
              </SimpleGrid>
              <Text size="xs" c="dimmed">Run a new review to update scores based on your latest submitted chapters.</Text>
            </Paper>
          </SimpleGrid>

          <Paper withBorder p="md" radius="md" mb="xl" bg="white">
            <Group gap="xs" mb={4}>
              <LuShield size={14} color="#3b5bdb" />
              <Text size="sm" fw={600}>Overall summary</Text>
            </Group>
            <Text size="sm" c="dimmed">{report.summary}</Text>
          </Paper>

          {/* ── Report header (date/time) ── */}
          <Paper withBorder p="md" radius="md" mb="lg" style={{ background: '#f8f9fa' }}>
            <Group justify="space-between" wrap="wrap" gap="xs">
              <Text size="sm" fw={600}>Cognita's Peer Reviewer Report</Text>
              <Group gap="xl" wrap="wrap">
                <Box>
                  <Text size="xs" c="dimmed" fw={500}>Date &amp; Time Generated</Text>
                  <Text size="xs">
                    {reviewedAt
                      ? new Date(reviewedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" fw={500}>Total Issues</Text>
                  <Text size="xs">{issues.length}</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" fw={500}>Overall Score</Text>
                  <Text size="xs">{totalScore}/{maxTotal} ({pct}%)</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" fw={500}>Author</Text>
                  <Text size="xs">{user?.name ?? user?.email ?? '—'}</Text>
                </Box>
              </Group>
            </Group>
          </Paper>

          {/* ── Issues table ── */}
          <Paper withBorder radius="md" bg="white" style={{ overflow: 'hidden' }}>
            <Box px="lg" py="md" style={{ borderBottom: '1px solid #f1f3f5' }}>
              <Group justify="space-between" wrap="wrap" gap="sm">
                <Group gap="xs">
                  <Text fw={600}>Detailed Issues</Text>
                  <Badge variant="light" color="brand" size="sm">{issues.length} total</Badge>
                </Group>
                <Group gap={4}>
                  {(['all', 'critical', 'major', 'minor', 'suggestion'] as const).map(f => (
                    <Button key={f} size="compact-xs"
                      variant={filter === f ? 'filled' : 'subtle'}
                      color={f === 'all' ? 'brand' : f === 'critical' ? 'red' : f === 'major' ? 'orange' : f === 'minor' ? 'yellow' : 'blue'}
                      onClick={() => setFilter(f)}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {f === 'all' ? `All (${issues.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f as IssueSeverity]})`}
                    </Button>
                  ))}
                </Group>
              </Group>
            </Box>

            {filtered.length === 0 ? (
              <Box p="xl" ta="center">
                <LuCircleCheck size={40} color="#2f9e44" />
                <Text size="sm" c="dimmed" mt="md">No issues in this category.</Text>
              </Box>
            ) : (
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead style={{ background: '#f0f4ff' }}>
                  <Table.Tr>
                    <Table.Th style={{ width: 160 }}>Section</Table.Th>
                    <Table.Th style={{ width: 120 }}>Issue Gravity</Table.Th>
                    <Table.Th>Issue Description</Table.Th>
                    <Table.Th>Suggestion</Table.Th>
                    <Table.Th style={{ width: 80 }}>Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filtered.map((issue, idx) => {
                    const SeverityIcon = severityIcon(issue.severity);
                    return (
                      <Table.Tr key={`${issue.sectionId}-${idx}`}>
                        <Table.Td>
                          <Text size="sm" fw={500}>{issue.sectionTitle}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            variant="light"
                            color={severityColor(issue.severity)}
                            size="sm"
                            leftSection={<SeverityIcon size={10} />}
                            style={{ textTransform: 'capitalize' }}
                          >
                            {issue.severity}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{issue.message}</Text>
                        </Table.Td>
                        <Table.Td>
                          {issue.suggestion ? (
                            <Text size="xs" c="dimmed" fs="italic">{issue.suggestion}</Text>
                          ) : (
                            <Text size="xs" c="dimmed">—</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Tooltip label={`Go to ${issue.sectionTitle} in Editor`} withArrow position="left">
                            <Button
                              size="compact-xs"
                              variant="light"
                              color="brand"
                              rightSection={<LuArrowRight size={11} />}
                              onClick={() => handleIssueClick(issue)}
                            >
                              Review
                            </Button>
                          </Tooltip>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
          </Paper>

          <Divider my="xl" />

          {/* ── Bottom export bar ── */}
          <Group justify="flex-end">
            <Button
              variant="light"
              color="brand"
              leftSection={<LuFileDown size={14} />}
              loading={exporting}
              onClick={handleExportPDF}
            >
              Export Peer Reviewer Report as PDF
            </Button>
          </Group>
        </>
      )}
    </Box>
  );
}
