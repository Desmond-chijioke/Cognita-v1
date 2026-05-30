import { createBrowserRouter, Navigate } from 'react-router-dom';

import LandingPage from '../Components/landingpage/Landingpage';
import Login from '../Components/Auth/Login';
import Signup from '../Components/Auth/Signup';
import ProtectedRoute from '../Components/protectedRoute/ProtectedRoute';

// Layouts
import AdminLayout from '../Components/Admin/AdminLayout';
import HODLayout from '../Components/HOD/HODLayout';
import SupervisorLayout from '../Components/Supervisor/SupervisorLayout';
import StudentLayout from '../Components/Student/StudentLayout';

// Admin pages
import AdminDashboard from '../Components/Admin/pages/AdminDashboard';
import AdminProjects from '../Components/Admin/pages/AdminProjects';
import AdminResearchers from '../Components/Admin/pages/AdminResearchers';
import AdminFacultyDepts from '../Components/Admin/pages/AdminFacultyDepts';
import AdminCompliance from '../Components/Admin/pages/AdminCompliance';
import AdminAnalytics from '../Components/Admin/pages/AdminAnalytics';
import AdminAuditTrail from '../Components/Admin/pages/AdminAuditTrail';
import AdminMessages from '../Components/Admin/pages/AdminMessages';
import AdminSettings from '../Components/Admin/pages/AdminSettings';

// HOD pages
import HODOverview from '../Components/HOD/pages/HODOverview';
import HODSupervisors from '../Components/HOD/pages/HODSupervisors';
import HODStudents from '../Components/HOD/pages/HODStudents';
import HODMessages from '../Components/HOD/pages/HODMessages';
import HODSettings from '../Components/HOD/pages/HODSettings';

// Supervisor pages
import SupervisorOverview from '../Components/Supervisor/pages/SupervisorOverview';
import SupervisorMyStudents from '../Components/Supervisor/pages/SupervisorMyStudents';
import SupervisorReviews from '../Components/Supervisor/pages/SupervisorReviews';
import SupervisorApprovals from '../Components/Supervisor/pages/SupervisorApprovals';
import SupervisorAnalytics from '../Components/Supervisor/pages/SupervisorAnalytics';
import SupervisorNotifications from '../Components/Supervisor/pages/SupervisorNotifications';
import SupervisorMessages from '../Components/Supervisor/pages/SupervisorMessages';
import SupervisorSettings from '../Components/Supervisor/pages/SupervisorSettings';
import SupervisorStudentDetail from '../Components/Supervisor/pages/SupervisorStudentDetail';

// Student pages
import StudentDashboard from '../Components/Student/pages/StudentDashboard';
import StudentEditor from '../Components/Student/pages/StudentEditor';
import StudentReferences from '../Components/Student/pages/StudentReferences';
import StudentDataFiles from '../Components/Student/pages/StudentDataFiles';
import StudentAnalysis from '../Components/Student/pages/StudentAnalysis';
import StudentResults from '../Components/Student/pages/StudentResults';
import StudentAIReviewer from '../Components/Student/pages/StudentAIReviewer';
import StudentPlagiarism from '../Components/Student/pages/StudentPlagiarism';
import StudentExport from '../Components/Student/pages/StudentExport';
import StudentMessages from '../Components/Student/pages/StudentMessages';
import StudentCollaboration from '../Components/Student/pages/StudentCollaboration';
import StudentSettings from '../Components/Student/pages/StudentSettings';

import { APPROUTE_LIST } from './types';

export const router = createBrowserRouter([
  // ─── Public ───────────────────────────────────────────────────────────────
  { path: '/',                        element: <LandingPage /> },
  { path: APPROUTE_LIST.LOGIN,        element: <Login /> },
  { path: APPROUTE_LIST.SIGNUP,       element: <Signup /> },

  // ─── Protected ────────────────────────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [

      // Admin (Director of Research / schoolAdmin)
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true,          element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard',    element: <AdminDashboard /> },
          { path: 'projects',     element: <AdminProjects /> },
          { path: 'researchers',  element: <AdminResearchers /> },
          { path: 'faculty-depts',element: <AdminFacultyDepts /> },
          { path: 'compliance',   element: <AdminCompliance /> },
          { path: 'analytics',    element: <AdminAnalytics /> },
          { path: 'audit-trail',  element: <AdminAuditTrail /> },
          { path: 'messages',     element: <AdminMessages /> },
          { path: 'settings',     element: <AdminSettings /> },
        ],
      },

      // Head of Department
      {
        path: '/hod',
        element: <HODLayout />,
        children: [
          { index: true,          element: <Navigate to="overview" replace /> },
          { path: 'overview',     element: <HODOverview /> },
          { path: 'supervisors',  element: <HODSupervisors /> },
          { path: 'students',     element: <HODStudents /> },
          { path: 'messages',     element: <HODMessages /> },
          { path: 'settings',     element: <HODSettings /> },
        ],
      },

      // Supervisor
      {
        path: '/supervisor',
        element: <SupervisorLayout />,
        children: [
          { index: true,              element: <Navigate to="overview" replace /> },
          { path: 'overview',         element: <SupervisorOverview /> },
          {
            path: 'students',
            children: [
              { index: true,           element: <SupervisorMyStudents /> },
              { path: ':studentId',    element: <SupervisorStudentDetail /> },
            ],
          },
          { path: 'reviews',          element: <SupervisorReviews /> },
          { path: 'approvals',        element: <SupervisorApprovals /> },
          { path: 'analytics',        element: <SupervisorAnalytics /> },
          { path: 'notifications',    element: <SupervisorNotifications /> },
          { path: 'messages',         element: <SupervisorMessages /> },
          { path: 'settings',         element: <SupervisorSettings /> },
        ],
      },

      // Student (PhD Student)
      {
        path: '/app',
        element: <StudentLayout />,
        children: [
          { index: true,                  element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard',            element: <StudentDashboard /> },
          { path: 'editor',               element: <StudentEditor /> },
          { path: 'references',           element: <StudentReferences /> },
          { path: 'data-files',           element: <StudentDataFiles /> },
          { path: 'analysis',             element: <StudentAnalysis /> },
          { path: 'results',              element: <StudentResults /> },
          { path: 'ai-reviewer',          element: <StudentAIReviewer /> },
          { path: 'plagiarism-checker',   element: <StudentPlagiarism /> },
          { path: 'export',               element: <StudentExport /> },
          { path: 'messages',             element: <StudentMessages /> },
          { path: 'collaboration',        element: <StudentCollaboration /> },
          { path: 'settings',             element: <StudentSettings /> },
        ],
      },

    ],
  },
]);
