-- Swipes (like/pass) and mutual matches for Discover / Matches.
-- Chat messages reference matches.id (see 012 migration if non-empty chat_messages).

DO $$ BEGIN
  CREATE TYPE public.swipe_direction AS ENUM ('like', 'pass');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.profile_swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction public.swipe_direction NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profile_swipes_no_self CHECK (viewer_id <> target_id),
  CONSTRAINT profile_swipes_viewer_target_unique UNIQUE (viewer_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_swipes_viewer ON public.profile_swipes (viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_swipes_target ON public.profile_swipes (target_id);

CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT matches_ordered_pair CHECK (user_a < user_b),
  CONSTRAINT matches_user_pair_unique UNIQUE (user_a, user_b)
);

CREATE INDEX IF NOT EXISTS idx_matches_user_a ON public.matches (user_a);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON public.matches (user_b);

ALTER TABLE public.profile_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Viewers manage and read their own swipe rows
CREATE POLICY "Users insert own swipes"
  ON public.profile_swipes FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Users read own swipes as viewer"
  ON public.profile_swipes FOR SELECT
  USING (auth.uid() = viewer_id);

CREATE POLICY "Users update own swipes"
  ON public.profile_swipes FOR UPDATE
  USING (auth.uid() = viewer_id)
  WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Users delete swipes involving self"
  ON public.profile_swipes FOR DELETE
  USING (auth.uid() = viewer_id OR auth.uid() = target_id);

-- Mutual matches: participants can read and delete (unmatch)
CREATE POLICY "Match participants can read matches"
  ON public.matches FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Match participants can delete matches"
  ON public.matches FOR DELETE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Rows are created only via SECURITY DEFINER trigger (no client INSERT on matches)
CREATE OR REPLACE FUNCTION public.trg_profile_swipes_maybe_create_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reciprocal BOOLEAN;
  a UUID;
  b UUID;
BEGIN
  IF NEW.direction IS DISTINCT FROM 'like' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profile_swipes s
    WHERE s.viewer_id = NEW.target_id
      AND s.target_id = NEW.viewer_id
      AND s.direction = 'like'
  ) INTO reciprocal;

  IF NOT reciprocal THEN
    RETURN NEW;
  END IF;

  a := LEAST(NEW.viewer_id, NEW.target_id);
  b := GREATEST(NEW.viewer_id, NEW.target_id);

  INSERT INTO public.matches (user_a, user_b)
  VALUES (a, b)
  ON CONFLICT (user_a, user_b) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_swipes_create_mutual_match ON public.profile_swipes;
CREATE TRIGGER profile_swipes_create_mutual_match
  AFTER INSERT ON public.profile_swipes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_profile_swipes_maybe_create_match();

COMMENT ON TABLE public.profile_swipes IS 'Discover swipes: one row per (viewer, target); direction like or pass.';
COMMENT ON TABLE public.matches IS 'Mutual like pairs only; user_a < user_b. Used as chat thread id.';
