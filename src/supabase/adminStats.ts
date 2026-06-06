import { supabase } from './client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminProject {
  id:          string;
  title:       string;
  researcher:  string;
  department:  string;
  status:      string;
  aiUsage:     string;
  integrity:   number;
  lastUpdated: string;
  dataset:     string;
  aiMode:      string;
  sections:    { name: string; words: number }[];
}

export interface DeptStat  { dept: string; count: number }
export interface AlertItem { severity: 'critical' | 'warning'; message: string; time: string }

export interface StatusSlice {
  label: string; count: number; pct: number; color: string;
}

export interface StudentProgress {
  id:           string;
  name:         string;
  degreeLevel:  string;
  projectTitle: string;
  approvedCount: number;
  pendingCount:  number;
  rejectedCount: number;
  totalCount:    number;
  progress:      number;
}

export interface SubmissionRow {
  id:                    string;
  studentName:           string;
  department:            string;
  sectionTitle:          string;
  status:                string;
  submittedAt:           string;
  reviewedAt:            string | null;
  supervisorComment:     string | null;
  wordCount:             number;
  unresolvedAnnotations: number;
}

export interface ApprovedChapter {
  id:               string;
  studentName:      string;
  studentId:        string;
  department:       string;
  degreeLevel:      string;
  projectTitle:     string;
  sectionTitle:     string;
  supervisorComment: string | null;
  reviewedAt:       string | null;
  submittedAt:      string;
}

export interface ActivityEvent {
  type:          'submitted' | 'approved' | 'revision' | 'annotation';
  actorName:     string;   // student name for submitted, supervisor name for approved/revision
  studentName:   string;   // always the student (for context when actor is supervisor)
  sectionTitle:  string;
  action:        string;   // "submitted" | "approved" | "requested revision on" | "annotated"
  time:          string;
  isoTimestamp:  string;
}

export interface DashboardData {
  activeProjects:     number;
  pendingCount:       number;
  revisionCount:      number;
  approvedCount:      number;
  reviewedCount:      number;
  totalStudents:      number;
  avgProgress:        number;
  degreeBreakdown:    { phd: number; masters: number; ug: number; other: number };
  submissionsByDept:  DeptStat[];
  statusBreakdown:    StatusSlice[];
  alerts:             AlertItem[];
  allSubmissions:     SubmissionRow[];
  approvedChapters:   ApprovedChapter[];
  activityFeed:       ActivityEvent[];
  studentProgress:    StudentProgress[];
}

export interface AnalyticsData {
  totalPubs:     number;
  topDept:       string;
  pubData:       { dept: string; pubs: number }[];
  integrityData: { faculty: string; score: number }[];
}

// ── Internal row types ─────────────────────────────────────────────────────────

type StudentRow = {
  id: string; name: string; email: string; role: string;
  department: string | null; project_title: string | null; degree_level: string | null;
};

type SubRow = {
  id: string; student_id: string; supervisor_id: string | null;
  section_id: string; section_title: string;
  content: string; status: string; submitted_at: string;
  reviewed_at: string | null; supervisor_comment: string | null;
  annotations: { id: string; resolved: boolean }[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STUDENT_ROLES = ['Student', 'PhD Student', "Master's Student", 'Undergraduate Student', 'Researcher'];
const SUB_SELECT    = [
  'id', 'student_id', 'supervisor_id', 'section_id', 'section_title', 'content',
  'status', 'submitted_at', 'reviewed_at', 'supervisor_comment',
  'annotations:submission_annotations(id, resolved)',
].join(', ');

// ── Helpers ───────────────────────────────────────────────────────────────────

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return `${days} day${days  > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${Math.max(mins, 1)} min${mins > 1 ? 's' : ''} ago`;
}

function truncDept(d: string, max = 13) {
  return d.length > max ? d.slice(0, max - 1) + '…' : d;
}

function getDegreeLevel(row: StudentRow): string {
  const dl = row.degree_level;
  if (dl) return dl;
  if (row.role === 'PhD Student' || row.role === 'Researcher') return 'PhD';
  if (row.role === "Master's Student")     return "Master's";
  if (row.role === 'Undergraduate Student') return 'Undergraduate';
  return 'Student';
}

// ── Core data fetcher ─────────────────────────────────────────────────────────
// Three-path strategy so we never miss institution submissions:
//  Path A — submissions.institution_id = institutionId (correctly stamped subs)
//  Path B — submissions.student_id IN students-with-institution_id (covers blank institution_id on sub)
//  Path C — submissions.supervisor_id IN institution staff (covers students whose users row lacks institution_id)

async function load(institutionId: string): Promise<{
  students: StudentRow[];
  submissions: SubRow[];
  supervisorNames: Map<string, string>;
}> {

  // 1. Fetch all institution staff + students
  const { data: usersData } = await supabase
    .from('users')
    .select('id, name, email, role, department, project_title, degree_level')
    .eq('institution_id', institutionId);

  const allUsers      = (usersData ?? []) as StudentRow[];
  const students      = allUsers.filter(u => STUDENT_ROLES.includes(u.role));
  const studentIds    = students.map(s => s.id);
  const supervisorIds = allUsers.filter(u => !STUDENT_ROLES.includes(u.role)).map(u => u.id);
  // Build supervisor name map for activity log (like StudentDashboard uses supName)
  const supervisorNames = new Map(
    allUsers.filter(u => !STUDENT_ROLES.includes(u.role)).map(u => [u.id, u.name])
  );

  // 2. Three parallel submission paths
  const pathA = supabase
    .from('submissions').select(SUB_SELECT)
    .eq('institution_id', institutionId)
    .order('submitted_at', { ascending: false })
    .then(r => (r.data ?? []) as unknown  as SubRow[]);

  const pathB = studentIds.length
    ? supabase.from('submissions').select(SUB_SELECT)
        .in('student_id', studentIds)
        .order('submitted_at', { ascending: false })
        .then(r => (r.data ?? []) as unknown  as SubRow[])
    : Promise.resolve<SubRow[]>([]);

  const pathC = supervisorIds.length
    ? supabase.from('submissions').select(SUB_SELECT)
        .in('supervisor_id', supervisorIds)
        .order('submitted_at', { ascending: false })
        .then(r => (r.data ?? []) as unknown  as SubRow[])
    : Promise.resolve<SubRow[]>([]);

  const [subsA, subsB, subsC] = await Promise.all([pathA, pathB, pathC]);

  // Deduplicate
  const subMap = new Map<string, SubRow>();
  for (const s of [...subsA, ...subsB, ...subsC]) subMap.set(s.id, s);
  const submissions = [...subMap.values()]
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

  // 3. Back-fill student + supervisor records not in the initial institution user list.
  //    This covers students/supervisors whose institution_id wasn't stamped on their row.
  const knownIds    = new Set(studentIds);
  const knownSupIds = new Set(supervisorIds);
  const extraStudIds = [...new Set(submissions.map(s => s.student_id))].filter(id => !knownIds.has(id));
  const extraSupIds  = [...new Set(
    submissions.filter(s => s.supervisor_id).map(s => s.supervisor_id!)
  )].filter(id => !knownSupIds.has(id));
  const allExtraIds  = [...new Set([...extraStudIds, ...extraSupIds])];

  const studentMap = new Map<string, StudentRow>(students.map(s => [s.id, s]));

  if (allExtraIds.length) {
    const { data: extra } = await supabase
      .from('users')
      .select('id, name, email, role, department, project_title, degree_level')
      .in('id', allExtraIds);
    for (const u of (extra ?? []) as StudentRow[]) {
      if (STUDENT_ROLES.includes(u.role)) {
        studentMap.set(u.id, u);
      } else {
        supervisorNames.set(u.id, u.name); // add to supervisor name map
      }
    }
  }

  return { students: [...studentMap.values()], submissions, supervisorNames };
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function fetchDashboardData(institutionId?: string): Promise<DashboardData> {
  if (!institutionId) return emptyDashboard();

  const { students, submissions, supervisorNames } = await load(institutionId);
  const studentMap = new Map(students.map(s => [s.id, s]));

  const byStudent = new Map<string, SubRow[]>();
  for (const s of submissions) {
    if (!byStudent.has(s.student_id)) byStudent.set(s.student_id, []);
    byStudent.get(s.student_id)!.push(s);
  }

  const activeProjects = byStudent.size;
  const pendingCount   = submissions.filter(s => s.status === 'pending').length;
  const revisionCount  = submissions.filter(s => s.status === 'needs-revision').length;
  const approvedCount  = submissions.filter(s => s.status === 'approved').length;

  // Submissions per dept
  const deptMap = new Map<string, number>();
  for (const s of submissions) {
    const dept = studentMap.get(s.student_id)?.department ?? 'Other';
    deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
  }
  const submissionsByDept: DeptStat[] = [...deptMap.entries()]
    .map(([dept, count]) => ({ dept: truncDept(dept), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Per-student project status for donut
  const allStudentIds = new Set([...students.map(s => s.id), ...byStudent.keys()]);
  const statuses = [...allStudentIds].map(id => {
    const subs = byStudent.get(id) ?? [];
    if (!subs.length)                                    return 'Draft';
    if (subs.some(s => s.status === 'needs-revision'))  return 'Review';
    if (subs.every(s => s.status === 'approved'))       return 'Submitted';
    return 'In Progress';
  });

  const counts = {
    Draft:         statuses.filter(s => s === 'Draft').length,
    'In Progress': statuses.filter(s => s === 'In Progress').length,
    Review:        statuses.filter(s => s === 'Review').length,
    Submitted:     statuses.filter(s => s === 'Submitted').length,
  };
  const total = Math.max(Object.values(counts).reduce((a, b) => a + b, 0), 1);

  const statusBreakdown: StatusSlice[] = [
    { label: 'Draft',       count: counts['Draft'],        pct: (counts['Draft']        / total) * 100, color: '#dee2e6' },
    { label: 'In Progress', count: counts['In Progress'],  pct: (counts['In Progress']  / total) * 100, color: '#1864ab' },
    { label: 'Review',      count: counts['Review'],       pct: (counts['Review']        / total) * 100, color: '#f59f00' },
    { label: 'Submitted',   count: counts['Submitted'],    pct: (counts['Submitted']    / total) * 100, color: '#2f9e44' },
  ].filter(s => s.count > 0);

  // Alerts (revision requests + open annotations)
  const alerts: AlertItem[] = [];
  for (const s of submissions) {
    if (alerts.length >= 4) break;
    const name       = studentMap.get(s.student_id)?.name ?? 'A student';
    const unresolved = s.annotations.filter(a => !a.resolved).length;
    if (s.status === 'needs-revision') {
      alerts.push({ severity: 'critical', message: `"${s.section_title}" by ${name} requires revision`, time: timeAgo(s.submitted_at) });
    } else if (unresolved > 0) {
      alerts.push({ severity: 'warning', message: `${unresolved} open annotation${unresolved > 1 ? 's' : ''} in "${s.section_title}" by ${name}`, time: timeAgo(s.submitted_at) });
    }
  }

  // Full submission list (all statuses, for chapter tracker table)
  const allSubmissions: SubmissionRow[] = submissions.map(s => {
    const st = studentMap.get(s.student_id);
    return {
      id:                    s.id,
      studentName:           st?.name       ?? 'Unknown',
      department:            st?.department ?? 'Unknown',
      sectionTitle:          s.section_title,
      status:                s.status,
      submittedAt:           s.submitted_at,
      reviewedAt:            s.reviewed_at,
      supervisorComment:     s.supervisor_comment,
      wordCount:             countWords(s.content),
      unresolvedAnnotations: s.annotations.filter(a => !a.resolved).length,
    };
  });

  // Approved chapters (most recently reviewed first — matches SupervisorApprovals sort)
  const approvedChapters: ApprovedChapter[] = submissions
    .filter(s => s.status === 'approved')
    .sort((a, b) => {
      const ta = a.reviewed_at ?? a.submitted_at;
      const tb = b.reviewed_at ?? b.submitted_at;
      return new Date(tb).getTime() - new Date(ta).getTime();
    })
    .map(s => {
      const st = studentMap.get(s.student_id);
      return {
        id:                s.id,
        studentName:       st?.name          ?? 'Unknown',
        studentId:         s.student_id,
        department:        st?.department    ?? 'Unknown',
        degreeLevel:       st?.degree_level  ?? st?.role ?? 'Student',
        projectTitle:      st?.project_title ?? 'Untitled Research',
        sectionTitle:      s.section_title,
        supervisorComment: s.supervisor_comment,
        reviewedAt:        s.reviewed_at,
        submittedAt:       s.submitted_at,
      };
    });

  // Activity feed — mirrors StudentDashboard exactly:
  // • One event per submission action: student submits → supervisor reviews
  // • Uses supervisor name from supervisorNames map (same as StudentDashboard uses supName)
  // • Sorted newest-first by the action timestamp
  const events: ActivityEvent[] = [];
  for (const s of submissions) {
    const studentName  = studentMap.get(s.student_id)?.name ?? 'A student';
    const supervisorName = s.supervisor_id ? (supervisorNames.get(s.supervisor_id) ?? 'Supervisor') : 'Supervisor';

    // Submission event (student is actor)
    events.push({
      type:         'submitted',
      actorName:    studentName,
      studentName,
      sectionTitle: s.section_title,
      action:       'submitted',
      time:         timeAgo(s.submitted_at),
      isoTimestamp: s.submitted_at,
    });

    // Review event (supervisor is actor) — only if reviewed_at exists, same as StudentDashboard
    if (s.reviewed_at) {
      const isApproved = s.status === 'approved';
      events.push({
        type:         isApproved ? 'approved' : 'revision',
        actorName:    supervisorName,
        studentName,
        sectionTitle: s.section_title,
        action:       isApproved ? 'approved' : 'requested revision on',
        time:         timeAgo(s.reviewed_at),
        isoTimestamp: s.reviewed_at,
      });
    }

    // Annotation event for unresolved annotations
    if (s.annotations.some(a => !a.resolved)) {
      events.push({
        type:         'annotation',
        actorName:    supervisorName,
        studentName,
        sectionTitle: s.section_title,
        action:       'annotated',
        time:         timeAgo(s.submitted_at),
        isoTimestamp: s.submitted_at,
      });
    }
  }

  const activityFeed = events
    .sort((a, b) => new Date(b.isoTimestamp).getTime() - new Date(a.isoTimestamp).getTime())
    .slice(0, 30);

  // Per-student progress (mirrors SupervisorOverview Student Details)
  const studentProgress: StudentProgress[] = [...studentMap.values()].map(st => {
    const subs         = byStudent.get(st.id) ?? [];
    const appCount     = subs.filter(s => s.status === 'approved').length;
    const pendCount    = subs.filter(s => s.status === 'pending').length;
    const rejCount     = subs.filter(s => s.status === 'needs-revision').length;
    const prog         = subs.length > 0 ? Math.round((appCount / subs.length) * 100) : 0;
    return {
      id:           st.id,
      name:         st.name,
      degreeLevel:  getDegreeLevel(st),
      projectTitle: st.project_title ?? 'Untitled Research',
      approvedCount: appCount,
      pendingCount:  pendCount,
      rejectedCount: rejCount,
      totalCount:    subs.length,
      progress:      prog,
    };
  }).sort((a, b) => b.progress - a.progress);

  // Avg progress across all students (same formula as SupervisorOverview)
  const avgProgress = studentProgress.length > 0
    ? Math.round(studentProgress.reduce((sum, s) => sum + s.progress, 0) / studentProgress.length)
    : 0;

  // Reviewed = approved + needs-revision (same as SupervisorOverview)
  const reviewedCount = approvedCount + revisionCount;

  // Degree breakdown
  const degreeBreakdown = {
    phd:     students.filter(s => ['PhD', 'PhD Student', 'Researcher'].includes(getDegreeLevel(s))).length,
    masters: students.filter(s => ["Master's", "Master's Student"].includes(getDegreeLevel(s))).length,
    ug:      students.filter(s => ['Undergraduate', 'Undergraduate Student'].includes(getDegreeLevel(s))).length,
    other:   students.filter(s => ['Student'].includes(getDegreeLevel(s))).length,
  };

  return {
    activeProjects, pendingCount, revisionCount, approvedCount, reviewedCount,
    totalStudents: students.length, avgProgress, degreeBreakdown,
    submissionsByDept, statusBreakdown, alerts,
    allSubmissions, approvedChapters, activityFeed, studentProgress,
  };
}

function emptyDashboard(): DashboardData {
  return {
    activeProjects: 0, pendingCount: 0, revisionCount: 0, approvedCount: 0, reviewedCount: 0,
    totalStudents: 0, avgProgress: 0,
    degreeBreakdown: { phd: 0, masters: 0, ug: 0, other: 0 },
    submissionsByDept: [], statusBreakdown: [], alerts: [],
    allSubmissions: [], approvedChapters: [], activityFeed: [], studentProgress: [],
  };
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function fetchAdminProjects(institutionId?: string): Promise<AdminProject[]> {
  if (!institutionId) return [];

  const { students, submissions } = await load(institutionId);

  const byStudent = new Map<string, SubRow[]>();
  for (const s of submissions) {
    if (!byStudent.has(s.student_id)) byStudent.set(s.student_id, []);
    byStudent.get(s.student_id)!.push(s);
  }

  return students.map(st => {
    const subs = byStudent.get(st.id) ?? [];

    let status = 'Draft';
    if (subs.length) {
      if (subs.some(s => s.status === 'needs-revision'))  status = 'Review';
      else if (subs.every(s => s.status === 'approved'))  status = 'Submitted';
      else                                                 status = 'In-Progress';
    }

    const sorted     = [...subs].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    const sections   = subs.map(s => ({ name: s.section_title, words: countWords(s.content) }));
    const approved   = subs.filter(s => s.status === 'approved').length;
    const integrity  = subs.length ? Math.round((approved / subs.length) * 100) : 0;
    const annotTotal = subs.reduce((sum, s) => sum + s.annotations.length, 0);
    const aiUsage    = annotTotal > 5 ? 'High' : annotTotal > 2 ? 'Moderate' : annotTotal > 0 ? 'Low' : 'None';

    return {
      id:          st.id,
      title:       st.project_title ?? `${st.name}'s Research`,
      researcher:  st.name,
      department:  st.department ?? 'Unknown',
      status,
      aiUsage,
      integrity,
      lastUpdated: sorted[0]?.submitted_at.slice(0, 10) ?? '—',
      dataset:     subs.length ? 'Uploaded'  : 'Not Uploaded',
      aiMode:      subs.length ? 'Enabled'   : 'Disabled',
      sections,
    };
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function fetchAnalyticsData(institutionId?: string): Promise<AnalyticsData> {
  if (!institutionId) return { totalPubs: 0, topDept: '—', pubData: [], integrityData: [] };

  const { students, submissions } = await load(institutionId);
  const studentMap = new Map(students.map(s => [s.id, s]));

  const approved = submissions.filter(s => s.status === 'approved');

  const pubMap = new Map<string, number>();
  for (const s of approved) {
    const dept = studentMap.get(s.student_id)?.department ?? 'Other';
    pubMap.set(dept, (pubMap.get(dept) ?? 0) + 1);
  }
  const pubData = [...pubMap.entries()]
    .map(([dept, pubs]) => ({ dept: truncDept(dept), pubs }))
    .sort((a, b) => b.pubs - a.pubs)
    .slice(0, 7);

  const intMap = new Map<string, { approved: number; total: number }>();
  for (const s of submissions) {
    const dept = studentMap.get(s.student_id)?.department ?? 'Other';
    if (!intMap.has(dept)) intMap.set(dept, { approved: 0, total: 0 });
    const e = intMap.get(dept)!;
    e.total++;
    if (s.status === 'approved') e.approved++;
  }
  const integrityData = [...intMap.entries()]
    .map(([faculty, { approved: ap, total }]) => ({
      faculty: truncDept(faculty, 14),
      score:   total > 0 ? Math.round((ap / total) * 100) : 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return {
    totalPubs:  approved.length,
    topDept:    pubData[0]?.dept ?? '—',
    pubData,
    integrityData,
  };
}
