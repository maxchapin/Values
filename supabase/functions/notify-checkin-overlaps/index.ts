/**
 * POST /notify-checkin-overlaps — sends a re-engagement push notification to
 * any user whose check-in overlap count has grown since they were last
 * notified (or who has never been notified).
 *
 * Invoked on a schedule via pg_cron + pg_net (see migration 026). Not meant
 * to be called by app clients.
 *
 * Deploy: `supabase functions deploy notify-checkin-overlaps`
 * Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected
 * automatically. The service-role key is required — get_checkin_overlap_counts
 * and checkin_notifications_sent are both restricted to service_role.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

type OverlapRow = {
  user_id: string;
  overlap_count: number;
  latest_shared_venue_name: string | null;
};

type SentRow = {
  user_id: string;
  last_overlap_count: number;
  last_notified_at: string | null;
};

type ExpoMessage = { to: string; title: string; body: string };

Deno.serve(async (req: Request) => {
  const supabaseUrl     = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Server misconfigured' }, 500);
  }

  // Only the scheduled cron job (migration 026) may invoke this function —
  // it authenticates with the service-role key as a bearer token.
  if (req.headers.get('Authorization') !== `Bearer ${serviceRoleKey}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── 1. Overlap counts for every user with an active check-in ─────────────
  const { data: overlaps, error: overlapErr } = await supabase
    .rpc('get_checkin_overlap_counts');

  if (overlapErr) {
    console.error('get_checkin_overlap_counts failed:', overlapErr);
    return json({ error: 'Failed to compute overlap counts' }, 500);
  }

  const overlapRows = (overlaps ?? []) as OverlapRow[];
  if (overlapRows.length === 0) {
    return json({ notified: 0, skipped: 0 }, 200);
  }

  const userIds = overlapRows.map((r) => r.user_id);

  // ── 2. De-dup: only notify when the overlap count grew, or first time ────
  const { data: sentRows, error: sentErr } = await supabase
    .from('checkin_notifications_sent')
    .select('user_id, last_overlap_count, last_notified_at')
    .in('user_id', userIds);

  if (sentErr) {
    console.error('checkin_notifications_sent lookup failed:', sentErr);
    return json({ error: 'Failed to load notification state' }, 500);
  }

  const sentByUser = new Map<string, SentRow>(
    (sentRows ?? []).map((r) => [r.user_id, r as SentRow]),
  );

  const candidates = overlapRows.filter((r) => {
    const prev = sentByUser.get(r.user_id);
    return !prev || prev.last_notified_at == null || r.overlap_count > prev.last_overlap_count;
  });

  if (candidates.length === 0) {
    return json({ notified: 0, skipped: overlapRows.length }, 200);
  }

  // ── 3. Preference filter — default enabled when absent/null ──────────────
  const candidateIds = candidates.map((r) => r.user_id);

  const { data: profileRows, error: profileErr } = await supabase
    .from('profiles')
    .select('id, preferences')
    .in('id', candidateIds);

  if (profileErr) {
    console.error('profiles lookup failed:', profileErr);
    return json({ error: 'Failed to load preferences' }, 500);
  }

  const optedOut = new Set(
    (profileRows ?? [])
      .filter((p) => (p.preferences as Record<string, unknown> | null)?.push_checkin_overlap === false)
      .map((p) => p.id as string),
  );

  const eligible = candidates.filter((r) => !optedOut.has(r.user_id));
  if (eligible.length === 0) {
    return json({ notified: 0, skipped: overlapRows.length }, 200);
  }

  // ── 4. Push tokens — a user may have multiple devices ─────────────────────
  const eligibleIds = eligible.map((r) => r.user_id);

  const { data: tokenRows, error: tokenErr } = await supabase
    .from('push_tokens')
    .select('user_id, expo_token')
    .in('user_id', eligibleIds);

  if (tokenErr) {
    console.error('push_tokens lookup failed:', tokenErr);
    return json({ error: 'Failed to load push tokens' }, 500);
  }

  const tokensByUser = new Map<string, string[]>();
  for (const row of tokenRows ?? []) {
    const list = tokensByUser.get(row.user_id) ?? [];
    list.push(row.expo_token);
    tokensByUser.set(row.user_id, list);
  }

  // ── 5. Build messages ──────────────────────────────────────────────────
  const messages: ExpoMessage[] = [];
  const notifiedUserIds = new Set<string>();

  for (const row of eligible) {
    const tokens = tokensByUser.get(row.user_id);
    if (!tokens || tokens.length === 0) continue;

    const venueName = row.latest_shared_venue_name ?? 'a venue you visited';
    for (const token of tokens) {
      messages.push({
        to: token,
        title: 'New people to meet nearby',
        body: `Someone new checked in at ${venueName} — open The Local to see who's around.`,
      });
    }
    notifiedUserIds.add(row.user_id);
  }

  // ── 6. Send to Expo in batches ────────────────────────────────────────────
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        console.error('Expo push send failed:', res.status, await res.text());
      }
    } catch (e) {
      console.error('Expo push send threw:', e);
    }
  }

  // ── 7. Record notification state ──────────────────────────────────────────
  if (notifiedUserIds.size > 0) {
    const now = new Date().toISOString();
    const upsertRows = eligible
      .filter((r) => notifiedUserIds.has(r.user_id))
      .map((r) => ({
        user_id: r.user_id,
        last_overlap_count: r.overlap_count,
        last_notified_at: now,
      }));

    const { error: upsertErr } = await supabase
      .from('checkin_notifications_sent')
      .upsert(upsertRows, { onConflict: 'user_id' });

    if (upsertErr) {
      console.error('checkin_notifications_sent upsert failed:', upsertErr);
    }
  }

  return json({
    notified: notifiedUserIds.size,
    skipped: overlapRows.length - notifiedUserIds.size,
  }, 200);
});

// ---------------------------------------------------------------------------
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
