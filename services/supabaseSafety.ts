/**
 * Block / report: user_blocks + user_reports (see migration 014).
 */

import { supabase } from './supabase';

/** User ids to exclude from Discover for this viewer (either direction of block). */
export async function fetchBlockedUserIdsForViewer(viewerId: string): Promise<string[]> {
  if (!viewerId) return [];
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`);

  if (error) {
    if (__DEV__) console.warn('[supabaseSafety] fetchBlockedUserIdsForViewer:', error.message);
    return [];
  }

  const out = new Set<string>();
  for (const row of data ?? []) {
    const r = row as { blocker_id?: string; blocked_id?: string };
    if (r.blocker_id === viewerId && r.blocked_id) out.add(r.blocked_id);
    else if (r.blocked_id === viewerId && r.blocker_id) out.add(r.blocker_id);
  }
  return [...out];
}

export async function insertUserBlock(blockerId: string, blockedId: string): Promise<void> {
  if (!blockerId || !blockedId || blockerId === blockedId) {
    throw new Error('Invalid block');
  }
  const { error } = await supabase.from('user_blocks').insert({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });
  if (error) {
    if (error.code === '23505') return;
    throw new Error(error.message || 'Could not block user');
  }
}

export type ReportReason =
  | 'harassment'
  | 'fake_profile'
  | 'inappropriate_content'
  | 'other';

export async function insertUserReport(params: {
  reporterId: string;
  reportedUserId: string;
  reason: ReportReason;
  details?: string;
  matchId?: string | null;
}): Promise<void> {
  const { reporterId, reportedUserId, reason, details, matchId } = params;
  if (!reporterId || !reportedUserId || reporterId === reportedUserId) {
    throw new Error('Invalid report');
  }

  const { error } = await supabase.from('user_reports').insert({
    reporter_id: reporterId,
    reported_user_id: reportedUserId,
    reason,
    details: details?.trim() || null,
    match_id: matchId ?? null,
  });

  if (error) {
    throw new Error(error.message || 'Could not submit report');
  }
}
