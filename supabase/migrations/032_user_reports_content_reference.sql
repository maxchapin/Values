-- ================================================================
-- Migration 032: let reports reference a specific piece of content
--
--   user_reports (migration 014) only ever recorded "reporter flagged
--   reported_user_id" — there was no way to attach the report to a
--   specific chat message or photo. Apple's UGC guidance (1.2) expects
--   users to be able to flag specific objectionable content, not just
--   the account as a whole.
-- ================================================================

ALTER TABLE public.user_reports
  ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reported_photo_url TEXT;

COMMENT ON COLUMN public.user_reports.message_id IS 'Optional: specific chat message being flagged.';
COMMENT ON COLUMN public.user_reports.reported_photo_url IS 'Optional: specific profile photo URL being flagged.';
