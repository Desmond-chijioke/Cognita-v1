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

  // ── HOD-level (College Dean, Faculty Dean, Head of Department) ────────────
  'Dean':                   APPROUTE_LIST.HOD_OVERVIEW,
  'Head of Department':     APPROUTE_LIST.HOD_OVERVIEW,
  'Provost':                APPROUTE_LIST.HOD_OVERVIEW,

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
