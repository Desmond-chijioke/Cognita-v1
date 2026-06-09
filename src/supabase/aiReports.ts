import { supabase } from './client';

// ── AI-generated report storage ────────────────────────────────────────────────
// One row per (student, report type) — re-running a scan overwrites the
// previous report so the page always shows the latest result without
// regenerating it on every visit.

export type AIReportType = 'plagiarism' | 'ai_review' | 'references' | 'analysis';

export interface AIReportRow<T = unknown> {
  id:           string;
  student_id:   string;
  report_type:  AIReportType;
  data:         T;
  created_at:   string;
}

export async function fetchAIReport<T = unknown>(
  studentId: string,
  type:      AIReportType,
): Promise<AIReportRow<T> | null> {
  const { data, error } = await supabase
    .from('ai_reports')
    .select('*')
    .eq('student_id', studentId)
    .eq('report_type', type)
    .maybeSingle();

  if (error) { console.error('fetchAIReport:', error.message); return null; }
  return data as AIReportRow<T> | null;
}

export async function saveAIReport<T = unknown>(
  studentId: string,
  type:      AIReportType,
  data:      T,
): Promise<void> {
  const { error } = await supabase
    .from('ai_reports')
    .upsert({
      student_id:   studentId,
      report_type:  type,
      data,
      created_at:   new Date().toISOString(),
    }, { onConflict: 'student_id,report_type' });

  if (error) throw new Error(error.message);
}
