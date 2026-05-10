-- ================================================================
-- Seed: 3 sample venues for check-in feature testing
-- Run in Supabase SQL editor after migrations 016 & 017
-- ================================================================
-- qr_token values are intentionally short and human-readable for
-- dev testing; production tokens should be cryptographically random.

INSERT INTO venues (name, category, address, qr_token, operating_hours, lat, lng)
VALUES
  (
    'Bloc 11 Cafe',
    'coffee',
    '11 Bow Street, Union Square, Somerville, MA 02143',
    'venue_bloc11_a1b2c3',
    '{
      "mon": {"open": "07:00", "close": "21:00"},
      "tue": {"open": "07:00", "close": "21:00"},
      "wed": {"open": "07:00", "close": "21:00"},
      "thu": {"open": "07:00", "close": "21:00"},
      "fri": {"open": "07:00", "close": "22:00"},
      "sat": {"open": "08:00", "close": "22:00"},
      "sun": {"open": "08:00", "close": "20:00"}
    }'::jsonb,
    42.3776,
    -71.0996
  ),
  (
    'The Middle East Restaurant & Nightclub',
    'music',
    '472 Massachusetts Ave, Cambridge, MA 02139',
    'venue_middleeast_d4e5f6',
    '{
      "wed": {"open": "18:00", "close": "02:00"},
      "thu": {"open": "18:00", "close": "02:00"},
      "fri": {"open": "18:00", "close": "02:00"},
      "sat": {"open": "18:00", "close": "02:00"}
    }'::jsonb,
    42.3651,
    -71.1037
  ),
  (
    'Minuteman Bikeway Trailhead',
    'outdoors',
    '21 Alewife Brook Pkwy, Cambridge, MA 02138',
    'venue_minuteman_g7h8i9',
    '{
      "mon": {"open": "06:00", "close": "20:00"},
      "tue": {"open": "06:00", "close": "20:00"},
      "wed": {"open": "06:00", "close": "20:00"},
      "thu": {"open": "06:00", "close": "20:00"},
      "fri": {"open": "06:00", "close": "20:00"},
      "sat": {"open": "06:00", "close": "21:00"},
      "sun": {"open": "06:00", "close": "21:00"}
    }'::jsonb,
    42.3956,
    -71.1462
  );
