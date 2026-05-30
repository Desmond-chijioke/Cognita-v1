import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './Route/router';
import { supabase } from './supabase/client';
import { fetchProfile } from './supabase/auth';
import { useAppDispatch } from './Redux/hooks';
import { loginSuccess, logout, authInitialized } from './Redux/slices/authSlice';
import type { AppRole } from './Redux/slices/authSlice';
import { loadSession, saveSession } from './helper/storage';

function AppInner() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // ── Step 1: Sync restore from localStorage ────────────────────────────────
    // This runs before the first render of ProtectedRoute, so isInitializing
    // stays true until loginSuccess or authInitialized is dispatched here.
    const saved = loadSession();
    if (saved) {
      dispatch(loginSuccess({
        role:             saved.role as AppRole,
        email:            saved.email,
        id:               saved.id,
        name:             saved.name,
        institutionId:    saved.institutionId,
        institutionName:  saved.institutionName,
        institutionEmail: saved.institutionEmail,
        departmentName:   saved.departmentName,
      }));
      // loginSuccess sets isInitializing = false
    } else {
      // No saved session — mark initializing as done so ProtectedRoute can redirect
      dispatch(authInitialized());
    }

    // ── Step 2: Verify/refresh Supabase session in background ────────────────
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (profile) {
          const userData = {
            role:             profile.role as AppRole,
            email:            session.user.email!,
            id:               session.user.id,
            name:             profile.name,
            institutionId:    profile.institution_id,
            institutionName:  profile.institution_name,
            institutionEmail: profile.institution_email,
            departmentName:   profile.department_name,
          };
          saveSession(userData);
          dispatch(loginSuccess(userData));
        }
      }
    });

    // ── Step 3: Stay in sync with Supabase auth events ────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          // Only truly log out if our own localStorage session is already gone.
          // If it still exists, the SIGNED_OUT was fired automatically by Supabase
          // (token refresh failure) — keep the user in the app.
          const stillSaved = loadSession();
          if (!stillSaved) {
            dispatch(logout());
          }
          // clearSession() is done explicitly in Logout.tsx before signOut() is called
        } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (profile) {
            const userData = {
              role:             profile.role as AppRole,
              email:            session.user.email!,
              id:               session.user.id,
              name:             profile.name,
              institutionId:    profile.institution_id,
              institutionName:  profile.institution_name,
              institutionEmail: profile.institution_email,
            };
            saveSession(userData);
            dispatch(loginSuccess(userData));
          }
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return <RouterProvider router={router} />;
}

export default function App() {
  return <AppInner />;
}
