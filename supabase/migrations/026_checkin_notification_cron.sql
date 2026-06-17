-- ================================================================
-- Migration 026: Schedule notify-checkin-overlaps
--   - Calls the notify-checkin-overlaps edge function every 2 hours
--     via pg_cron + pg_net.
--
-- 2-hour interval: overlap state changes slowly (24h maturity delay,
-- 7-day window) and migration 025's count-based de-dup means more
-- frequent runs wouldn't cause duplicate pushes — but hourly is
-- excessive and daily risks missing same-day re-engagement.
--
-- ----------------------------------------------------------------
-- ONE-TIME MANUAL SETUP (not executed by this migration):
--   1. Dashboard → Database → Extensions → enable "pg_cron" and "pg_net".
--   2. Set the service-role key as a DB setting so the cron job can
--      authenticate the edge function call, e.g. via SQL editor:
--        ALTER DATABASE postgres SET app.settings.service_role_key = '<service-role-key>';
--      (Do not commit the key itself anywhere — set it directly in
--      the Dashboard SQL editor.)
--   3. Deploy the function: `supabase functions deploy notify-checkin-overlaps`
-- ----------------------------------------------------------------
-- Run AFTER 025_checkin_notification_tracking.sql
-- ================================================================

SELECT cron.schedule(
  'notify-checkin-overlaps',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://nkcaaujkovelpqahmuug.supabase.co/functions/v1/notify-checkin-overlaps',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rY2FhdWprb3ZlbHBxYWhtdXVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI4NTczMywiZXhwIjoyMDg1ODYxNzMzfQ.UzHSj27lH7U51DSwjdHDQxT5woADHoylktqlGRb7p7w"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
