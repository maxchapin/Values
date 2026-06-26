-- ================================================================
-- Migration 028: Report status tracking + instant notify trigger
--   - Adds status/reviewed_at to user_reports so reports can be
--     triaged (see scripts/review-reports.js) instead of re-read
--     forever.
--   - notify_new_report(): fires AFTER INSERT on user_reports and
--     calls the notify-new-report edge function via pg_net, so the
--     developer gets a push the instant a report is submitted
--     (Apple Guideline 1.2 requires acting on reports "promptly").
--     Mirrors the pg_cron + pg_net call pattern from migration 026,
--     but trigger-based instead of scheduled, and reads the
--     service-role key from Supabase Vault rather than a literal
--     (see migration 029, which fixes 026 to do the same — both
--     read the same 'service_role_key' Vault secret).
--
--     NOTE: an earlier version of this migration used
--     `ALTER DATABASE postgres SET app.settings.service_role_key`.
--     That fails with "permission denied to set parameter" on
--     Supabase-hosted Postgres — the SQL editor's role isn't
--     granted ALTER DATABASE. Vault is the supported mechanism.
--
-- ----------------------------------------------------------------
-- ONE-TIME MANUAL SETUP (not executed by this migration):
--   1. Confirm the "Supabase Vault" extension is enabled:
--      Dashboard → Database → Extensions → search "vault"
--      (usually on by default).
--   2. Store the service-role key in Vault — run once in the SQL
--      editor (never commit the key itself anywhere):
--        select vault.create_secret('<service-role-key>', 'service_role_key', 'Used by DB triggers/cron to call edge functions');
--   3. Set the ADMIN_USER_ID secret the edge function reads —
--      Dashboard → Edge Functions → Manage secrets (or
--      `supabase secrets set ADMIN_USER_ID=<your auth.users.id>`
--      if using the CLI).
--   4. Deploy the function: Dashboard → Edge Functions → Deploy a
--      new function (or `supabase functions deploy notify-new-report`).
-- ----------------------------------------------------------------
-- Run AFTER 027_checkin_feed_block_visibility_fix.sql
-- ================================================================

ALTER TABLE public.user_reports
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE public.user_reports
  ADD CONSTRAINT user_reports_status_check
  CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned'));

CREATE INDEX IF NOT EXISTS idx_user_reports_status_pending
  ON public.user_reports (status)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.notify_new_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_key TEXT;
BEGIN
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  IF service_key IS NULL THEN
    RAISE WARNING 'notify_new_report: service_role_key not found in Vault; skipping push notification';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := 'https://nkcaaujkovelpqahmuug.supabase.co/functions/v1/notify-new-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body    := jsonb_build_object('report_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_reports_notify_new ON public.user_reports;
CREATE TRIGGER user_reports_notify_new
  AFTER INSERT ON public.user_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_report();
