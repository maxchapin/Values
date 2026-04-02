-- Allow authenticated users to read other users' profiles for Discover (non-self rows).
-- Respects preferences.is_profile_visible when false; missing key defaults to visible.

CREATE POLICY "Authenticated users can read others profiles for discover"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND id <> auth.uid()
    AND COALESCE((preferences->>'is_profile_visible')::boolean, true) = true
  );
