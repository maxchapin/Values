-- ================================================================
-- Migration 020: Check-in visibility overhaul
--   - Remove visibility_mode (every check-in behaves the same way)
--   - 24h maturity delay + 7-day rolling window for matching
--   - Lock down checkins RLS to owner-only SELECT
--   - Add get_shared_venue_for_pair() for the match icebreaker
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Lock down direct SELECT access to owners only. All cross-user
--    matching now goes through SECURITY DEFINER functions below.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "checkins_select" ON checkins;

CREATE POLICY "checkins_select_own"
  ON checkins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No longer needed: visibility_mode (the only updatable field) is being removed.
DROP POLICY IF EXISTS "checkins_update_visibility_own" ON checkins;


-- ----------------------------------------------------------------
-- 2. Remove visibility_mode — every check-in now follows the same
--    24h-delay / 7-day-window rule (enforced in get_checkin_feed).
--    Dropping the column also drops its CHECK constraint and the
--    partial index that referenced it.
-- ----------------------------------------------------------------
ALTER TABLE checkins DROP COLUMN visibility_mode;

CREATE INDEX checkins_venue_scanned_idx
  ON checkins (venue_id, scanned_at DESC);


-- ----------------------------------------------------------------
-- 3. get_checkin_feed: add 24h maturity + 7-day window on both
--    sides of the match, and verify the caller is asking about
--    themselves.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_checkin_feed(requesting_user_id uuid)
RETURNS TABLE (
  user_id                  uuid,
  overlap_count            bigint,
  latest_shared_venue_name text,
  latest_shared_checkin    timestamptz
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF requesting_user_id <> auth.uid() THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH my_venues AS (
    -- Venues the requester checked into, now "active" (24h old) and
    -- still within the past week
    SELECT DISTINCT c.venue_id
    FROM   checkins c
    WHERE  c.user_id       = requesting_user_id
      AND  c.visible_after <= now()
      AND  c.scanned_at    >= now() - interval '7 days'
  ),
  candidate_rows AS (
    -- Other users' active, recent check-ins at those same venues
    SELECT
      c.user_id,
      c.venue_id,
      v.name     AS venue_name,
      c.scanned_at
    FROM   checkins c
    JOIN   venues   v ON v.id = c.venue_id
    WHERE  c.venue_id     IN (SELECT venue_id FROM my_venues)
      AND  c.user_id      <> requesting_user_id
      AND  c.visible_after <= now()
      AND  c.scanned_at    >= now() - interval '7 days'
  ),
  aggregated AS (
    SELECT
      cr.user_id,
      COUNT(DISTINCT cr.venue_id)::bigint                        AS overlap_count,
      (ARRAY_AGG(cr.venue_name ORDER BY cr.scanned_at DESC))[1]  AS latest_shared_venue_name,
      MAX(cr.scanned_at)                                          AS latest_shared_checkin
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
-- 4. get_shared_venue_for_pair: server-side lookup for the
--    MatchDetail icebreaker. Only for confirmed matches, only for
--    check-ins past the 24h maturity delay, and never across a
--    block in either direction. Restricted to the caller's own
--    pairing (viewer_id must be the calling user).
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_shared_venue_for_pair(viewer_id uuid, partner_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result text;
BEGIN
  IF viewer_id <> auth.uid() THEN
    RETURN NULL;
  END IF;

  -- Only confirmed matches may see each other's shared-venue callout
  IF NOT EXISTS (
    SELECT 1 FROM matches m
    WHERE m.user_a = LEAST(viewer_id, partner_id)
      AND m.user_b = GREATEST(viewer_id, partner_id)
  ) THEN
    RETURN NULL;
  END IF;

  -- Never reveal shared visits across a block, in either direction
  IF EXISTS (
    SELECT 1 FROM user_blocks b
    WHERE (b.blocker_id = viewer_id  AND b.blocked_id = partner_id)
       OR (b.blocker_id = partner_id AND b.blocked_id = viewer_id)
  ) THEN
    RETURN NULL;
  END IF;

  SELECT v.name INTO result
  FROM   checkins c1
  JOIN   checkins c2 ON c2.venue_id = c1.venue_id
  JOIN   venues   v  ON v.id = c1.venue_id
  WHERE  c1.user_id = viewer_id
    AND  c2.user_id = partner_id
    AND  c1.visible_after <= now()
    AND  c2.visible_after <= now()
  ORDER BY GREATEST(c1.scanned_at, c2.scanned_at) DESC
  LIMIT 1;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_shared_venue_for_pair(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_shared_venue_for_pair(uuid, uuid) TO authenticated;
