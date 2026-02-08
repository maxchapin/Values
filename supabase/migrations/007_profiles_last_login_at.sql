-- Add last_login_at for Discover composite score (similarity + recency).
-- Used to order candidates: blend values match score with recency so active users surface first.
-- Update on sign-in or app open via touchLastLoginAt() or upsertSupabaseProfile().

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.last_login_at IS 'Last time the user opened the app or signed in; used for Discover ordering (composite score = 0.7 * similarity + 0.3 * recency).';

-- Index for ordering discovery by recency (optional; useful if you sort by last_login_at in SQL).
CREATE INDEX IF NOT EXISTS idx_profiles_last_login_at ON public.profiles(last_login_at DESC NULLS LAST);
