import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type SubmissionStatus = 'pending' | 'approved' | 'needs-revision';

export interface SubmissionAnnotation {
  id:           string;
  selectedText: string;
  comment:      string;
  color:        string;
  createdAt:    string;
  resolved?:    boolean;
}

export interface Submission {
  id:                string;
  studentId:         string;
  studentName:       string;
  sectionId:         string;
  sectionTitle:      string;
  content:           string;
  submittedAt:       string;
  status:            SubmissionStatus;
  supervisorComment: string;
  reviewedAt:        string;
  annotations:       SubmissionAnnotation[];
}

interface SubmissionsState {
  list: Submission[];
}

const initialState: SubmissionsState = { list: [] };

const submissionsSlice = createSlice({
  name: 'submissions',
  initialState,
  reducers: {
    submitSection(
      state,
      action: PayloadAction<
        Pick<Submission, 'studentId' | 'studentName' | 'sectionId' | 'sectionTitle' | 'content'>
        & { id?: string }   // optional: pass Supabase UUID so Redux ID matches DB
      >,
    ) {
      const existing = state.list.findIndex(
        s => s.studentId === action.payload.studentId && s.sectionId === action.payload.sectionId,
      );
      // Use provided id (from Supabase) > existing Redux id > new random UUID
      const resolvedId = action.payload.id
        ?? (existing >= 0 ? state.list[existing].id : crypto.randomUUID());
      const entry: Submission = {
        ...action.payload,
        id:                resolvedId,
        status:            'pending',
        supervisorComment: '',
        reviewedAt:        '',
        submittedAt:       new Date().toISOString(),
        annotations:       existing >= 0 ? state.list[existing].annotations : [],
      };
      if (existing >= 0) state.list[existing] = entry;
      else state.list.push(entry);
    },

    approveSubmission(state, action: PayloadAction<{ id: string }>) {
      const s = state.list.find(s => s.id === action.payload.id);
      if (s) { s.status = 'approved'; s.reviewedAt = new Date().toISOString(); }
    },

    requestRevision(state, action: PayloadAction<{ id: string; comment: string }>) {
      const s = state.list.find(s => s.id === action.payload.id);
      if (s) {
        s.status            = 'needs-revision';
        s.supervisorComment = action.payload.comment;
        s.reviewedAt        = new Date().toISOString();
      }
    },

    addAnnotation(
      state,
      action: PayloadAction<{ subId: string; selectedText: string; comment: string; color: string; id?: string }>,
    ) {
      const sub = state.list.find(s => s.id === action.payload.subId);
      if (!sub) return;
      // Don't add duplicate (same id already exists from Supabase sync)
      if (action.payload.id && sub.annotations.some(a => a.id === action.payload.id)) return;
      sub.annotations.push({
        id:           action.payload.id ?? crypto.randomUUID(),
        selectedText: action.payload.selectedText,
        comment:      action.payload.comment,
        color:        action.payload.color,
        createdAt:    new Date().toISOString(),
      });
    },

    updateAnnotation(
      state,
      action: PayloadAction<{ subId: string; annId: string; comment: string }>,
    ) {
      const ann = state.list.find(s => s.id === action.payload.subId)
        ?.annotations.find(a => a.id === action.payload.annId);
      if (ann) ann.comment = action.payload.comment;
    },

    deleteAnnotation(
      state,
      action: PayloadAction<{ subId: string; annId: string }>,
    ) {
      const sub = state.list.find(s => s.id === action.payload.subId);
      if (sub) sub.annotations = sub.annotations.filter(a => a.id !== action.payload.annId);
    },

    resolveAnnotation(
      state,
      action: PayloadAction<{ subId: string; annId: string }>,
    ) {
      const ann = state.list.find(s => s.id === action.payload.subId)
        ?.annotations.find(a => a.id === action.payload.annId);
      if (ann) ann.resolved = true;
    },
  },
});

export const {
  submitSection, approveSubmission, requestRevision,
  addAnnotation, updateAnnotation, deleteAnnotation, resolveAnnotation,
} = submissionsSlice.actions;
export default submissionsSlice.reducer;
