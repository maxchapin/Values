/**
 * Supabase-backed swipes and mutual matches.
 */

import { supabase } from './supabase';
import { getDiscoveryProfileRowsByIds, discoveryProfileRowToUser } from './supabaseProfile';
import { computeMatch } from './mockBackend';
import type { Match } from '../types/match';
import type { User } from '../types/user';

export type SwipeDirection = 'like' | 'pass';

export interface MutualMatchRow {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
}

export async function recordProfileSwipe(
  viewerId: string,
  targetId: string,
  direction: SwipeDirection
): Promise<void> {
  if (!viewerId || !targetId || viewerId === targetId) {
    throw new Error('Invalid swipe');
  }

  const { error } = await supabase.from('profile_swipes').upsert(
    {
      viewer_id: viewerId,
      target_id: targetId,
      direction,
    },
    { onConflict: 'viewer_id,target_id' }
  );

  if (error) {
    throw new Error(error.message || 'Failed to save swipe');
  }
}

/** All profile ids the viewer has already swiped on (like or pass). */
export async function fetchSwipedTargetIds(viewerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('profile_swipes')
    .select('target_id')
    .eq('viewer_id', viewerId);

  if (error) {
    if (__DEV__) console.warn('[supabaseMatching] fetchSwipedTargetIds:', error.message);
    return [];
  }

  const out: string[] = [];
  for (const row of data ?? []) {
    const tid = (row as { target_id?: string }).target_id;
    if (typeof tid === 'string' && tid.length > 0) out.push(tid);
  }
  return out;
}

export async function fetchMutualMatchRows(viewerId: string): Promise<MutualMatchRow[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('id, user_a, user_b, created_at')
    .or(`user_a.eq.${viewerId},user_b.eq.${viewerId}`);

  if (error) {
    if (__DEV__) console.warn('[supabaseMatching] fetchMutualMatchRows:', error.message);
    return [];
  }

  return (data ?? []) as MutualMatchRow[];
}

function partnerId(row: MutualMatchRow, viewerId: string): string {
  return row.user_a === viewerId ? row.user_b : row.user_a;
}

/** Build Match[] for the Matches tab (mutual only) using viewer + partner profiles. */
export async function buildMutualMatchesForViewer(
  viewerId: string,
  currentUser: User
): Promise<{ matches: Match[]; matchIdByPartnerUserId: Record<string, string> }> {
  const rows = await fetchMutualMatchRows(viewerId);
  if (rows.length === 0) {
    return { matches: [], matchIdByPartnerUserId: {} };
  }

  const partnerIds = rows.map((r) => partnerId(r, viewerId));
  const profileRows = await getDiscoveryProfileRowsByIds(partnerIds);
  const userById = new Map<string, User>();
  for (const pr of profileRows) {
    userById.set(pr.id, discoveryProfileRowToUser(pr));
  }

  const matches: Match[] = [];
  const matchIdByPartnerUserId: Record<string, string> = {};

  for (const row of rows) {
    const otherId = partnerId(row, viewerId);
    const other = userById.get(otherId);
    if (!other) continue;
    const { similarityScore, sharedValues, valuesExplanation } = computeMatch(currentUser, other);
    matches.push({
      user: other,
      similarityScore,
      sharedValues,
      sharedValuesCount: sharedValues.length,
      valuesExplanation,
    });
    matchIdByPartnerUserId[otherId] = row.id;
  }

  return { matches, matchIdByPartnerUserId };
}

export async function deleteMutualMatchById(matchId: string): Promise<void> {
  const { error } = await supabase.from('matches').delete().eq('id', matchId);
  if (error) {
    throw new Error(error.message || 'Failed to unmatch');
  }
}

/** Resolve `public.matches.id` for a mutual pair (server enforces user_a < user_b). */
export async function fetchMatchThreadIdForPair(
  viewerId: string,
  partnerId: string
): Promise<string | null> {
  if (!viewerId || !partnerId || viewerId === partnerId) return null;
  const userA = viewerId < partnerId ? viewerId : partnerId;
  const userB = viewerId < partnerId ? partnerId : viewerId;
  const { data, error } = await supabase
    .from('matches')
    .select('id')
    .eq('user_a', userA)
    .eq('user_b', userB)
    .maybeSingle();

  if (error) {
    if (__DEV__) console.warn('[supabaseMatching] fetchMatchThreadIdForPair:', error.message);
    return null;
  }
  const id = (data as { id?: string } | null)?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}
