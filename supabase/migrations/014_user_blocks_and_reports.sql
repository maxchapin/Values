-- User block list (hide from discover, prevent new mutual matches) and abuse reports.

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_blocks_no_self CHECK (blocker_id <> blocked_id),
  CONSTRAINT user_blocks_pair_unique UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks (blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert blocks as blocker"
  ON public.user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users read blocks involving self"
  ON public.user_blocks FOR SELECT
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "Users delete own outgoing blocks"
  ON public.user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- ---------------------------------------------------------------------------
-- Reports (review in Supabase dashboard or via Edge/worker)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_reports_no_self CHECK (reporter_id <> reported_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON public.user_reports (reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_created ON public.user_reports (created_at DESC);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own reports"
  ON public.user_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users read own reports"
  ON public.user_reports FOR SELECT
  USING (auth.uid() = reporter_id);

COMMENT ON TABLE public.user_blocks IS 'Viewer blocked target: hide in Discover; trigger prevents new mutual match rows.';
COMMENT ON TABLE public.user_reports IS 'Safety reports; expand SELECT with service role for moderation dashboards.';

-- ---------------------------------------------------------------------------
-- Do not create a mutual match if either direction is blocked
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_match_if_blocked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE (b.blocker_id = NEW.user_a AND b.blocked_id = NEW.user_b)
       OR (b.blocker_id = NEW.user_b AND b.blocked_id = NEW.user_a)
  ) THEN
    RAISE EXCEPTION 'Match blocked';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS matches_prevent_blocked ON public.matches;
CREATE TRIGGER matches_prevent_blocked
  BEFORE INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_match_if_blocked();
