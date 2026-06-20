-- ================================================================
-- Migration 027: Fix check-in feed block symmetry + visibility bypass
--
--   get_checkin_feed() (020) and get_checkin_overlap_counts() (025)
--   had two bugs vs. the city-wide Discover path:
--     1. Block exclusion was one-directional — only excluded users who
--        blocked the requester, not users the requester blocked. The
--        city-wide path (fetchBlockedUserIdsForViewer) is symmetric.
--     2. Neither function checked preferences.is_profile_visible, so a
--        user who hid their profile in Settings was still surfaced via
--        check-in overlaps. The city-wide path enforces this via the
--        profiles SELECT RLS policy (011); these SECURITY DEFINER
--        functions bypass that policy and need their own check.
--
--   Both fixes mirror the existing pattern in get_shared_venue_for_pair
--   (020) for block checks, and the RLS policy (011) for visibility.
-- Run AFTER 026_checkin_notification_cron.sql
-- ================================================================

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
    SELECT DISTINCT c.venue_id
    FROM   checkins c
    WHERE  c.user_id       = requesting_user_id
      AND  c.visible_after <= now()
      AND  c.scanned_at    >= now() - interval '7 days'
  ),
  candidate_rows AS (
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
  JOIN profiles p ON p.id = a.user_id
  WHERE COALESCE((p.preferences->>'is_profile_visible')::boolean, true) = true
    -- Exclude users the requester has already liked or passed
    AND NOT EXISTS (
      SELECT 1 FROM profile_swipes ps
      WHERE ps.viewer_id = requesting_user_id AND ps.target_id = a.user_id
    )
    -- Exclude a block in EITHER direction (requester blocked them, or they blocked requester)
    AND NOT EXISTS (
      SELECT 1 FROM user_blocks ub
      WHERE (ub.blocker_id = a.user_id          AND ub.blocked_id = requesting_user_id)
         OR (ub.blocker_id = requesting_user_id AND ub.blocked_id = a.user_id)
    )
  ORDER BY a.overlap_count DESC, a.latest_shared_checkin DESC;
END;
$$;


-- get_checkin_overlap_counts: batch variant for the notify-checkin-overlaps cron (025).
-- Mirrors the same two fixes per the "must be mirrored here" note in 025.
CREATE OR REPLACE FUNCTION get_checkin_overlap_counts()
RETURNS TABLE (
  user_id                  uuid,
  overlap_count            bigint,
  latest_shared_venue_name text
) LANGUAGE sql SECURITY DEFINER AS $$
  WITH active_checkins AS (
    SELECT c.user_id, c.venue_id, v.name AS venue_name, c.scanned_at
    FROM   checkins c
    JOIN   venues   v ON v.id = c.venue_id
    WHERE  c.visible_after <= now()
      AND  c.scanned_at    >= now() - interval '7 days'
  ),
  pairs AS (
    SELECT
      a.user_id AS requesting_user_id,
      b.venue_id,
      b.venue_name,
      b.scanned_at
    FROM   active_checkins a
    JOIN   active_checkins b
      ON   b.venue_id = a.venue_id
     AND   b.user_id  <> a.user_id
    JOIN   profiles pb ON pb.id = b.user_id
    WHERE  COALESCE((pb.preferences->>'is_profile_visible')::boolean, true) = true
      AND NOT EXISTS (
        SELECT 1 FROM profile_swipes ps
        WHERE ps.viewer_id = a.user_id AND ps.target_id = b.user_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks ub
        WHERE (ub.blocker_id = b.user_id AND ub.blocked_id = a.user_id)
           OR (ub.blocker_id = a.user_id AND ub.blocked_id = b.user_id)
      )
  )
  SELECT
    p.requesting_user_id AS user_id,
    COUNT(DISTINCT p.venue_id)::bigint                       AS overlap_count,
    (ARRAY_AGG(p.venue_name ORDER BY p.scanned_at DESC))[1]  AS latest_shared_venue_name
  FROM pairs p
  GROUP BY p.requesting_user_id;
$$;

REVOKE EXECUTE ON FUNCTION get_checkin_overlap_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_checkin_overlap_counts() TO service_role;
