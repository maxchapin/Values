-- Add birthday to profiles; age remains for backward compatibility and can be computed from birthday in app or DB.
-- Run in Supabase SQL Editor if not using Supabase CLI.

-- Add birthday column (store as date at midnight UTC for consistency)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS birthday TIMESTAMPTZ;

-- Optional: DB-level age from birthday (for filtering). Uncomment if you want SQL-side age.
-- CREATE OR REPLACE FUNCTION public.calculate_age(birthday_date TIMESTAMPTZ)
-- RETURNS INTEGER AS $$
-- BEGIN
--   IF birthday_date IS NULL THEN
--     RETURN NULL;
--   END IF;
--   RETURN EXTRACT(YEAR FROM age(CURRENT_DATE, birthday_date::date))::integer;
-- END;
-- $$ LANGUAGE plpgsql IMMUTABLE;

-- Optional: Add generated age column (requires dropping existing age first and backfilling birthday).
-- Only run if you have backfilled birthday from existing age (e.g. approximate: birthday = today - age years).
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS age;
-- ALTER TABLE public.profiles ADD COLUMN age INTEGER GENERATED ALWAYS AS (public.calculate_age(birthday)) STORED;

COMMENT ON COLUMN public.profiles.birthday IS 'User date of birth (time set to 00:00:00 UTC). Used to compute age for display and 18+ validation.';
