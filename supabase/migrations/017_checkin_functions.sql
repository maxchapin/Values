-- ================================================================
-- Migration 017: moderation_flags table, helper functions,
--                discovery feed query, abuse detection trigger
-- Run AFTER 016_checkin_tables.sql
-- ================================================================


-- ----------------------------------------------------------------
-- moderation_flags
-- ----------------------------------------------------------------
CREATE TABLE moderation_flags (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  flagged_user_id uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  reason          text        NOT NULL,
  metadata        jsonb,
  created_at      timestamptz DEFAULT now()
);

-- No user-facing access; all writes go through SECURITY DEFINER functions
ALTER TABLE moderation_flags ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------
-- haversine_distance_m — returns metres between two lat/lng points
-- Uses the Haversine formula; no PostGIS required.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION haversine_distance_m(
  lat1 float8, lng1 float8,
  lat2 float8, lng2 float8
) RETURNS float8 LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  r    float8 := 6371000; -- Earth mean radius in metres
  dlat float8 := radians(lat2 - lat1);
  dlng float8 := radians(lng2 - lng1);
  a    float8;
BEGIN
  a := sin(dlat / 2) ^ 2
     + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ^ 2;
  RETURN r * 2 * asin(sqrt(a));
END;
$$;


-- ----------------------------------------------------------------
-- get_checkin_feed(requesting_user_id)
--
-- Returns other users who share a venue with the requester, ranked
-- by number of overlapping venues then recency. Excludes:
--   • users the requester has already swiped (profile_swipes)
--   • users who have blocked the requester (user_blocks)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_checkin_feed(requesting_user_id uuid)
RETURNS TABLE (
  user_id                  uuid,
  overlap_count            bigint,
  latest_shared_venue_name text,
  latest_shared_checkin    timestamptz
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH my_venues AS (
    -- Every venue the requester has ever checked into
    SELECT DISTINCT c.venue_id
    FROM   checkins c
    WHERE  c.user_id = requesting_user_id
  ),
  candidate_rows AS (
    -- Public, delay-elapsed check-ins by other users at those same venues
    SELECT
      c.user_id,
      c.venue_id,
      v.name     AS venue_name,
      c.scanned_at
    FROM   checkins c
    JOIN   venues   v ON v.id = c.venue_id
    WHERE  c.venue_id        IN (SELECT venue_id FROM my_venues)
      AND  c.user_id         <> requesting_user_id
      AND  c.visibility_mode  = 'public'
      AND  c.visible_after   <= now()
  ),
  aggregated AS (
    SELECT
      cr.user_id,
      COUNT(DISTINCT cr.venue_id)::bigint                              AS overlap_count,
      (ARRAY_AGG(cr.venue_name ORDER BY cr.scanned_at DESC))[1]       AS latest_shared_venue_name,
      MAX(cr.scanned_at)                                               AS latest_shared_checkin
    FROM candidate_rows cr
    GROUP BY cr.user_id
  )
  SELECT
    a.user_id,
    a.overlap_count,
    a.latest_shared_venue_name,
    a.latest_shared_checkin
  FROM aggregated a
  -- Exclude users the requester has already liked or passed
  WHERE a.user_id NOT IN (
    SELECT ps.target_id
    FROM   profile_swipes ps
    WHERE  ps.viewer_id = requesting_user_id
  )
  -- Exclude users who have blocked the requester
  AND a.user_id NOT IN (
    SELECT ub.blocker_id
    FROM   user_blocks ub
    WHERE  ub.blocked_id = requesting_user_id
  )
  ORDER BY a.overlap_count DESC, a.latest_shared_checkin DESC;
END;
$$;


-- ----------------------------------------------------------------
-- check_abuse_pattern(actor_id, target_id)
--
-- Called after every check-in. If the target has blocked the actor
-- and they share >= 3 venues, writes (or updates) a moderation flag.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_abuse_pattern(actor_id uuid, target_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  shared_count int;
  venue_list   jsonb;
BEGIN
  -- Short-circuit: only relevant when target has blocked actor
  IF NOT EXISTS (
    SELECT 1 FROM user_blocks
    WHERE  blocker_id = target_id
      AND  blocked_id = actor_id
  ) THEN
    RETURN;
  END IF;

  -- Count distinct venues both users have checked into
  SELECT
    COUNT(DISTINCT c1.venue_id),
    jsonb_agg(DISTINCT v.name)
  INTO shared_count, venue_list
  FROM   checkins c1
  JOIN   checkins c2 ON c2.venue_id = c1.venue_id
                     AND c2.user_id  = target_id
  JOIN   venues   v  ON v.id = c1.venue_id
  WHERE  c1.user_id = actor_id;

  IF shared_count < 3 THEN
    RETURN;
  END IF;

  -- Upsert: one flag per actor/target pair to prevent duplicates
  IF EXISTS (
    SELECT 1 FROM moderation_flags
    WHERE  flagged_user_id                 = actor_id
      AND  reason                          = 'repeated_checkin_after_block'
      AND  (metadata ->> 'target_user_id') = target_id::text
  ) THEN
    UPDATE moderation_flags
    SET
      metadata   = jsonb_build_object(
                     'venues',             venue_list,
                     'shared_venue_count', shared_count,
                     'target_user_id',     target_id::text
                   ),
      created_at = now()
    WHERE  flagged_user_id                 = actor_id
      AND  reason                          = 'repeated_checkin_after_block'
      AND  (metadata ->> 'target_user_id') = target_id::text;
  ELSE
    INSERT INTO moderation_flags (flagged_user_id, reason, metadata)
    VALUES (
      actor_id,
      'repeated_checkin_after_block',
      jsonb_build_object(
        'venues',             venue_list,
        'shared_venue_count', shared_count,
        'target_user_id',     target_id::text
      )
    );
  END IF;
END;
$$;


-- ----------------------------------------------------------------
-- Trigger: run abuse check after every new check-in
-- Iterates over all users who have blocked the actor and checks
-- whether the pattern threshold has been reached.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION _trigger_checkin_abuse_check()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  blocker RECORD;
BEGIN
  FOR blocker IN
    SELECT blocker_id
    FROM   user_blocks
    WHERE  blocked_id = NEW.user_id
  LOOP
    PERFORM check_abuse_pattern(NEW.user_id, blocker.blocker_id);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER checkin_abuse_check_trigger
  AFTER INSERT ON checkins
  FOR EACH ROW
  EXECUTE FUNCTION _trigger_checkin_abuse_check();
