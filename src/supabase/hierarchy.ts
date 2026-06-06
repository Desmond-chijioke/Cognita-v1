import { createClient } from '@supabase/supabase-js';
import { supabase } from './client';

// ── Shared user stub (leader info embedded from users table) ──────────────────

export interface UserStub {
  id:     string;
  name:   string;
  email:  string;
  phone?: string;
  role?:  string;
}

// ── Normalized types — hierarchy tables only store entity + leader FK ─────────

export interface DBCollege {
  id:             string;
  institution_id: string;
  name:           string;
  dean_id:        string | null;
  created_at:     string;
  dean?:          UserStub | null;
}

export interface DBFaculty {
  id:             string;
  institution_id: string;
  college_id:     string | null;
  name:           string;
  dean_id:        string | null;
  created_at:     string;
  dean?:          UserStub | null;
}

export interface DBDepartment {
  id:             string;
  institution_id: string;
  faculty_id:     string;
  name:           string;
  hod_id:         string | null;
  students:       number;
  created_at:     string;
  hod?:           UserStub | null;
}

// ── Fetch all hierarchy data (2-step: entities → then batch-fetch leaders) ────
// Avoids PostgREST FK join syntax which requires schema cache refresh and can hang.

const STUDENT_ROLES = ['Student', 'PhD Student', "Master's Student", 'Undergraduate Student', 'Researcher'];

export async function fetchHierarchy(institutionId: string) {
  // Step 1: Fetch the three entity tables + institution students in parallel
  const [colRes, facRes, deptRes, studentRes] = await Promise.all([
    supabase.from('colleges')   .select('id, institution_id, name, dean_id, created_at').eq('institution_id', institutionId).order('created_at'),
    supabase.from('faculties')  .select('id, institution_id, college_id, name, dean_id, created_at').eq('institution_id', institutionId).order('created_at'),
    supabase.from('departments').select('id, institution_id, faculty_id, name, hod_id, students, created_at').eq('institution_id', institutionId).order('created_at'),
    // Live student count per department — scoped to this institution only
    supabase.from('users').select('department').eq('institution_id', institutionId).in('role', STUDENT_ROLES),
  ]);

  const colleges    = (colRes.data  ?? []) as (Omit<DBCollege,    'dean'>)[];
  const faculties   = (facRes.data  ?? []) as (Omit<DBFaculty,    'dean'>)[];
  const departments = (deptRes.data ?? []) as (Omit<DBDepartment, 'hod'>)[];

  // Build a live count map: department name → number of students in this institution
  const studentCountMap = new Map<string, number>();
  for (const u of (studentRes.data ?? []) as { department: string | null }[]) {
    if (!u.department) continue;
    studentCountMap.set(u.department, (studentCountMap.get(u.department) ?? 0) + 1);
  }

  // Step 2: Collect all unique leader UUIDs and batch-fetch from users (institution-scoped)
  const leaderIds = [
    ...colleges.map(c => c.dean_id),
    ...faculties.map(f => f.dean_id),
    ...departments.map(d => d.hod_id),
  ].filter((id): id is string => !!id);

  const usersMap: Record<string, UserStub> = {};
  if (leaderIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email, phone, role')
      .in('id', [...new Set(leaderIds)])
      .eq('institution_id', institutionId);  // only leaders from this institution
    users?.forEach(u => { usersMap[u.id] = u as UserStub; });
  }

  // Step 3: Merge leader info + live student counts back into each entity
  return {
    colleges:    colleges.map(c => ({ ...c, dean: c.dean_id ? (usersMap[c.dean_id] ?? null) : null })) as DBCollege[],
    faculties:   faculties.map(f => ({ ...f, dean: f.dean_id ? (usersMap[f.dean_id] ?? null) : null })) as DBFaculty[],
    departments: departments.map(d => ({
      ...d,
      hod:      d.hod_id ? (usersMap[d.hod_id] ?? null) : null,
      students: studentCountMap.get(d.name) ?? 0,  // live count, not stale DB column
    })) as DBDepartment[],
  };
}

// ── Insert helpers (entity fields only — user info lives in users table) ──────

export async function insertCollege(data: {
  institution_id: string;
  name:           string;
  dean_id?:       string | null;
}): Promise<string> {
  const { data: row, error } = await supabase
    .from('colleges').insert(data).select('id').single();
  if (error) throw new Error(error.message);
  return row.id as string;
}

export async function insertFaculty(data: {
  institution_id: string;
  college_id?:    string | null;
  name:           string;
  dean_id?:       string | null;
}): Promise<string> {
  const { data: row, error } = await supabase
    .from('faculties').insert(data).select('id').single();
  if (error) throw new Error(error.message);
  return row.id as string;
}

export async function insertDepartment(data: {
  institution_id: string;
  faculty_id:     string;
  name:           string;
  hod_id?:        string | null;
  students?:      number;
}): Promise<string> {
  const { data: row, error } = await supabase
    .from('departments').insert(data).select('id').single();
  if (error) throw new Error(error.message);
  return row.id as string;
}

// ── Delete helpers ────────────────────────────────────────────────────────────

export async function deleteCollege(id: string, institutionId: string) {
  const { error } = await supabase.from('colleges').delete()
    .eq('id', id).eq('institution_id', institutionId);
  if (error) throw new Error(error.message);
}

export async function deleteFaculty(id: string, institutionId: string) {
  const { error } = await supabase.from('faculties').delete()
    .eq('id', id).eq('institution_id', institutionId);
  if (error) throw new Error(error.message);
}

export async function deleteDepartment(id: string, institutionId: string) {
  const { error } = await supabase.from('departments').delete()
    .eq('id', id).eq('institution_id', institutionId);
  if (error) throw new Error(error.message);
}

// ── Create staff user ─────────────────────────────────────────────────────────
// Stores user info in the shared users table.
// institution_id is shared across all staff in one institution (NOT unique).

export async function createStaffUser(params: {
  name:            string;
  email:           string;
  phone?:          string;
  password:        string;
  role:            string;
  institutionId:   string;
  institutionName: string;
  // Role-specific optional fields
  specialty?:      string;   // supervisors
  department?:     string;   // supervisors
  matricNo?:       string;   // students
  projectTitle?:   string;   // students (research program)
  supervisorId?:   string;   // students (assigned supervisor)
}): Promise<{ userId: string }> {
  const { name, email, phone, password, role, institutionId, institutionName,
          specialty, department, matricNo, projectTitle, supervisorId } = params;

  // Use the deployed Edge Function (rapid-responder) to create the auth user.
  // This runs server-side with the service role key so NO second GoTrueClient
  // is created in the browser — eliminating the session contamination bug that
  // caused admins to be signed out when creating staff members.
  let userId: string | null = null;

  const { data: edgeData, error: edgeError } = await supabase.functions.invoke('rapid-responder', {
    body: { name, email, password, role, institutionId, institutionName },
  });

  if (!edgeError && edgeData?.userId) {
    // Edge Function created the auth user + inserted the profile row
    userId = edgeData.userId;
  } else {
    // Edge Function unavailable — fall back to browser-side signUp.
    // This creates a second GoTrueClient but is acceptable as a fallback.
    console.warn('[createStaffUser] Edge Function failed, using browser fallback:', edgeError?.message);

    const tempClient = createClient(
      import.meta.env.VITE_SUPABASE_URL      as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'sb-staff-tmp-' + Date.now() } },
    );

    const { data: signUpData } = await tempClient.auth.signUp({ email, password });

    if (signUpData?.user) {
      userId = signUpData.user.id;
    } else {
      // Email already exists — look up by email
      const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).maybeSingle();
      if (existing) userId = existing.id;
      else throw new Error(`Could not create account for ${email}. Try a different email.`);
    }
  }

  if (!userId) throw new Error('Could not get user ID — please try again.');

  // If the Edge Function succeeded it already inserted the basic profile row.
  // We still do a browser-side upsert to add the extra fields (specialty, phone,
  // matric_no etc.) that the Edge Function doesn't receive.
  // ignoreDuplicates: false means update if id exists — this is allowed because
  // after dropping the institution_id unique constraint the only conflict is on
  // the primary key (id), and the INSERT policy covers new rows while any UPDATE
  // done here is to the SAME user id that was just created so auth.uid() = id
  // matches when the admin's session is still active.
  // Plain INSERT — only the INSERT policy is checked (not UPDATE).
  // Upsert checks both INSERT + UPDATE policies which causes 42501 when the
  // HOD inserts a row for a different user (UPDATE policy needs auth.uid() = id).
  const { error: profileError } = await supabase.from('users').insert({
    id:               userId,
    name,
    email,
    phone:            phone         ?? null,
    role,
    institution_id:   institutionId,
    institution_name: institutionName,
    specialty:        specialty     ?? null,
    department:       department    ?? null,
    matric_no:        matricNo      ?? null,
    project_title:    projectTitle  ?? null,
    supervisor_id:    supervisorId  ?? null,
  });

  if (profileError) {
    // 23505 = duplicate key — Edge Function already created the row, that's fine
    if (profileError.code === '23505') return { userId };
    console.error('[createStaffUser] profile insert failed:', profileError.code, profileError.message);
    throw new Error(`Profile could not be saved: ${profileError.message}`);
  }

  return { userId };
}

// ── Fetch supervisors for an institution ──────────────────────────────────────

export interface DBSupervisorUser {
  id:         string;
  name:       string;
  email:      string;
  phone?:     string;
  specialty?: string;
  role:       string;
  created_at: string;
}

export async function fetchSupervisors(institutionId: string): Promise<DBSupervisorUser[]> {
  const { data } = await supabase
    .from('users')
    .select('id, name, email, phone, specialty, role, created_at')
    .eq('institution_id', institutionId)
    .in('role', ['Supervisor', 'Senior Supervisor', 'Co-Supervisor'])
    .order('created_at');
  return (data ?? []) as DBSupervisorUser[];
}

// ── Fetch students for an institution ─────────────────────────────────────────

export interface DBStudentUser {
  id:            string;
  name:          string;
  email:         string;
  phone?:        string;
  matric_no?:    string;
  project_title?: string;
  role:          string;
  supervisor_id?: string;
  created_at:    string;
}

export async function fetchStudents(institutionId: string): Promise<DBStudentUser[]> {
  const { data } = await supabase
    .from('users')
    .select('id, name, email, phone, matric_no, project_title, role, supervisor_id, created_at')
    .eq('institution_id', institutionId)
    .in('role', ['PhD Student', "Master's Student", 'Undergraduate Student', 'Student', 'Researcher'])
    .order('created_at');
  return (data ?? []) as DBStudentUser[];
}

// ── Update student's supervisor assignment in Supabase ────────────────────────

export async function updateSupervisorAssignment(
  studentId:    string,
  supervisorId: string | null,
) {
  const { error } = await supabase
    .from('users')
    .update({ supervisor_id: supervisorId })
    .eq('id', studentId);
  if (error) throw new Error(error.message);
}
