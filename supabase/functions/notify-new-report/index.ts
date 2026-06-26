/**
 * POST /notify-new-report — sends a push notification to the developer's
 * own device the instant a user submits a report, so reports can be acted
 * on promptly (Apple Guideline 1.2).
 *
 * Invoked by the user_reports AFTER INSERT trigger via pg_net (see
 * migration 028). Not meant to be called by app clients.
 *
 * Deploy: `supabase functions deploy notify-new-report`
 * Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected
 * automatically. ADMIN_USER_ID must be set manually — it's the
 * auth.users.id of the developer's own account, whose push_tokens
 * rows (populated by the app itself) this function notifies:
 *   supabase secrets set ADMIN_USER_ID=<your auth.users.id>
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

type ExpoMessage = { to: string; title: string; body: string };

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const adminUserId = Deno.env.get('ADMIN_USER_ID') ?? '';

  if (!supabaseUrl || !serviceRoleKey || !adminUserId) {
    return json({ error: 'Server misconfigured' }, 500);
  }

  // Only the user_reports trigger (migration 028) may invoke this function —
  // it authenticates with the service-role key as a bearer token.
  if (req.headers.get('Authorization') !== `Bearer ${serviceRoleKey}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let reportId: string | undefined;
  try {
    const body = await req.json();
    reportId = typeof body?.report_id === 'string' ? body.report_id : undefined;
  } catch {
    // fall through to the missing-reportId check below
  }

  if (!reportId) {
    return json({ error: 'Missing report_id' }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── 1. Look up the report's reason only — no reporter/reported PII ───────
  const { data: report, error: reportErr } = await supabase
    .from('user_reports')
    .select('reason')
    .eq('id', reportId)
    .single();

  if (reportErr || !report) {
    console.error('user_reports lookup failed:', reportErr?.message ?? 'not found');
    return json({ notified: 0, reason: 'report_not_found' }, 200);
  }

  // ── 2. Push tokens for the admin's own account — may have multiple devices ─
  const { data: tokenRows, error: tokenErr } = await supabase
    .from('push_tokens')
    .select('expo_token')
    .eq('user_id', adminUserId);

  if (tokenErr) {
    console.error('push_tokens lookup failed:', tokenErr.message);
    return json({ error: 'Failed to load push tokens' }, 500);
  }

  if (!tokenRows || tokenRows.length === 0) {
    console.warn('notify-new-report: admin has no push token registered');
    return json({ notified: 0, reason: 'no_push_token' }, 200);
  }

  // ── 3. Build and send messages — body is generic, no names (lock screen) ─
  const messages: ExpoMessage[] = tokenRows.map((row) => ({
    to: row.expo_token as string,
    title: 'New report submitted',
    body: `Reason: ${report.reason}`,
  }));

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

  return json({ notified: messages.length }, 200);
});

// ---------------------------------------------------------------------------
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
