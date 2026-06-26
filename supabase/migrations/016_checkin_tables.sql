-- ================================================================
-- Migration 016: venues & checkins tables
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New query)
-- ================================================================

-- ----------------------------------------------------------------
-- venues
-- ----------------------------------------------------------------
CREATE TABLE venues (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  category         text,                        -- coffee, music, outdoors, nightlife, fitness, food
  address          text,
  qr_token         text        UNIQUE NOT NULL,  -- static token embedded in QR code
  operating_hours  jsonb,                        -- { "mon": { "open": "07:00", "close": "21:00" }, ... }
  lat              float8,                       -- venue latitude  (for GPS soft-check)
  lng              float8,                       -- venue longitude (for GPS soft-check)
  created_at       timestamptz DEFAULT now()
);

-- Authenticated users can read all venues; venue rows are admin-managed only
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venues_select_authenticated"
  ON venues FOR SELECT
  TO authenticated
  USING (true);


-- ----------------------------------------------------------------
-- checkins
-- ----------------------------------------------------------------
CREATE TABLE checkins (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  venue_id        uuid        NOT NULL REFERENCES venues      ON DELETE CASCADE,
  scanned_at      timestamptz NOT NULL DEFAULT now(),
  check_in_date   date        NOT NULL DEFAULT CURRENT_DATE, -- UTC date of scan; used for the unique constraint
  visible_after   timestamptz,                   -- scanned_at + 24 hrs; set by edge function
  visibility_mode text        NOT NULL DEFAULT 'public'
                              CHECK (visibility_mode IN ('public', 'matches_only', 'private')),
  created_at      timestamptz DEFAULT now()
);

-- One check-in per user per venue per UTC calendar day.
-- Plain column index avoids the IMMUTABLE requirement of expression indexes.
CREATE UNIQUE INDEX checkins_user_venue_day_idx
  ON checkins (user_id, venue_id, check_in_date);

-- Speed up the discovery feed join
CREATE INDEX checkins_venue_visible_idx
  ON checkins (venue_id, visible_after)
  WHERE visibility_mode = 'public';

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- Users can insert their own check-ins only
CREATE POLICY "checkins_insert_own"
  ON checkins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read:
--   • their own check-ins (any visibility, any time)
--   • other users' public check-ins once the delay window has passed
CREATE POLICY "checkins_select"
  ON checkins FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      visibility_mode = 'public'
      AND visible_after <= now()
    )
  );

-- Users can update only visibility_mode on their own check-ins
CREATE POLICY "checkins_update_visibility_own"
  ON checkins FOR UPDATE
  TO authenticated
  USING    (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- No DELETE policy — check-ins are immutable once written
