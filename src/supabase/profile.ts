import { supabase } from './client';

// ── Shared "edit my own profile" helpers ──────────────────────────────────────
// Used by every role's Settings page so name / phone / avatar updates persist
// to the shared `users` table (and stay in sync with the Redux auth.user via
// the caller dispatching `updateUser` after a successful save).

export interface MyProfileRow {
  name:       string;
  phone:      string | null;
  avatar_url: string | null;
}

export async function fetchMyProfile(userId: string): Promise<MyProfileRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('name, phone, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export interface ProfileUpdateParams {
  name?:      string;
  phone?:     string;
  avatarUrl?: string | null;
}

export async function updateMyProfile(userId: string, params: ProfileUpdateParams): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (params.name      !== undefined) payload.name       = params.name;
  if (params.phone     !== undefined) payload.phone      = params.phone;
  if (params.avatarUrl !== undefined) payload.avatar_url = params.avatarUrl;
  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase.from('users').update(payload).eq('id', userId);
  if (error) throw new Error(error.message);
}

// Down-scales the chosen image client-side and re-encodes it as a compact JPEG
// data URL — small enough to store directly in the `avatar_url` text column
// without needing a Supabase Storage bucket + policies.
export function fileToAvatarDataUrl(file: File, maxDimension = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not load the selected image.'));
      img.onload = () => {
        const scale  = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width  = Math.round(img.width  * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Image processing is not supported in this browser.')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
