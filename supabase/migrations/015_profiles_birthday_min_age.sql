-- Server-side 18+ check on birthday (evaluated on INSERT/UPDATE to profiles).

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_birthday_min_age;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_birthday_min_age CHECK (
    birthday IS NULL
    OR (birthday::date <= (CURRENT_DATE - INTERVAL '18 years'))
  );

COMMENT ON CONSTRAINT profiles_birthday_min_age ON public.profiles IS
  'Require birthday on or before the calendar date 18 years ago (user at least 18). NULL allowed for legacy rows; app should require birthday for new signups.';
