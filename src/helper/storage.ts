const SESSION_KEY = 'cognita_user_session';

export interface StoredSession {
  id:                string;
  name:              string;
  email:             string;
  role:              string;
  institutionId?:    string;
  institutionName?:  string;
  institutionEmail?: string;
  departmentName?:   string;
  collegeId?:        string;
  facultyId?:        string;
  supervisorId?:     string;
  supervisorName?:   string;
  supervisorEmail?:  string;
  // Supabase tokens stored here instead of sb-* keys
  accessToken?:      string;
  refreshToken?:     string;
}

export function saveSession(user: StoredSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
