import { supabase } from './client';

export interface DBDraft {
  id:            string;
  student_id:    string;
  section_id:    string;
  section_title: string;
  content:       string;
  updated_at:    string;
}

export async function fetchSectionDrafts(studentId: string): Promise<DBDraft[]> {
  const { data, error } = await supabase
    .from('section_drafts')
    .select('*')
    .eq('student_id', studentId)
    .order('updated_at');

  if (error) { console.error('fetchSectionDrafts:', error.message); return []; }
  return (data ?? []) as DBDraft[];
}

export async function saveSectionDrafts(
  studentId: string,
  sections: { sectionId: string; sectionTitle: string; content: string }[],
): Promise<void> {
  if (!sections.length) return;
  const rows = sections.map(s => ({
    student_id:    studentId,
    section_id:    s.sectionId,
    section_title: s.sectionTitle,
    content:       s.content,
    updated_at:    new Date().toISOString(),
  }));
  const { error } = await supabase
    .from('section_drafts')
    .upsert(rows, { onConflict: 'student_id,section_id' });
  if (error) throw new Error(error.message);
}

export async function deleteSectionDraft(studentId: string, sectionId: string): Promise<void> {
  const { error } = await supabase
    .from('section_drafts')
    .delete()
    .eq('student_id', studentId)
    .eq('section_id', sectionId);
  if (error) throw new Error(error.message);
}

export async function deleteProjectDrafts(studentId: string, projPrefix: string): Promise<void> {
  const { error } = await supabase
    .from('section_drafts')
    .delete()
    .eq('student_id', studentId)
    .like('section_id', `${projPrefix}%`);
  if (error) throw new Error(error.message);
}
