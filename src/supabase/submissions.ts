import { supabase } from './client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DBSubmission {
  id:                 string;
  student_id:         string;
  supervisor_id:      string | null;
  institution_id:     string;
  section_id:         string;
  section_title:      string;
  content:            string;
  status:             'pending' | 'approved' | 'needs-revision';
  supervisor_comment: string | null;
  submitted_at:       string;
  reviewed_at:        string | null;
  annotations?:       DBAnnotation[];
}

export interface DBAnnotation {
  id:            string;
  submission_id: string;
  selected_text: string;
  comment:       string;
  color:         string;
  resolved:      boolean;
  created_at:    string;
}

// ── Submit / update a chapter ─────────────────────────────────────────────────

export async function submitChapter(params: {
  studentId:     string;
  supervisorId:  string | null;
  institutionId: string;
  sectionId:     string;
  sectionTitle:  string;
  content:       string;
}): Promise<DBSubmission> {
  const { data, error } = await supabase
    .from('submissions')
    .upsert({
      student_id:    params.studentId,
      supervisor_id: params.supervisorId,
      institution_id: params.institutionId,
      section_id:    params.sectionId,
      section_title: params.sectionTitle,
      content:       params.content,
      status:        'pending',
      submitted_at:  new Date().toISOString(),
    }, { onConflict: 'student_id,section_id' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DBSubmission;
}

// ── Fetch submissions for a student ──────────────────────────────────────────

export async function fetchStudentSubmissions(studentId: string): Promise<DBSubmission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select(`*, annotations:submission_annotations(*)`)
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false });

  if (error) { console.error('fetchStudentSubmissions:', error.message); return []; }
  return (data ?? []) as unknown as DBSubmission[];
}

// ── Fetch submissions for a student (supervisor can pass their id for extra filter) ──

export async function fetchSubmissionsForStudent(
  studentId:    string,
  supervisorId?: string,   // optional — if omitted, returns all submissions for that student
): Promise<DBSubmission[]> {
  let q = supabase
    .from('submissions')
    .select(`*, annotations:submission_annotations(*)`)
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false });

  // Only apply supervisor filter if provided AND non-empty
  if (supervisorId) q = q.eq('supervisor_id', supervisorId);

  const { data, error } = await q;
  if (error) { console.error('fetchSubmissionsForStudent:', error.message); return []; }
  return (data ?? []) as unknown as DBSubmission[];
}

// ── Fetch ALL submissions for a supervisor (all students) ─────────────────────

export async function fetchAllSupervisorSubmissions(supervisorId: string): Promise<DBSubmission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select(`*, annotations:submission_annotations(*)`)
    .eq('supervisor_id', supervisorId)
    .order('submitted_at', { ascending: false });

  if (error) { console.error('fetchAllSupervisorSubmissions:', error.message); return []; }
  return (data ?? []) as unknown as DBSubmission[];
}

// ── Supervisor reviews a submission ──────────────────────────────────────────

export async function reviewSubmission(params: {
  submissionId: string;
  status:       'approved' | 'needs-revision';
  comment?:     string;
}): Promise<void> {
  const { error } = await supabase
    .from('submissions')
    .update({
      status:             params.status,
      supervisor_comment: params.comment ?? null,
      reviewed_at:        new Date().toISOString(),
    })
    .eq('id', params.submissionId);

  if (error) throw new Error(error.message);
}

// ── Annotations ───────────────────────────────────────────────────────────────

export async function addAnnotation(params: {
  submissionId: string;
  selectedText: string;
  comment:      string;
  color:        string;
}): Promise<DBAnnotation> {
  const { data, error } = await supabase
    .from('submission_annotations')
    .insert({
      submission_id: params.submissionId,
      selected_text: params.selectedText,
      comment:       params.comment,
      color:         params.color,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DBAnnotation;
}

export async function updateAnnotation(id: string, comment: string): Promise<void> {
  const { error } = await supabase
    .from('submission_annotations')
    .update({ comment })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteAnnotationDB(id: string): Promise<void> {
  const { error } = await supabase
    .from('submission_annotations')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function resolveAnnotationDB(id: string): Promise<void> {
  const { error } = await supabase
    .from('submission_annotations')
    .update({ resolved: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
