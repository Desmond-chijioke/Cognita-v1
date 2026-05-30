import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AppRole } from './authSlice';

export interface StoredUser {
  id:            string;
  name:          string;
  email:         string;
  password:      string;
  role:          AppRole;
  schoolId?:     string;
  supervisorId?: string;
  department?:   string;
  matricNo?:     string;
  degreeLevel?:  string;
  projectTitle?: string;
  createdAt:     string;
}

interface UsersState {
  list: StoredUser[];
}

const initialState: UsersState = { list: [] };

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    createUser(state, action: PayloadAction<Omit<StoredUser, 'id' | 'createdAt'>>) {
      if (state.list.some(u => u.email.toLowerCase() === action.payload.email.toLowerCase())) return;
      state.list.unshift({
        ...action.payload,
        id:        crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      });
    },
    updateStoredUser(state, action: PayloadAction<{ id: string } & Partial<StoredUser>>) {
      const idx = state.list.findIndex(u => u.id === action.payload.id);
      if (idx !== -1) state.list[idx] = { ...state.list[idx], ...action.payload };
    },
    deleteUser(state, action: PayloadAction<string>) {
      state.list = state.list.filter(u => u.id !== action.payload);
    },
    assignToSupervisor(state, action: PayloadAction<{ studentId: string; supervisorId: string }>) {
      const student = state.list.find(u => u.id === action.payload.studentId);
      if (student) student.supervisorId = action.payload.supervisorId;
    },
  },
});

export const { createUser, updateStoredUser, deleteUser, assignToSupervisor } = usersSlice.actions;
export default usersSlice.reducer;
