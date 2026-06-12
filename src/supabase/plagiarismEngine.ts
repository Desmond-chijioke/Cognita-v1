import { supabase } from './client';

// ── Types (superset of the old Gemini PlagiarismReport — backward-compatible) ──

export interface SourceMatch {
  url:   string;
  title: string;
}

export interface SectionFinding {
  sectionId:    string;
  sectionTitle: string;
  similarity:   number;
  aiScore:      number;
  flags:        string[];
  notes:        string;
  sources?:     SourceMatch[];
}

export interface PlagiarismReport {
  overallSimilarity: number;
  overallAi:         number;
  summary:           string;
  sections:          SectionFinding[];
  sources?:          SourceMatch[];
  engine?:           'gemini' | 'internal';
  scannedAt?:        string;
}

// ── Engine call ────────────────────────────────────────────────────────────────

export async function runInternalScan(params: {
  studentId:     string;
  institutionId: string;
  sections:      { id: string; title: string; content: string }[];
}): Promise<PlagiarismReport> {
  const { data, error } = await supabase.functions.invoke('check-plagiarism', {
    body: params,
  });

  if (error) throw new Error(error.message ?? 'Plagiarism scan failed');
  return data as PlagiarismReport;
}
