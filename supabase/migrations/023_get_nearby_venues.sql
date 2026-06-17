-- ================================================================
-- Migration 023: get_nearby_venues
--   - Cold-start helper for the Nearby Venues screen: returns active
--     venues within radius_miles of the given coordinates, sorted by
--     distance.
--   - Plain SQL function, no SECURITY DEFINER — venues already has an
--     open authenticated SELECT policy, this is just a computed-
--     distance convenience wrapper around haversine_distance_m() (017).
-- Run AFTER 022_venues_is_active.sql
-- ================================================================

CREATE OR REPLACE FUNCTION get_nearby_venues(
  user_lat float8, user_lng float8, radius_miles float8 DEFAULT 5
)
RETURNS TABLE (
  id             uuid,
  name           text,
  category       text,
  address        text,
  distance_miles float8
) LANGUAGE sql STABLE AS $$
  SELECT v.id, v.name, v.category, v.address,
         haversine_distance_m(user_lat, user_lng, v.lat, v.lng) / 1609.344 AS distance_miles
  FROM   venues v
  WHERE  v.is_active = true
    AND  v.lat IS NOT NULL AND v.lng IS NOT NULL
    AND  haversine_distance_m(user_lat, user_lng, v.lat, v.lng) / 1609.344 <= radius_miles
  ORDER BY distance_miles ASC;
$$;

GRANT EXECUTE ON FUNCTION get_nearby_venues TO authenticated;
