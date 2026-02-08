-- Add neighborhood (optional) to profiles. Visible to all; e.g. "Harvard Square", "Central Square".
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS neighborhood TEXT;

COMMENT ON COLUMN public.profiles.neighborhood IS 'Neighborhood/area name; optional, visible to user and matches.';
