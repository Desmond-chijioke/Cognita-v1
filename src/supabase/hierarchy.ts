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

export async function fetchHierarchy(institutionId: string) {
  // Step 1: Fetch the three entity tables independently
  const [colRes, facRes, deptRes] = await Promise.all([
    supabase.from('colleges')   .select('id, institution_id, name, dean_id, created_at').eq('institution_id', institutionId).order('created_at'),
    supabase.from('faculties')  .select('id, institution_id, college_id, name, dean_id, created_at').eq('institution_id', institutionId).order('created_at'),
    supabase.from('departments').select('id, institution_id, faculty_id, name, hod_id, students, created_at').eq('institution_id', institutionId).order('created_at'),
  ]);

  const colleges    = (colRes.data  ?? []) as (Omit<DBCollege,    'dean'>)[];
  const faculties   = (facRes.data  ?? []) as (Omit<DBFaculty,    'dean'>)[];
  const departments = (deptRes.data ?? []) as (Omit<DBDepartment, 'hod'>)[];

  // Step 2: Collect all unique leader UUIDs and batch-fetch from users
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
      .in('id', [...new Set(leaderIds)]);
    users?.forEach(u => { usersMap[u.id] = u as UserStub; });
  }

  // Step 3: Merge leader info back into each entity
  return {
    colleges:    colleges.map(c => ({ ...c, dean: c.dean_id ? (usersMap[c.dean_id] ?? null) : null }))    as DBCollege[],
    faculties:   faculties.map(f => ({ ...f, dean: f.dean_id ? (usersMap[f.dean_id] ?? null) : null }))  as DBFaculty[],
    departments: departments.map(d => ({ ...d, hod: d.hod_id ? (usersMap[d.hod_id]  ?? null) : null })) as DBDepartment[],
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

export async function deleteCollege(id: string) {
  const { error } = await supabase.from('colleges').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteFaculty(id: string) {
  const { error } = await supabase.from('faculties').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteDepartment(id: string) {
  const { error } = await supabase.from('departments').delete().eq('id', id);
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
  matricNo?:       string;   // students
  projectTitle?:   string;   // students (research program)
  supervisorId?:   string;   // students (assigned supervisor)
}): Promise<{ userId: string }> {
  const { name, email, phone, password, role, institutionId, institutionName,
          specialty, matricNo, projectTitle, supervisorId } = params;

  // Isolated temp client — different storage key so admin session is never touched
  const temp = createClient(
    import.meta.env.VITE_SUPABASE_URL      as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'sb-staff-temp' } },
  );

  let userId: string | null = null;

  // 1. Try to create a new Supabase auth account
  const { data: signUpData, error: signUpError } = await temp.auth.signUp({ email, password });

  if (signUpData?.user) {
    // New account created successfully
    userId = signUpData.user.id;
  } else {
    // signUp returned null user — email already exists in auth.users.
    // DO NOT try signInWithPassword (the generated password won't match the
    // existing account's real password → "Invalid login credentials" error).
    // Instead look up the existing profile row by email.
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
    } else if (signUpError) {
      throw new Error(signUpError.message);
    } else {
      throw new Error(`An account for ${email} already exists but has no profile. Contact your administrator.`);
    }
  }

  if (!userId) throw new Error('Could not get user ID — please try again.');

  // INSERT the profile row. Using insert (not upsert) to avoid triggering the
  // UPDATE RLS policy (which only allows auth.uid() = id — the admin/HoD can't
  // update another user's row). If the row already exists, skip silently.
  const { error: profileError } = await supabase.from('users').insert({
    id:               userId,
    name,
    email,
    phone:            phone         ?? null,
    role,
    institution_id:   institutionId,
    institution_name: institutionName,
    specialty:        specialty     ?? null,
    matric_no:        matricNo      ?? null,
    project_title:    projectTitle  ?? null,
    supervisor_id:    supervisorId  ?? null,
  });

  // Log insert errors but never throw — the auth user was created and that's
  // the critical part. Profile can be repaired manually if the insert fails.
  if (profileError) {
    console.error('[createStaffUser] users insert failed:', profileError.code, profileError.message);
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
