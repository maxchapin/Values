/**
 * Discover feed eligibility: liked users never shown; passed users hidden until cooldown expires.
 */

import type { Match } from '../types/match';

/** How long a pass hides someone from Discover before they can reappear (recycle). */
export const DISCOVER_PASS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export interface PassedSwipeRecord {
  userId: string;
  /** ISO timestamp when the viewer passed. */
  passedAt: string;
}

export function passSwipeInCooldown(
  userId: string,
  records: PassedSwipeRecord[],
  nowMs: number = Date.now()
): boolean {
  let latest = 0;
  for (const r of records) {
    if (r.userId !== userId) continue;
    const t = new Date(r.passedAt).getTime();
    if (!Number.isFinite(t)) continue;
    if (t > latest) latest = t;
  }
  if (latest === 0) return false;
  return nowMs - latest < DISCOVER_PASS_COOLDOWN_MS;
}

/** Drop pass records that are past cooldown so storage stays bounded. */
export function pruneExpiredPassSwipes(
  records: PassedSwipeRecord[],
  nowMs: number = Date.now()
): PassedSwipeRecord[] {
  return records.filter((r) => {
    const t = new Date(r.passedAt).getTime();
    if (!Number.isFinite(t)) return false;
    return nowMs - t < DISCOVER_PASS_COOLDOWN_MS;
  });
}

/**
 * Full ranked pool from the server minus anyone liked or still in pass cooldown.
 */
export function buildDiscoverQueueFromPool(
  rankedPool: Match[],
  likedUserIds: string[],
  passRecords: PassedSwipeRecord[],
  nowMs: number = Date.now()
): Match[] {
  const liked = new Set(likedUserIds);
  return rankedPool.filter((m) => {
    const id = m.user?.id;
    if (!id) return false;
    if (liked.has(id)) return false;
    if (passSwipeInCooldown(id, passRecords, nowMs)) return false;
    return true;
  });
}

/** Discover queue when swipe targets come from Supabase (any direction). */
export function buildDiscoverQueueExcludingTargets(
  rankedPool: Match[],
  swipedTargetIds: Set<string>
): Match[] {
  return rankedPool.filter((m) => {
    const id = m.user?.id;
    if (!id) return false;
    return !swipedTargetIds.has(id);
  });
}
