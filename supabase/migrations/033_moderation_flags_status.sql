-- ================================================================
-- Migration 033: moderation_flags status tracking
--
--   moderation_flags (migration 017) is written by two triggers
--   (block-evasion pattern in 017, GPS-mismatch pattern in 021) but
--   had no status column and no review tooling — flags were
--   recorded and never looked at again. Mirrors the status/
--   reviewed_at pattern migration 028 added to user_reports, and
--   pairs with scripts/review-moderation-flags.js.
-- ================================================================

ALTER TABLE public.moderation_flags
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE public.moderation_flags
  ADD CONSTRAINT moderation_flags_status_check
  CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned'));

CREATE INDEX IF NOT EXISTS idx_moderation_flags_status_pending
  ON public.moderation_flags (status)
  WHERE status = 'pending';
