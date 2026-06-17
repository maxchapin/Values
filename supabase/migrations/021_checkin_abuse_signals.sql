-- ================================================================
-- Migration 021: Persist check-in abuse signals
--   - Add gps_mismatch / outside_hours flags to checkins
--   - Flag repeated GPS mismatches as a moderation pattern
-- Run AFTER 020_checkin_visibility_overhaul.sql
-- ================================================================

ALTER TABLE checkins ADD COLUMN gps_mismatch  boolean NOT NULL DEFAULT false;
ALTER TABLE checkins ADD COLUMN outside_hours boolean NOT NULL DEFAULT false;


-- ----------------------------------------------------------------
-- check_gps_mismatch_pattern(actor_id)
--
-- Called after a check-in flagged with gps_mismatch. If the user
-- has racked up >= 3 GPS-mismatched check-ins in the last 7 days,
-- writes (or refreshes) a moderation flag.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_gps_mismatch_pattern(actor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  mismatch_count int;
BEGIN
  SELECT COUNT(*)
  INTO   mismatch_count
  FROM   checkins
  WHERE  user_id      = actor_id
    AND  gps_mismatch = true
    AND  scanned_at   >= now() - interval '7 days';

  IF mismatch_count < 3 THEN
    RETURN;
  END IF;

  -- Upsert: one flag per user to prevent duplicates
  IF EXISTS (
    SELECT 1 FROM moderation_flags
    WHERE  flagged_user_id = actor_id
      AND  reason          = 'gps_mismatch_pattern'
  ) THEN
    UPDATE moderation_flags
    SET
      metadata   = jsonb_build_object('mismatch_count', mismatch_count, 'window_days', 7),
      created_at = now()
    WHERE  flagged_user_id = actor_id
      AND  reason          = 'gps_mismatch_pattern';
  ELSE
    INSERT INTO moderation_flags (flagged_user_id, reason, metadata)
    VALUES (
      actor_id,
      'gps_mismatch_pattern',
      jsonb_build_object('mismatch_count', mismatch_count, 'window_days', 7)
    );
  END IF;
END;
$$;


-- ----------------------------------------------------------------
-- Trigger: run the GPS-mismatch pattern check after any check-in
-- that was itself flagged as a mismatch. outside_hours is recorded
-- but intentionally not wired to a moderation flag (weaker signal).
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION _trigger_checkin_gps_abuse_check()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM check_gps_mismatch_pattern(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER checkin_gps_abuse_check_trigger
  AFTER INSERT ON checkins
  FOR EACH ROW
  WHEN (NEW.gps_mismatch)
  EXECUTE FUNCTION _trigger_checkin_gps_abuse_check();
