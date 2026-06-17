-- ================================================================
-- Seed: test check-in data for previewing the check-in-based
--       Discover feed (get_checkin_feed).
-- Run AFTER migrations 016-020 and checkin_venues_seed.sql.
--
-- "Test profiles" must be real Supabase auth accounts (sign up via
-- the app first) — the client-only mock users in mockBackend.ts
-- never reach the database.
-- ================================================================

-- Step 1: Look up real account UUIDs for your two test accounts, and
-- copy them into the DO block below.
SELECT id, email, display_name FROM public.profiles ORDER BY created_at;

-- Step 2: Replace the placeholder UUIDs below with real ids from
-- the query above, then run this block. It seeds check-ins (so
-- get_checkin_feed surfaces "other" to the viewer) and fills in
-- profile details (name, age, gender, bio, location, photo, values)
-- for "other" so their Discover card looks like a real candidate.
DO $$
DECLARE
  viewer_id uuid := '00000000-0000-0000-0000-000000000001'; -- TODO: replace — the account you'll view Discover as
  other_id  uuid := '00000000-0000-0000-0000-000000000002'; -- TODO: replace — shares both venues with viewer

  bloc11_id     uuid;
  middleeast_id uuid;
BEGIN
  SELECT id INTO bloc11_id     FROM venues WHERE qr_token = 'venue_bloc11_a1b2c3';
  SELECT id INTO middleeast_id FROM venues WHERE qr_token = 'venue_middleeast_d4e5f6';

  -- Viewer's own check-ins — establishes "my_venues" for get_checkin_feed.
  -- visible_after is backdated so these are already "active" (24h+ old).
  INSERT INTO checkins (user_id, venue_id, scanned_at, visible_after)
  VALUES
    (viewer_id, bloc11_id,     now() - interval '2 days', now() - interval '1 day'),
    (viewer_id, middleeast_id, now() - interval '2 days', now() - interval '1 day');

  -- other: shares BOTH venues with viewer -> overlap_count = 2
  INSERT INTO checkins (user_id, venue_id, scanned_at, visible_after)
  VALUES
    (other_id, bloc11_id,     now() - interval '2 days', now() - interval '1 day'),
    (other_id, middleeast_id, now() - interval '2 days', now() - interval '1 day');

  -- ----------------------------------------------------------------
  -- Profile details for "other" — so their Discover card shows a
  -- name, age, photo, bio, location, and values (with the "You were
  -- both at <venue> this week" badge from the check-ins above).
  -- ----------------------------------------------------------------
  UPDATE public.profiles SET
    first_name = 'Jordan',
    display_name = 'Jordan',
    age = 27,
    gender = 'woman',
    bio = 'Coffee enthusiast, always up for a hike or a new restaurant.',
    location_label = 'Cambridge, MA',
    location_latitude = 42.3776,
    location_longitude = -71.0996,
    photos = '["https://i.pravatar.cc/600?img=47"]'::jsonb,
    selected_values = '["adventure", "honesty", "personal-growth", "connection", "health"]'::jsonb,
    values_profile = jsonb_build_object(
      'selectedValueIds', '["adventure", "honesty", "personal-growth", "connection", "health"]'::jsonb,
      'selectedValues', jsonb_build_array(
        jsonb_build_object('id', 'adventure', 'label', 'Adventure'),
        jsonb_build_object('id', 'honesty', 'label', 'Honesty'),
        jsonb_build_object('id', 'personal-growth', 'label', 'Personal Growth'),
        jsonb_build_object('id', 'connection', 'label', 'Connection'),
        jsonb_build_object('id', 'health', 'label', 'Health')
      )
    ),
    is_profile_complete = true,
    is_values_complete = true,
    is_onboarding_complete = true
  WHERE id = other_id;
END $$;

-- Step 3: Verify — should return "other" with overlap_count = 2.
-- Replace with the same viewer_id used above.
SELECT * FROM get_checkin_feed('00000000-0000-0000-0000-000000000001');

-- Note: get_checkin_feed excludes users the viewer has already swiped
-- (profile_swipes) and users who have blocked the viewer (user_blocks).
-- If the verification query comes back empty, clear any existing rows for
-- these test accounts first:
--   DELETE FROM profile_swipes WHERE viewer_id = '<viewer_id>' AND target_id = '<other_id>';
--   DELETE FROM user_blocks WHERE blocked_id = '<viewer_id>';
