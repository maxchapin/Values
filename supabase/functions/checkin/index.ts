/**
 * POST /checkin — validates a venue QR token and records a check-in.
 *
 * Body: { qr_token, visibility_mode?, user_lat?, user_lng? }
 * Auth: Bearer <user JWT> (user_id is derived from the token, not the body)
 *
 * Deploy: `supabase functions deploy checkin`
 * Secrets: SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically.
 * No extra secrets needed — all DB operations run under the user's JWT
 * and are governed by RLS policies.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

// ---------------------------------------------------------------------------
// Haversine distance — returns metres between two lat/lng points.
// No PostGIS required.
// ---------------------------------------------------------------------------
function haversineDistanceM(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000; // Earth mean radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// ---------------------------------------------------------------------------
// Operating hours check — returns false when venue is closed right now.
// operating_hours format: { "mon": { "open": "07:00", "close": "21:00" }, ... }
// Times are treated as UTC to match Supabase's server timezone.
// ---------------------------------------------------------------------------
type DayHours = { open: string; close: string };
type OperatingHours = Partial<Record<string, DayHours>>;

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function isWithinOperatingHours(hours: OperatingHours | null): boolean {
  if (!hours) return true; // No hours set → treat as always open
  const now = new Date();
  const dayKey = DAY_KEYS[now.getUTCDay()];
  const dayHours = hours[dayKey];
  if (!dayHours) return false; // No entry for today → closed

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const current = now.getUTCHours() * 60 + now.getUTCMinutes();
  return current >= toMinutes(dayHours.open) && current <= toMinutes(dayHours.close);
}

// ---------------------------------------------------------------------------
// Venue row returned from DB
// ---------------------------------------------------------------------------
type VenueRow = {
  id: string;
  name: string;
  category: string | null;
  lat: number | null;
  lng: number | null;
  operating_hours: OperatingHours | null;
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing or invalid authorization header' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')      ?? '';
  const anonKey     = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  if (!supabaseUrl || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500);
  }

  // Single client scoped to the user's JWT — RLS handles all access control.
  // Derive user_id from the token; never trust a body-supplied user_id.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return json({ error: 'Invalid session' }, 401);
  }
  const userId = user.id;

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: {
    qr_token: string;
    visibility_mode?: string;
    user_lat?: number;
    user_lng?: number;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { qr_token, user_lat, user_lng } = body;
  const visibilityMode = (['public', 'matches_only', 'private'] as const)
    .includes(body.visibility_mode as never)
    ? (body.visibility_mode as 'public' | 'matches_only' | 'private')
    : 'public';

  if (!qr_token) {
    return json({ error: 'qr_token is required' }, 400);
  }

  // ── Venue lookup ─────────────────────────────────────────────────────────
  const { data: venue, error: venueErr } = await userClient
    .from('venues')
    .select('id, name, category, lat, lng, operating_hours')
    .eq('qr_token', qr_token)
    .single<VenueRow>();

  if (venueErr || !venue) {
    return json({ error: 'Venue not found' }, 404);
  }

  const flags: { gps_mismatch?: true; outside_hours?: true } = {};

  // ── GPS soft-check (silent flag, does not block check-in) ────────────────
  if (
    user_lat != null && user_lng != null &&
    venue.lat != null && venue.lng != null
  ) {
    const distance = haversineDistanceM(user_lat, user_lng, venue.lat, venue.lng);
    if (distance > 300) {
      flags.gps_mismatch = true;
      console.warn(
        `GPS mismatch: user=${userId} venue=${venue.id} distance=${Math.round(distance)}m`,
      );
    }
  }

  // ── Operating hours soft-check (silent flag, does not block check-in) ────
  if (!isWithinOperatingHours(venue.operating_hours)) {
    flags.outside_hours = true;
    console.warn(`Outside hours: user=${userId} venue=${venue.id}`);
  }

  // ── Idempotency: already checked in within the last 8 hours? ─────────────
  const windowStart = new Date(Date.now() - 8 * 60 * 60 * 1_000);

  const { data: existing } = await userClient
    .from('checkins')
    .select('id, visible_after')
    .eq('user_id', userId)
    .eq('venue_id', venue.id)
    .gte('scanned_at', windowStart.toISOString())
    .order('scanned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return json({
      already_checked_in: true,
      venue_name:    venue.name,
      category:      venue.category,
      visible_after: existing.visible_after,
      ...flags,
    }, 200);
  }

  // ── Write check-in ────────────────────────────────────────────────────────
  const scannedAt    = new Date();
  const visibleAfter = new Date(scannedAt.getTime() + 10 * 60 * 60 * 1_000); // +10 hrs

  // check_in_date stores the UTC calendar date of the scan — kept for
  // display and analytics. Idempotency is enforced by the 8-hour rolling
  // window query above, not by a unique index.
  const checkInDate = scannedAt.toISOString().slice(0, 10); // "YYYY-MM-DD"

  const { data: checkin, error: insertErr } = await userClient
    .from('checkins')
    .insert({
      user_id:         userId,
      venue_id:        venue.id,
      scanned_at:      scannedAt.toISOString(),
      check_in_date:   checkInDate,
      visible_after:   visibleAfter.toISOString(),
      visibility_mode: visibilityMode,
    })
    .select('id, visible_after')
    .single();

  if (insertErr) {
    console.error('Check-in insert failed:', insertErr);
    return json({ error: 'Failed to record check-in' }, 500);
  }

  return json({
    success:       true,
    venue_name:    venue.name,
    category:      venue.category,
    visible_after: checkin.visible_after,
    ...flags,
  }, 200);
});

// ---------------------------------------------------------------------------
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
