import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface Section {
  id: string;
  key: string;
  title: string;
  content: string;
  order: number;
  parentKey?: string;
  mandatory: boolean;
  enabled: boolean;
  approved?: boolean;
  supervisorComment?: string;
  wordCount: number;
}

export interface Reference {
  id: string;
  title: string;
  authors: string[];
  year: number;
  journal?: string;
  doi?: string;
  tags: string[];
  abstract?: string;
  status: 'valid' | 'missing-doi' | 'unchecked';
  cited: boolean;
}

export interface Project {
  id: string;
  title: string;
  subtitle?: string;
  discipline: string;
  targetOutput: string;
  methodologyType: string;
  projectType: string;
  status: 'draft' | 'in-progress' | 'review' | 'submitted' | 'exported';
  sections: Section[];
  references: Reference[];
  progress: number;
  wordCount: number;
  targetWordCount: number;
  integrityScore: number;
  similarityIndex: number;
  aiDetectionScore: number;
  aiUsageLevel: 'None' | 'Low' | 'Moderate' | 'High';
  createdAt: string;
  updatedAt: string;
}

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  isLoading: boolean;
  isSaving: boolean;
}

const DEMO_PROJECT: Project = {
  id: 'proj-001',
  title: 'The Impact of Machine Learning on Early Disease Detection in Sub-Saharan Africa',
  subtitle: 'A systematic review and meta-analysis',
  discipline: 'Biochemistry / Medical Sciences',
  targetOutput: 'PhD Thesis',
  methodologyType: 'Mixed Methods',
  projectType: 'Thesis',
  status: 'in-progress',
  sections: [
    { id: 's-1', key: 'abstract', title: 'Abstract', content: '', order: 0, mandatory: true, enabled: true, wordCount: 0 },
    { id: 's-2', key: 'ch1-intro', title: 'Chapter 1: Introduction', content: '', order: 1, mandatory: true, enabled: true, wordCount: 0 },
    { id: 's-3', key: 'ch1-background', title: '1.1 Background', content: '', order: 2, parentKey: 'ch1-intro', mandatory: true, enabled: true, wordCount: 0 },
    { id: 's-4', key: 'ch1-problem', title: '1.2 Problem Statement', content: '', order: 3, parentKey: 'ch1-intro', mandatory: true, enabled: true, wordCount: 0 },
    { id: 's-5', key: 'ch1-objectives', title: '1.3 Objectives', content: '', order: 4, parentKey: 'ch1-intro', mandatory: true, enabled: true, wordCount: 0 },
    { id: 's-6', key: 'ch2-litreview', title: 'Chapter 2: Literature Review', content: '', order: 5, mandatory: true, enabled: true, wordCount: 0 },
    { id: 's-7', key: 'ch3-methodology', title: 'Chapter 3: Methodology', content: '', order: 6, mandatory: true, enabled: true, wordCount: 0 },
    { id: 's-8', key: 'ch4-results', title: 'Chapter 4: Results', content: '', order: 7, mandatory: true, enabled: true, wordCount: 0 },
    { id: 's-9', key: 'ch5-discussion', title: 'Chapter 5: Discussion', content: '', order: 8, mandatory: true, enabled: true, wordCount: 0 },
    { id: 's-10', key: 'ch6-conclusion', title: 'Chapter 6: Conclusion', content: '', order: 9, mandatory: true, enabled: true, wordCount: 0 },
    { id: 's-11', key: 'references', title: 'References', content: '', order: 10, mandatory: true, enabled: true, wordCount: 0 },
  ],
  references: [],
  progress: 34,
  wordCount: 8420,
  targetWordCount: 80000,
  integrityScore: 87,
  similarityIndex: 4,
  aiDetectionScore: 12,
  aiUsageLevel: 'Low',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-05-20T14:30:00Z',
};

const initialState: ProjectState = {
  projects: [DEMO_PROJECT],
  activeProjectId: 'proj-001',
  isLoading: false,
  isSaving: false,
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setActiveProject(state, action: PayloadAction<string>) {
      state.activeProjectId = action.payload;
    },
    updateSection(state, action: PayloadAction<{ projectId: string; sectionId: string; content: string }>) {
      const { projectId, sectionId, content } = action.payload;
      const project = state.projects.find(p => p.id === projectId);
      if (project) {
        const section = project.sections.find(s => s.id === sectionId);
        if (section) {
          section.content = content;
          section.wordCount = content.trim().split(/\s+/).filter(Boolean).length;
          project.wordCount = project.sections.reduce((sum, s) => sum + s.wordCount, 0);
          project.updatedAt = new Date().toISOString();
        }
      }
    },
    approveSection(state, action: PayloadAction<{ projectId: string; sectionId: string; comment?: string }>) {
      const { projectId, sectionId, comment } = action.payload;
      const project = state.projects.find(p => p.id === projectId);
      if (project) {
        const section = project.sections.find(s => s.id === sectionId);
        if (section) {
          section.approved = true;
          if (comment) section.supervisorComment = comment;
        }
      }
    },
    updateProjectStatus(state, action: PayloadAction<{ projectId: string; status: Project['status'] }>) {
      const project = state.projects.find(p => p.id === action.payload.projectId);
      if (project) {
        project.status = action.payload.status;
        project.updatedAt = new Date().toISOString();
      }
    },
    addReference(state, action: PayloadAction<{ projectId: string; reference: Reference }>) {
      const project = state.projects.find(p => p.id === action.payload.projectId);
      if (project) {
        project.references.push(action.payload.reference);
      }
    },
    removeReference(state, action: PayloadAction<{ projectId: string; referenceId: string }>) {
      const project = state.projects.find(p => p.id === action.payload.projectId);
      if (project) {
        project.references = project.references.filter(r => r.id !== action.payload.referenceId);
      }
    },
    setSaving(state, action: PayloadAction<boolean>) {
      state.isSaving = action.payload;
    },
  },
});

export const {
  setActiveProject,
  updateSection,
  approveSection,
  updateProjectStatus,
  addReference,
  removeReference,
  setSaving,
} = projectSlice.actions;
export default projectSlice.reducer;
