-- Phase 3: Replace calendar-day unique constraint with a regular index.
-- Idempotency is now enforced by the edge function's 8-hour rolling window
-- query rather than a DB uniqueness constraint.

-- Drop the UTC-calendar-day unique constraint
DROP INDEX IF EXISTS checkins_user_venue_day_idx;

-- Add non-unique index for efficient rolling-window lookups
CREATE INDEX checkins_user_venue_recent_idx
  ON checkins (user_id, venue_id, scanned_at DESC);
