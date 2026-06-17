import { supabase } from './client';

const BUCKET = 'editor-images';

export async function uploadEditorImage(
  userId: string,
  file:   File,
): Promise<{ url: string; filename: string } | null> {
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) { console.error('uploadEditorImage:', error.message); return null; }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, filename: file.name };
}

export async function listEditorImages(
  userId: string,
): Promise<{ name: string; url: string }[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(userId, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

  if (error || !data) return [];

  return data
    .filter(item => !item.name.endsWith('/'))
    .map(item => ({
      name: item.name,
      url:  supabase.storage.from(BUCKET).getPublicUrl(`${userId}/${item.name}`).data.publicUrl,
    }));
}
