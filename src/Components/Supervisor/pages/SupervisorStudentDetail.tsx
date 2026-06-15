import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ActionIcon, Avatar, Badge, Box, Button, Divider, Group, Modal, Paper, Progress,
  SimpleGrid, Stack, Table, Tabs, Text, Textarea, ThemeIcon, Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuArrowLeft, LuClock, LuCircleCheck, LuTriangleAlert, LuX,
  LuFileText, LuActivity, LuShield, LuMessageSquare,
  LuSparkles, LuCheck, LuFlag, LuBell, LuSend, LuEye, LuPencil,
} from 'react-icons/lu';
import { SUPERVISED_STUDENTS } from '../supervisorData';
import type { StageStatus, AlertType, StudentSection, DegreeLevel, ComplianceStatus, SupervisedStudent } from '../supervisorData';
import { useAppSelector, useAppDispatch } from '../../../Redux/hooks';
import type { StoredUser } from '../../../Redux/slices/usersSlice';
import {
  approveSubmission, requestRevision, addAnnotation, updateAnnotation,
  deleteAnnotation as deleteSubAnnotation, submitSection, resolveAnnotation,
} from '../../../Redux/slices/submissionsSlice';
import type { SubmissionAnnotation } from '../../../Redux/slices/submissionsSlice';
import {
  fetchSubmissionsForStudent, reviewSubmission as reviewSubmissionDB,
  addAnnotation as addAnnotationDB, updateAnnotation as updateAnnotationDB,
  deleteAnnotationDB, resolveAnnotationDB,
} from '../../../supabase/submissions';
import { useCollaborativeDoc } from '../../../hooks/useCollaborativeDoc';
import type { CollabComment } from '../../../hooks/useCollaborativeDoc';
import TTSPlayer from '../TTSPlayer';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function stageStatusColor(s: StageStatus) {
  return s === 'completed' ? 'green' : s === 'in-progress' ? 'blue' : s === 'needs-revision' ? 'red' : 'gray';
}

function stageStatusLabel(s: StageStatus) {
  return s === 'completed' ? 'Completed' : s === 'in-progress' ? 'In Progress' : s === 'needs-revision' ? 'Needs Revision' : 'Not Started';
}

function alertIcon(type: AlertType) {
  const map: Record<AlertType, React.ElementType> = {
    overdue:          LuClock,
    'missing-data':   LuTriangleAlert,
    'plagiarism-risk':LuX,
    'analysis-issue': LuTriangleAlert,
    deadline:         LuClock,
    milestone:        LuCircleCheck,
  };
  return map[type];
}

function alertColor(type: AlertType) {
  return type === 'milestone' ? 'green' : type === 'deadline' ? 'brand' : 'red';
}

// ── Annotation helpers ─────────────────────────────────────────────────────────

const HIGHLIGHT_COLORS = [
  { label: 'Yellow', value: '#ffd43b' },
  { label: 'Green',  value: '#69db7c' },
  { label: 'Blue',   value: '#74c0fc' },
  { label: 'Pink',   value: '#f783ac' },
];

function applyHighlights(text: string, annotations: CollabComment[]): React.ReactNode {
  if (!annotations.length) return text;
  const ranges: { start: number; end: number; ann: CollabComment; annIdx: number }[] = [];
  annotations.forEach((ann, annIdx) => {
    if (!ann.selectedText) return;
    let idx = 0;
    while ((idx = text.indexOf(ann.selectedText, idx)) !== -1) {
      ranges.push({ start: idx, end: idx + ann.selectedText.length, ann, annIdx });
      idx += ann.selectedText.length;
    }
  });
  if (!ranges.length) return text;
  ranges.sort((a, b) => a.start - b.start);
  const clean: typeof ranges = [];
  let lastEnd = 0;
  for (const r of ranges) {
    if (r.start >= lastEnd) { clean.push(r); lastEnd = r.end; }
  }
  const nodes: React.ReactNode[] = [];
  let pos = 0;
  for (const r of clean) {
    if (r.start > pos) nodes.push(text.slice(pos, r.start));
    nodes.push(
      <mark
        key={`${r.ann.id}-${r.start}`}
        style={{
          background: r.ann.color + '55',
          borderRadius: 3,
          padding: '1px 2px',
          borderBottom: `2px solid ${r.ann.color}`,
          cursor: 'default',
        }}
        title={r.ann.text || 'Highlighted'}
      >
        {r.ann.selectedText!}
        <sup style={{ fontSize: 9, color: '#3b5bdb', fontWeight: 800, marginLeft: 1 }}>
          {r.annIdx + 1}
        </sup>
      </mark>
    );
    pos = r.end;
  }
  if (pos < text.length) nodes.push(text.slice(pos));
  return <>{nodes}</>;
}

function applySubmissionHighlights(text: string, annotations: SubmissionAnnotation[]): React.ReactNode {
  // Only highlight active (unresolved) annotations
  const active = annotations.filter(a => !a.resolved);
  if (!active.length) return text;
  const ranges: { start: number; end: number; ann: SubmissionAnnotation; idx: number }[] = [];
  active.forEach((ann, idx) => {
    let pos = 0;
    while ((pos = text.indexOf(ann.selectedText, pos)) !== -1) {
      ranges.push({ start: pos, end: pos + ann.selectedText.length, ann, idx });
      pos += ann.selectedText.length;
    }
  });
  if (!ranges.length) return text;
  ranges.sort((a, b) => a.start - b.start);
  const clean: typeof ranges = [];
  let lastEnd = 0;
  for (const r of ranges) { if (r.start >= lastEnd) { clean.push(r); lastEnd = r.end; } }
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const r of clean) {
    if (r.start > cursor) nodes.push(text.slice(cursor, r.start));
    nodes.push(
      <mark
        key={`${r.ann.id}-${r.start}`}
        title={r.ann.resolved ? `[Resolved] ${r.ann.comment}` : (r.ann.comment || 'Highlighted')}
        style={{
          background:      r.ann.resolved ? 'rgba(173,181,189,0.25)' : r.ann.color + '66',
          borderRadius:    3,
          padding:         '1px 2px',
          borderBottom:    `2px solid ${r.ann.resolved ? '#adb5bd' : r.ann.color}`,
          cursor:          'default',
          opacity:         r.ann.resolved ? 0.55 : 1,
          textDecoration:  r.ann.resolved ? 'line-through' : 'none',
        }}
      >
        {r.ann.selectedText}
        <sup style={{ fontSize: 9, color: r.ann.resolved ? '#adb5bd' : '#3b5bdb', fontWeight: 800, marginLeft: 1 }}>
          {r.ann.resolved ? '✓' : r.idx + 1}
        </sup>
      </mark>
    );
    cursor = r.end;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

// ── Redux → SupervisedStudent ──────────────────────────────────────────────────

const MANTINE_COLORS = ['blue', 'teal', 'green', 'grape', 'orange', 'cyan', 'indigo', 'red', 'pink', 'yellow'];
function nameToColor(name: string) {
  let h = 0;
  for (const c of name) h = (h << 5) - h + c.charCodeAt(0);
  return MANTINE_COLORS[Math.abs(h) % MANTINE_COLORS.length];
}

function reduxUserToStudent(u: StoredUser): SupervisedStudent {
  return {
    id:               u.id,
    name:             u.name,
    email:            u.email,
    matricNo:         u.matricNo       ?? 'N/A',
    degreeLevel:      (u.degreeLevel as DegreeLevel) ?? 'PhD',
    projectTitle:     u.projectTitle   ?? 'Untitled Research',
    stage:            'Proposal',
    progress:         0,
    similarityIndex:  0,
    aiDetectionScore: 0,
    integrityScore:   0,
    complianceStatus: 'Good' as ComplianceStatus,
    department:       u.department ?? 'Unassigned',
    wordCount:        0,
    targetWordCount:  80000,
    deadline:         '',
    lastActivity:     'Just joined',
    color:            nameToColor(u.name),
    stages:           [],
    sections:         [],
    analyses:         [],
    feedbackThreads:  [],
    alerts:           [],
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupervisorStudentDetail() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate      = useNavigate();
  const location      = useLocation();
  const navState      = (location.state ?? {}) as { tab?: string; subTab?: string };
  const dispatch      = useAppDispatch();

  // ── Student lookup: Redux → Supabase → mock ───────────────────────────────
  const reduxUsersList = useAppSelector(s => s.users.list);
  const reduxRaw       = reduxUsersList.find(u => u.id === studentId);
  const mockStudent    = !reduxRaw ? SUPERVISED_STUDENTS.find(s => s.id === studentId) : null;

  const [sbStudent, setSbStudent] = useState<SupervisedStudent | null>(null);

  useEffect(() => {
    if (reduxRaw || mockStudent || !studentId) return;
    // Not in Redux or mock — fetch from Supabase
    import('../../../supabase/client').then(({ supabase }) =>
      supabase.from('users')
        .select('id, name, email, role, matric_no, project_title, degree_level, department')
        .eq('id', studentId)
        .single()
    ).then(({ data }) => {
      if (!data) return;
      setSbStudent({
        id:               data.id,
        name:             data.name,
        email:            data.email,
        matricNo:         data.matric_no      ?? 'N/A',
        degreeLevel:      (data.degree_level ?? 'PhD') as DegreeLevel,
        projectTitle:     data.project_title  ?? 'Untitled Research',
        stage:            'Proposal',
        progress:         0,
        similarityIndex:  0,
        aiDetectionScore: 0,
        integrityScore:   0,
        complianceStatus: 'Good' as ComplianceStatus,
        department:       data.department ?? 'Unassigned',
        wordCount:        0,
        targetWordCount:  80000,
        deadline:         '',
        lastActivity:     'Active',
        color:            nameToColor(data.name),
        stages:           [],
        sections:         [],
        analyses:         [],
        feedbackThreads:  [],
        alerts:           [],
      } as SupervisedStudent);
    });
  }, [studentId, reduxRaw, mockStudent]);

  const student = reduxRaw
    ? reduxUserToStudent(reduxRaw)
    : (mockStudent ?? sbStudent ?? null);

  const [activeTab,    setActiveTab]    = useState(navState.tab ?? 'progress');
  const [newComment,   setNewComment]   = useState('');
  const [sections,     setSections]     = useState(student?.sections ?? []);
  const [stages,       setStages]       = useState(student?.stages ?? []);
  const [analyses,     setAnalyses]     = useState(student?.analyses ?? []);
  const [threads,      setThreads]      = useState(student?.feedbackThreads ?? []);
  const [readSection,  setReadSection]  = useState<StudentSection | null>(null);
  const [modalComment, setModalComment] = useState('');
  const [liveContent,  setLiveContent]  = useState<string>('');
  const [selPopup,     setSelPopup]     = useState<{ text: string; x: number; y: number } | null>(null);
  const [selColor,     setSelColor]     = useState('#ffd43b');
  const [selComment,   setSelComment]   = useState('');
  const popupRef = useRef<HTMLDivElement>(null);

  // Submissions from this student (Redux — populated from Supabase below)
  const studentSubmissions = useAppSelector(s =>
    s.submissions.list.filter(sub => sub.studentId === studentId),
  );
  const pendingCount = studentSubmissions.filter(s => s.status === 'pending').length;

  // ── Load submissions from Supabase on mount ─────────────────────────────────
  const authUser = useAppSelector(s => s.auth.user);
  useEffect(() => {
    if (!studentId) return;
    // Pass supervisor id optionally — if submissions have it, great; if not, load anyway
    fetchSubmissionsForStudent(studentId, authUser?.id ?? undefined).then(dbSubs => {
      dbSubs.forEach(dbSub => {
        // Use Supabase UUID as Redux id so annotations link correctly
        dispatch(submitSection({
          id:           dbSub.id,            // ← Supabase UUID → Redux id
          studentId:    dbSub.student_id,
          studentName:  student?.name ?? dbSub.student_id,
          sectionId:    dbSub.section_id,
          sectionTitle: dbSub.section_title,
          content:      dbSub.content,
        }));
        if (dbSub.status === 'approved') {
          dispatch(approveSubmission({ id: dbSub.id }));
        } else if (dbSub.status === 'needs-revision' && dbSub.supervisor_comment) {
          dispatch(requestRevision({ id: dbSub.id, comment: dbSub.supervisor_comment }));
        }
        // Sync annotations including resolved status
        (dbSub.annotations ?? []).forEach(ann => {
          dispatch(addAnnotation({
            id:           ann.id,
            subId:        dbSub.id,
            selectedText: ann.selected_text,
            comment:      ann.comment,
            color:        ann.color,
          }));
          if (ann.resolved) {
            dispatch(resolveAnnotation({ subId: dbSub.id, annId: ann.id }));
          }
        });
      });
    }).catch(() => {});
  }, [studentId, authUser?.id]);
  const [revisionInputs, setRevisionInputs] = useState<Record<string, string>>({});

  const [subTab, setSubTab] = useState<string>(navState.subTab ?? 'submitted');

  // Submission annotation popup state
  const [subAnnoPopup, setSubAnnoPopup] = useState<{ subId: string; text: string; x: number; y: number } | null>(null);
  const [subAnnoColor,   setSubAnnoColor]   = useState('#ffd43b');
  const [subAnnoComment, setSubAnnoComment] = useState('');
  const [editAnnos, setEditAnnos] = useState<Record<string, string>>({}); // annId → draft comment
  const subAnnoRef = useRef<HTMLDivElement>(null);

  // ── Collaborative doc ───────────────────────────────────────────────────────
  
  const roomId   = `project-${studentId ?? 'demo'}`;
  const collab   = useCollaborativeDoc(
    roomId,
    authUser?.name  ?? 'Supervisor',
    authUser?.email ?? '',
    authUser?.role  ?? 'Supervisor',
  );

  // When the document modal opens for a section, seed Yjs and subscribe to live changes
  useEffect(() => {
    if (!readSection) { setLiveContent(''); return; }
    collab.initSection(readSection.id, readSection.content ?? '');
    setLiveContent(collab.getSectionContent(readSection.id) || readSection.content || '');
    return collab.observeSection(readSection.id, content => setLiveContent(content));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readSection?.id]);

  // Derived values — use ?. so hooks above always run even when student is null
  const daysToDeadline = student?.deadline
    ? Math.max(0, Math.ceil((new Date(student.deadline).getTime() - Date.now()) / 86400000))
    : null;

  const complianceColor = student?.complianceStatus === 'Good' ? 'green' : student?.complianceStatus === 'Warning' ? 'orange' : 'red';

  const aiSummary = student?.complianceStatus === 'Critical'
    ? `Immediate attention required: ${student.name}'s similarity index (${student.similarityIndex}%) and AI detection score (${student.aiDetectionScore}%) both exceed acceptable thresholds.`
    : student?.complianceStatus === 'Warning'
    ? `${student.name}'s similarity index (${student.similarityIndex}%) is approaching the borderline threshold.`
    : `${student?.name ?? ''} is progressing well. Current stage: ${student?.stage ?? ''}. Integrity score: ${student?.integrityScore ?? 0}%.`;

  const handleApproveStage = (i: number) => {
    setStages(prev => prev.map((s, idx) => idx === i ? { ...s, supervisorApproved: true } : s));
    notifications.show({ title: 'Stage Approved', message: `${stages[i].name} has been approved.`, color: 'green' });
  };

  const handleApproveSection = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, approved: true } : s));
    notifications.show({ title: 'Section Approved', message: 'Section marked as approved.', color: 'green' });
  };

  const handleSectionComment = (id: string, comment: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, supervisorComment: comment } : s));
  };

  const handleApproveAnalysis = (id: string) => {
    setAnalyses(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' as const } : a));
    notifications.show({ title: 'Analysis Approved', message: 'Statistical analysis has been approved.', color: 'green' });
  };

  const handleFlagAnalysis = (id: string) => {
    setAnalyses(prev => prev.map(a => a.id === id ? { ...a, status: 'flagged' as const } : a));
    notifications.show({ title: 'Analysis Flagged', message: 'Statistical analysis has been flagged for revision.', color: 'red' });
  };

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    const newMsg = {
      author: 'Dr. Supervisor',
      isStudent: false,
      timestamp: new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      text: newComment.trim(),
    };
    if (threads.length > 0) {
      setThreads(prev => prev.map((t, i) => i === 0 ? { ...t, messages: [...t.messages, newMsg] } : t));
    } else {
      setThreads([{ id: 'new', subject: 'Supervisor Feedback', resolved: false, messages: [newMsg] }]);
    }
    setNewComment('');
    notifications.show({ title: 'Comment sent', message: `Your feedback has been sent to ${student?.name}.`, color: 'green' });
  };

  const handleRequestRevision = () => {
    if (!newComment.trim()) return;
    const newMsg = {
      author: 'Dr. Supervisor',
      isStudent: false,
      timestamp: new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      text: `[Revision Requested] ${newComment.trim()}`,
    };
    if (threads.length > 0) {
      setThreads(prev => prev.map((t, i) => i === 0 ? { ...t, messages: [...t.messages, newMsg] } : t));
    } else {
      setThreads([{ id: 'new', subject: 'Revision Request', resolved: false, messages: [newMsg] }]);
    }
    setNewComment('');
    notifications.show({ title: 'Revision requested', message: `${student?.name} has been notified to revise.`, color: 'orange' });
  };

  const handleDocMouseUp = useCallback(() => {
    const sel = window.getSelection();
    const txt = sel?.toString().trim() ?? '';
    if (txt.length < 3) { setSelPopup(null); return; }
    const range = sel!.getRangeAt(0);
    const rect  = range.getBoundingClientRect();
    const half = 165; // half of popup min-width (330px) + padding
    const clampedX = Math.max(half, Math.min(window.innerWidth - half, rect.left + rect.width / 2));
    setSelPopup({ text: txt, x: clampedX, y: rect.top });
    setSelComment('');
  }, []);

  const saveAnnotation = () => {
    if (!readSection || !selPopup) return;
    collab.addComment({
      author:       authUser?.name ?? 'Supervisor',
      role:         authUser?.role ?? 'Supervisor',
      text:         selComment.trim(),
      selectedText: selPopup.text,
      sectionId:    readSection.id,
      resolved:     false,
      color:        selColor,
    });
    window.getSelection()?.removeAllRanges();
    setSelPopup(null);
    setSelComment('');
  };

  const deleteAnnotation = (_sectionId: string, annId: string) => {
    collab.deleteComment(annId);
  };

  useEffect(() => {
    if (!selPopup) return;
    const dismiss = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setSelPopup(null);
      }
    };
    document.addEventListener('mousedown', dismiss);
    return () => document.removeEventListener('mousedown', dismiss);
  }, [selPopup]);

  const currentAnnotations: CollabComment[] = readSection
    ? collab.comments.filter(c => c.sectionId === readSection.id && !c.resolved)
    : [];

  // ── All hooks have been called above — safe to do conditional returns now ──
  if (!student) {
    const isLoading = !reduxRaw && !mockStudent && !sbStudent;
    return (
      <Box p="xl">
        <Button variant="subtle" leftSection={<LuArrowLeft size={14} />} mb="lg" onClick={() => navigate('/supervisor/students')}>
          Back to Students
        </Button>
        <Paper withBorder p="xl" radius="md" ta="center">
          <Text c="dimmed">{isLoading ? 'Loading student…' : 'Student not found.'}</Text>
        </Paper>
      </Box>
    );
  }

  return (
    <Box p="xl">

      {/* ── Back button ── */}
      <Button
        variant="subtle"
        color="gray"
        leftSection={<LuArrowLeft size={14} />}
        mb="lg"
        onClick={() => navigate('/supervisor/students')}
      >
        Back to Students
      </Button>

      {/* ── Student header card ── */}
      <Paper withBorder p="lg" radius="md" mb="lg" bg="white">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="md" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <Avatar color={student.color} radius="xl" size={56} style={{ fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
              {getInitials(student.name)}
            </Avatar>
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Group gap="xs" mb={4} wrap="nowrap">
                <Text fw={700} size="lg" lh={1.2}>{student.name}</Text>
                <Badge variant="light" color={student.color === 'blue' ? 'blue' : student.color === 'violet' ? 'violet' : 'teal'} size="sm">
                  {student.degreeLevel}
                </Badge>
                <Badge variant="light" color={complianceColor} size="sm">
                  {student.complianceStatus}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" mb={2}>{student.department} · {student.email} · {student.matricNo}</Text>
              <Text size="sm" fw={500} mb={6} lineClamp={1}>{student.projectTitle}</Text>
              <Group gap="lg" mb={8}>
                <Text size="xs" c="dimmed">Stage: <strong style={{ color: '#1c1c1e' }}>{student.stage}</strong></Text>
                <Text size="xs" c="dimmed">{student.wordCount.toLocaleString()} / {student.targetWordCount.toLocaleString()} words</Text>
                {daysToDeadline !== null && (
                  <Group gap={4}>
                    <LuClock size={12} color="#adb5bd" />
                    <Text size="xs" c="dimmed">{daysToDeadline} days to deadline</Text>
                  </Group>
                )}
              </Group>
              <Group gap="sm" align="center">
                <Progress value={student.progress} color="brand" size="sm" radius="xl" style={{ flex: 1, maxWidth: 280 }} />
                <Text size="sm" fw={700}>{student.progress}%</Text>
              </Group>
            </Box>
          </Group>

          <SimpleGrid cols={3} spacing={8} style={{ flexShrink: 0 }}>
            {[
              { label: 'Integrity', value: `${student.integrityScore}`, color: student.integrityScore >= 85 ? '#2f9e44' : student.integrityScore >= 70 ? '#f08c00' : '#e03131' },
              { label: 'Similarity', value: `${student.similarityIndex}%`, color: student.similarityIndex > 20 ? '#e03131' : '#2f9e44' },
              { label: 'AI Detect', value: `${student.aiDetectionScore}%`, color: student.aiDetectionScore > 30 ? '#f08c00' : '#2f9e44' },
            ].map(({ label, value, color }) => (
              <Box key={label} p="sm" ta="center" style={{ background: '#f8f9fa', borderRadius: 10 }}>
                <Text fw={800} size="lg" lh={1} style={{ color }}>{value}</Text>
                <Text size="xs" c="dimmed" mt={4}>{label}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Group>
      </Paper>

      {/* ── AI summary ── */}
      <Paper
        withBorder p="md" radius="md" mb="lg"
        style={{ borderLeft: '4px solid #3b5bdb', background: '#f8f9ff' }}
      >
        <Group gap="sm" align="flex-start">
          <ThemeIcon size={32} radius="md" color="brand" variant="light" style={{ flexShrink: 0, marginTop: 2 }}>
            <LuSparkles size={15} />
          </ThemeIcon>
          <Box>
            <Text size="sm" fw={600} mb={4}>AI Supervisor Summary</Text>
            <Text size="sm" c="dimmed">{aiSummary}</Text>
          </Box>
        </Group>
      </Paper>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onChange={v => setActiveTab(v ?? 'progress')}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="progress"  leftSection={<LuClock          size={14} />}>Progress</Tabs.Tab>
          <Tabs.Tab value="writing"   leftSection={<LuFileText       size={14} />}>Writing</Tabs.Tab>
          <Tabs.Tab value="analysis"  leftSection={<LuActivity       size={14} />}>Analysis</Tabs.Tab>
          <Tabs.Tab value="integrity" leftSection={<LuShield         size={14} />}>Integrity</Tabs.Tab>
          <Tabs.Tab value="feedback"  leftSection={<LuMessageSquare  size={14} />}>
            Feedback
            {threads.filter(t => !t.resolved).length > 0 && (
              <Badge size="xs" color="brand" variant="filled" ml={4} radius="xl">
                {threads.filter(t => !t.resolved).length}
              </Badge>
            )}
          </Tabs.Tab>
          <Tabs.Tab value="submissions" leftSection={<LuFlag size={14} />}>
            Submissions
            {pendingCount > 0 && (
              <Badge size="xs" color="orange" variant="filled" ml={4} radius="xl">
                {pendingCount}
              </Badge>
            )}
          </Tabs.Tab>
        </Tabs.List>

        {/* ── PROGRESS TAB ── */}
        <Tabs.Panel value="progress">
          <Paper withBorder radius="md" bg="white" style={{ overflow: 'hidden' }}>
            <Box px="lg" py="md" style={{ borderBottom: '1px solid #f1f3f5' }}>
              <Text fw={600}>Project Timeline & Milestones</Text>
            </Box>
            <Stack gap={0} px="lg" py="sm">
              {stages.map((stage, i) => (
                <Group
                  key={stage.name}
                  justify="space-between"
                  py="md"
                  wrap="nowrap"
                  style={i < stages.length - 1 ? { borderBottom: '1px solid #f1f3f5' } : undefined}
                >
                  <Group gap="md" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    <ThemeIcon size={28} radius="xl" color={stageStatusColor(stage.status)} variant="light" style={{ flexShrink: 0 }}>
                      {stage.status === 'completed' ? <LuCircleCheck size={13} /> :
                       stage.status === 'in-progress' ? <LuClock size={13} /> :
                       stage.status === 'needs-revision' ? <LuTriangleAlert size={13} /> :
                       <Box style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid #adb5bd' }} />}
                    </ThemeIcon>
                    <Box style={{ minWidth: 0 }}>
                      <Text size="sm" fw={500}>{stage.name}</Text>
                      {stage.dueDate && <Text size="xs" c="dimmed">Due: {stage.dueDate}</Text>}
                    </Box>
                  </Group>
                  <Group gap="sm" wrap="nowrap" style={{ flexShrink: 0 }}>
                    <Badge variant="light" color={stageStatusColor(stage.status)} size="sm" radius="sm">
                      {stageStatusLabel(stage.status)}
                    </Badge>
                    {stage.supervisorApproved ? (
                      <Badge variant="outline" color="green" size="sm" radius="sm" leftSection={<LuCheck size={10} />}>
                        Approved
                      </Badge>
                    ) : stage.status === 'completed' ? (
                      <Button size="xs" variant="outline" color="brand" onClick={() => handleApproveStage(i)}>
                        Approve
                      </Button>
                    ) : null}
                  </Group>
                </Group>
              ))}
            </Stack>
          </Paper>
        </Tabs.Panel>

        {/* ── WRITING TAB ── */}
        <Tabs.Panel value="writing">
          <Paper
            withBorder p="sm" radius="md" mb="md"
            style={{ background: '#f8f9ff', border: '1px dashed #748ffc' }}
          >
            <Group gap="xs">
              <LuEye size={13} color="#3b5bdb" />
              <Text size="xs" c="dimmed">
                Click <strong>Read</strong> on any submitted section to open the full document text and leave your review.
              </Text>
            </Group>
          </Paper>

          <Paper withBorder radius="md" bg="white" style={{ overflow: 'hidden' }}>
            <Box px="lg" py="md" style={{ borderBottom: '1px solid #f1f3f5' }}>
              <Text fw={600}>Document Sections</Text>
            </Box>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr style={{ background: '#f8f9fa' }}>
                  {['Section / Chapter', 'Words', 'Status', 'Approved', 'Supervisor Comment', 'Actions'].map(h => (
                    <Table.Th key={h}><Text size="xs" c="dimmed" fw={600}>{h}</Text></Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sections.map(sec => (
                  <Table.Tr key={sec.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{sec.title}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{sec.wordCount > 0 ? sec.wordCount.toLocaleString() : '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={stageStatusColor(sec.status)} size="xs" radius="sm">
                        {stageStatusLabel(sec.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <ThemeIcon size={22} radius="xl" color={sec.approved ? 'green' : 'gray'} variant="light">
                        {sec.approved ? <LuCircleCheck size={11} /> : <LuX size={11} />}
                      </ThemeIcon>
                    </Table.Td>
                    <Table.Td style={{ maxWidth: 220 }}>
                      {sec.supervisorComment ? (
                        <Text size="xs" c="dimmed" lineClamp={2}>{sec.supervisorComment}</Text>
                      ) : (
                        <Text size="xs" c="dimmed" fs="italic">No comment yet</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        {sec.wordCount > 0 && (
                          <Button
                            size="xs" variant="light" color="brand"
                            leftSection={<LuEye size={11} />}
                            onClick={() => { setReadSection(sec); setModalComment(sec.supervisorComment ?? ''); }}
                          >
                            Read
                          </Button>
                        )}
                        {!sec.approved && sec.status !== 'not-started' && (
                          <Button
                            size="xs" variant="light" color="green"
                            leftSection={<LuCheck size={11} />}
                            onClick={() => handleApproveSection(sec.id)}
                          >
                            Approve
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        {/* ── ANALYSIS TAB ── */}
        <Tabs.Panel value="analysis">
          <Paper withBorder radius="md" bg="white" style={{ overflow: 'hidden' }}>
            <Box px="lg" py="md" style={{ borderBottom: '1px solid #f1f3f5' }}>
              <Text fw={600}>Statistical Analyses</Text>
            </Box>
            {analyses.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="xl">No analyses submitted yet for this stage.</Text>
            ) : (
              <Stack gap="sm" p="lg">
                {analyses.map(analysis => (
                  <Paper
                    key={analysis.id}
                    withBorder p="md" radius="md"
                    style={{
                      background: analysis.status === 'flagged' ? '#fff5f5' : 'white',
                      borderColor: analysis.status === 'flagged' ? '#ff636330' : undefined,
                    }}
                  >
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group gap="xs" mb={4}>
                          <Text size="sm" fw={600}>{analysis.title}</Text>
                          {analysis.aiRecommended && (
                            <Badge variant="outline" size="xs" radius="sm" leftSection={<LuSparkles size={9} />} color="brand">
                              AI Recommended
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed" mb={4}>
                          Test: {analysis.testType}
                          {analysis.pValue !== undefined ? ` · p = ${analysis.pValue}` : ''}
                        </Text>
                        {analysis.result && <Text size="sm" c="dimmed">{analysis.result}</Text>}
                        {analysis.supervisorNote && (
                          <Text size="sm" c="red.7" mt={6} fw={500}>
                            Supervisor note: {analysis.supervisorNote}
                          </Text>
                        )}
                      </Box>
                      <Box style={{ flexShrink: 0 }}>
                        {analysis.status === 'flagged' ? (
                          <Badge color="red" variant="light" size="sm" radius="sm" leftSection={<LuFlag size={10} />}>
                            Flagged
                          </Badge>
                        ) : analysis.status === 'approved' ? (
                          <Badge color="green" variant="light" size="sm" radius="sm" leftSection={<LuCircleCheck size={10} />}>
                            Approved
                          </Badge>
                        ) : (
                          <Group gap="xs">
                            <Button size="xs" variant="light" color="green" leftSection={<LuCheck size={11} />}
                              onClick={() => handleApproveAnalysis(analysis.id)}>
                              Approve
                            </Button>
                            <Button size="xs" variant="light" color="red" leftSection={<LuFlag size={11} />}
                              onClick={() => handleFlagAnalysis(analysis.id)}>
                              Flag
                            </Button>
                          </Group>
                        )}
                      </Box>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Tabs.Panel>

        {/* ── INTEGRITY TAB ── */}
        <Tabs.Panel value="integrity">
          <SimpleGrid cols={{ base: 1, sm: 3 }} mb="lg">
            {[
              { label: 'Integrity Score', value: `${student.integrityScore}`, color: student.integrityScore >= 85 ? '#2f9e44' : student.integrityScore >= 70 ? '#f08c00' : '#e03131', sub: student.integrityScore >= 85 ? 'Good standing' : student.integrityScore >= 70 ? 'Borderline' : 'Critical' },
              { label: 'Similarity Index', value: `${student.similarityIndex}%`, color: student.similarityIndex > 35 ? '#e03131' : student.similarityIndex > 20 ? '#f08c00' : '#2f9e44', sub: student.similarityIndex <= 20 ? 'Safe (≤20%)' : student.similarityIndex <= 35 ? 'Borderline (21–35%)' : 'Critical (>35%)' },
              { label: 'AI Detection', value: `${student.aiDetectionScore}%`, color: student.aiDetectionScore > 45 ? '#e03131' : student.aiDetectionScore > 20 ? '#f08c00' : '#2f9e44', sub: student.aiDetectionScore <= 20 ? 'Safe (≤20%)' : student.aiDetectionScore <= 45 ? 'Borderline (21–45%)' : 'Risky (>45%)' },
            ].map(({ label, value, color, sub }) => (
              <Paper key={label} withBorder p="xl" radius="md" bg="white" ta="center">
                <Text fw={800} style={{ fontSize: 36, color, lineHeight: 1 }}>{value}</Text>
                <Text size="sm" c="dimmed" mt={4} fw={500}>{label}</Text>
                <Text size="xs" c="dimmed" mt={4}>{sub}</Text>
              </Paper>
            ))}
          </SimpleGrid>

          <Paper withBorder p="lg" radius="md" bg="white">
            <Text fw={600} mb="lg">Section-Level Integrity</Text>
            <Stack gap="md">
              {sections.filter(s => s.wordCount > 0).map(sec => {
                const simulated = Math.min(100, Math.max(0, student.similarityIndex + (Math.abs(sec.id.charCodeAt(3) - 50) % 15) - 7));
                const intScore  = 100 - simulated;
                return (
                  <Box key={sec.id}>
                    <Group justify="space-between" mb={5}>
                      <Text size="sm">{sec.title}</Text>
                      <Group gap="md">
                        <Text size="xs" c="dimmed">Similarity: <strong style={{ color: simulated > 20 ? '#e03131' : '#2f9e44' }}>{simulated}%</strong></Text>
                        <Text size="xs" c="dimmed">Integrity: <strong style={{ color: intScore >= 80 ? '#2f9e44' : '#f08c00' }}>{intScore}%</strong></Text>
                      </Group>
                    </Group>
                    <Progress
                      value={intScore}
                      color={intScore >= 80 ? 'green' : intScore >= 65 ? 'orange' : 'red'}
                      size="sm" radius="xl"
                    />
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        </Tabs.Panel>

        {/* ── FEEDBACK TAB ── */}
        <Tabs.Panel value="feedback">
          <Stack gap="lg">

            {/* Existing feedback threads */}
            {threads.length === 0 ? (
              <Paper withBorder p="xl" radius="md" bg="white" ta="center">
                <Text size="sm" c="dimmed">No feedback threads yet. Start one below.</Text>
              </Paper>
            ) : (
              threads.map(thread => (
                <Paper key={thread.id} withBorder p="lg" radius="md" bg="white">
                  <Group justify="space-between" mb="md">
                    <Text fw={600} size="sm">{thread.subject}</Text>
                    <Badge
                      variant="light"
                      color={thread.resolved ? 'green' : 'blue'}
                      size="sm" radius="sm"
                    >
                      {thread.resolved ? 'Resolved' : 'Open'}
                    </Badge>
                  </Group>
                  <Divider mb="md" />
                  <Stack gap="md">
                    {thread.messages.map((msg, i) => (
                      <Group
                        key={i}
                        gap="sm"
                        wrap="nowrap"
                        justify={msg.isStudent ? 'flex-end' : 'flex-start'}
                        align="flex-start"
                      >
                        {!msg.isStudent && (
                          <Avatar color="brand" radius="xl" size="sm" style={{ flexShrink: 0 }}>
                            {msg.author.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </Avatar>
                        )}
                        <Box
                          p="sm"
                          style={{
                            maxWidth: '72%',
                            borderRadius: 12,
                            background: msg.isStudent ? '#e3fafc' : '#f0f4ff',
                          }}
                        >
                          <Text size="xs" fw={600} c="dimmed" mb={4}>{msg.author} · {msg.timestamp}</Text>
                          <Text size="sm">{msg.text}</Text>
                        </Box>
                        {msg.isStudent && (
                          <Avatar color={student.color} radius="xl" size="sm" style={{ flexShrink: 0 }}>
                            {getInitials(student.name)}
                          </Avatar>
                        )}
                      </Group>
                    ))}
                  </Stack>
                </Paper>
              ))
            )}

            {/* Send new feedback */}
            <Paper withBorder p="lg" radius="md" bg="white" style={{ borderStyle: 'dashed' }}>
              <Text size="sm" fw={600} mb="sm">Send Feedback to {student.name}</Text>
              <Textarea
                placeholder="Write a comment, instruction, or revision request for this student…"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                rows={3}
                mb="md"
              />
              <Group gap="sm">
                <Button
                  size="sm"
                  color="brand"
                  leftSection={<LuSend size={13} />}
                  disabled={!newComment.trim()}
                  onClick={handleSendComment}
                >
                  Send Comment
                </Button>
                <Button
                  size="sm"
                  color="orange"
                  variant="light"
                  leftSection={<LuTriangleAlert size={13} />}
                  disabled={!newComment.trim()}
                  onClick={handleRequestRevision}
                >
                  Request Revision
                </Button>
              </Group>
            </Paper>

            {/* Student alerts */}
            {student.alerts.length > 0 && (
              <Paper withBorder p="lg" radius="md" bg="white">
                <Group gap="xs" mb="md">
                  <LuBell size={16} color="#4c6ef5" />
                  <Text fw={600} size="sm">Alerts for this Student</Text>
                </Group>
                <Divider mb="md" />
                <Stack gap="sm">
                  {student.alerts.map(al => {
                    const Icon = alertIcon(al.type);
                    const color = alertColor(al.type);
                    return (
                      <Group
                        key={al.id}
                        gap="sm"
                        p="sm"
                        wrap="nowrap"
                        style={{
                          borderRadius: 8,
                          background: al.read ? 'transparent' : '#f0f4ff',
                        }}
                      >
                        <ThemeIcon size={28} radius="md" color={color} variant="light" style={{ flexShrink: 0 }}>
                          <Icon size={13} />
                        </ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm">{al.message}</Text>
                          <Text size="xs" c="dimmed" mt={2}>{al.timestamp}</Text>
                        </Box>
                        {!al.read && (
                          <Box style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b5bdb', flexShrink: 0 }} />
                        )}
                      </Group>
                    );
                  })}
                </Stack>
              </Paper>
            )}

          </Stack>
        </Tabs.Panel>

        {/* ── SUBMISSIONS TAB ── */}
        <Tabs.Panel value="submissions">

          {/* Annotation popup — fixed overlay, rendered above sub-tabs */}
          {subAnnoPopup && (
            <Box
              ref={subAnnoRef}
              style={{
                position: 'fixed',
                left: subAnnoPopup.x,
                top: subAnnoPopup.y - 8,
                transform: 'translate(-50%, -100%)',
                zIndex: 9999,
                background: '#fff',
                border: '1px solid #dee2e6',
                borderRadius: 10,
                boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
                padding: '12px 14px',
                minWidth: 280,
              }}
            >
              <Text size="xs" fw={700} mb={6} c="dimmed">Highlight &amp; Comment</Text>
              <Text size="xs" c="dark" mb={8} lineClamp={2} style={{ fontStyle: 'italic', background: '#f8f9fa', padding: '4px 8px', borderRadius: 6 }}>
                "{subAnnoPopup.text}"
              </Text>
              <Group gap={6} mb={8}>
                {[
                  { label: 'Yellow', value: '#ffd43b' },
                  { label: 'Green',  value: '#69db7c' },
                  { label: 'Blue',   value: '#74c0fc' },
                  { label: 'Pink',   value: '#f783ac' },
                  { label: 'Orange', value: '#ffa94d' },
                ].map(c => (
                  <Box
                    key={c.value}
                    onClick={() => setSubAnnoColor(c.value)}
                    style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: c.value, cursor: 'pointer',
                      border: subAnnoColor === c.value ? '2px solid #3b5bdb' : '2px solid transparent',
                    }}
                  />
                ))}
              </Group>
              <Textarea
                placeholder="Add a comment (required)…"
                value={subAnnoComment}
                onChange={e => { const v = e.currentTarget.value; setSubAnnoComment(v); }}
                rows={2} size="xs" mb={8} autoFocus
              />
              <Group gap={6}>
                <Button
                  size="xs" color="brand"
                  disabled={!subAnnoComment.trim()}
                  onClick={async () => {
                    const tempId  = crypto.randomUUID();
                    const capture = { subId: subAnnoPopup.subId, text: subAnnoPopup.text, comment: subAnnoComment.trim(), color: subAnnoColor };
                    // Add to Redux immediately with a temp id for instant feedback
                    dispatch(addAnnotation({ id: tempId, subId: capture.subId, selectedText: capture.text, comment: capture.comment, color: capture.color }));
                    window.getSelection()?.removeAllRanges();
                    setSubAnnoPopup(null);
                    setSubAnnoComment('');
                    // Persist to Supabase, then replace temp id with real Supabase UUID
                    try {
                      const dbAnn = await addAnnotationDB({ submissionId: capture.subId, selectedText: capture.text, comment: capture.comment, color: capture.color });
                      dispatch(deleteSubAnnotation({ subId: capture.subId, annId: tempId }));
                      dispatch(addAnnotation({ id: dbAnn.id, subId: capture.subId, selectedText: capture.text, comment: capture.comment, color: capture.color }));
                    } catch {}
                  }}
                >
                  Save
                </Button>
                <Button size="xs" variant="subtle" color="gray" onClick={() => { window.getSelection()?.removeAllRanges(); setSubAnnoPopup(null); }}>
                  Cancel
                </Button>
              </Group>
            </Box>
          )}

          {/* Sub-tabs: Submitted vs Approved Chapters */}
          <Tabs value={subTab} onChange={v => v && setSubTab(v)}>
            <Tabs.List mb="md">
              <Tabs.Tab value="submitted" leftSection={<LuFlag size={13} />}>
                Submitted
                {studentSubmissions.filter(s => s.status !== 'approved').length > 0 && (
                  <Badge size="xs" color="brand" variant="filled" ml={4} radius="xl" style={{ pointerEvents: 'none' }}>
                    {studentSubmissions.filter(s => s.status !== 'approved').length}
                  </Badge>
                )}
              </Tabs.Tab>
              <Tabs.Tab value="approved" leftSection={<LuCircleCheck size={13} />}>
                Approved Chapters
                {studentSubmissions.filter(s => s.status === 'approved').length > 0 && (
                  <Badge size="xs" color="green" variant="filled" ml={4} radius="xl" style={{ pointerEvents: 'none' }}>
                    {studentSubmissions.filter(s => s.status === 'approved').length}
                  </Badge>
                )}
              </Tabs.Tab>
            </Tabs.List>

            {/* ── Submitted (pending / needs-revision) ── */}
            <Tabs.Panel value="submitted">
              <Stack gap="md">
                {studentSubmissions.filter(s => s.status !== 'approved').length === 0 ? (
                  <Paper withBorder p="xl" radius="md" bg="white" ta="center">
                    <LuFlag size={28} color="#adb5bd" style={{ marginBottom: 8 }} />
                    <Text fw={600} c="dimmed" size="sm">No pending submissions.</Text>
                    <Text size="xs" c="dimmed" mt={4}>All chapters have been reviewed, or the student hasn't submitted yet.</Text>
                  </Paper>
                ) : (
                  studentSubmissions.filter(s => s.status !== 'approved').map(sub => {
                    const statusColor = sub.status === 'needs-revision' ? 'orange' : 'blue';
                    const statusLabel = sub.status === 'needs-revision' ? 'Needs Revision' : 'Pending Review';
                    return (
                      <Paper key={sub.id} withBorder p="lg" radius="md" bg="white">

                        {/* Header */}
                        <Group justify="space-between" mb="md" wrap="nowrap">
                          <Group gap="sm" wrap="nowrap">
                            <ThemeIcon size={32} radius="md" color={statusColor} variant="light" style={{ flexShrink: 0 }}>
                              <LuFileText size={15} />
                            </ThemeIcon>
                            <Box>
                              <Group gap={6}>
                                <Text fw={600} size="sm">{sub.sectionTitle}</Text>
                                {sub.annotations.filter(a => !a.resolved).length > 0 && (
                                  <Badge size="xs" color="grape" variant="light" radius="xl">
                                    {sub.annotations.filter(a => !a.resolved).length} pending
                                  </Badge>
                                )}
                              {sub.annotations.filter(a => a.resolved).length > 0 && (
                                  <Badge size="xs" color="green" variant="light" radius="xl">
                                    {sub.annotations.filter(a => a.resolved).length} resolved
                                  </Badge>
                                )}
                              </Group>
                              <Text size="xs" c="dimmed">
                                Submitted {new Date(sub.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            </Box>
                          </Group>
                          <Badge color={statusColor} variant="light" radius="sm" size="sm" style={{ flexShrink: 0 }}>{statusLabel}</Badge>
                        </Group>

                        {/* TTS player */}
                        <TTSPlayer text={sub.content} />

                        {/* Selectable content with highlights */}
                        <Text size="9px" c="dimmed" mt={8} mb={4} style={{ textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
                          Select any text to highlight and comment
                        </Text>
                        <Paper
                          p="md" radius="md" mb="md"
                          style={{ background: '#f8f9fa', border: '1px solid #e9ecef', userSelect: 'text', cursor: 'text' }}
                          onMouseUp={() => {
                            const sel = window.getSelection();
                            const txt = sel?.toString().trim() ?? '';
                            if (txt.length < 2) { setSubAnnoPopup(null); return; }
                            const range = sel!.getRangeAt(0);
                            const rect  = range.getBoundingClientRect();
                            const half = 150; // half of popup min-width (280px) + padding
                            const clampedX = Math.max(half, Math.min(window.innerWidth - half, rect.left + rect.width / 2));
                            setSubAnnoPopup({ subId: sub.id, text: txt, x: clampedX, y: rect.top });
                            setSubAnnoColor('#ffd43b');
                            setSubAnnoComment('');
                          }}
                        >
                          <Text size="sm" style={{ fontFamily: 'Georgia, serif', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                            {applySubmissionHighlights(sub.content || '(No content)', sub.annotations)}
                          </Text>
                        </Paper>

                        {/* Annotations list — active and resolved */}
                        {sub.annotations.length > 0 && (() => {
                          const active   = sub.annotations.filter(a => !a.resolved);
                          const resolved = sub.annotations.filter(a => a.resolved);
                          return (
                            <Stack gap={6} mb="md">
                              {/* Active (unresolved) */}
                              {active.length > 0 && (
                                <>
                                  <Group gap={6} align="center">
                                    <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
                                      Annotations
                                    </Text>
                                    <Badge size="xs" color="grape" variant="light" radius="xl">{active.length} active</Badge>
                                  </Group>
                                  {active.map((ann, idx) => (
                                    <Paper key={ann.id} p="sm" radius="md"
                                      style={{ background: ann.color + '22', border: `1.5px solid ${ann.color}88` }}
                                    >
                                      <Group gap={6} mb={4} wrap="nowrap">
                                        <Box style={{ width: 10, height: 10, borderRadius: '50%', background: ann.color, flexShrink: 0 }} />
                                        <Text size="xs" fw={700} style={{ color: '#495057' }}>#{idx + 1}</Text>
                                        <Text size="xs" c="dimmed" style={{ fontStyle: 'italic', flex: 1 }} lineClamp={1}>"{ann.selectedText}"</Text>
                                        <ActionIcon size="xs" color="red" variant="subtle"
                                          onClick={() => {
                                            dispatch(deleteSubAnnotation({ subId: sub.id, annId: ann.id }));
                                            deleteAnnotationDB(ann.id).catch(() => {});
                                          }}
                                        >
                                          <LuX size={10} />
                                        </ActionIcon>
                                      </Group>
                                      {editAnnos[ann.id] !== undefined ? (
                                        <Group gap={6}>
                                          <Textarea
                                            value={editAnnos[ann.id]}
                                            onChange={e => { const v = e.currentTarget.value; setEditAnnos(prev => ({ ...prev, [ann.id]: v })); }}
                                            size="xs" rows={2} style={{ flex: 1 }} autoFocus
                                          />
                                          <Stack gap={4}>
                                            <ActionIcon size="sm" color="green" variant="light"
                                              onClick={() => {
                                                dispatch(updateAnnotation({ subId: sub.id, annId: ann.id, comment: editAnnos[ann.id] }));
                                                updateAnnotationDB(ann.id, editAnnos[ann.id]).catch(() => {});
                                                setEditAnnos(prev => { const n = { ...prev }; delete n[ann.id]; return n; });
                                              }}
                                            >
                                              <LuCheck size={12} />
                                            </ActionIcon>
                                            <ActionIcon size="sm" color="gray" variant="subtle"
                                              onClick={() => setEditAnnos(prev => { const n = { ...prev }; delete n[ann.id]; return n; })}
                                            >
                                              <LuX size={12} />
                                            </ActionIcon>
                                          </Stack>
                                        </Group>
                                      ) : (
                                        <Group gap={6} wrap="nowrap">
                                          <Text size="xs" style={{ flex: 1 }}>{ann.comment}</Text>
                                          <ActionIcon size="xs" color="gray" variant="subtle"
                                            onClick={() => setEditAnnos(prev => ({ ...prev, [ann.id]: ann.comment }))}
                                          >
                                            <LuPencil size={10} />
                                          </ActionIcon>
                                        </Group>
                                      )}
                                    </Paper>
                                  ))}
                                </>
                              )}

                              {/* Resolved by student */}
                              {resolved.length > 0 && (
                                <>
                                  <Group gap={6} align="center" mt={active.length > 0 ? 6 : 0}>
                                    <Text size="xs" fw={700} style={{ textTransform: 'uppercase', letterSpacing: 0.6, color: '#2f9e44' }}>
                                      Resolved by student
                                    </Text>
                                    <Badge size="xs" color="green" variant="light" radius="xl">{resolved.length}</Badge>
                                  </Group>
                                  {resolved.map((ann, idx) => (
                                    <Paper key={ann.id} p="sm" radius="md"
                                      style={{ background: '#f1f3f5', border: '1.5px solid #dee2e6', opacity: 0.75 }}
                                    >
                                      <Group gap={6} mb={4} wrap="nowrap">
                                        <Box style={{ width: 10, height: 10, borderRadius: '50%', background: '#2f9e44', flexShrink: 0 }} />
                                        <Badge size="xs" color="green" variant="filled" radius="xl" style={{ pointerEvents: 'none' }}>✓ Resolved</Badge>
                                        <Text size="xs" fw={700} style={{ color: '#868e96' }}>#{active.length + idx + 1}</Text>
                                        <Text size="xs" c="dimmed" style={{ fontStyle: 'italic', flex: 1, textDecoration: 'line-through' }} lineClamp={1}>
                                          "{ann.selectedText}"
                                        </Text>
                                      </Group>
                                      <Text size="xs" c="dimmed" style={{ paddingLeft: 16, textDecoration: 'line-through' }}>{ann.comment}</Text>
                                    </Paper>
                                  ))}
                                </>
                              )}
                            </Stack>
                          );
                        })()}

                        {/* Existing supervisor comment */}
                        {sub.supervisorComment && (
                          <Paper p="sm" radius="md" mb="sm" style={{ background: '#fff8e1', border: '1px solid #ffe08a' }}>
                            <Text size="xs" fw={600} c="orange" mb={2}>Overall comment:</Text>
                            <Text size="xs" c="dimmed">{sub.supervisorComment}</Text>
                          </Paper>
                        )}

                        {/* Approve / Request Revision */}
                        <Divider my="sm" />
                        <Stack gap="sm">
                          <Textarea
                            placeholder="Overall revision note (optional for approval)…"
                            value={revisionInputs[sub.id] ?? ''}
                            onChange={e => { const v = e.currentTarget.value; setRevisionInputs(prev => ({ ...prev, [sub.id]: v })); }}
                            rows={2} size="sm"
                          />
                          <Group gap="sm">
                            <Button
                              size="xs" color="green" leftSection={<LuCheck size={13} />}
                              onClick={() => {
                                dispatch(approveSubmission({ id: sub.id }));
                                // Persist to Supabase
                                reviewSubmissionDB({ submissionId: sub.id, status: 'approved' }).catch(() => {});
                                notifications.show({ title: 'Chapter approved', message: `"${sub.sectionTitle}" has been approved.`, color: 'green' });
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="xs" color="orange" variant="light" leftSection={<LuTriangleAlert size={13} />}
                              disabled={!(revisionInputs[sub.id] ?? '').trim()}
                              onClick={() => {
                                const comment = revisionInputs[sub.id] ?? '';
                                dispatch(requestRevision({ id: sub.id, comment }));
                                // Persist to Supabase
                                reviewSubmissionDB({ submissionId: sub.id, status: 'needs-revision', comment }).catch(() => {});
                                setRevisionInputs(prev => ({ ...prev, [sub.id]: '' }));
                                notifications.show({ title: 'Revision requested', message: `Feedback sent for "${sub.sectionTitle}".`, color: 'orange' });
                              }}
                            >
                              Request Revision
                            </Button>
                          </Group>
                        </Stack>
                      </Paper>
                    );
                  })
                )}
              </Stack>
            </Tabs.Panel>

            {/* ── Approved Chapters ── */}
            <Tabs.Panel value="approved">
              <Stack gap="md">
                {studentSubmissions.filter(s => s.status === 'approved').length === 0 ? (
                  <Paper withBorder p="xl" radius="md" bg="white" ta="center">
                    <LuCircleCheck size={28} color="#adb5bd" style={{ marginBottom: 8 }} />
                    <Text fw={600} c="dimmed" size="sm">No approved chapters yet.</Text>
                    <Text size="xs" c="dimmed" mt={4}>Chapters you approve will appear here.</Text>
                  </Paper>
                ) : (
                  studentSubmissions.filter(s => s.status === 'approved').map((sub, i) => (
                    <Paper key={sub.id} withBorder p="lg" radius="md" bg="white"
                      style={{ borderLeft: '4px solid #2f9e44' }}
                    >
                      <Group justify="space-between" mb="sm" wrap="nowrap">
                        <Group gap="sm" wrap="nowrap">
                          <ThemeIcon size={32} radius="md" color="green" variant="light" style={{ flexShrink: 0 }}>
                            <LuCircleCheck size={15} />
                          </ThemeIcon>
                          <Box>
                            <Group gap={6}>
                              <Text fw={700} size="sm">{sub.sectionTitle}</Text>
                              <Badge size="xs" color="green" variant="light" radius="xl">
                                Chapter {i + 1}
                              </Badge>
                              {sub.annotations.filter(a => !a.resolved).length > 0 && (
                                <Badge size="xs" color="grape" variant="light" radius="xl">
                                  {sub.annotations.filter(a => !a.resolved).length} note{sub.annotations.filter(a => !a.resolved).length > 1 ? 's' : ''}
                                </Badge>
                              )}
                              {sub.annotations.filter(a => a.resolved).length > 0 && (
                                <Badge size="xs" color="green" variant="light" radius="xl">
                                  {sub.annotations.filter(a => a.resolved).length} resolved
                                </Badge>
                              )}
                            </Group>
                            <Text size="xs" c="dimmed">
                              Approved {sub.reviewedAt ? new Date(sub.reviewedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                              {' · '}Submitted {new Date(sub.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                          </Box>
                        </Group>
                        <Badge color="green" variant="filled" radius="sm" size="sm" leftSection={<LuCheck size={10} />} style={{ flexShrink: 0 }}>
                          Approved
                        </Badge>
                      </Group>

                      {/* TTS player */}
                      <TTSPlayer text={sub.content} />

                      {/* Content preview — approved chapters show clean text, no highlights */}
                      <Paper p="md" radius="md" mt={8} mb="sm"
                        style={{ background: '#f6fef9', border: '1px solid #b2f2bb', maxHeight: 180, overflowY: 'auto' }}
                      >
                        <Text size="sm" style={{ fontFamily: 'Georgia, serif', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                          {sub.content || '(No content)'}
                        </Text>
                      </Paper>

                      {/* Reviewer Notes side-panel style — resolved / active split */}
                      {sub.annotations.length > 0 && (() => {
                        const active   = sub.annotations.filter(a => !a.resolved);
                        const resolved = sub.annotations.filter(a => a.resolved);
                        return (
                          <Stack gap={4} mb="sm">
                            <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
                              Reviewer Notes
                            </Text>
                            {active.map((ann, idx) => (
                              <Group key={ann.id} gap={8} wrap="nowrap"
                                style={{ background: ann.color + '18', borderRadius: 6, padding: '4px 8px', border: `1px solid ${ann.color}55`, overflow: 'hidden' }}
                              >
                                <Box style={{ width: 8, height: 8, borderRadius: '50%', background: ann.color, flexShrink: 0 }} />
                                <Text size="xs" fw={600} c="dimmed" style={{ flexShrink: 0 }}>#{idx + 1}</Text>
                                <Text size="xs" c="dimmed" style={{ fontStyle: 'italic', minWidth: 0 }} lineClamp={1}>"{ann.selectedText}"</Text>
                                <Text size="xs" style={{ flex: 1, minWidth: 0 }} lineClamp={1}>{ann.comment}</Text>
                              </Group>
                            ))}
                            {resolved.map((ann, idx) => (
                              <Group key={ann.id} gap={8} wrap="nowrap"
                                style={{ background: '#f1f3f5', borderRadius: 6, padding: '4px 8px', border: '1px solid #dee2e6', opacity: 0.7, overflow: 'hidden' }}
                              >
                                <LuCircleCheck size={10} color="#2f9e44" style={{ flexShrink: 0 }} />
                                <Text size="xs" fw={600} style={{ color: '#2f9e44', flexShrink: 0 }}>Resolved</Text>
                                <Text size="xs" fw={600} c="dimmed" style={{ flexShrink: 0 }}>#{active.length + idx + 1}</Text>
                                <Text size="xs" c="dimmed" style={{ fontStyle: 'italic', minWidth: 0, textDecoration: 'line-through' }} lineClamp={1}>"{ann.selectedText}"</Text>
                                <Text size="xs" style={{ flex: 1, minWidth: 0, textDecoration: 'line-through', color: '#adb5bd' }} lineClamp={1}>{ann.comment}</Text>
                              </Group>
                            ))}
                          </Stack>
                        );
                      })()}

                      {/* Supervisor's overall comment */}
                      {sub.supervisorComment && (
                        <Paper p="sm" radius="md" style={{ background: '#ebfbee', border: '1px solid #b2f2bb' }}>
                          <Text size="xs" fw={600} c="green" mb={2}>Supervisor comment:</Text>
                          <Text size="xs" c="dimmed">{sub.supervisorComment}</Text>
                        </Paper>
                      )}
                    </Paper>
                  ))
                )}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Tabs.Panel>

      </Tabs>

      {/* ── Document reading modal ── */}
      <Modal
        opened={readSection !== null}
        onClose={() => setReadSection(null)}
        size="90%"
        padding={0}
        title={null}
        styles={{
          content: { maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
          body:    { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, minHeight: 0 },
        }}
      >
        {readSection && (
          <Box style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

            {/* Modal header */}
            <Box
              px="xl" py="md"
              style={{ borderBottom: '1px solid #f1f3f5', flexShrink: 0, background: 'white' }}
            >
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Group gap="sm" mb={4} wrap="wrap">
                    <Text fw={700} size="lg">{readSection.title}</Text>
                    <Badge variant="light" color={stageStatusColor(readSection.status)} size="sm" radius="sm">
                      {stageStatusLabel(readSection.status)}
                    </Badge>
                    {readSection.approved && (
                      <Badge variant="outline" color="green" size="sm" radius="sm" leftSection={<LuCheck size={10} />}>
                        Approved
                      </Badge>
                    )}
                  </Group>
                  <Group gap="xl">
                    <Text size="xs" c="dimmed">{readSection.wordCount.toLocaleString()} words</Text>
                    <Text size="xs" c="dimmed">{student.name} · {student.degreeLevel}</Text>
                    <Text size="xs" c="dimmed" lineClamp={1} style={{ maxWidth: 300 }}>{student.projectTitle}</Text>
                    {/* Live collaborators strip */}
                    {collab.connectedUsers.length > 0 && (
                      <Group gap={6}>
                        <Group gap={4}>
                          <Box style={{ width: 7, height: 7, borderRadius: '50%', background: '#2f9e44', boxShadow: '0 0 0 2px #d3f9d8' }} />
                          <Text size="10px" fw={700} c="dimmed" style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>Live</Text>
                        </Group>
                        {collab.connectedUsers.map(u => (
                          <Tooltip
                            key={u.clientId}
                            label={
                              <Stack gap={2}>
                                <Text size="xs" fw={600}>{u.name}</Text>
                                <Text size="xs" c="dimmed">{u.email}</Text>
                              </Stack>
                            }
                            withArrow
                          >
                            <Group
                              gap={5}
                              style={{
                                background: `${u.color}12`,
                                border: `1.5px solid ${u.color}40`,
                                borderRadius: 16,
                                padding: '2px 8px 2px 4px',
                                cursor: 'default',
                              }}
                            >
                              <Box style={{
                                width: 18, height: 18, borderRadius: '50%',
                                background: u.color, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 8, color: 'white', fontWeight: 800,
                              }}>
                                {u.name.charAt(0).toUpperCase()}
                              </Box>
                              <Text size="xs" fw={600} style={{ color: u.color }}>{u.name.split(' ')[0]}</Text>
                              <Badge size="xs" variant="light" radius="xl" style={{ padding: '0 4px', fontSize: 9 }}>{u.role}</Badge>
                            </Group>
                          </Tooltip>
                        ))}
                      </Group>
                    )}
                  </Group>
                </Box>
                <Button
                  size="xs" variant="subtle" color="gray"
                  leftSection={<LuX size={13} />}
                  onClick={() => setReadSection(null)}
                  style={{ flexShrink: 0 }}
                >
                  Close
                </Button>
              </Group>
            </Box>

            {/* Document content */}
            <Box style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: '#fafafa' }}>
              <Box
                px="xl" py="xl"
                style={{ maxWidth: 860, margin: '0 auto', userSelect: 'text' }}
                onMouseUp={handleDocMouseUp}
              >
                {liveContent ? (
                  liveContent.split('\n').map((para, i) =>
                    para.trim() ? (
                      <Text
                        key={i}
                        size="sm"
                        lh={1.9}
                        mb="md"
                        style={{ fontFamily: 'Georgia, "Times New Roman", serif', textAlign: 'justify' }}
                      >
                        {applyHighlights(para.trim(), currentAnnotations)}
                      </Text>
                    ) : (
                      <Box key={i} mb="sm" />
                    )
                  )
                ) : (
                  <Box py="xl" ta="center">
                    <ThemeIcon size={48} radius="xl" color="gray" variant="light" mx="auto" mb="md">
                      <LuFileText size={22} />
                    </ThemeIcon>
                    <Text size="sm" c="dimmed">No document content available for this section yet.</Text>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Annotations panel */}
            {currentAnnotations.length > 0 && (
              <Box
                px="xl" py="md"
                style={{
                  borderTop: '1px solid #e9ecef', background: '#fffef5',
                  flexShrink: 0, maxHeight: 160, overflowY: 'auto',
                }}
              >
                <Group justify="space-between" mb="xs">
                  <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                    ANNOTATIONS ({currentAnnotations.length})
                  </Text>
                  <Button
                    size="compact-xs" variant="subtle" color="red"
                    onClick={() => {
                      collab.comments
                        .filter(c => c.sectionId === readSection.id && !c.resolved)
                        .forEach(c => collab.deleteComment(c.id));
                    }}
                  >
                    Clear all
                  </Button>
                </Group>
                <Stack gap={6}>
                  {currentAnnotations.map((ann, idx) => (
                    <Group key={ann.id} gap="sm" align="flex-start" wrap="nowrap">
                      <Box
                        style={{
                          width: 20, height: 20, borderRadius: '50%', background: ann.color,
                          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                        }}
                      >
                        <Text size="xs" fw={800} style={{ color: 'rgba(0,0,0,0.65)', fontSize: 10 }}>{idx + 1}</Text>
                      </Box>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        {ann.selectedText && (
                          <Text size="xs" fw={600} lineClamp={1}>
                            <span style={{ background: ann.color + '50', borderRadius: 3, padding: '0 4px' }}>
                              "{ann.selectedText}"
                            </span>
                          </Text>
                        )}
                        {ann.text && <Text size="xs" c="dimmed" mt={2} lineClamp={2}>{ann.text}</Text>}
                        <Group gap={6} mt={2}>
                          <Text size="xs" c="dimmed" fw={500}>{ann.author}</Text>
                          <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                            {new Date(ann.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </Group>
                      </Box>
                      <ActionIcon
                        size="xs" color="red" variant="subtle"
                        onClick={() => deleteAnnotation(readSection.id, ann.id)}
                      >
                        <LuX size={10} />
                      </ActionIcon>
                    </Group>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Supervisor review footer */}
            <Box
              px="xl" py="lg"
              style={{ borderTop: '2px solid #e9ecef', background: 'white', flexShrink: 0 }}
            >
              <Text size="sm" fw={600} mb="sm">Your Review</Text>
              <Textarea
                placeholder="Write your feedback, annotation, or revision instructions for this section…"
                value={modalComment}
                onChange={e => setModalComment(e.target.value)}
                rows={2}
                mb="md"
                styles={{ input: { background: '#f8f9fa', border: '1.5px solid #dee2e6' } }}
              />
              <Group gap="sm" wrap="wrap">
                <Button
                  size="sm"
                  color="brand"
                  leftSection={<LuSend size={13} />}
                  disabled={!modalComment.trim()}
                  onClick={() => {
                    handleSectionComment(readSection.id, modalComment);
                    notifications.show({ title: 'Comment saved', message: 'Your review has been saved to this section.', color: 'green' });
                    setReadSection(null);
                  }}
                >
                  Save Comment
                </Button>
                {!readSection.approved && (
                  <Button
                    size="sm"
                    color="green"
                    variant="light"
                    leftSection={<LuCheck size={13} />}
                    onClick={() => {
                      handleApproveSection(readSection.id);
                      setReadSection(null);
                    }}
                  >
                    Approve Section
                  </Button>
                )}
                <Button
                  size="sm"
                  color="orange"
                  variant="light"
                  leftSection={<LuTriangleAlert size={13} />}
                  onClick={() => {
                    const revisionMsg = {
                      author: 'Dr. Supervisor',
                      isStudent: false,
                      timestamp: new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
                      text: `[Revision Requested — ${readSection.title}] ${modalComment.trim() || 'Please review and revise this section.'}`,
                    };
                    if (threads.length > 0) {
                      setThreads(prev => prev.map((t, i) => i === 0 ? { ...t, messages: [...t.messages, revisionMsg] } : t));
                    } else {
                      setThreads([{ id: `rev-${readSection.id}`, subject: `Revision: ${readSection.title}`, resolved: false, messages: [revisionMsg] }]);
                    }
                    notifications.show({ title: 'Revision requested', message: `${student.name} has been notified to revise this section.`, color: 'orange' });
                    setReadSection(null);
                  }}
                >
                  Request Revision
                </Button>
              </Group>
            </Box>

          </Box>
        )}
      </Modal>

      {/* Floating annotation popup — appears above selected text */}
      {selPopup && (
        <Box
          ref={popupRef}
          style={{
            position:     'fixed',
            left:          selPopup.x,
            top:           selPopup.y - 12,
            transform:    'translate(-50%, -100%)',
            background:   'white',
            border:       '1.5px solid #dee2e6',
            borderRadius:  12,
            boxShadow:    '0 8px 32px rgba(0,0,0,0.16)',
            padding:       16,
            zIndex:        10000,
            minWidth:      300,
          }}
        >
          {/* Selected text preview */}
          <Text size="xs" fw={600} c="dimmed" mb={8} lineClamp={2} style={{ fontStyle: 'italic' }}>
            "{selPopup.text}"
          </Text>

          {/* Color picker */}
          <Group gap={6} mb={10} align="center">
            {HIGHLIGHT_COLORS.map(c => (
              <Box
                key={c.value}
                onClick={() => setSelColor(c.value)}
                title={c.label}
                style={{
                  width:       22,
                  height:      22,
                  borderRadius: '50%',
                  background:   c.value,
                  cursor:      'pointer',
                  border:       selColor === c.value ? '2.5px solid #3b5bdb' : '2px solid transparent',
                  outline:      selColor === c.value ? '1px solid #3b5bdb' : 'none',
                  outlineOffset: 1,
                  boxSizing:   'border-box',
                  flexShrink:   0,
                }}
              />
            ))}
            <Text size="xs" c="dimmed" ml={4}>Highlight colour</Text>
          </Group>

          {/* Comment input */}
          <Textarea
            placeholder="Add a note (optional)…"
            value={selComment}
            onChange={e => setSelComment(e.target.value)}
            rows={2}
            mb={10}
            size="xs"
            autoFocus
            styles={{ input: { fontSize: 12 } }}
          />

          {/* Actions */}
          <Group gap="xs" justify="flex-end">
            <Button size="xs" variant="subtle" color="gray" onClick={() => setSelPopup(null)}>
              Cancel
            </Button>
            <Button size="xs" color="brand" onClick={saveAnnotation}>
              Save Annotation
            </Button>
          </Group>
        </Box>
      )}

    </Box>
  );
}
