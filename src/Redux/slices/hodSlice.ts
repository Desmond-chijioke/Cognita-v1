import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface HODSupervisor {
  id:               string;
  name:             string;
  email:            string;
  specialty:        string;
  role:             string;
  studentsAssigned: number;
  color:            string;
  addedOn:          string;
}

export interface HODStudent {
  id:           string;
  name:         string;
  email:        string;
  matricNo:     string;
  program:      string;
  role:         string;
  supervisorId: string | null;
  color:        string;
  addedOn:      string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SUPERVISOR_COLORS = ['blue', 'violet', 'teal', 'orange', 'grape', 'cyan'];
const STUDENT_COLORS    = ['orange', 'indigo', 'blue', 'red', 'green', 'grape'];

// ── Slice ──────────────────────────────────────────────────────────────────────

interface HODState {
  supervisors: HODSupervisor[];
  students:    HODStudent[];
}

const initialState: HODState = {
  supervisors: [],   // loaded from Supabase on mount
  students:    [],   // loaded from Supabase on mount
};

const hodSlice = createSlice({
  name: 'hod',
  initialState,
  reducers: {

    // ── Bulk load from Supabase ──────────────────────────────────────────────
    loadSupervisors(state, action: PayloadAction<HODSupervisor[]>) {
      state.supervisors = action.payload;
    },

    loadStudents(state, action: PayloadAction<HODStudent[]>) {
      state.students = action.payload;
    },

    // ── Local mutations (also persisted to Supabase in the component) ────────
    addSupervisor(state, action: PayloadAction<Omit<HODSupervisor, 'color' | 'studentsAssigned'>>) {
      const color = SUPERVISOR_COLORS[state.supervisors.length % SUPERVISOR_COLORS.length];
      state.supervisors.push({ ...action.payload, color, studentsAssigned: 0 });
    },

    removeSupervisor(state, action: PayloadAction<string>) {
      state.supervisors = state.supervisors.filter(s => s.id !== action.payload);
      state.students = state.students.map(st =>
        st.supervisorId === action.payload ? { ...st, supervisorId: null } : st,
      );
    },

    addStudent(state, action: PayloadAction<Omit<HODStudent, 'color'>>) {
      const color = STUDENT_COLORS[state.students.length % STUDENT_COLORS.length];
      state.students.push({ ...action.payload, color });
      if (action.payload.supervisorId) {
        const sup = state.supervisors.find(s => s.id === action.payload.supervisorId);
        if (sup) sup.studentsAssigned += 1;
      }
    },

    removeStudent(state, action: PayloadAction<string>) {
      const student = state.students.find(s => s.id === action.payload);
      if (student?.supervisorId) {
        const sup = state.supervisors.find(s => s.id === student.supervisorId);
        if (sup && sup.studentsAssigned > 0) sup.studentsAssigned -= 1;
      }
      state.students = state.students.filter(s => s.id !== action.payload);
    },

    assignSupervisor(state, action: PayloadAction<{ studentId: string; supervisorId: string | null }>) {
      const { studentId, supervisorId } = action.payload;
      const student = state.students.find(s => s.id === studentId);
      if (!student) return;
      if (student.supervisorId) {
        const old = state.supervisors.find(s => s.id === student.supervisorId);
        if (old && old.studentsAssigned > 0) old.studentsAssigned -= 1;
      }
      student.supervisorId = supervisorId;
      if (supervisorId) {
        const newSup = state.supervisors.find(s => s.id === supervisorId);
        if (newSup) newSup.studentsAssigned += 1;
      }
    },
  },
});

export const {
  loadSupervisors, loadStudents,
  addSupervisor, removeSupervisor,
  addStudent, removeStudent,
  assignSupervisor,
} = hodSlice.actions;

export default hodSlice.reducer;
