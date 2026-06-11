export const APPROUTE_LIST = {
  // Public
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',

  // Admin (Director of Research / schoolAdmin)
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_PROJECTS: '/admin/projects',
  ADMIN_RESEARCHERS: '/admin/researchers',
  ADMIN_FACULTY_DEPTS: '/admin/faculty-depts',
  ADMIN_COMPLIANCE: '/admin/compliance',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_AUDIT_TRAIL: '/admin/audit-trail',
  ADMIN_MESSAGES: '/admin/messages',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_USERS:    '/admin/users',

  // College (Provost)
  COLLEGE_OVERVIEW:    '/college/overview',
  COLLEGE_FACULTIES:   '/college/faculties',
  COLLEGE_STUDENTS:    '/college/students',
  COLLEGE_ANALYTICS:   '/college/analytics',
  COLLEGE_MESSAGES:    '/college/messages',
  COLLEGE_SETTINGS:    '/college/settings',

  // College Research Workspace
  COLLEGE_RESEARCH_EDITOR:      '/college/research/editor',
  COLLEGE_RESEARCH_EXPORT:      '/college/research/export',
  COLLEGE_RESEARCH_AI_REVIEWER: '/college/research/ai-reviewer',
  COLLEGE_RESEARCH_PLAGIARISM:  '/college/research/plagiarism',

  // Faculty (Dean)
  FACULTY_OVERVIEW:    '/faculty/overview',
  FACULTY_DEPARTMENTS: '/faculty/departments',
  FACULTY_STUDENTS:    '/faculty/students',
  FACULTY_ANALYTICS:   '/faculty/analytics',
  FACULTY_MESSAGES:    '/faculty/messages',
  FACULTY_SETTINGS:    '/faculty/settings',

  // Faculty Research Workspace
  FACULTY_RESEARCH_EDITOR:      '/faculty/research/editor',
  FACULTY_RESEARCH_EXPORT:      '/faculty/research/export',
  FACULTY_RESEARCH_AI_REVIEWER: '/faculty/research/ai-reviewer',
  FACULTY_RESEARCH_PLAGIARISM:  '/faculty/research/plagiarism',

  // Head of Department
  HOD_OVERVIEW:    '/hod/overview',
  HOD_USERS:       '/hod/users',
  HOD_SUPERVISORS: '/hod/supervisors',
  HOD_STUDENTS:    '/hod/students',
  HOD_MESSAGES:    '/hod/messages',
  HOD_SETTINGS:    '/hod/settings',

  // HOD Research Workspace
  HOD_RESEARCH_EDITOR:      '/hod/research/editor',
  HOD_RESEARCH_EXPORT:      '/hod/research/export',
  HOD_RESEARCH_REFERENCES:  '/hod/research/references',
  HOD_RESEARCH_AI_REVIEWER: '/hod/research/ai-reviewer',
  HOD_RESEARCH_PLAGIARISM:  '/hod/research/plagiarism',

  // Supervisor
  SUPERVISOR_OVERVIEW: '/supervisor/overview',
  SUPERVISOR_STUDENTS: '/supervisor/students',
  SUPERVISOR_REVIEWS: '/supervisor/reviews',
  SUPERVISOR_APPROVALS: '/supervisor/approvals',
  SUPERVISOR_ANALYTICS: '/supervisor/analytics',
  SUPERVISOR_NOTIFICATIONS: '/supervisor/notifications',
  SUPERVISOR_MESSAGES: '/supervisor/messages',
  SUPERVISOR_SETTINGS: '/supervisor/settings',

  // Supervisor Research Workspace
  SUPERVISOR_RESEARCH_EDITOR:      '/supervisor/research/editor',
  SUPERVISOR_RESEARCH_EXPORT:      '/supervisor/research/export',
  SUPERVISOR_RESEARCH_REFERENCES:  '/supervisor/research/references',
  SUPERVISOR_RESEARCH_AI_REVIEWER: '/supervisor/research/ai-reviewer',
  SUPERVISOR_RESEARCH_PLAGIARISM:  '/supervisor/research/plagiarism',

  // PG School (PG Coordinator) — read-only, institution-wide, non-UG students only
  PGSCHOOL_OVERVIEW:    '/pgschool/overview',
  PGSCHOOL_STUDENTS:    '/pgschool/students',
  PGSCHOOL_SUPERVISORS: '/pgschool/supervisors',
  PGSCHOOL_ANALYTICS:   '/pgschool/analytics',
  PGSCHOOL_MESSAGES:    '/pgschool/messages',
  PGSCHOOL_SETTINGS:    '/pgschool/settings',

  // PG School Research Workspace
  PGSCHOOL_RESEARCH_EDITOR:      '/pgschool/research/editor',
  PGSCHOOL_RESEARCH_EXPORT:      '/pgschool/research/export',
  PGSCHOOL_RESEARCH_AI_REVIEWER: '/pgschool/research/ai-reviewer',
  PGSCHOOL_RESEARCH_PLAGIARISM:  '/pgschool/research/plagiarism',

  // Student (PhD Student)
  STUDENT_DASHBOARD: '/app/dashboard',
  STUDENT_EDITOR: '/app/editor',
  STUDENT_REFERENCES: '/app/references',
  STUDENT_DATA_FILES: '/app/data-files',
  STUDENT_ANALYSIS: '/app/analysis',
  STUDENT_RESULTS: '/app/results',
  STUDENT_AI_REVIEWER: '/app/ai-reviewer',
  STUDENT_PLAGIARISM: '/app/plagiarism-checker',
  STUDENT_EXPORT: '/app/export',
  STUDENT_MESSAGES: '/app/messages',
  STUDENT_COLLABORATION: '/app/collaboration',
  STUDENT_SETTINGS: '/app/settings',
};

export const ROLE_HOME: Record<string, string> = {

  // ── Institution admin ─────────────────────────────────────────────────────
  'Director of Research':   APPROUTE_LIST.ADMIN_DASHBOARD,
  'schoolAdmin':            APPROUTE_LIST.ADMIN_DASHBOARD,

  // ── College level ─────────────────────────────────────────────────────────
  'Provost':                APPROUTE_LIST.COLLEGE_OVERVIEW,

  // ── Faculty level ─────────────────────────────────────────────────────────
  'Dean':                   APPROUTE_LIST.FACULTY_OVERVIEW,

  // ── PG School ────────────────────────────────────────────────────────────
  'PG Coordinator':         APPROUTE_LIST.PGSCHOOL_OVERVIEW,

  // ── Department level ──────────────────────────────────────────────────────
  'Head of Department':     APPROUTE_LIST.HOD_OVERVIEW,

  // ── Supervisors — all variants route to supervisor workspace ─────────────
  'Supervisor':             APPROUTE_LIST.SUPERVISOR_OVERVIEW,
  'Senior Supervisor':      APPROUTE_LIST.SUPERVISOR_OVERVIEW,
  'Co-Supervisor':          APPROUTE_LIST.SUPERVISOR_OVERVIEW,
  'Assistant Supervisor':   APPROUTE_LIST.SUPERVISOR_OVERVIEW,

  // ── Students — all route to student workspace ────────────────────────────
  'PhD Student':            APPROUTE_LIST.STUDENT_DASHBOARD,
  'Undergraduate Student':  APPROUTE_LIST.STUDENT_DASHBOARD,
  "Master's Student":       APPROUTE_LIST.STUDENT_DASHBOARD,
  'Postgraduate Student':   APPROUTE_LIST.STUDENT_DASHBOARD,
};
