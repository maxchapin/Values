-- Chat messages: text-only for safety. No image/photo/file attachments.
-- Use this table when you wire chat to Supabase real-time.

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type = 'text'),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_match_id ON public.chat_messages(match_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Only allow inserting text messages (no image URLs or media).
-- Reject content that looks like image/URL to prevent abuse.
CREATE OR REPLACE FUNCTION public.chat_message_content_is_text_only()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.message_type IS DISTINCT FROM 'text' THEN
    RAISE EXCEPTION 'message_type must be text only';
  END IF;
  -- Optional: reject content that looks like storage/HTTP image URLs
  IF NEW.content ~* '^\s*https?://[^\s]+\.(jpg|jpeg|png|gif|webp|heic)(\?.*)?\s*$' THEN
    RAISE EXCEPTION 'Image URLs are not allowed in chat';
  END IF;
  IF NEW.content ~* '^\s*data:image/' THEN
    RAISE EXCEPTION 'Inline image data is not allowed in chat';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS chat_messages_text_only_trigger ON public.chat_messages;
CREATE TRIGGER chat_messages_text_only_trigger
  BEFORE INSERT OR UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_message_content_is_text_only();

-- RLS: users can only read/write messages for matches they are part of.
-- (Adjust USING/WITH CHECK to your match/conversation model, e.g. match_id in user_matches.)
CREATE POLICY "Users can read own chat messages"
  ON public.chat_messages
  FOR SELECT
  USING (auth.uid() = sender_id OR EXISTS (
    SELECT 1 FROM public.chat_messages m2
    WHERE m2.match_id = chat_messages.match_id
      AND m2.sender_id = auth.uid()
    LIMIT 1
  ));

CREATE POLICY "Users can insert text messages as sender"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND message_type = 'text'
    AND content IS NOT NULL
    AND length(trim(content)) > 0
  );

CREATE POLICY "Users can update read status of messages they received"
  ON public.chat_messages
  FOR UPDATE
  USING (sender_id <> auth.uid())
  WITH CHECK (true);

COMMENT ON TABLE public.chat_messages IS 'Text-only chat. No image/photo/file attachments (safety). message_type must be text.';
