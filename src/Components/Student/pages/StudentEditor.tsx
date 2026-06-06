import { useState, useRef, useCallback, useEffect } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import {
  Box, Text, Group, Stack, Select, ActionIcon, Divider,
  Tabs, Textarea, Button, Badge, Progress, Modal,
  TextInput, Tooltip, Paper, Drawer,
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
  LuMenu, LuArrowLeft,
} from 'react-icons/lu';
import { STUDENT_REFERENCES, REVIEW_SCORES, REVIEW_ISSUES } from '../studentData';
import { STUDENT_SECTIONS } from '../studentData';
import type { ReviewScore, ReviewIssue } from '../studentData';
import {
  PROJECT_TYPES, buildSections, mapSections,
} from '../editorTemplates';
import type { ProjectType, EditorSection, SectionStatus } from '../editorTemplates';
import { useAppSelector, useAppDispatch } from '../../../Redux/hooks';
import { submitSection, resolveAnnotation, approveSubmission, requestRevision, addAnnotation, updateAnnotation, deleteAnnotation } from '../../../Redux/slices/submissionsSlice';
import type { SubmissionStatus, SubmissionAnnotation } from '../../../Redux/slices/submissionsSlice';
import { submitChapter, fetchStudentSubmissions, resolveAnnotationDB } from '../../../supabase/submissions';
import { fetchSectionDrafts, saveSectionDrafts } from '../../../supabase/drafts';
import { supabase } from '../../../supabase/client';
import type { DBSubmission } from '../../../supabase/submissions';
import { useCollaborativeDoc } from '../../../hooks/useCollaborativeDoc';


// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Initial sections â€” empty; Supabase drafts + submissions populate content â”€â”€â”€
function buildInitialSections(): EditorSection[] {
  return STUDENT_SECTIONS.map(s => ({
    id:          s.id,
    key:         s.key,
    title:       s.title,
    mandatory:   s.mandatory,
    placeholder: `Start writing your ${s.title.toLowerCase()} hereâ€¦`,
    content:     '',
    status:      'not-started' as SectionStatus,
    wordCount:   0,
  }));
}

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function StudentEditor() {

  // â”€â”€ Core state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [projectType, setProjectType]     = useState<ProjectType>('Thesis');
  const [sections,    setSections]        = useState<EditorSection[]>(buildInitialSections);
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? '');

  // â”€â”€ Switch-type modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [switchModal, setSwitchModal]     = useState<{ open: boolean; pending: ProjectType | null }>({ open: false, pending: null });

  // â”€â”€ Section rename state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [editingId,    setEditingId]      = useState<string | null>(null);
  const [editingTitle, setEditingTitle]   = useState('');

  // â”€â”€ Add-section modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [addModal,      setAddModal]      = useState(false);
  const [newSecTitle,   setNewSecTitle]   = useState('');

  // â”€â”€ Formatting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [fontFamily,  setFontFamily]  = useState('Georgia');
  const [fontSize,    setFontSize]    = useState('12');
  const [lineSpacing, setLineSpacing] = useState('1.5');
  const [bold,        setBold]        = useState(false);
  const [italic,      setItalic]      = useState(false);
  const [underline,   setUnderline]   = useState(false);
  const [strikethrough, setStrike]    = useState(false);
  const [alignment,   setAlignment]   = useState<Alignment>('left');

  // â”€â”€ UI state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [focusMode,     setFocusMode]     = useState(false);
  const [citeModalOpen, setCiteModalOpen] = useState(false);
  const [citeSearch,    setCiteSearch]    = useState('');
  const [rightTab,      setRightTab]      = useState<string>('reviewer');
  const [showResolvedAnnos, setShowResolvedAnnos] = useState(false);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [refSearch,     setRefSearch]     = useState('');

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'ai-1', role: 'ai', text: 'Hello! I am your AI writing assistant. I can help you refine arguments, suggest citations, improve clarity, or expand sections. What would you like to work on?' },
    { id: 'ai-2', role: 'ai', text: 'Tip: You are currently in Chapter 1. Consider adding a thesis roadmap paragraph at the end of your introduction â€” it helps examiners navigate your structure.' },
  ]);
  const [chatInput, setChatInput] = useState('');

  const centerRef = useRef<HTMLDivElement>(null);

  // â”€â”€ Redux + Supabase submissions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const dispatch    = useAppDispatch();
  const user        = useAppSelector(s => s.auth.user);
  const [projectTitle, setProjectTitle] = useState('');

  // â”€â”€ Fetch project title â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('users')
      .select('project_title')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setProjectTitle(data?.project_title ?? ''));
  }, [user?.id]);

  const mySubmissions = useAppSelector(s =>
    s.submissions.list.filter(sub => sub.studentId === user?.id),
  );

  // â”€â”€ Load drafts + submissions from Supabase on mount â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Drafts  â†’ populate editor content (what the student is currently writing)
  // Submissions â†’ populate Redux for status badges; also seed editor if no draft
  useEffect(() => {
    if (!user?.id) return;

    Promise.all([
      fetchSectionDrafts(user.id),
      fetchStudentSubmissions(user.id),
    ]).then(([drafts, dbSubs]) => {

      setSections(prev => {
        // Update standard sections with saved draft or submission content
        const updated = prev.map(sec => {
          const draft = drafts.find(d => d.section_id === sec.id);
          if (draft && draft.content.trim()) {
            return { ...sec, content: draft.content, wordCount: countWords(draft.content), status: 'in-progress' as SectionStatus };
          }
          // No draft yet â€” seed from submitted content so student sees their work
          const sub = dbSubs.find(s => s.section_id === sec.id);
          if (sub && sub.content.trim()) {
            return { ...sec, content: sub.content, wordCount: countWords(sub.content), status: 'in-progress' as SectionStatus };
          }
          return sec;
        });

        // Re-attach any custom sections saved as drafts
        const existingIds = new Set(prev.map(s => s.id));
        const customSections: EditorSection[] = drafts
          .filter(d => !existingIds.has(d.section_id))
          .map(d => ({
            id:          d.section_id,
            key:         d.section_id,
            title:       d.section_title,
            mandatory:   false,
            placeholder: 'Start writing hereâ€¦',
            content:     d.content,
            status:      d.content.trim() ? 'in-progress' as SectionStatus : 'not-started' as SectionStatus,
            wordCount:   countWords(d.content),
          }));

        return [...updated, ...customSections];
      });

      // Sync submissions to Redux for status + annotation tracking
      dbSubs.forEach(dbSub => {
        dispatch(submitSection({
          id:           dbSub.id,
          studentId:    user.id,
          studentName:  user.name ?? '',
          sectionId:    dbSub.section_id,
          sectionTitle: dbSub.section_title,
          content:      dbSub.content,
        }));
        if (dbSub.status === 'approved') {
          dispatch(approveSubmission({ id: dbSub.id }));
        } else if (dbSub.status === 'needs-revision' && dbSub.supervisor_comment) {
          dispatch(requestRevision({ id: dbSub.id, comment: dbSub.supervisor_comment }));
        }
        (dbSub.annotations ?? []).forEach(ann => {
          dispatch(addAnnotation({
            id:           ann.id,
            subId:        dbSub.id,
            selectedText: ann.selected_text,
            comment:      ann.comment,
            color:        ann.color,
          }));
        });
      });

    }).catch(() => {});
  }, [user?.id]);

  const getSubStatus = (sectionId: string): SubmissionStatus | null =>
    mySubmissions.find(s => s.sectionId === sectionId)?.status ?? null;

  const getSubComment = (sectionId: string): string =>
    mySubmissions.find(s => s.sectionId === sectionId)?.supervisorComment ?? '';

  const getActiveSub = () => mySubmissions.find(s => s.sectionId === activeSectionId) ?? null;

  const handleSubmitSection = async () => {
    if (!user || !activeSection || !activeSection.content.trim()) {
      notifications.show({ title: 'Nothing to submit', message: 'Write some content first.', color: 'orange' });
      return;
    }

    // Save draft first so the submitted content matches what's in the database
    saveSectionDrafts(user.id, [{
      sectionId:    activeSection.id,
      sectionTitle: activeSection.title,
      content:      activeSection.content,
    }]).catch(() => {});

    // Save to Redux for immediate UI update
    dispatch(submitSection({
      studentId:    user.id,
      studentName:  user.name,
      sectionId:    activeSection.id,
      sectionTitle: activeSection.title,
      content:      activeSection.content,
    }));
    // Persist submission to Supabase
    submitChapter({
      studentId:     user.id,
      supervisorId:  user.supervisorId ?? null,
      institutionId: user.institutionId ?? '',
      sectionId:     activeSection.id,
      sectionTitle:  activeSection.title,
      content:       activeSection.content,
    }).catch(err => console.error('submitChapter failed:', err));

    notifications.show({ title: 'Chapter submitted', message: `"${activeSection.title}" sent to your supervisor for review.`, color: 'blue' });
  };

  // â”€â”€ Responsive breakpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1100px)');
  const [mobilePanel,  setMobilePanel]  = useState<'sections' | 'editor' | 'review'>('editor');
  const [drawerTab,    setDrawerTab]    = useState<string | null>(null);

  // â”€â”€ Draft save / load via localStorage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const draftKey = useCallback(
    (sectionKey: string) => `cognita_draft_${user?.id ?? 'anon'}_${sectionKey}`,
    [user?.id],
  );

  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    // All sections get saved: custom ones always (to preserve their existence),
    // standard ones only when they have content.
    const toSave = sections
      .filter(s => s.content.trim() || s.id.startsWith('custom_'))
      .map(s => ({ sectionId: s.id, sectionTitle: s.title, content: s.content }));

    // localStorage as instant offline backup
    sections.forEach(sec => {
      if (sec.content.trim()) localStorage.setItem(draftKey(sec.key), sec.content);
    });

    if (toSave.length > 0) {
      try {
        await saveSectionDrafts(user.id, toSave);
      } catch {
        notifications.show({
          title: 'Saved locally only',
          message: 'Could not reach the database. Your work is saved locally â€” try again when online.',
          color: 'orange',
        });
        return;
      }
    }

    notifications.show({
      title: 'Draft saved',
      message: `${toSave.length} section${toSave.length !== 1 ? 's' : ''} saved to database.`,
      color: 'green',
    });
  }, [sections, user?.id, draftKey]);

  // â”€â”€ Collaborative editing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Derived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    const id = `custom_${Date.now()}`;
    const newSec: EditorSection = {
      id, key: id,
      title: newSecTitle.trim(), mandatory: false,
      placeholder: 'Start writing hereâ€¦',
      content: '', status: 'not-started', wordCount: 0,
    };
    setSections(prev => [...prev, newSec]);
    setActiveSectionId(id);
    setAddModal(false);
    setNewSecTitle('');
    // Persist immediately so the section survives a page refresh
    if (user?.id) {
      saveSectionDrafts(user.id, [{ sectionId: id, sectionTitle: newSec.title, content: '' }]).catch(() => {});
    }
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
        text: `Regarding "${text.slice(0, 60)}${text.length > 60 ? 'â€¦' : ''}" â€” I recommend clarifying your methodology claims with explicit references to your experimental setup. Would you like me to draft a revised paragraph?`,
      }]);
    }, 500);
  };

  // â”€â”€ Textarea style â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Right panel tabs (shared by mobile panel and desktop drawer) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderRightTabs = () => (
    <Tabs value={rightTab} onChange={v => v && setRightTab(v)}
      style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
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
                  âœ“
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
              placeholder="Ask the AI assistantâ€¦" rows={2} style={{ flex: 1 }}
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
          <Paper withBorder p="sm" radius="md">
            <Textarea
              placeholder="Add a comment for this sectionâ€¦"
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

          {collab.comments.filter(c => c.sectionId === activeSectionId && c.resolved).length > 0 && (
            <>
              <Divider label="Resolved" labelPosition="center" />
              {[...collab.comments]
                .filter(c => c.sectionId === activeSectionId && c.resolved)
                .map(c => (
                  <Paper key={c.id} withBorder p="sm" radius="md" style={{ opacity: 0.55 }}>
                    <Group justify="space-between" mb={2}>
                      <Text size="xs" fw={600} c="dimmed">{c.author} Â· <span style={{ fontWeight: 400 }}>{c.role}</span></Text>
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
        <TextInput placeholder="Search referencesâ€¦" leftSection={<LuSearch size={14} />}
          size="xs" mb={10} value={refSearch} onChange={e => setRefSearch(e.currentTarget.value)} />
        <Stack gap={6}>
          {filteredRefs.map(ref => (
            <Box key={ref.id} style={{ border: '1px solid #f1f3f5', borderRadius: 8, padding: '8px 10px' }}>
              <Text size="xs" fw={500} mb={2} lineClamp={2}>{ref.title}</Text>
              <Text size="xs" c="dimmed" mb={6}>{ref.authors[0]} Â· {ref.year}</Text>
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
              <Paper withBorder p="sm" radius="md" style={{ borderLeft: `3px solid var(--mantine-color-${statusColor}-6)` }}>
                <Group justify="space-between" mb={4}>
                  <Text size="xs" fw={600}>Supervisor Feedback</Text>
                  <Badge size="xs" color={statusColor} variant="light">{statusLabel}</Badge>
                </Group>
                <Text size="10px" c="dimmed">
                  Submitted {new Date(sub.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {sub.reviewedAt && ` Â· Reviewed ${new Date(sub.reviewedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                </Text>
                {sub.supervisorComment && (
                  <Box mt={8} style={{ background: '#fff8e1', borderRadius: 6, padding: '6px 8px', borderLeft: '3px solid #f08c00' }}>
                    <Text size="xs" style={{ fontStyle: 'italic', color: '#e67700' }}>"{sub.supervisorComment}"</Text>
                  </Box>
                )}
                {sub.status === 'pending' && !sub.supervisorComment && (
                  <Text size="xs" c="dimmed" mt={6} style={{ fontStyle: 'italic' }}>Awaiting supervisor reviewâ€¦</Text>
                )}
              </Paper>

              {activeAnns.length > 0 && (
                <>
                  <Text size="10px" fw={700} c="dimmed" style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Open Annotations ({activeAnns.length})
                  </Text>
                  <Box style={{
                    border: '1px solid #e9ecef', borderRadius: 8, padding: '10px 12px',
                    background: '#fafbff', fontSize: 11, lineHeight: 1.7, color: '#212529',
                    maxHeight: 160, overflowY: 'auto', userSelect: 'none',
                  }}>
                    {applyReviewHighlights(sub.content, activeAnns)}
                  </Box>
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
                                onClick={() => {
                                  dispatch(resolveAnnotation({ subId: sub.id, annId: ann.id }));
                                  resolveAnnotationDB(ann.id).catch(() => {});
                                  setShowResolvedAnnos(true);
                                }}
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

              {activeAnns.length === 0 && resolvedAnns.length === 0 && sub.status !== 'pending' && !sub.supervisorComment && (
                <Text size="xs" c="dimmed" ta="center" py={12}>No annotations left by your supervisor.</Text>
              )}
              {activeAnns.length === 0 && resolvedAnns.length > 0 && (
                <Paper withBorder p="sm" radius="md" style={{ background: '#ebfbee', borderColor: '#b2f2bb' }}>
                  <Group gap={6}>
                    <LuCircleCheck size={14} color="#2f9e44" />
                    <Text size="xs" fw={600} c="green">All annotations resolved â€” great work!</Text>
                  </Group>
                </Paper>
              )}
            </Stack>
          );
        })()}
      </Tabs.Panel>
    </Tabs>
  );

  
  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TOOLBAR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Box style={{ background: '#fff', borderBottom: '1px solid #e9ecef', flexShrink: 0, zIndex: 10 }}>

        {/* Row 1 â€” Formatting */}
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
              leftSection={<Text size="9px" c="dimmed" style={{ lineHeight: 1 }}>â‰¡â‰¡</Text>} />
          </Group>
        )}

        {/* Row 2 â€” Doc actions */}
        <Group justify="space-between" px={12} py={6} style={{ minHeight: 44 }}>
          <Group gap={8} style={{ minWidth: 0, flex: 1 }}>
            <Text
              size="sm"
              fw={700}
              c="dark"
              style={{
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 320,
              }}
            >
              {projectTitle || user?.name ? (projectTitle || `${user?.name}'s Project`) : 'Research Project'}
            </Text>
            {focusMode && (
              <Text size="xs" c="dimmed">{wordCount.toLocaleString()} words</Text>
            )}
          </Group>
          <Group gap={6} wrap="nowrap">
            {!focusMode && !isMobile && (
              <Button size="xs" variant="subtle" leftSection={<LuQuote size={14} />} onClick={() => setCiteModalOpen(true)}>Cite</Button>
            )}
            <Button
              size="xs"
              color="brand"
              variant="light"
              leftSection={<LuSave size={14} />}
              onClick={handleSave}
            >
              {isMobile ? '' : 'Save'}
            </Button>
            {(() => {
              const st = activeSection ? getSubStatus(activeSection.id) : null;
              const color = st === 'approved' ? 'green' : st === 'needs-revision' ? 'orange' : 'blue';
              const label = st === 'approved' ? 'Approved' : st === 'needs-revision' ? 'Revision' : st === 'pending' ? 'Pending' : 'Submit';
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
            {!isMobile && (
              <Button size="xs" variant="subtle" leftSection={focusMode ? <LuMinimize size={14} /> : <LuMaximize size={14} />}
                onClick={() => setFocusMode(m => !m)}>
                {focusMode ? 'Exit' : 'Focus'}
              </Button>
            )}
          </Group>
        </Group>
      </Box>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• THREE-PANEL ROW â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Box style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* â”€â”€ LEFT PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {!focusMode && (!isMobile || mobilePanel === 'sections') && (
          <Box style={{
            width: isMobile ? '100%' : 240,
            flexShrink: 0, borderRight: '1px solid #f1f3f5', background: '#fff',
            display: 'flex', flexDirection: 'column', height: panelHeight, overflowY: 'auto',
          }}>
            {/* Mobile: back-to-editor button */}
            {isMobile && (
              <Box px={12} pt={10} pb={6} style={{ flexShrink: 0, borderBottom: '1px solid #f1f3f5' }}>
                <Button size="xs" variant="subtle" leftSection={<LuArrowLeft size={13} />}
                  onClick={() => setMobilePanel('editor')}>
                  Back to Editor
                </Button>
              </Box>
            )}
            {/* Project title */}
            {projectTitle && (
              <Box px={12} pt={12} pb={4} style={{ flexShrink: 0 }}>
                {/* <Text size="xs" fw={700} lineClamp={2} lh={1.35} c="dark">
                  {projectTitle}
                </Text> */}
                {user?.name && (
                  <Text size="10px" c="dimmed" mt={2}>{user.name}</Text>
                )}
              </Box>
            )}

            {/* Project type selector */}
            <Box px={12} pt={projectTitle ? 6 : 12} pb={8} style={{ flexShrink: 0 }}>
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

        {/* â”€â”€ CENTER PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {(!isMobile || mobilePanel === 'editor') && (
        <Box ref={centerRef} style={{
          flex: 1, background: isMobile ? '#fff' : '#f0f0f0',
          overflowY: 'auto', overflowX: isMobile ? 'hidden' : 'scroll',
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

          {/* Presence bar â€” live collaborators */}
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

          {/* Mobile: plain full-screen textarea */}
          {isMobile ? (
            <textarea
              value={content}
              onChange={e => updateContent(e.target.value)}
              spellCheck
              placeholder={activeSection?.placeholder ?? 'Start writing hereâ€¦'}
              style={{
                flex: 1,
                width: '100%',
                resize: 'none',
                border: 'none',
                outline: 'none',
                padding: '16px',
                fontSize: 16,
                lineHeight: 1.7,
                fontFamily,
                background: '#fff',
                color: '#212529',
                boxSizing: 'border-box',
              }}
            />
          ) : (
            /* Desktop / tablet: A4 pages */
            <Box style={{ padding: '24px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, minWidth: 912 }}>
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
                        placeholder={activeSection?.placeholder ?? 'Start writing hereâ€¦'}
                      />
                    )}
                    <Box style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center' }}>
                      <Text size="xs" c="dimmed">Page {i + 1}</Text>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
        )}

        {/* â”€â”€ MOBILE: full-screen review panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {!focusMode && isMobile && mobilePanel === 'review' && (
          <Box style={{
            width: '100%', flexShrink: 0, borderLeft: '1px solid #f1f3f5', background: '#fff',
            display: 'flex', flexDirection: 'column', height: panelHeight, overflowY: 'auto',
          }}>
            <Box px={12} pt={10} pb={6} style={{ flexShrink: 0, borderBottom: '1px solid #f1f3f5' }}>
              <Button size="xs" variant="subtle" leftSection={<LuArrowLeft size={13} />}
                onClick={() => setMobilePanel('editor')}>
                Back to Editor
              </Button>
            </Box>
            {renderRightTabs()}
          </Box>
        )}

        {/* â”€â”€ ICON STRIP (tablet / desktop) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {!focusMode && !isMobile && (
          <Box style={{
            width: 44, flexShrink: 0, borderLeft: '1px solid #f1f3f5', background: '#fff',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            paddingTop: 8, paddingBottom: 8, gap: 2,
          }}>
            {([
              { tab: 'chat',      Icon: LuBot,            label: 'AI Chat',   badgeColor: 'brand',  badge: 0 },
              { tab: 'reviewer',  Icon: LuActivity,       label: 'Reviewer',  badgeColor: 'brand',  badge: 0 },
              { tab: 'citations', Icon: LuQuote,          label: 'Citations', badgeColor: 'brand',  badge: 0 },
              { tab: 'comments',  Icon: LuMessageSquare,  label: 'Comments',  badgeColor: 'brand',
                badge: collab.comments.filter(c => c.sectionId === activeSectionId && !c.resolved).length },
              { tab: 'review',    Icon: LuEye,            label: 'Review',    badgeColor: 'orange',
                badge: getActiveSub()?.annotations.filter(a => !a.resolved).length ?? 0 },
            ] as { tab: string; Icon: React.ElementType; label: string; badge: number; badgeColor: string }[]).map(({ tab, Icon, label, badge, badgeColor }) => (
              <Tooltip key={tab} label={label} position="left" withArrow>
                <Box style={{ position: 'relative', display: 'flex' }}>
                  <ActionIcon
                    size="lg"
                    variant={drawerTab === tab ? 'light' : 'subtle'}
                    color={drawerTab === tab ? 'brand' : 'gray'}
                    onClick={() => {
                      if (drawerTab === tab) { setDrawerTab(null); }
                      else { setDrawerTab(tab); setRightTab(tab); }
                    }}
                  >
                    <Icon size={17} />
                  </ActionIcon>
                  {badge > 0 && (
                    <Box style={{ position: 'absolute', top: -3, right: -3, zIndex: 1 }}>
                      <Badge size="xs" color={badgeColor} variant="filled" circle>{badge}</Badge>
                    </Box>
                  )}
                </Box>
              </Tooltip>
            ))}
          </Box>
        )}

        {/* â”€â”€ DRAWER (tablet / desktop) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {!isMobile && (
          <Drawer
            opened={drawerTab !== null && !focusMode}
            onClose={() => setDrawerTab(null)}
            position="right"
            size={380}
            withOverlay={false}
            withCloseButton={false}
            trapFocus={false}
            lockScroll={false}
            zIndex={98}
            styles={{
              inner:   { top: 64, height: 'calc(100vh - 64px)' },
              content: { height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', borderRadius: 0 },
              body:    { padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
            }}
          >
            <Box style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 6px 0', flexShrink: 0 }}>
              <Tooltip label="Close panel" withArrow>
                <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setDrawerTab(null)}>
                  <LuX size={14} />
                </ActionIcon>
              </Tooltip>
            </Box>
            {renderRightTabs()}
          </Drawer>
        )}

      </Box>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• MOBILE BOTTOM TAB BAR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {isMobile && !focusMode && (
        <Box style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          borderTop: '1px solid #e9ecef', background: '#fff',
          padding: '6px 8px', flexShrink: 0,
        }}>
          {([
            { id: 'sections', icon: LuMenu,       label: 'Sections' },
            { id: 'editor',   icon: LuPencil,     label: 'Editor'   },
            { id: 'review',   icon: LuActivity,   label: 'Review'   },
          ] as const).map(tab => (
            <Button
              key={tab.id}
              variant={mobilePanel === tab.id ? 'light' : 'subtle'}
              color={mobilePanel === tab.id ? 'brand' : 'gray'}
              size="sm"
              leftSection={<tab.icon size={16} />}
              onClick={() => setMobilePanel(tab.id)}
              style={{ flex: 1 }}
            >
              {tab.label}
            </Button>
          ))}
        </Box>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SWITCH PROJECT TYPE MODAL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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
        styles={{ body: { padding: '8px 16px 16px' } }}
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

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• ADD SECTION MODAL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• CITATION MODAL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Modal
        opened={citeModalOpen}
        onClose={() => { setCiteModalOpen(false); setCiteSearch(''); }}
        title={<Text fw={700} size="sm" style={{ fontFamily: 'Playfair Display, serif' }}>Insert Citation</Text>}
        size="lg" centered
      >
        <TextInput placeholder="Search by title or authorâ€¦" leftSection={<LuSearch size={15} />}
          mb={12} value={citeSearch} onChange={e => setCiteSearch(e.currentTarget.value)} />
        <Stack gap={8}>
          {filteredModalRefs.map(ref => (
            <Group key={ref.id} justify="space-between" align="flex-start">
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={500} lineClamp={2}>{ref.title}</Text>
                <Text size="xs" c="dimmed">{ref.authors[0]}{ref.authors.length > 1 ? ' et al.' : ''} Â· {ref.year} Â· {ref.journal}</Text>
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
