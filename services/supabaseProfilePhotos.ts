/**
 * Upload local profile images to Supabase Storage (`avatars` bucket).
 * Object path: `{userId}/{filename}` — must match RLS (first folder = auth.uid()).
 */

import { supabase } from './supabase';

const BUCKET = 'avatars';

function needsUpload(uri: string): boolean {
  const u = uri.trim().toLowerCase();
  if (!u) return false;
  if (u.startsWith('http://') || u.startsWith('https://')) return false;
  return (
    u.startsWith('file://') ||
    u.startsWith('content://') ||
    u.startsWith('ph://') ||
    u.startsWith('assets-library://')
  );
}

/**
 * Upload a single local image; return the same string if already a remote URL.
 */
export async function uploadProfilePhotoIfNeeded(
  uri: string,
  userId: string,
  slotIndex: number
): Promise<string> {
  if (!needsUpload(uri)) {
    return uri;
  }

  const ext = /\.png(\?|$)/i.test(uri) ? 'png' : 'jpg';
  const path = `${userId}/profile-${slotIndex}-${Date.now()}.${ext}`;

  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(`Could not read image (${res.status})`);
  }
  const blob = await res.blob();

  const { data, error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg',
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

  if (__DEV__) {
    console.log('[supabaseProfilePhotos] Uploaded', path, '→', publicUrl);
  }

  return publicUrl;
}

/** Map photo list to public URLs, uploading local files per slot. */
export async function resolveProfilePhotoUrlsForSupabase(
  photos: string[],
  userId: string
): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    out.push(await uploadProfilePhotoIfNeeded(photos[i] ?? '', userId, i));
  }
  return out;
}
