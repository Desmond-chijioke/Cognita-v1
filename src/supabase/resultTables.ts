import { supabase } from './client';

export interface DBResultTable {
  id:             string;
  user_id:        string;
  institution_id: string;
  name:           string;
  headers:        string[];
  rows:           string[][];
  created_at:     string;
}

export async function fetchResultTables(userId: string): Promise<DBResultTable[]> {
  const { data, error } = await supabase
    .from('student_result_tables')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) { console.error('fetchResultTables:', error.message); return []; }
  return (data ?? []) as DBResultTable[];
}

export async function createResultTable(
  userId:        string,
  institutionId: string,
  name:          string,
): Promise<DBResultTable | null> {
  const { data, error } = await supabase
    .from('student_result_tables')
    .insert({
      user_id:        userId,
      institution_id: institutionId,
      name,
      headers: ['Column 1', 'Column 2', 'Column 3'],
      rows:    [['', '', ''], ['', '', ''], ['', '', '']],
    })
    .select()
    .single();
  if (error) { console.error('createResultTable:', error.message); return null; }
  return data as DBResultTable;
}

export async function saveResultTable(
  tableId: string,
  patch:   Partial<Pick<DBResultTable, 'name' | 'headers' | 'rows'>>,
): Promise<void> {
  const { error } = await supabase
    .from('student_result_tables')
    .update(patch)
    .eq('id', tableId);
  if (error) console.error('saveResultTable:', error.message);
}

export async function deleteResultTable(tableId: string): Promise<void> {
  await supabase.from('student_result_tables').delete().eq('id', tableId);
}
