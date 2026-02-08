-- Add user preferences to profiles (notification toggles, profile visibility)
-- Used by Settings screen; synced from app User.settings

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.preferences IS 'User preferences: { "is_profile_visible": boolean, "push_new_match": boolean, "push_new_message": boolean }';
