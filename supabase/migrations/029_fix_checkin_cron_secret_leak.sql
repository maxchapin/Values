-- ================================================================
-- Migration 029: Fix hardcoded service-role key in the check-in
-- notification cron job.
--
--   Migration 026 embedded the live service-role JWT directly in
--   the `cron.schedule(...)` body, committed in plaintext to this
--   repo. This migration re-schedules the same job to instead call
--   a wrapper function that reads the key from Supabase Vault (the
--   same 'service_role_key' secret migration 028's notify_new_report()
--   trigger uses).
--
--   NOTE: an earlier version of this migration used
--   `current_setting('app.settings.service_role_key', true)`, which
--   depended on `ALTER DATABASE postgres SET app.settings...` —
--   that fails with "permission denied to set parameter" on
--   Supabase-hosted Postgres (the SQL editor's role isn't granted
--   ALTER DATABASE). Vault is the supported mechanism; see the
--   one-time setup in migration 028's header comment.
--
--   This migration does NOT rotate the key. The literal key in
--   026 is permanently in git history regardless of this fix —
--   roll the service-role key in Dashboard → Settings → API after
--   applying this migration, then update the Vault secret:
--     select id from vault.secrets where name = 'service_role_key';
--     select vault.update_secret('<id-from-above>', '<new key>');
--   (covers both this cron job and migration 028's trigger).
-- ----------------------------------------------------------------
-- Run AFTER 028_report_status_and_notify_trigger.sql
-- ================================================================

CREATE OR REPLACE FUNCTION public.run_checkin_overlap_notify()
RETURNS void
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
    RAISE WARNING 'run_checkin_overlap_notify: service_role_key not found in Vault; skipping';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := 'https://nkcaaujkovelpqahmuug.supabase.co/functions/v1/notify-checkin-overlaps',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body    := '{}'::jsonb
  );
END;
$$;

SELECT cron.unschedule('notify-checkin-overlaps');

SELECT cron.schedule(
  'notify-checkin-overlaps',
  '0 */2 * * *',
  $$SELECT public.run_checkin_overlap_notify();$$
);
