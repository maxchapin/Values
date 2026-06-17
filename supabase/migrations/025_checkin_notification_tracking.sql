-- ================================================================
-- Migration 025: Check-in overlap notification tracking
--   - get_checkin_overlap_counts(): batch variant of get_checkin_feed
--     (020) that computes overlap_count / latest_shared_venue_name
--     for ALL users in one query, for the notify-checkin-overlaps
--     edge function (D6). Service-role only — exposes cross-user data.
--   - checkin_notifications_sent: per-user de-dup state so a user is
--     only notified when a *new* overlap appears.
--
-- NOTE: this duplicates the matching logic of get_checkin_feed (020)
-- by necessity (per-requester vs. all-users-batch shapes). Any future
-- change to the 7-day window or exclusion rules must be mirrored here.
-- Run AFTER 024_push_tokens.sql
-- ================================================================

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
    WHERE NOT EXISTS (
      SELECT 1 FROM profile_swipes ps
      WHERE ps.viewer_id = a.user_id AND ps.target_id = b.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_blocks ub
      WHERE ub.blocker_id = b.user_id AND ub.blocked_id = a.user_id
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


CREATE TABLE checkin_notifications_sent (
  user_id            uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  last_overlap_count bigint NOT NULL DEFAULT 0,
  last_notified_at   timestamptz
);

ALTER TABLE checkin_notifications_sent ENABLE ROW LEVEL SECURITY;
-- No policies — only the notify-checkin-overlaps edge function (service-role) reads/writes this table.
