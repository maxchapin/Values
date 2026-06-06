import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckinFeedRow {
  user_id: string;
  overlap_count: number;
  latest_shared_venue_name: string;
  latest_shared_checkin: string;
}

export interface RecordCheckinParams {
  qrToken: string;
  visibilityMode: 'public' | 'matches_only' | 'private';
  userLat?: number;
  userLng?: number;
}

export interface RecordCheckinResult {
  success?: boolean;
  alreadyCheckedIn?: boolean;
  venueName: string;
  category: string | null;
  visibleAfter: string;
  gpsMismatch?: boolean;
  outsideHours?: boolean;
  error?: string;
}

export interface UserCheckinRecord {
  checkinId: string;
  venueId: string;
  venueName: string;
  category: string | null;
  scannedAt: string;
  visibilityMode: 'public' | 'matches_only' | 'private';
}

// ---------------------------------------------------------------------------
// getCheckinFeed
// Returns users who share a venue with the viewer, ranked by overlap count.
// Never throws — returns [] on any error so discovery degrades to city mode.
// ---------------------------------------------------------------------------
export async function getCheckinFeed(viewerId: string): Promise<CheckinFeedRow[]> {
  try {
    const { data, error } = await supabase.rpc('get_checkin_feed', {
      requesting_user_id: viewerId,
    });
    if (error) {
      if (__DEV__) console.warn('[supabaseCheckin] getCheckinFeed error:', error.message);
      return [];
    }
    return (data as CheckinFeedRow[]) ?? [];
  } catch (e) {
    if (__DEV__) console.warn('[supabaseCheckin] getCheckinFeed threw:', e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// recordCheckin
// Calls the POST /checkin edge function with the user's current JWT.
// ---------------------------------------------------------------------------
export async function recordCheckin(params: RecordCheckinParams): Promise<RecordCheckinResult> {
  const { qrToken, visibilityMode, userLat, userLng } = params;

  if (__DEV__) {
    console.log('[recordCheckin] params:', JSON.stringify(params));
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const edgeUrl = process.env.EXPO_PUBLIC_CHECKIN_EDGE_URL;
  if (__DEV__) console.log('[recordCheckin] edge URL:', edgeUrl);
  if (!edgeUrl) throw new Error('EXPO_PUBLIC_CHECKIN_EDGE_URL is not configured');

  const body: Record<string, unknown> = {
    qr_token: qrToken,
    visibility_mode: visibilityMode,
  };
  if (userLat != null) body.user_lat = userLat;
  if (userLng != null) body.user_lng = userLng;

  if (__DEV__) console.log('[recordCheckin] POST body:', JSON.stringify(body));

  const res = await fetch(edgeUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (__DEV__) console.log('[recordCheckin] HTTP status:', res.status, res.statusText);

  const json = await res.json();

  if (__DEV__) console.log('[recordCheckin] Response JSON:', JSON.stringify(json));

  if (!res.ok) {
    throw new Error(json?.error ?? `Check-in failed (${res.status})`);
  }

  return {
    success: json.success,
    alreadyCheckedIn: json.already_checked_in,
    venueName: json.venue_name,
    category: json.category ?? null,
    visibleAfter: json.visible_after,
    gpsMismatch: json.gps_mismatch,
    outsideHours: json.outside_hours,
    error: json.error,
  };
}

// ---------------------------------------------------------------------------
// getSharedVenueForPair
// Returns the name of the most recent venue both users checked into, or null.
// Two sequential queries — no new DB function required.
// ---------------------------------------------------------------------------
export async function getSharedVenueForPair(
  viewerId: string,
  partnerId: string,
): Promise<string | null> {
  try {
    const [viewerRes, partnerRes] = await Promise.all([
      supabase
        .from('checkins')
        .select('venue_id, venues(name)')
        .eq('user_id', viewerId)
        .order('scanned_at', { ascending: false })
        .limit(15),
      supabase
        .from('checkins')
        .select('venue_id')
        .eq('user_id', partnerId)
        .limit(50),
    ]);

    if (!viewerRes.data?.length || !partnerRes.data?.length) return null;

    const partnerVenueIds = new Set(partnerRes.data.map((r) => r.venue_id as string));

    for (const row of viewerRes.data) {
      if (partnerVenueIds.has(row.venue_id as string)) {
        return (row.venues as { name: string } | null)?.name ?? null;
      }
    }
    return null;
  } catch (e) {
    if (__DEV__) console.warn('[supabaseCheckin] getSharedVenueForPair:', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// getUserCheckinHistory
// Returns the current user's check-ins joined to venue metadata, newest first.
// ---------------------------------------------------------------------------
export async function getUserCheckinHistory(userId: string): Promise<UserCheckinRecord[]> {
  try {
    const { data, error } = await supabase
      .from('checkins')
      .select('id, venue_id, scanned_at, visibility_mode, venues(name, category)')
      .eq('user_id', userId)
      .order('scanned_at', { ascending: false })
      .limit(100);

    if (error) {
      if (__DEV__) console.warn('[supabaseCheckin] getUserCheckinHistory:', error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      checkinId: row.id as string,
      venueId: row.venue_id as string,
      venueName: (row.venues as { name: string; category: string } | null)?.name ?? 'Unknown venue',
      category: (row.venues as { name: string; category: string } | null)?.category ?? null,
      scannedAt: row.scanned_at as string,
      visibilityMode: row.visibility_mode as 'public' | 'matches_only' | 'private',
    }));
  } catch (e) {
    if (__DEV__) console.warn('[supabaseCheckin] getUserCheckinHistory threw:', e);
    return [];
  }
}
