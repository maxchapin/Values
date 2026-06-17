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
  visibleAfter: string;
}

export interface NearbyVenueRow {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  distanceMiles: number;
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
  const { qrToken, userLat, userLng } = params;

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
// Calls a SECURITY DEFINER function — clients can no longer read other
// users' check-in rows directly.
// ---------------------------------------------------------------------------
export async function getSharedVenueForPair(
  viewerId: string,
  partnerId: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_shared_venue_for_pair', {
      viewer_id: viewerId,
      partner_id: partnerId,
    });
    if (error) {
      if (__DEV__) console.warn('[supabaseCheckin] getSharedVenueForPair error:', error.message);
      return null;
    }
    return (data as string | null) ?? null;
  } catch (e) {
    if (__DEV__) console.warn('[supabaseCheckin] getSharedVenueForPair threw:', e);
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
      .select('id, venue_id, scanned_at, visible_after, venues(name, category)')
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
      visibleAfter: row.visible_after as string,
    }));
  } catch (e) {
    if (__DEV__) console.warn('[supabaseCheckin] getUserCheckinHistory threw:', e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// getNearbyVenues
// Returns active venues within radiusMiles of the given coordinates,
// nearest first. Never throws — returns [] on any error.
// ---------------------------------------------------------------------------
export async function getNearbyVenues(
  userLat: number,
  userLng: number,
  radiusMiles = 5,
): Promise<NearbyVenueRow[]> {
  try {
    const { data, error } = await supabase.rpc('get_nearby_venues', {
      user_lat: userLat,
      user_lng: userLng,
      radius_miles: radiusMiles,
    });
    if (error) {
      if (__DEV__) console.warn('[supabaseCheckin] getNearbyVenues error:', error.message);
      return [];
    }
    return ((data ?? []) as Array<{
      id: string;
      name: string;
      category: string | null;
      address: string | null;
      distance_miles: number;
    }>).map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      address: row.address,
      distanceMiles: row.distance_miles,
    }));
  } catch (e) {
    if (__DEV__) console.warn('[supabaseCheckin] getNearbyVenues threw:', e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// deleteCheckin
// Removes a check-in record (Places tab "remove" action).
// ---------------------------------------------------------------------------
export async function deleteCheckin(checkinId: string): Promise<void> {
  const { error } = await supabase.from('checkins').delete().eq('id', checkinId);
  if (error) throw new Error(error.message);
}
