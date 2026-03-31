/**
 * Upload local profile images to Supabase Storage (`avatars` bucket).
 * Object path: `{userId}/{filename}` — must match RLS (first folder = auth.uid()).
 *
 * Native: reads file bytes via expo-file-system (legacy). Do not use fetch(uri).blob() on RN — it often returns 0-byte blobs.
 */

import { Platform } from 'react-native';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { supabase } from './supabase';

const BUCKET = 'avatars';

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = globalThis.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/** Read a local picker/manipulator URI into bytes + content type for Storage upload. */
async function readLocalImageForUpload(uri: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const inferredType = /\.png(\?|$)/i.test(uri) ? 'image/png' : 'image/jpeg';

  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    if (!res.ok) {
      throw new Error(`Could not read image (${res.status})`);
    }
    const blob = await res.blob();
    const ab = await blob.arrayBuffer();
    const bytes = new Uint8Array(ab);
    if (bytes.byteLength === 0) {
      throw new Error('Could not read image (empty file). Try picking the photo again.');
    }
    const contentType = blob.type && blob.type.startsWith('image/') ? blob.type : inferredType;
    return { bytes, contentType };
  }

  const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
  if (!base64?.length) {
    throw new Error('Could not read image (empty file). Try picking the photo again.');
  }
  const bytes = base64ToUint8Array(base64);
  if (bytes.byteLength === 0) {
    throw new Error('Could not read image (empty file). Try picking the photo again.');
  }
  return { bytes, contentType: inferredType };
}

/** Build public object URL for a path inside the `avatars` bucket (no network). */
export function getPublicUrlForAvatarPath(pathInBucket: string): string {
  const path = pathInBucket.trim().replace(/^\/+/, '');
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}

/**
 * Turn a DB or form value into an `Image` `uri`: full https URL, local picker URI, or storage path → public URL.
 */
export function normalizeProfilePhotoUri(raw: string): string {
  const s = (raw ?? '').trim();
  if (!s) return s;
  const lower = s.toLowerCase();
  if (lower.startsWith('http://') || lower.startsWith('https://')) return s;
  if (
    lower.startsWith('file://') ||
    lower.startsWith('content://') ||
    lower.startsWith('ph://') ||
    lower.startsWith('assets-library://')
  ) {
    return s;
  }
  return getPublicUrlForAvatarPath(s);
}

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
 * Upload a single local image; return public HTTPS URL for remote paths or storage object paths.
 */
export async function uploadProfilePhotoIfNeeded(
  uri: string,
  userId: string,
  slotIndex: number
): Promise<string> {
  if (!needsUpload(uri)) {
    const t = (uri ?? '').trim();
    if (!t) return t;
    if (/^https?:\/\//i.test(t)) return t;
    return normalizeProfilePhotoUri(t);
  }

  const ext = /\.png(\?|$)/i.test(uri) ? 'png' : 'jpg';
  const path = `${userId}/profile-${slotIndex}-${Date.now()}.${ext}`;

  const { bytes, contentType } = await readLocalImageForUpload(uri);

  const { data, error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

  if (__DEV__) {
    console.log('[supabaseProfilePhotos] Uploaded', path, bytes.byteLength, 'bytes →', publicUrl);
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
