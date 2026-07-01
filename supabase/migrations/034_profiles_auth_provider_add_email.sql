-- Allow 'email' as an auth_provider value.
-- Needed for the email/password sign-in path (services/authService.ts
-- signInWithEmailPassword) used by the Apple App Review demo account
-- (scripts/seedDemoAccount.js) — upsertSupabaseProfile writes
-- auth_provider on every login, so the CHECK constraint must allow it.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_auth_provider_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_auth_provider_check CHECK (auth_provider IN ('google', 'apple', 'phone', 'email'));
