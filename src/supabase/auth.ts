import { supabase } from './client';
import type { AppRole } from '../Redux/slices/authSlice';

// ── Types ──────────────────────────────────────────────────────────────────

export interface UserProfile {
  id:                  string;
  name:                string;
  email:               string;
  role:                AppRole;
  institution_id?:     string;
  institution_name?:   string;
  institution_email?:  string;
  institution_type?:   string;
  phone?:              string;
  department_name?:    string;
  department?:         string;
  matric_no?:          string;
  degree_level?:       string;
  project_title?:      string;
  supervisor_id?:      string;
  supervisor_name?:    string;   // resolved from supervisor_id
  supervisor_email?:   string;
}

export interface InstitutionSignupParams {
  adminPassword:    string;
  institutionName:  string;
  institutionEmail: string;
  institutionType:  string;
  phone:            string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateInstitutionId(): string {
  const digits = Math.floor(10000000 + Math.random() * 90000000);
  return `COG${digits}`;
}

const PROFILE_SELECT = `
  id, name, email, role,
  institution_id, institution_name, institution_email, institution_type, phone,
  department, matric_no, degree_level, project_title, supervisor_id
`;

// ── Sign up: creates auth user + upserts single row in users table ──────────
// Using upsert so if the users row was lost (table reset) re-registration
// restores it without needing to change the auth password.

export async function signUpInstitution(
  params: InstitutionSignupParams,
): Promise<{ userId: string }> {
  const { adminPassword, institutionName, institutionEmail, institutionType, phone } = params;

  // 1. Try to create a new auth user via signUp
  let userId: string | null = null;
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email:    institutionEmail,
    password: adminPassword,
  });

  if (!signUpError && signUpData.user) {
    // New account created (or Supabase returned existing user object)
    userId = signUpData.user.id;
  } else {
    // signUp failed or returned no user (email already registered).
    // Sign in with the supplied password to get the existing user's ID,
    // then we'll upsert their profile row below.
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email:    institutionEmail,
      password: adminPassword,
    });
    if (signInError || !signInData.user) {
      throw new Error(
        signInError?.message ??
        'Account already exists. Use your existing password, or reset it via "Forgot password".',
      );
    }
    userId = signInData.user.id;
  }

  if (!userId) throw new Error('Could not determine user ID — please try again.');

  // 2. Preserve existing institution_id if this user already has one.
  //    Regenerating it on every re-registration would orphan all previously
  //    created colleges / faculties / departments that carry the old COG number.
  const { data: existingRow } = await supabase
    .from('users')
    .select('institution_id')
    .eq('id', userId)
    .maybeSingle();

  const stableInstitutionId = existingRow?.institution_id ?? generateInstitutionId();

  // 3. Upsert the full institution profile so re-registration always restores a lost row
  const { error: upsertError } = await supabase
    .from('users')
    .upsert({
      id:                userId,
      institution_id:    stableInstitutionId,
      institution_name:  institutionName,
      institution_email: institutionEmail,
      institution_type:  institutionType,
      phone,
      name:              institutionEmail.split('@')[0],
      email:             institutionEmail,
      role:              'Director of Research',
    }, { onConflict: 'id' });

  if (upsertError) {
    console.error('[signUpInstitution] Upsert failed:', upsertError.message);
    throw new Error(`Failed to save profile: ${upsertError.message}`);
  }

  return { userId };
}

// ── Sign in and fetch full profile ─────────────────────────────────────────

export async function signInSupabase(
  email: string,
  password: string,
): Promise<{ profile: UserProfile; accessToken: string; refreshToken: string } | null> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return null;

  const accessToken  = data.session?.access_token  ?? '';
  const refreshToken = data.session?.refresh_token ?? '';

  // Primary lookup by auth user id
  let profile = await fetchProfile(data.user.id);

  // Recovery: if no row found by id, try by email.
  // This happens when the users table was reset but auth.users still has the account.
  if (!profile) {
    const { data: byEmail } = await supabase
      .from('users')
      .select(PROFILE_SELECT)
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (byEmail) {
      profile = byEmail as UserProfile;
    }
  }

  // Truly no profile — auth succeeded but users row is missing entirely
  // (users table was probably reset). Throw a specific error so Login.tsx
  // can show a helpful recovery message instead of "wrong password".
  if (!profile) throw new Error('PROFILE_NOT_FOUND');

  return { profile, accessToken, refreshToken };
}

// ── Fetch full profile (single query, all columns) ─────────────────────────

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data: user, error } = await supabase
    .from('users')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .single();

  if (error || !user) return null;

  // For staff users (Dean / HoD) institution_name may be null in their own row.
  // Look it up from the institution admin who shares the same institution_id.
  if (!user.institution_name && user.institution_id) {
    const { data: admin } = await supabase
      .from('users')
      .select('institution_name, institution_email')
      .eq('institution_id', user.institution_id)
      .eq('role', 'Director of Research')
      .maybeSingle();
    if (admin) {
      user.institution_name  = admin.institution_name;
      user.institution_email = admin.institution_email;
    }
  }

  // Look up which dept / faculty / college this user is responsible for
  let departmentName: string | undefined;

  if (user.role === 'Head of Department') {
    const { data: dept } = await supabase
      .from('departments')
      .select('name')
      .eq('hod_id', userId)
      .maybeSingle();
    if (dept) departmentName = dept.name;

  } else if (user.role === 'Dean') {
    // Check faculties first, then colleges
    const { data: fac } = await supabase
      .from('faculties')
      .select('name')
      .eq('dean_id', userId)
      .maybeSingle();
    if (fac) {
      departmentName = fac.name;
    } else {
      const { data: col } = await supabase
        .from('colleges')
        .select('name')
        .eq('dean_id', userId)
        .maybeSingle();
      if (col) departmentName = col.name;
    }
  }

  // For students: look up their assigned supervisor's name and email
  let supervisorName: string | undefined;
  let supervisorEmail: string | undefined;
  const STUDENT_ROLES = ['PhD Student', "Master's Student", 'Undergraduate Student', 'Student', 'Researcher'];
  if (STUDENT_ROLES.includes(user.role) && user.supervisor_id) {
    const { data: sup } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', user.supervisor_id)
      .maybeSingle();
    if (sup) {
      supervisorName  = sup.name;
      supervisorEmail = sup.email;
    }
  }

  return {
    ...user,
    department_name:  departmentName,
    supervisor_name:  supervisorName,
    supervisor_email: supervisorEmail,
  } as UserProfile;
}

// ── Sign out ───────────────────────────────────────────────────────────────

export async function signOut() {
  // scope:'local' clears the local session immediately and is fast (no network
  // await required for the session to be gone locally).  The Supabase client
  // itself removes the sb-* storage key as part of this call.
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // ignore — belt-and-suspenders sweep below still runs
  }

  // Belt-and-suspenders: remove any sb-* keys the client may have left behind.
  // We deliberately do NOT call localStorage.clear() here — a full clear would
  // race with an immediate re-login and wipe the new cognita_user_session that
  // App.tsx's SIGNED_IN handler writes, breaking refresh for the new session.
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('sb-')) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore — unavailable in some private-browsing modes
  }
}
