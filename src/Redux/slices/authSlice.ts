import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type AppRole =
  | 'schoolAdmin'
  | 'Undergraduate Student'
  | "Master's Student"
  | 'Student'
  | 'Researcher'
  | 'Supervisor'
  | 'Head of Department'
  | 'PG Coordinator'
  | 'Dean'
  | 'Director of Research'
  | 'Vice Chancellor'
  | 'External Examiner'
  | 'Internal Examiner';

export interface User {
  id:               string;
  name:             string;
  email:            string;
  role:             AppRole;
  avatar?:          string;
  institutionId?:   string;
  institutionName?: string;
  institutionEmail?: string;
  departmentName?:  string;
}

interface AuthState {
  user: User | null;
  role: AppRole;
  isAuthenticated: boolean;
  isInitializing: boolean;   // true until the first localStorage check completes
  isLoading: boolean;
  schoolName: string | null;
  schoolLogo: string | null;
}

const initialState: AuthState = {
  user: null,
  role: 'Student',
  isAuthenticated: false,
  isInitializing: true,      // start as true — ProtectedRoute will wait
  isLoading: false,
  schoolName: null,
  schoolLogo: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.isLoading = true;
    },
    loginSuccess(state, action: PayloadAction<{ role: AppRole; email: string; id?: string; name?: string; institutionId?: string; institutionName?: string; institutionEmail?: string; departmentName?: string }>) {
      const { role, email, id, name, institutionId, institutionName, institutionEmail, departmentName } = action.payload;
      state.user = {
        id:               id   ?? crypto.randomUUID(),
        name:             name ?? email.split('@')[0].replace(/[._]/g, ' '),
        email,
        role,
        institutionId,
        institutionName,
        institutionEmail,
        departmentName,
      };
      state.role = role;
      state.isAuthenticated  = true;
      state.isInitializing   = false;
      state.isLoading        = false;
    },
    loginFailed(state) {
      state.isLoading      = false;
      state.isInitializing = false;
    },
    authInitialized(state) {
      // Called when the startup session check completes with no saved session
      state.isInitializing = false;
    },
    logout(state) {
      state.user           = null;
      state.role           = 'Student';
      state.isAuthenticated = false;
      state.isInitializing  = false;
      state.schoolName     = null;
      state.schoolLogo     = null;
    },
    updateUser(state, action: PayloadAction<Partial<User>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    updateSchool(state, action: PayloadAction<{ schoolName?: string; schoolLogo?: string }>) {
      if (action.payload.schoolName !== undefined) state.schoolName = action.payload.schoolName;
      if (action.payload.schoolLogo !== undefined) state.schoolLogo = action.payload.schoolLogo;
    },
  },
});

export const { loginStart, loginSuccess, loginFailed, authInitialized, logout, updateUser, updateSchool } = authSlice.actions;
export default authSlice.reducer;
