import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './Route/router';
import { supabase } from './supabase/client';
import { fetchProfile } from './supabase/auth';
import { useAppDispatch } from './Redux/hooks';
import { loginSuccess, logout, authInitialized } from './Redux/slices/authSlice';
import type { AppRole } from './Redux/slices/authSlice';
import { loadSession, saveSession, clearSession } from './helper/storage';

function AppInner() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // ── Step 1: Sync restore from localStorage ────────────────────────────────
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
        supervisorId:     saved.supervisorId,
        supervisorName:   saved.supervisorName,
        supervisorEmail:  saved.supervisorEmail,
      }));
    } else {
      dispatch(authInitialized());
    }

    // ── Step 2: Verify/refresh Supabase session in background ────────────────
    // This is the fallback for INITIAL_SESSION (fired by Supabase v2 on page
    // load with an existing session) which onAuthStateChange may not surface
    // as a SIGNED_IN event in newer SDK versions.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        if (saved) {
          clearSession();
          dispatch(logout());
        } else {
          dispatch(authInitialized());
        }
        return;
      }

      const profile = await fetchProfile(session.user.id);
      if (!profile) {
        clearSession();
        dispatch(logout());
        return;
      }

      const userData = {
        role:             profile.role as AppRole,
        email:            session.user.email!,
        id:               session.user.id,
        name:             profile.name,
        institutionId:    profile.institution_id,
        institutionName:  profile.institution_name,
        institutionEmail: profile.institution_email,
        departmentName:   profile.department_name,
        supervisorId:     profile.supervisor_id,
        supervisorName:   profile.supervisor_name,
        supervisorEmail:  profile.supervisor_email,
      };
      saveSession(userData);
      dispatch(loginSuccess(userData));
    }).catch(() => {
      if (saved) {
        clearSession();
        dispatch(logout());
      } else {
        dispatch(authInitialized());
      }
    });

    // ── Step 3: Stay in sync with Supabase auth events ────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          clearSession();
          dispatch(logout());

        } else if (
          (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') &&
          session?.user
        ) {
          // INITIAL_SESSION fires on every page load when Supabase finds an
          // existing session (Supabase JS v2.52+).  We handle it the same way
          // as SIGNED_IN so the session is always persisted on refresh.
          //
          // For TOKEN_REFRESHED only: bail if the user explicitly logged out
          // while the refresh was in flight (clearSession cleared the key).
          if (event === 'TOKEN_REFRESHED' && !loadSession()) return;

          const profile = await fetchProfile(session.user.id);
          if (!profile) return;

          // Re-check after the async gap for the TOKEN_REFRESHED race.
          if (event === 'TOKEN_REFRESHED' && !loadSession()) return;

          const userData = {
            role:             profile.role as AppRole,
            email:            session.user.email!,
            id:               session.user.id,
            name:             profile.name,
            institutionId:    profile.institution_id,
            institutionName:  profile.institution_name,
            institutionEmail: profile.institution_email,
            departmentName:   profile.department_name,
            supervisorId:     profile.supervisor_id,
            supervisorName:   profile.supervisor_name,
            supervisorEmail:  profile.supervisor_email,
            accessToken:      session.access_token,
            refreshToken:     session.refresh_token,
          };
          saveSession(userData);
          dispatch(loginSuccess(userData));
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
