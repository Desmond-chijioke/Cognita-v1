import { useEffect, useRef } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './Route/router';
import { supabase } from './supabase/client';
import { fetchProfile } from './supabase/auth';
import { useAppDispatch, useAppSelector } from './Redux/hooks';
import { loginSuccess, logout, authInitialized } from './Redux/slices/authSlice';
import type { AppRole } from './Redux/slices/authSlice';
import { loadSession, saveSession, clearSession } from './helper/storage';
import { GlobalCallProvider } from './context/GlobalCallProvider';
import GlobalLoader from './Components/shared/GlobalLoader';

// ── Why this approach ─────────────────────────────────────────────────────────
//
// Problem: after a page refresh, components mount and immediately fire Supabase
// queries.  If the JWT isn't valid yet those queries return empty / 401 — which
// looks like "data disappearing on refresh".
//
// Fix:
//  • Keep isInitializing = true (ProtectedRoute shows a spinner) until the
//    Supabase client actually has a valid JWT.
//  • Restore the JWT via setSession(stored tokens) which also auto-refreshes
//    if the access token is expired.
//  • Only THEN dispatch loginSuccess → isInitializing = false → components
//    render and query Supabase with a guaranteed-valid JWT.
//  • A 5-second safety timeout falls back to the cached profile data so the
//    app never hangs forever (e.g. offline or slow network).
// ─────────────────────────────────────────────────────────────────────────────

function AppInner() {
  const dispatch  = useAppDispatch();
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedRef = useRef(false);   // prevents timeout and async path racing

  useEffect(() => {
    const saved = loadSession();

    // ── No saved session ─────────────────────────────────────────────────────
    if (!saved) {
      dispatch(authInitialized());   // → isInitializing = false, not authenticated
      return;
    }

    // TypeScript can't narrow `saved` inside closure callbacks (setTimeout,
    // async functions) even after the null check above, so we capture it here.
    const session = saved;

    // ── Safety timeout (5 s) ─────────────────────────────────────────────────
    // If setSession() hangs (no network, slow endpoint), fall back to the
    // cached profile so the user isn't stuck on a spinner forever.
    // Components may see stale or empty Supabase data but the app is usable.
    timerRef.current = setTimeout(() => {
      if (resolvedRef.current) return;   // already handled by the async path
      resolvedRef.current = true;
      dispatch(loginSuccess({
        role:             session.role as AppRole,
        email:            session.email,
        id:               session.id,
        name:             session.name,
        institutionId:    session.institutionId,
        institutionName:  session.institutionName,
        institutionEmail: session.institutionEmail,
        departmentName:   session.departmentName,
        collegeId:        session.collegeId,
        facultyId:        session.facultyId,
        supervisorId:     session.supervisorId,
        supervisorName:   session.supervisorName,
        supervisorEmail:  session.supervisorEmail,
      }));
    }, 5000);

    // ── Main session restoration path ─────────────────────────────────────────
    async function restoreSession() {
      try {
        let resolvedSession: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] | null = null;

        if (session.accessToken && session.refreshToken) {
          // Feed the stored tokens back to the Supabase client.
          // • access_token still valid  → client becomes authenticated instantly
          // • access_token expired      → uses refresh_token (one network round-trip)
          // • refresh_token also expired → error → log the user out
          const { data, error } = await supabase.auth.setSession({
            access_token:  session.accessToken,
            refresh_token: session.refreshToken,
          });

          if (error || !data.session) {
            // Tokens are truly dead — must log in again.
            if (timerRef.current) clearTimeout(timerRef.current);
            resolvedRef.current = true;
            clearSession();
            dispatch(logout());
            return;
          }
          resolvedSession = data.session;
        } else {
          // No tokens stored — check if Supabase already has a valid sb-* session.
          const { data } = await supabase.auth.getSession();
          resolvedSession = data.session;

          if (!resolvedSession) {
            // Nothing works — log out cleanly.
            if (timerRef.current) clearTimeout(timerRef.current);
            resolvedRef.current = true;
            clearSession();
            dispatch(logout());
            return;
          }
        }

        // JWT is now valid. Fetch a fresh copy of the user profile.
        const profile = await fetchProfile(resolvedSession.user.id);

        if (!profile) {
          if (timerRef.current) clearTimeout(timerRef.current);
          resolvedRef.current = true;
          clearSession();
          dispatch(logout());
          return;
        }

        if (timerRef.current) clearTimeout(timerRef.current);
        if (resolvedRef.current) return;   // timeout already fired
        resolvedRef.current = true;

        const userData = {
          role:             profile.role as AppRole,
          email:            resolvedSession.user.email!,
          id:               resolvedSession.user.id,
          name:             profile.name,
          institutionId:    profile.institution_id,
          institutionName:  profile.institution_name,
          institutionEmail: profile.institution_email,
          departmentName:   profile.department_name,
          collegeId:        profile.college_id,
          facultyId:        profile.faculty_id,
          supervisorId:     profile.supervisor_id,
          supervisorName:   profile.supervisor_name,
          supervisorEmail:  profile.supervisor_email,
        };

        // Persist the freshest tokens so the NEXT reload can restore cleanly.
        saveSession({
          ...userData,
          accessToken:  resolvedSession.access_token,
          refreshToken: resolvedSession.refresh_token,
        });

        // JWT is confirmed valid → isInitializing = false → ProtectedRoute
        // renders the app → components query Supabase with a valid JWT.
        dispatch(loginSuccess(userData));

      } catch {
        // Unexpected error (e.g. JSON parse failure, module error).
        // The 5-second timeout will unblock the UI via cached data.
      }
    }

    restoreSession();

    // ── Ongoing auth events ───────────────────────────────────────────────────
    // Handles automatic token refresh, sign-out from another tab, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {

        if (event === 'SIGNED_OUT') {
          if (timerRef.current) clearTimeout(timerRef.current);
          clearSession();
          dispatch(logout());
          return;
        }

        // TOKEN_REFRESHED: Supabase rotated the access token in the background.
        // Update our stored session so the next reload uses the new token.
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          if (!loadSession()) return;   // user explicitly logged out mid-refresh
          try {
            const profile = await fetchProfile(session.user.id);
            if (!profile || !loadSession()) return;

            const userData = {
              role:             profile.role as AppRole,
              email:            session.user.email!,
              id:               session.user.id,
              name:             profile.name,
              institutionId:    profile.institution_id,
              institutionName:  profile.institution_name,
              institutionEmail: profile.institution_email,
              departmentName:   profile.department_name,
              collegeId:        profile.college_id,
              facultyId:        profile.faculty_id,
              supervisorId:     profile.supervisor_id,
              supervisorName:   profile.supervisor_name,
              supervisorEmail:  profile.supervisor_email,
            };
            saveSession({
              ...userData,
              accessToken:  session.access_token,
              refreshToken: session.refresh_token,
            });
            dispatch(loginSuccess(userData));
          } catch { /* keep existing state on network error */ }
        }
      },
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const isLoggingOut = useAppSelector(s => s.auth.isLoggingOut);

  return (
    <GlobalCallProvider>
      {isLoggingOut && <GlobalLoader message="Signing out…" />}
      <RouterProvider router={router} />
    </GlobalCallProvider>
  );
}

export default function App() {
  return <AppInner />;
}
