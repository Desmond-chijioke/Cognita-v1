import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box, Text, Group, Stack, Select, ActionIcon, Divider,
  Tabs, Textarea, Button, Badge, Progress, Modal,
  TextInput, Tooltip, Paper,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuBold, LuItalic, LuUnderline, LuStrikethrough,
  LuAlignLeft, LuAlignCenter, LuAlignRight, LuAlignJustify,
  LuList, LuListOrdered, LuQuote, LuSave, LuMaximize, LuMinimize,
  LuShield, LuCircleCheck, LuClock, LuTriangleAlert,
  LuMessageSquare, LuPlus, LuSearch, LuSend, LuBot, LuUser,
  LuActivity, LuPencil, LuTrash2, LuCheck, LuX, LuLock,
  LuUpload, LuMessageSquareDot, LuEye,
} from 'react-icons/lu';
import { STUDENT_REFERENCES, REVIEW_SCORES, REVIEW_ISSUES } from '../studentData';
import { STUDENT_SECTIONS } from '../studentData';
import type { ReviewScore, ReviewIssue } from '../studentData';
import {
  PROJECT_TYPES, buildSections, mapSections,
} from '../editorTemplates';
import type { ProjectType, EditorSection, SectionStatus } from '../editorTemplates';
import { useAppSelector, useAppDispatch } from '../../../Redux/hooks';
import { submitSection, resolveAnnotation } from '../../../Redux/slices/submissionsSlice';
import type { SubmissionStatus, SubmissionAnnotation } from '../../../Redux/slices/submissionsSlice';
import { useCollaborativeDoc } from '../../../hooks/useCollaborativeDoc';


// ── Constants ──────────────────────────────────────────────────────────────────
const FONT_FAMILIES = ['Times New Roman', 'Arial', 'Calibri', 'Georgia', 'Garamond', 'Helvetica'];
const FONT_SIZES    = ['8','9','10','11','12','14','16','18','20','24','28','36','48','72'];
const LINE_SPACINGS = ['1.0','1.15','1.5','2.0','2.5','3.0'];
const BRAND         = '#3b5bdb';

type Alignment = 'left' | 'center' | 'right' | 'justify';

interface ChatMessage {
  id:   string;
  role: 'user' | 'ai';
  text: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function sectionStatusIcon(status: SectionStatus) {
  switch (status) {
    case 'completed':      return <LuCircleCheck   size={15} color="#2f9e44"  />;
    case 'in-progress':    return <LuClock         size={15} color={BRAND}    />;
    case 'needs-revision': return <LuTriangleAlert size={15} color="#e67700"  />;
    default:
      return (
        <Box style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid #adb5bd', display: 'inline-block', flexShrink: 0 }} />
      );
  }
}

function severityColor(s: ReviewIssue['severity']): string {
  switch (s) {
    case 'critical':   return 'red';
    case 'major':      return 'orange';
    case 'minor':      return 'yellow';
    case 'suggestion': return 'blue';
  }
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function applyReviewHighlights(text: string, annotations: SubmissionAnnotation[]): React.ReactNode {
  if (!annotations.length) return text;
  // Build non-overlapping ranges sorted by position in original text
  const ranges: { start: number; end: number; ann: SubmissionAnnotation }[] = [];
  for (const ann of annotations) {
    let pos = 0;
    while ((pos = text.indexOf(ann.selectedText, pos)) !== -1) {
      ranges.push({ start: pos, end: pos + ann.selectedText.length, ann });
      pos += ann.selectedText.length;
    }
  }
  if (!ranges.length) return text;
  ranges.sort((a, b) => a.start - b.start);
  const clean: typeof ranges = [];
  let lastEnd = 0;
  for (const r of ranges) { if (r.start >= lastEnd) { clean.push(r); lastEnd = r.end; } }
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const r of clean) {
    if (r.start > cursor) nodes.push(<span key={`pre-${r.start}`}>{text.slice(cursor, r.start)}</span>);
    nodes.push(
      <mark
        key={`${r.ann.id}-${r.start}`}
        title={r.ann.comment}
        style={{
          background: r.ann.color + '66',
          borderRadius: 3,
          padding: '1px 2px',
          borderBottom: `2px solid ${r.ann.color}`,
          cursor: 'help',
        }}
      >
        {r.ann.selectedText}
      </mark>
    );
    cursor = r.end;
  }
  if (cursor < text.length) nodes.push(<span key="post-end">{text.slice(cursor)}</span>);
  return <>{nodes}</>;
}

function RingProgress({ value, size = 80 }: { value: number; size?: number }) {
  const r    = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const cx   = size / 2;
  const cy   = size / 2;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e9ecef" strokeWidth={10} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={BRAND} strokeWidth={10}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
    </svg>
  );
}

// ── Initial sections from existing STUDENT_SECTIONS data ──────────────────────
function buildInitialSections(): EditorSection[] {
  const keyMap: Record<string, string> = {
    'Title': 'title', 'Abstract': 'abstract', 'Acknowledgements': 'acknowledge',
    'Introduction': 'introduction', 'Literature Review': 'lit_review',
    'Methodology': 'methodology', 'Results': 'results', 'Discussion': 'discussion',
    'Conclusion': 'conclusion', 'References': 'references', 'Appendices': 'appendices',
  };
  return STUDENT_SECTIONS.map(s => ({
    id:      s.id,
    key:     keyMap[s.title] ?? s.title.toLowerCase().replace(/\s+/g, '_'),
    title:   s.title,
    mandatory: s.mandatory,
    placeholder: `Start writing your ${s.title.toLowerCase()} here…`,
    content:   s.content,
    status:    s.status as SectionStatus,
    wordCount: s.wordCount,
    supervisorComment: s.supervisorComment,
  }));
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function StudentEditor() {

  // ── Core state ──────────────────────────────────────────────────────────────
  const [projectType, setProjectType]     = useState<ProjectType>('Thesis');
  const [sections,    setSections]        = useState<EditorSection[]>(buildInitialSections);
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? '');

  // ── Switch-type modal ────────────────────────────────────────────────────────
  const [switchModal, setSwitchModal]     = useState<{ open: boolean; pending: ProjectType | null }>({ open: false, pending: null });

  // ── Section rename state ─────────────────────────────────────────────────────
  const [editingId,    setEditingId]      = useState<string | null>(null);
  const [editingTitle, setEditingTitle]   = useState('');

  // ── Add-section modal ────────────────────────────────────────────────────────
  const [addModal,      setAddModal]      = useState(false);
  const [newSecTitle,   setNewSecTitle]   = useState('');

  // ── Formatting ───────────────────────────────────────────────────────────────
  const [fontFamily,  setFontFamily]  = useState('Georgia');
  const [fontSize,    setFontSize]    = useState('12');
  const [lineSpacing, setLineSpacing] = useState('1.5');
  const [bold,        setBold]        = useState(false);
  const [italic,      setItalic]      = useState(false);
  const [underline,   setUnderline]   = useState(false);
  const [strikethrough, setStrike]    = useState(false);
  const [alignment,   setAlignment]   = useState<Alignment>('left');

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [focusMode,     setFocusMode]     = useState(false);
  const [citeModalOpen, setCiteModalOpen] = useState(false);
  const [citeSearch,    setCiteSearch]    = useState('');
  const [rightTab,      setRightTab]      = useState<string>('reviewer');
  const [showResolvedAnnos, setShowResolvedAnnos] = useState(false);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [refSearch,     setRefSearch]     = useState('');

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'ai-1', role: 'ai', text: 'Hello! I am your AI writing assistant. I can help you refine arguments, suggest citations, improve clarity, or expand sections. What would you like to work on?' },
    { id: 'ai-2', role: 'ai', text: 'Tip: You are currently in Chapter 1. Consider adding a thesis roadmap paragraph at the end of your introduction — it helps examiners navigate your structure.' },
  ]);
  const [chatInput, setChatInput] = useState('');

  const centerRef = useRef<HTMLDivElement>(null);

  // ── Redux ────────────────────────────────────────────────────────────────────
  const dispatch    = useAppDispatch();
  const user        = useAppSelector(s => s.auth.user);
  const mySubmissions = useAppSelector(s =>
    s.submissions.list.filter(sub => sub.studentId === user?.id),
  );

  const getSubStatus = (sectionId: string): SubmissionStatus | null =>
    mySubmissions.find(s => s.sectionId === sectionId)?.status ?? null;

  const getSubComment = (sectionId: string): string =>
    mySubmissions.find(s => s.sectionId === sectionId)?.supervisorComment ?? '';

  const getActiveSub = () => mySubmissions.find(s => s.sectionId === activeSectionId) ?? null;

  const handleSubmitSection = () => {
    if (!user || !activeSection || !activeSection.content.trim()) {
      notifications.show({ title: 'Nothing to submit', message: 'Write some content first.', color: 'orange' });
      return;
    }
    dispatch(submitSection({
      studentId:    user.id,
      studentName:  user.name,
      sectionId:    activeSection.id,
      sectionTitle: activeSection.title,
      content:      activeSection.content,
    }));
    notifications.show({ title: 'Chapter submitted', message: `"${activeSection.title}" sent to your supervisor for review.`, color: 'blue' });
  };

  // ── Collaborative editing ─────────────────────────────────────────────────────
  const roomId  = `project-${user?.id ?? 'demo'}`;
  const collab  = useCollaborativeDoc(
    roomId,
    user?.name  ?? 'Student',
    user?.email ?? '',
    user?.role  ?? 'Student',
  );
  const [commentText, setCommentText] = useState('');

  // Seed Yjs on mount with the current section content
  useEffect(() => {
    sections.forEach(sec => collab.initSection(sec.id, sec.content));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to remote changes for the active section + broadcast which section we're editing
  useEffect(() => {
    collab.setActiveSection(activeSectionId);
    return collab.observeSection(activeSectionId, newContent => {
      setSections(prev => prev.map(s =>
        s.id === activeSectionId
          ? { ...s, content: newContent, wordCount: countWords(newContent) }
          : s
      ));
    });
  }, [activeSectionId, collab.observeSection, collab.setActiveSection]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const activeSection = sections.find(s => s.id === activeSectionId) ?? sections[0];
  const content       = activeSection?.content ?? '';
  const wordCount     = countWords(content);

  const linesPerPage  = Math.max(1, Math.floor(912 / (parseInt(fontSize) * parseFloat(lineSpacing))));
  const lineCount     = content.split('\n').length;
  const pageCount     = Math.max(1, Math.ceil(lineCount / linesPerPage));

  const approvedCount  = sections.filter(s => s.status === 'completed').length;
  const inProgressCount = sections.filter(s => s.status === 'in-progress').length;
  const notStartedMandatory = sections.filter(s => s.status === 'not-started' && s.mandatory).length;

  const totalScore    = REVIEW_SCORES.reduce((acc, r) => acc + r.score, 0);
  const maxTotalScore = REVIEW_SCORES.reduce((acc, r) => acc + r.maxScore, 0);
  const reviewPct     = Math.round((totalScore / maxTotalScore) * 100);

  const filteredRefs      = STUDENT_REFERENCES.filter(r =>
    r.title.toLowerCase().includes(refSearch.toLowerCase()) ||
    r.authors[0]?.toLowerCase().includes(refSearch.toLowerCase())
  );
  const filteredModalRefs = STUDENT_REFERENCES.filter(r =>
    r.title.toLowerCase().includes(citeSearch.toLowerCase()) ||
    r.authors[0]?.toLowerCase().includes(citeSearch.toLowerCase())
  );

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const updateContent = (val: string) => {
    const old = activeSection?.content ?? '';
    setSections(prev => prev.map(s =>
      s.id === activeSection?.id
        ? { ...s, content: val, wordCount: countWords(val), status: val.trim() ? 'in-progress' as SectionStatus : 'not-started' as SectionStatus }
        : s
    ));
    if (activeSection) collab.updateSection(activeSection.id, old, val);
  };

  // Project-type switching
  const requestSwitch = (type: ProjectType) => {
    if (type === projectType) return;
    setSwitchModal({ open: true, pending: type });
  };

  const confirmSwitch = () => {
    if (!switchModal.pending) return;
    const newSecs = mapSections(sections, switchModal.pending);
    setSections(newSecs);
    setProjectType(switchModal.pending);
    setActiveSectionId(newSecs[0]?.id ?? '');
    setSwitchModal({ open: false, pending: null });
    notifications.show({ title: 'Project type changed', message: `Template updated to ${switchModal.pending}. Matching content has been preserved.`, color: 'blue' });
  };

  // Section content insert (citations)
  const insertCitation = useCallback((refId: string) => {
    const ref = STUDENT_REFERENCES.find(r => r.id === refId);
    if (!ref) return;
    const lastName = ref.authors[0]?.split(',')[0] ?? 'Author';
    const cite     = ` (${lastName} et al., ${ref.year})`;
    setSections(prev => prev.map(s =>
      s.id === activeSection?.id ? { ...s, content: s.content + cite } : s
    ));
    notifications.show({ title: 'Citation inserted', message: `(${lastName} et al., ${ref.year})`, color: 'blue' });
    setCiteModalOpen(false);
    setCiteSearch('');
  }, [activeSection?.id]);

  // Section rename
  const startEdit = (sec: EditorSection) => { setEditingId(sec.id); setEditingTitle(sec.title); };
  const commitEdit = () => {
    if (!editingId || !editingTitle.trim()) { setEditingId(null); return; }
    setSections(prev => prev.map(s => s.id === editingId ? { ...s, title: editingTitle.trim() } : s));
    setEditingId(null);
  };

  // Add custom section
  const handleAddSection = () => {
    if (!newSecTitle.trim()) return;
    const newSec: EditorSection = {
      id: `custom_${Date.now()}`, key: `custom_${Date.now()}`,
      title: newSecTitle.trim(), mandatory: false,
      placeholder: 'Start writing here…',
      content: '', status: 'not-started', wordCount: 0,
    };
    setSections(prev => [...prev, newSec]);
    setActiveSectionId(newSec.id);
    setAddModal(false);
    setNewSecTitle('');
  };

  // Delete section (non-mandatory only)
  const deleteSection = (id: string) => {
    setSections(prev => {
      const next = prev.filter(s => s.id !== id);
      if (id === activeSectionId) setActiveSectionId(next[0]?.id ?? '');
      return next;
    });
  };

  // AI chat
  const handleSend = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', text }]);
    setChatInput('');
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: `Regarding "${text.slice(0, 60)}${text.length > 60 ? '…' : ''}" — I recommend clarifying your methodology claims with explicit references to your experimental setup. Would you like me to draft a revised paragraph?`,
      }]);
    }, 500);
  };

  // ── Textarea style ────────────────────────────────────────────────────────────
  const textareaStyle: React.CSSProperties = {
    fontFamily, fontSize: parseInt(fontSize), lineHeight: lineSpacing,
    fontWeight:  bold      ? 'bold'   : 'normal',
    fontStyle:   italic    ? 'italic' : 'normal',
    textDecoration: [underline && 'underline', strikethrough && 'line-through'].filter(Boolean).join(' ') || 'none',
    textAlign: alignment,
    border: 'none', outline: 'none', resize: 'none',
    width: '100%', minHeight: 600, background: 'transparent', padding: 0,
    boxSizing: 'border-box', color: '#212529',
  };

  const panelHeight = `calc(100vh - 64px - ${focusMode ? 52 : 92}px)`;

  const TBtn = ({ icon: Icon, active, onClick, label }: { icon: React.ElementType; active?: boolean; onClick?: () => void; label: string }) => (
    <Tooltip label={label} withArrow>
      <ActionIcon variant={active ? 'filled' : 'subtle'} color={active ? 'brand' : 'gray'} onClick={onClick} size="sm">
        <Icon size={14} />
      </ActionIcon>
    </Tooltip>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

      {/* ════════════════ TOOLBAR ════════════════════════════════════════════ */}
      <Box style={{ background: '#fff', borderBottom: '1px solid #e9ecef', flexShrink: 0, zIndex: 10 }}>

        {/* Row 1 — Formatting */}
        {!focusMode && (
          <Group gap={4} px={12} py={6} style={{ borderBottom: '1px solid #f1f3f5', flexWrap: 'wrap', minHeight: 44 }}>
            <Select data={FONT_FAMILIES} value={fontFamily} onChange={v => v && setFontFamily(v)}
              size="xs" w={160} comboboxProps={{ withinPortal: true }} styles={{ input: { fontFamily, fontSize: 12 } }} />
            <Select data={FONT_SIZES} value={fontSize} onChange={v => v && setFontSize(v)}
              size="xs" w={70} comboboxProps={{ withinPortal: true }} />
            <Divider orientation="vertical" mx={4} />
            <TBtn icon={LuBold}          active={bold}          onClick={() => setBold(b => !b)}      label="Bold" />
            <TBtn icon={LuItalic}        active={italic}        onClick={() => setItalic(b => !b)}    label="Italic" />
            <TBtn icon={LuUnderline}     active={underline}     onClick={() => setUnderline(b => !b)} label="Underline" />
            <TBtn icon={LuStrikethrough} active={strikethrough} onClick={() => setStrike(b => !b)}    label="Strikethrough" />
            <Divider orientation="vertical" mx={4} />
            {(['left','center','right','justify'] as Alignment[]).map((a, i) => {
              const icons  = [LuAlignLeft, LuAlignCenter, LuAlignRight, LuAlignJustify];
              const labels = ['Align Left','Align Center','Align Right','Justify'];
              return <TBtn key={a} icon={icons[i]} active={alignment === a} onClick={() => setAlignment(a)} label={labels[i]} />;
            })}
            <Divider orientation="vertical" mx={4} />
            <TBtn icon={LuList}        active={false} label="Bullet List" />
            <TBtn icon={LuListOrdered} active={false} label="Numbered List" />
            <Divider orientation="vertical" mx={4} />
            <Select data={LINE_SPACINGS} value={lineSpacing} onChange={v => v && setLineSpacing(v)}
              size="xs" w={72} comboboxProps={{ withinPortal: true }}
              leftSection={<Text size="9px" c="dimmed" style={{ lineHeight: 1 }}>≡≡</Text>} />
          </Group>
        )}

        {/* Row 2 — Doc actions */}
        <Group justify="space-between" px={12} py={6} style={{ minHeight: 44 }}>
          <Group gap={6}>
            <LuShield size={16} color="#2f9e44" />
            <Text size="sm" fw={600} c="green">88% Integrity</Text>
            {focusMode && <Text size="xs" c="dimmed" ml={12}>{wordCount.toLocaleString()} words</Text>}
          </Group>
          <Group gap={6}>
            {!focusMode && (
              <Button size="xs" variant="subtle" leftSection={<LuQuote size={14} />} onClick={() => setCiteModalOpen(true)}>Cite</Button>
            )}
            <Button size="xs" color="brand" variant="filled" leftSection={<LuSave size={14} />}
              onClick={() => notifications.show({ title: 'Saved', message: 'Your work has been saved.', color: 'green' })}>
              Save
            </Button>
            {(() => {
              const st = activeSection ? getSubStatus(activeSection.id) : null;
              const color = st === 'approved' ? 'green' : st === 'needs-revision' ? 'orange' : 'blue';
              const label = st === 'approved' ? 'Approved' : st === 'needs-revision' ? 'Needs Revision' : st === 'pending' ? 'Pending Review' : 'Submit Chapter';
              return (
                <Button
                  size="xs"
                  color={color}
                  variant={st ? 'light' : 'filled'}
                  leftSection={<LuUpload size={14} />}
                  onClick={st !== 'approved' ? handleSubmitSection : undefined}
                  disabled={st === 'approved'}
                >
                  {label}
                </Button>
              );
            })()}
            <Button size="xs" variant="subtle" leftSection={focusMode ? <LuMinimize size={14} /> : <LuMaximize size={14} />}
              onClick={() => setFocusMode(m => !m)}>
              {focusMode ? 'Exit Focus' : 'Focus Mode'}
            </Button>
          </Group>
        </Group>
      </Box>

      {/* ════════════════ THREE-PANEL ROW ════════════════════════════════════ */}
      <Box style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        {!focusMode && (
          <Box style={{
            width: 240, flexShrink: 0, borderRight: '1px solid #f1f3f5', background: '#fff',
            display: 'flex', flexDirection: 'column', height: panelHeight, overflowY: 'auto',
          }}>
            {/* Project type selector */}
            <Box px={12} pt={12} pb={8} style={{ flexShrink: 0 }}>
              <Text size="10px" fw={700} c="dimmed" mb={6} style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Project Type
              </Text>
              <Select
                data={PROJECT_TYPES}
                value={projectType}
                onChange={v => v && requestSwitch(v as ProjectType)}
                size="xs"
                comboboxProps={{ withinPortal: true }}
                styles={{
                  input: { fontWeight: 600, fontSize: 12, color: BRAND, background: '#f0f4ff', border: `1px solid #c5d2fb` },
                }}
              />
            </Box>

            <Divider />

            {/* Section stats */}
            <Box px={12} pt={8} pb={6} style={{ flexShrink: 0 }}>
              <Group gap={10}>
                {[
                  { color: '#2f9e44', count: approvedCount },
                  { color: '#f08c00', count: inProgressCount },
                  { color: '#e03131', count: notStartedMandatory },
                ].map(({ color, count }) => (
                  <Group key={color} gap={4}>
                    <Box style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                    <Text size="xs" c="dimmed">{count}</Text>
                  </Group>
                ))}
              </Group>
            </Box>

            <Divider />

            {/* Section list */}
            <Stack gap={2} px={8} py={8} style={{ flex: 1 }}>
              {sections.map(sec => {
                const isActive  = sec.id === activeSectionId;
                const isEditing = editingId === sec.id;
                return (
                  <Box
                    key={sec.id}
                    onClick={() => { if (!isEditing) { setActiveSectionId(sec.id); centerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); } }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
                      background: isActive ? '#eef2ff' : 'transparent',
                      transition: 'background 0.15s',
                      position: 'relative',
                    }}
                    className="section-row"
                  >
                    {/* Status icon */}
                    <Box style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      {sectionStatusIcon(sec.status)}
                    </Box>
                    {/* Submission status dot */}
                    {(() => {
                      const st = getSubStatus(sec.id);
                      if (!st) return null;
                      const dotColor = st === 'approved' ? '#2f9e44' : st === 'needs-revision' ? '#e67700' : '#228be6';
                      const tipLabel = st === 'approved' ? 'Approved by supervisor' : st === 'needs-revision' ? `Revision needed: ${getSubComment(sec.id)}` : 'Awaiting supervisor review';
                      return (
                        <Tooltip label={tipLabel} multiline maw={200} withArrow>
                          <Box style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                        </Tooltip>
                      );
                    })()}

                    {/* Title (editable) */}
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      {isEditing ? (
                        <Group gap={4} wrap="nowrap">
                          <TextInput
                            value={editingTitle}
                            onChange={e => setEditingTitle(e.currentTarget.value)}
                            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                            size="xs"
                            autoFocus
                            styles={{ input: { padding: '2px 6px', fontSize: 11, height: 24 } }}
                            style={{ flex: 1 }}
                            onClick={e => e.stopPropagation()}
                          />
                          <ActionIcon size="xs" color="green" variant="subtle" onClick={e => { e.stopPropagation(); commitEdit(); }}><LuCheck size={11} /></ActionIcon>
                          <ActionIcon size="xs" color="gray"  variant="subtle" onClick={e => { e.stopPropagation(); setEditingId(null); }}><LuX size={11} /></ActionIcon>
                        </Group>
                      ) : (
                        <>
                          <Text size="xs" fw={isActive ? 600 : 400}
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isActive ? BRAND : '#212529' }}>
                            {sec.title}
                          </Text>
                          <Text size="9px" c="dimmed">
                            {sec.wordCount > 0 ? `${sec.wordCount.toLocaleString()} words` : 'Empty'}
                          </Text>
                          {getSubStatus(sec.id) === 'needs-revision' && getSubComment(sec.id) && (
                            <Text size="9px" c="orange" style={{ fontStyle: 'italic' }} lineClamp={1}>
                              {getSubComment(sec.id)}
                            </Text>
                          )}
                        </>
                      )}
                    </Box>

                    {/* Right-side icons */}
                    {!isEditing && (
                      <Group gap={2} style={{ flexShrink: 0 }} wrap="nowrap">
                        {sec.supervisorComment && (
                          <Tooltip label={sec.supervisorComment} multiline maw={220} withArrow>
                            <Box style={{ display: 'flex', alignItems: 'center' }}><LuMessageSquare size={11} color="#e67700" /></Box>
                          </Tooltip>
                        )}
                        {sec.mandatory && (
                          <Tooltip label="Required section" withArrow>
                            <Box style={{ display: 'flex', alignItems: 'center' }}><LuLock size={10} color="#adb5bd" /></Box>
                          </Tooltip>
                        )}
                        <Tooltip label="Rename" withArrow>
                          <ActionIcon size="xs" variant="subtle" color="gray"
                            onClick={e => { e.stopPropagation(); startEdit(sec); }}>
                            <LuPencil size={10} />
                          </ActionIcon>
                        </Tooltip>
                        {!sec.mandatory && (
                          <Tooltip label="Delete section" withArrow>
                            <ActionIcon size="xs" variant="subtle" color="red"
                              onClick={e => { e.stopPropagation(); deleteSection(sec.id); }}>
                              <LuTrash2 size={10} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    )}
                  </Box>
                );
              })}
            </Stack>

            {/* Add Section */}
            <Box px={10} pb={12} style={{ flexShrink: 0 }}>
              <Button size="xs" variant="subtle" color="gray" leftSection={<LuPlus size={13} />} fullWidth
                onClick={() => setAddModal(true)}>
                Add Section
              </Button>
            </Box>
          </Box>
        )}

        {/* ── CENTER PANEL ──────────────────────────────────────────────── */}
        <Box ref={centerRef} style={{
          flex: 1, background: '#f0f0f0', overflowY: 'auto',
          height: panelHeight, display: 'flex', flexDirection: 'column',
        }}>
          {/* Sticky section breadcrumb */}
          <Box style={{
            position: 'sticky', top: 0, zIndex: 5, background: '#fff',
            borderBottom: '1px solid #e9ecef', padding: '8px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <Text size="xs" c="dimmed">
              {projectType} &rsaquo;{' '}
              <Text component="span" size="xs" fw={600} c="dark">{activeSection?.title}</Text>
            </Text>
            <Text size="xs" c="dimmed">{wordCount.toLocaleString()} words</Text>
          </Box>

          {/* Presence bar — live collaborators */}
          {collab.connectedUsers.length > 0 && (
            <Box style={{
              padding: '6px 20px', background: '#f8f9ff',
              borderBottom: '1px solid #e7ebff', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              <Group gap={4}>
                <Box style={{ width: 7, height: 7, borderRadius: '50%', background: '#2f9e44', boxShadow: '0 0 0 2px #d3f9d8' }} />
                <Text size="10px" fw={700} c="dimmed" style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>Live</Text>
              </Group>
              {collab.connectedUsers.map(u => {
                const sectionTitle = sections.find(s => s.id === u.sectionId)?.title;
                return (
                  <Tooltip
                    key={u.clientId}
                    label={
                      <Stack gap={2}>
                        <Text size="xs" fw={600}>{u.name}</Text>
                        <Text size="xs" c="dimmed">{u.email}</Text>
                        {sectionTitle && <Text size="xs" c="dimmed">Editing: {sectionTitle}</Text>}
                      </Stack>
                    }
                    withArrow
                  >
                    <Group
                      gap={6}
                      style={{
                        background: 'white',
                        border: `1.5px solid ${u.color}40`,
                        borderRadius: 20,
                        padding: '3px 10px 3px 4px',
                        cursor: 'default',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      }}
                    >
                      <Box style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: u.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, color: 'white', fontWeight: 800, flexShrink: 0,
                      }}>
                        {u.name.charAt(0).toUpperCase()}
                      </Box>
                      <Text size="xs" fw={600} style={{ color: u.color, lineHeight: 1 }}>
                        {u.name.split(' ')[0]}
                      </Text>
                      <Badge size="xs" variant="light" radius="xl" style={{ padding: '0 5px', fontSize: 9 }}>
                        {u.role}
                      </Badge>
                    </Group>
                  </Tooltip>
                );
              })}
            </Box>
          )}

          {/* A4 pages */}
          <Box style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            {Array.from({ length: pageCount }, (_, i) => (
              <Box key={i} style={{ marginBottom: i < pageCount - 1 ? 24 : 0, position: 'relative' }}>
                <Box style={{
                  width: 816, minHeight: 1056, background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                  paddingTop: 72, paddingBottom: 72, paddingLeft: 80, paddingRight: 80,
                  boxSizing: 'border-box', position: 'relative',
                }}>
                  {i === 0 && (
                    <textarea
                      value={content}
                      onChange={e => updateContent(e.target.value)}
                      style={{ ...textareaStyle, height: Math.max(600, pageCount * 912) } as React.CSSProperties}
                      spellCheck
                      placeholder={activeSection?.placeholder ?? 'Start writing here…'}
                    />
                  )}
                  <Box style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center' }}>
                    <Text size="xs" c="dimmed">Page {i + 1}</Text>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── RIGHT PANEL ───────────────────────────────────────────────── */}
        {!focusMode && (
          <Box style={{
            width: 300, flexShrink: 0, borderLeft: '1px solid #f1f3f5', background: '#fff',
            display: 'flex', flexDirection: 'column', height: panelHeight, overflowY: 'auto',
          }}>
            <Tabs value={rightTab} onChange={v => v && setRightTab(v)}
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Tabs.List style={{ flexShrink: 0 }}>
                <Tabs.Tab value="chat"      leftSection={<LuBot      size={13} />} style={{ fontSize: 12 }}>AI Chat</Tabs.Tab>
                <Tabs.Tab value="reviewer"  leftSection={<LuActivity size={13} />} style={{ fontSize: 12 }}>Reviewer</Tabs.Tab>
                <Tabs.Tab value="citations" leftSection={<LuQuote    size={13} />} style={{ fontSize: 12 }}>Citations</Tabs.Tab>
                <Tabs.Tab value="comments"  leftSection={<LuMessageSquare size={13} />} style={{ fontSize: 12 }}>
                  Comments
                  {collab.comments.filter(c => c.sectionId === activeSectionId && !c.resolved).length > 0 && (
                    <Badge size="xs" color="brand" variant="filled" ml={4} radius="xl" style={{ pointerEvents: 'none' }}>
                      {collab.comments.filter(c => c.sectionId === activeSectionId && !c.resolved).length}
                    </Badge>
                  )}
                </Tabs.Tab>
                <Tabs.Tab value="review" leftSection={<LuEye size={13} />} style={{ fontSize: 12 }}>
                  Review
                  {(() => {
                    const sub = getActiveSub();
                    if (!sub) return null;
                    const open = sub.annotations.filter(a => !a.resolved).length;
                    if (open > 0) {
                      return (
                        <Badge size="xs" color="orange" variant="filled" ml={4} radius="xl" style={{ pointerEvents: 'none' }}>
                          {open}
                        </Badge>
                      );
                    }
                    if (sub.supervisorComment || sub.annotations.length > 0) {
                      return (
                        <Badge size="xs" color="green" variant="filled" ml={4} radius="xl" style={{ pointerEvents: 'none' }}>
                          ✓
                        </Badge>
                      );
                    }
                    return null;
                  })()}
                </Tabs.Tab>
              </Tabs.List>

              {/* AI Chat */}
              <Tabs.Panel value="chat" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <Box style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
                  <Stack gap={10}>
                    {chatMessages.map(msg => (
                      <Box key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 6, alignItems: 'flex-end' }}>
                        {msg.role === 'ai' && (
                          <Box style={{ width: 26, height: 26, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <LuBot size={14} color={BRAND} />
                          </Box>
                        )}
                        <Box style={{ maxWidth: '78%', padding: '8px 10px', borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: msg.role === 'user' ? BRAND : '#f8f9fa', color: msg.role === 'user' ? '#fff' : '#212529' }}>
                          <Text size="xs" style={{ lineHeight: 1.5 }}>{msg.text}</Text>
                        </Box>
                        {msg.role === 'user' && (
                          <Box style={{ width: 26, height: 26, borderRadius: '50%', background: '#f1f3f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <LuUser size={14} color="#495057" />
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
                <Box style={{ borderTop: '1px solid #f1f3f5', padding: '8px 10px', flexShrink: 0 }}>
                  <Group gap={6} align="flex-end">
                    <Textarea value={chatInput} onChange={e => setChatInput(e.currentTarget.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Ask the AI assistant…" rows={2} style={{ flex: 1 }}
                      styles={{ input: { fontSize: 12 } }} size="xs" />
                    <ActionIcon color="brand" variant="filled" onClick={handleSend} size="md" style={{ marginBottom: 1 }}>
                      <LuSend size={14} />
                    </ActionIcon>
                  </Group>
                </Box>
              </Tabs.Panel>

              {/* Reviewer */}
              <Tabs.Panel value="reviewer" style={{ overflowY: 'auto', padding: '14px 12px' }}>
                <Box style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <Box style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RingProgress value={reviewPct} size={80} />
                    <Box style={{ position: 'absolute', textAlign: 'center' }}>
                      <Text size="sm" fw={700} c="brand">{reviewPct}%</Text>
                    </Box>
                  </Box>
                  <Box>
                    <Text size="xs" fw={600} mb={2}>Overall Score</Text>
                    <Text size="xs" c="dimmed">{totalScore} / {maxTotalScore} points</Text>
                    <Text size="10px" c="dimmed" mt={2}>Based on {REVIEW_SCORES.length} categories</Text>
                  </Box>
                </Box>
                <Stack gap={8} mb={16}>
                  {REVIEW_SCORES.map((rs: ReviewScore) => (
                    <Box key={rs.category}>
                      <Group justify="space-between" mb={3}>
                        <Text size="xs">{rs.category}</Text>
                        <Text size="xs" c="dimmed">{rs.score}/{rs.maxScore}</Text>
                      </Group>
                      <Progress value={(rs.score / rs.maxScore) * 100}
                        color={rs.score / rs.maxScore >= 0.7 ? 'green' : rs.score / rs.maxScore >= 0.4 ? 'yellow' : 'red'}
                        size="sm" radius="xl" />
                    </Box>
                  ))}
                </Stack>
                <Text size="xs" fw={600} mb={8}>Issues</Text>
                <Stack gap={6}>
                  {REVIEW_ISSUES.map((issue: ReviewIssue) => (
                    <Box key={issue.id}
                      style={{ border: '1px solid #f1f3f5', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', background: expandedIssueId === issue.id ? '#f8f9fa' : '#fff' }}
                      onClick={() => setExpandedIssueId(id => id === issue.id ? null : issue.id)}>
                      <Group gap={6} mb={4}>
                        <Badge size="xs" color={severityColor(issue.severity)} variant="light" tt="capitalize">{issue.severity}</Badge>
                        <Text size="10px" c="dimmed">{issue.sectionTitle}</Text>
                      </Group>
                      <Text size="xs">{issue.message}</Text>
                      {expandedIssueId === issue.id && issue.suggestion && (
                        <Box mt={8} style={{ background: '#f0f4ff', borderRadius: 6, padding: '6px 8px', borderLeft: `3px solid ${BRAND}` }}>
                          <Text size="xs" c="brand">{issue.suggestion}</Text>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Tabs.Panel>

              {/* Comments */}
              <Tabs.Panel value="comments" style={{ overflowY: 'auto', padding: '12px 10px' }}>
                <Stack gap="sm">
                  {/* Add comment */}
                  <Paper withBorder p="sm" radius="md">
                    <Textarea
                      placeholder="Add a comment for this section…"
                      value={commentText}
                      onChange={e => setCommentText(e.currentTarget.value)}
                      rows={2} size="xs" mb="xs"
                      styles={{ input: { fontSize: 12 } }}
                    />
                    <Button
                      size="xs" color="brand" leftSection={<LuSend size={12} />}
                      disabled={!commentText.trim()} fullWidth
                      onClick={() => {
                        collab.addComment({
                          author:    user?.name ?? 'Student',
                          role:      user?.role ?? 'Student',
                          text:      commentText.trim(),
                          sectionId: activeSectionId,
                          resolved:  false,
                          color:     collab.userColor,
                        });
                        setCommentText('');
                      }}
                    >
                      Post Comment
                    </Button>
                  </Paper>

                  {/* Active comments */}
                  {collab.comments.filter(c => c.sectionId === activeSectionId && !c.resolved).length === 0 ? (
                    <Text size="xs" c="dimmed" ta="center" py={20}>No comments yet for this section.</Text>
                  ) : (
                    [...collab.comments]
                      .filter(c => c.sectionId === activeSectionId && !c.resolved)
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .map(c => (
                        <Paper key={c.id} withBorder p="sm" radius="md" style={{ borderLeft: `3px solid ${c.color}` }}>
                          <Group justify="space-between" mb={4} wrap="nowrap">
                            <Group gap={6} wrap="nowrap">
                              <Box style={{ width: 16, height: 16, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                              <Text size="xs" fw={600} lineClamp={1}>{c.author}</Text>
                              <Badge size="xs" variant="light" radius="sm" style={{ flexShrink: 0 }}>{c.role}</Badge>
                            </Group>
                            <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                              <Tooltip label="Mark resolved" withArrow>
                                <ActionIcon size="xs" variant="subtle" color="green" onClick={() => collab.resolveComment(c.id)}>
                                  <LuCheck size={10} />
                                </ActionIcon>
                              </Tooltip>
                              <ActionIcon size="xs" variant="subtle" color="red" onClick={() => collab.deleteComment(c.id)}>
                                <LuTrash2 size={10} />
                              </ActionIcon>
                            </Group>
                          </Group>
                          {c.selectedText && (
                            <Text size="xs" fs="italic" c="dimmed" mb={4} lineClamp={2}>"{c.selectedText}"</Text>
                          )}
                          <Text size="xs" lh={1.5}>{c.text}</Text>
                          <Text size="10px" c="dimmed" mt={4}>
                            {new Date(c.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </Paper>
                      ))
                  )}

                  {/* Resolved */}
                  {collab.comments.filter(c => c.sectionId === activeSectionId && c.resolved).length > 0 && (
                    <>
                      <Divider label="Resolved" labelPosition="center" />
                      {[...collab.comments]
                        .filter(c => c.sectionId === activeSectionId && c.resolved)
                        .map(c => (
                          <Paper key={c.id} withBorder p="sm" radius="md" style={{ opacity: 0.55 }}>
                            <Group justify="space-between" mb={2}>
                              <Text size="xs" fw={600} c="dimmed">{c.author} · <span style={{ fontWeight: 400 }}>{c.role}</span></Text>
                              <ActionIcon size="xs" color="red" variant="subtle" onClick={() => collab.deleteComment(c.id)}>
                                <LuTrash2 size={10} />
                              </ActionIcon>
                            </Group>
                            <Text size="xs" c="dimmed">{c.text}</Text>
                          </Paper>
                        ))}
                    </>
                  )}
                </Stack>
              </Tabs.Panel>

              {/* Citations */}
              <Tabs.Panel value="citations" style={{ overflowY: 'auto', padding: '12px 10px' }}>
                <TextInput placeholder="Search references…" leftSection={<LuSearch size={14} />}
                  size="xs" mb={10} value={refSearch} onChange={e => setRefSearch(e.currentTarget.value)} />
                <Stack gap={6}>
                  {filteredRefs.map(ref => (
                    <Box key={ref.id} style={{ border: '1px solid #f1f3f5', borderRadius: 8, padding: '8px 10px' }}>
                      <Text size="xs" fw={500} mb={2} lineClamp={2}>{ref.title}</Text>
                      <Text size="xs" c="dimmed" mb={6}>{ref.authors[0]} · {ref.year}</Text>
                      <Button size="xs" variant="light" color="brand" onClick={() => insertCitation(ref.id)}>Insert</Button>
                    </Box>
                  ))}
                  {filteredRefs.length === 0 && <Text size="xs" c="dimmed" ta="center" py={20}>No references found.</Text>}
                </Stack>
              </Tabs.Panel>

              {/* Supervisor Review */}
              <Tabs.Panel value="review" style={{ overflowY: 'auto', padding: '12px 10px' }}>
                {(() => {
                  const sub = getActiveSub();
                  if (!sub) {
                    return (
                      <Stack align="center" py={32} gap={8}>
                        <LuEye size={28} color="#ced4da" />
                        <Text size="xs" c="dimmed" ta="center">
                          This section hasn't been submitted yet.<br />Submit it so your supervisor can review it.
                        </Text>
                      </Stack>
                    );
                  }

                  const statusColor = sub.status === 'approved' ? 'green' : sub.status === 'needs-revision' ? 'orange' : 'blue';
                  const statusLabel = sub.status === 'approved' ? 'Approved' : sub.status === 'needs-revision' ? 'Needs Revision' : 'Pending Review';
                  const activeAnns   = sub.annotations.filter(a => !a.resolved);
                  const resolvedAnns = sub.annotations.filter(a =>  a.resolved);

                  return (
                    <Stack gap={12}>

                      {/* Status + supervisor comment */}
                      <Paper withBorder p="sm" radius="md" style={{ borderLeft: `3px solid var(--mantine-color-${statusColor}-6)` }}>
                        <Group justify="space-between" mb={4}>
                          <Text size="xs" fw={600}>Supervisor Feedback</Text>
                          <Badge size="xs" color={statusColor} variant="light">{statusLabel}</Badge>
                        </Group>
                        <Text size="10px" c="dimmed">
                          Submitted {new Date(sub.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {sub.reviewedAt && ` · Reviewed ${new Date(sub.reviewedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                        </Text>
                        {sub.supervisorComment && (
                          <Box mt={8} style={{ background: '#fff8e1', borderRadius: 6, padding: '6px 8px', borderLeft: '3px solid #f08c00' }}>
                            <Text size="xs" style={{ fontStyle: 'italic', color: '#e67700' }}>"{sub.supervisorComment}"</Text>
                          </Box>
                        )}
                        {sub.status === 'pending' && !sub.supervisorComment && (
                          <Text size="xs" c="dimmed" mt={6} style={{ fontStyle: 'italic' }}>Awaiting supervisor review…</Text>
                        )}
                      </Paper>

                      {/* Active (unresolved) annotations */}
                      {activeAnns.length > 0 && (
                        <>
                          <Text size="10px" fw={700} c="dimmed" style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            Open Annotations ({activeAnns.length})
                          </Text>

                          {/* Content preview with highlights */}
                          <Box style={{
                            border: '1px solid #e9ecef', borderRadius: 8, padding: '10px 12px',
                            background: '#fafbff', fontSize: 11, lineHeight: 1.7, color: '#212529',
                            maxHeight: 160, overflowY: 'auto', userSelect: 'none',
                          }}>
                            {applyReviewHighlights(sub.content, activeAnns)}
                          </Box>

                          {/* Annotation cards */}
                          <Stack gap={8}>
                            {activeAnns.map((ann, idx) => (
                              <Paper key={ann.id} withBorder p="sm" radius="md"
                                style={{ borderLeft: `3px solid ${ann.color}`, background: ann.color + '22' }}
                              >
                                <Group justify="space-between" mb={4} wrap="nowrap">
                                  <Group gap={6} wrap="nowrap">
                                    <Box style={{ width: 14, height: 14, borderRadius: 3, background: ann.color, border: '1px solid #ddd', flexShrink: 0 }} />
                                    <Text size="10px" fw={700} c="dimmed">Note {idx + 1}</Text>
                                  </Group>
                                  <Group gap={4} wrap="nowrap">
                                    <Text size="9px" c="dimmed">
                                      {new Date(ann.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    </Text>
                                    <Tooltip label="Mark as resolved" withArrow>
                                      <ActionIcon
                                        size="xs" color="green" variant="subtle"
                                        onClick={() => dispatch(resolveAnnotation({ subId: sub.id, annId: ann.id }))}
                                      >
                                        <LuCircleCheck size={13} />
                                      </ActionIcon>
                                    </Tooltip>
                                  </Group>
                                </Group>
                                <Text size="xs" fs="italic" c="dimmed" mb={4} lineClamp={2}>"{ann.selectedText}"</Text>
                                <Text size="xs" lh={1.5}>{ann.comment}</Text>
                              </Paper>
                            ))}
                          </Stack>
                        </>
                      )}

                      {/* Resolved annotations toggle */}
                      {resolvedAnns.length > 0 && (
                        <>
                          <Box
                            onClick={() => setShowResolvedAnnos(v => !v)}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}
                          >
                            <LuCircleCheck size={12} color="#2f9e44" />
                            <Text size="xs" c="green" fw={600} style={{ textDecoration: 'underline' }}>
                              {showResolvedAnnos ? 'Hide' : 'Show'} resolved ({resolvedAnns.length})
                            </Text>
                          </Box>

                          {showResolvedAnnos && (
                            <Stack gap={6}>
                              {resolvedAnns.map((ann, idx) => (
                                <Paper key={ann.id} withBorder p="sm" radius="md"
                                  style={{ borderLeft: '3px solid #ced4da', background: '#f8f9fa', opacity: 0.6 }}
                                >
                                  <Group justify="space-between" mb={4} wrap="nowrap">
                                    <Group gap={6} wrap="nowrap">
                                      <Box style={{ width: 14, height: 14, borderRadius: 3, background: '#ced4da', border: '1px solid #ddd', flexShrink: 0 }} />
                                      <Text size="10px" fw={700} c="dimmed">Note {idx + 1}</Text>
                                      <Badge size="xs" color="green" variant="light" radius="xl">Resolved</Badge>
                                    </Group>
                                    <LuCircleCheck size={12} color="#2f9e44" />
                                  </Group>
                                  <Text size="xs" fs="italic" c="dimmed" mb={4} lineClamp={2}
                                    style={{ textDecoration: 'line-through' }}>
                                    "{ann.selectedText}"
                                  </Text>
                                  <Text size="xs" c="dimmed" lh={1.5}>{ann.comment}</Text>
                                </Paper>
                              ))}
                            </Stack>
                          )}
                        </>
                      )}

                      {/* Empty state after all resolved */}
                      {activeAnns.length === 0 && resolvedAnns.length === 0 && sub.status !== 'pending' && !sub.supervisorComment && (
                        <Text size="xs" c="dimmed" ta="center" py={12}>No annotations left by your supervisor.</Text>
                      )}
                      {activeAnns.length === 0 && resolvedAnns.length > 0 && (
                        <Paper withBorder p="sm" radius="md" style={{ background: '#ebfbee', borderColor: '#b2f2bb' }}>
                          <Group gap={6}>
                            <LuCircleCheck size={14} color="#2f9e44" />
                            <Text size="xs" fw={600} c="green">All annotations resolved — great work!</Text>
                          </Group>
                        </Paper>
                      )}

                    </Stack>
                  );
                })()}
              </Tabs.Panel>
            </Tabs>
          </Box>
        )}
      </Box>

      {/* ════════════════ SWITCH PROJECT TYPE MODAL ══════════════════════════ */}
      <Modal
        opened={switchModal.open}
        onClose={() => setSwitchModal({ open: false, pending: null })}
        title={
          <Text fw={700} size="md" style={{ fontFamily: 'Playfair Display, serif' }}>
            Switch Project Type?
          </Text>
        }
        centered
        size="sm"
        styles={{ body: { paddingTop: 8 } }}
      >
        <Stack gap="lg">
          <Text size="sm" c="dimmed">
            Switching from{' '}
            <Text component="span" fw={700} c="dark">{projectType}</Text>
            {' '}to{' '}
            <Text component="span" fw={700} c="dark">{switchModal.pending}</Text>
            {' '}will restructure your sections. Existing content will be mapped to matching sections where possible.
          </Text>

          <Paper withBorder p="sm" radius="md" style={{ background: '#fff8e1', borderColor: '#ffd43b' }}>
            <Group gap="sm" wrap="nowrap">
              <LuTriangleAlert size={16} color="#e67700" style={{ flexShrink: 0 }} />
              <Text size="xs" c="dimmed">
                <strong style={{ color: '#e67700' }}>Save your work first.</strong>{' '}
                Any unsaved changes will be lost. This action cannot be undone.
              </Text>
            </Group>
          </Paper>

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setSwitchModal({ open: false, pending: null })}>
              Cancel
            </Button>
            <Button color="brand" onClick={confirmSwitch}>
              Switch Type
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ════════════════ ADD SECTION MODAL ══════════════════════════════════ */}
      <Modal
        opened={addModal}
        onClose={() => { setAddModal(false); setNewSecTitle(''); }}
        title={
          <Text fw={700} size="sm" style={{ fontFamily: 'Playfair Display, serif' }}>
            Add New Section
          </Text>
        }
        centered
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label="Section Title"
            placeholder="e.g. Ethical Considerations"
            value={newSecTitle}
            onChange={e => setNewSecTitle(e.currentTarget.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); }}
            autoFocus
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => { setAddModal(false); setNewSecTitle(''); }}>Cancel</Button>
            <Button color="brand" leftSection={<LuPlus size={13} />} onClick={handleAddSection} disabled={!newSecTitle.trim()}>
              Add Section
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ════════════════ CITATION MODAL ═════════════════════════════════════ */}
      <Modal
        opened={citeModalOpen}
        onClose={() => { setCiteModalOpen(false); setCiteSearch(''); }}
        title={<Text fw={700} size="sm" style={{ fontFamily: 'Playfair Display, serif' }}>Insert Citation</Text>}
        size="lg" centered
      >
        <TextInput placeholder="Search by title or author…" leftSection={<LuSearch size={15} />}
          mb={12} value={citeSearch} onChange={e => setCiteSearch(e.currentTarget.value)} />
        <Stack gap={8}>
          {filteredModalRefs.map(ref => (
            <Group key={ref.id} justify="space-between" align="flex-start">
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={500} lineClamp={2}>{ref.title}</Text>
                <Text size="xs" c="dimmed">{ref.authors[0]}{ref.authors.length > 1 ? ' et al.' : ''} · {ref.year} · {ref.journal}</Text>
              </Box>
              <Button size="xs" color="brand" variant="filled" style={{ flexShrink: 0 }} onClick={() => insertCitation(ref.id)}>Insert</Button>
            </Group>
          ))}
          {filteredModalRefs.length === 0 && <Text size="sm" c="dimmed" ta="center" py={24}>No references match your search.</Text>}
        </Stack>
      </Modal>
    </Box>
  );
}
