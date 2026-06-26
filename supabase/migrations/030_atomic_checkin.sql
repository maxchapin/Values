-- ================================================================
-- Migration 030: Atomic check-in dedup
--
--   Migration 018 dropped the per-day unique index on checkins and
--   moved idempotency entirely into the checkin edge function
--   (SELECT existing-checkin, then INSERT if none found). Those are
--   two separate round trips with no transaction/lock between them,
--   so two near-simultaneous requests for the same user+venue (a
--   fast double-tap, or a client retry racing the original request)
--   can both pass the "no existing checkin" check before either
--   INSERT commits, producing duplicate checkin rows within the
--   same 8-hour window.
--
--   Fix: move the check-and-insert into a single SECURITY DEFINER
--   function that takes a per-(user, venue) advisory lock for the
--   duration of the transaction, so the second concurrent call
--   blocks until the first one has committed (or rolled back) and
--   then correctly sees the just-inserted row instead of racing it.
--
--   user_id is always taken from auth.uid() inside the function,
--   never from a parameter, so a caller cannot record a check-in
--   for anyone but themselves despite the function running with
--   elevated (SECURITY DEFINER) privileges.
-- ----------------------------------------------------------------
-- Run AFTER 029_fix_checkin_cron_secret_leak.sql
-- ================================================================

CREATE OR REPLACE FUNCTION public.atomic_record_checkin(
  p_venue_id uuid,
  p_gps_mismatch boolean DEFAULT false,
  p_outside_hours boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  visible_after timestamptz,
  already_checked_in boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       uuid := auth.uid();
  v_existing_id   uuid;
  v_existing_vis  timestamptz;
  v_scanned_at    timestamptz := now();
  v_visible_after timestamptz := now() + interval '24 hours';
  v_check_in_date date := (now() AT TIME ZONE 'UTC')::date;
  v_new_id        uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Serialize concurrent check-in attempts for this user+venue so the
  -- existing-row check and the insert below happen atomically as a unit.
  -- Lock is automatically released at transaction end.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_venue_id::text, 0));

  SELECT c.id, c.visible_after INTO v_existing_id, v_existing_vis
  FROM checkins c
  WHERE c.user_id = v_user_id
    AND c.venue_id = p_venue_id
    AND c.scanned_at >= now() - interval '8 hours'
  ORDER BY c.scanned_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_id, v_existing_vis, true;
    RETURN;
  END IF;

  INSERT INTO checkins (user_id, venue_id, scanned_at, check_in_date, visible_after, gps_mismatch, outside_hours)
  VALUES (v_user_id, p_venue_id, v_scanned_at, v_check_in_date, v_visible_after, p_gps_mismatch, p_outside_hours)
  RETURNING checkins.id INTO v_new_id;

  RETURN QUERY SELECT v_new_id, v_visible_after, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.atomic_record_checkin(uuid, boolean, boolean) TO authenticated;
