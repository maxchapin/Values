/**
 * Upload local profile images to Supabase Storage (`avatars` bucket).
 * Object path: `{userId}/{filename}` — must match RLS (first folder = auth.uid()).
 *
 * Native: reads file bytes via expo-file-system (legacy). Do not use fetch(uri).blob() on RN — it often returns 0-byte blobs.
 *
 * Incremental saves: diff against last server URLs — upload only new local URIs; reuse existing HTTPS; remove orphan Storage objects.
 */

import { Platform } from 'react-native';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { supabase } from './supabase';

const BUCKET = 'avatars';

/** Path segment after bucket in public URLs: `/storage/v1/object/public/avatars/<path>` */
const PUBLIC_AVATARS_PREFIX = '/storage/v1/object/public/avatars/';

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
 * Stable string for comparing two public URLs to the same Storage object.
 */
export function canonicalProfilePhotoUrl(raw: string): string {
  const s = (raw ?? '').trim();
  if (!s) return s;
  if (!/^https?:\/\//i.test(s)) return s;
  try {
    const u = new URL(s);
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    u.pathname = u.pathname.replace(/\/+/g, '/');
    return u.toString();
  } catch {
    return s;
  }
}

/**
 * Extract Storage object path for `avatars` bucket from a public URL, or null if not our bucket.
 */
export function storagePathFromPublicUrl(url: string): string | null {
  const s = (url ?? '').trim();
  if (!s) return null;
  const noQuery = s.split('?')[0];
  const idx = noQuery.indexOf(PUBLIC_AVATARS_PREFIX);
  if (idx === -1) return null;
  let path = noQuery.slice(idx + PUBLIC_AVATARS_PREFIX.length);
  try {
    path = decodeURIComponent(path);
  } catch {
    // keep raw
  }
  return path.replace(/^\/+/, '') || null;
}

/** Storage path must start with `{userId}/` (RLS layout). */
export function isAvatarPathOwnedByUser(path: string, userId: string): boolean {
  const p = path.replace(/^\/+/, '');
  const prefix = `${userId}/`;
  return p === userId || p.startsWith(prefix);
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

/** Unique storage paths under user's folder from a list of photo strings (URLs or paths). */
function collectUserAvatarPaths(photoStrings: string[], userId: string): Set<string> {
  const set = new Set<string>();
  for (const raw of photoStrings) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const norm = normalizeProfilePhotoUri(raw);
    if (!norm.startsWith('http')) continue;
    const path = storagePathFromPublicUrl(norm);
    if (path && isAvatarPathOwnedByUser(path, userId)) {
      set.add(path);
    }
  }
  return set;
}

/**
 * Multiset of canonical URLs from previous server list for reuse (reorder / unchanged).
 * Queues preserve original URL strings from DB for stable output.
 */
function buildPreviousRemoteReuseQueues(
  previousPublicUrls: string[]
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const raw of previousPublicUrls) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const expanded = normalizeProfilePhotoUri(raw);
    if (!expanded.startsWith('http')) continue;
    const can = canonicalProfilePhotoUrl(expanded);
    const list = map.get(can) ?? [];
    list.push(expanded);
    map.set(can, list);
  }
  return map;
}

function takeReuseUrl(queues: Map<string, string[]>, canonical: string): string | null {
  const list = queues.get(canonical);
  if (!list || list.length === 0) return null;
  return list.shift() ?? null;
}

async function uploadLocalProfilePhoto(uri: string, userId: string, slotIndex: number): Promise<string> {
  const ext = /\.png(\?|$)/i.test(uri) ? 'png' : 'jpg';
  const path = `${userId}/profile-${slotIndex}-${Date.now()}.${ext}`;

  const { bytes, contentType } = await readLocalImageForUpload(uri);

  const { data, error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Photo upload failed (slot ${slotIndex + 1}): ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

  if (__DEV__) {
    console.log('[supabaseProfilePhotos] upload', { slot: slotIndex, path, bytes: bytes.byteLength });
  }

  return publicUrl;
}

export interface ResolveProfilePhotosResult {
  urls: string[];
  orphanStoragePaths: string[];
}

/**
 * Map desired photo list to public URLs for `profiles.photos`, uploading only new local files.
 * Reuses existing HTTPS URLs that match the previous server list (reorder safe).
 * Computes orphan Storage paths (removed photos) — caller should delete after DB upsert succeeds.
 */
export async function resolveProfilePhotoUrlsForSupabase(
  desired: string[],
  userId: string,
  previousPublicUrls?: string[] | null
): Promise<ResolveProfilePhotosResult> {
  const previous = Array.isArray(previousPublicUrls) ? previousPublicUrls : [];
  const reuseQueues = buildPreviousRemoteReuseQueues(previous);

  const urls: string[] = [];
  let uploadCount = 0;
  let reuseCount = 0;
  let passThroughCount = 0;

  for (let i = 0; i < desired.length; i++) {
    const raw = desired[i] ?? '';
    const d = raw.trim();
    if (!d) {
      urls.push('');
      continue;
    }

    if (needsUpload(d)) {
      const uploaded = await uploadLocalProfilePhoto(d, userId, i);
      urls.push(uploaded);
      uploadCount++;
      continue;
    }

    if (/^https?:\/\//i.test(d)) {
      const can = canonicalProfilePhotoUrl(d);
      const reused = takeReuseUrl(reuseQueues, can);
      if (reused !== null) {
        urls.push(reused);
        reuseCount++;
      } else {
        urls.push(d);
        passThroughCount++;
      }
      continue;
    }

    const expanded = normalizeProfilePhotoUri(d);
    if (/^https?:\/\//i.test(expanded)) {
      const can = canonicalProfilePhotoUrl(expanded);
      const reused = takeReuseUrl(reuseQueues, can);
      if (reused !== null) {
        urls.push(reused);
        reuseCount++;
      } else {
        urls.push(expanded);
        passThroughCount++;
      }
      continue;
    }

    urls.push(d);
  }

  const finalPaths = collectUserAvatarPaths(urls, userId);
  const previousPaths = collectUserAvatarPaths(previous, userId);
  const orphanStoragePaths: string[] = [];
  for (const p of previousPaths) {
    if (!finalPaths.has(p)) {
      orphanStoragePaths.push(p);
    }
  }

  if (__DEV__) {
    console.log('[supabaseProfilePhotos] resolve', {
      uploadCount,
      reuseCount,
      passThroughRemoteCount: passThroughCount,
      orphanCount: orphanStoragePaths.length,
    });
  }

  return { urls, orphanStoragePaths };
}

/** Remove Storage objects for profile photos the user removed. Logs warnings on failure; does not throw. */
export async function removeOrphanProfileAvatarObjects(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error, data } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) {
    if (__DEV__) {
      console.warn('[supabaseProfilePhotos] remove orphans failed:', error.message, paths);
    }
    return;
  }
  if (__DEV__) {
    console.log('[supabaseProfilePhotos] removed orphan objects', { count: data?.length ?? paths.length });
  }
}

/** All objects under `{userId}/` in the avatars bucket (account deletion). Best-effort; logs warnings. */
export async function removeAllAvatarObjectsForUser(userId: string): Promise<void> {
  const prefix = (userId ?? '').trim().replace(/^\/+|\/+$/g, '');
  if (!prefix) return;

  const paths: string[] = [];
  const limit = 100;
  let offset = 0;
  for (;;) {
    const { data: batch, error } = await supabase.storage.from(BUCKET).list(prefix, { limit, offset });
    if (error) {
      if (__DEV__) console.warn('[supabaseProfilePhotos] list for account delete:', error.message);
      return;
    }
    const files = batch ?? [];
    if (files.length === 0) break;
    for (const f of files) {
      if (f?.name) paths.push(`${prefix}/${f.name}`);
    }
    offset += files.length;
    if (files.length < limit) break;
  }

  if (paths.length > 0) {
    await removeOrphanProfileAvatarObjects(paths);
  }
}

/**
 * Upload a single local image; return public HTTPS URL for remote paths or storage object paths.
 * Prefer `resolveProfilePhotoUrlsForSupabase` for profile saves to avoid duplicate uploads.
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

  return uploadLocalProfilePhoto(uri, userId, slotIndex);
}
