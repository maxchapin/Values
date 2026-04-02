-- Align chat_messages.match_id with matches.id (UUID + FK).
-- Clears existing chat rows (pre-GA). If you have production chat data, migrate match_id values to UUIDs before applying.

TRUNCATE public.chat_messages;

DROP POLICY IF EXISTS "Users can read own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert text messages as sender" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update read status of messages they received" ON public.chat_messages;

DROP INDEX IF EXISTS idx_chat_messages_match_id;

ALTER TABLE public.chat_messages DROP COLUMN match_id;
ALTER TABLE public.chat_messages ADD COLUMN match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_chat_messages_match_id ON public.chat_messages (match_id);

CREATE POLICY "Match participants can select chat messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = chat_messages.match_id
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  );

CREATE POLICY "Match participants can insert chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = chat_messages.match_id
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
    AND message_type = 'text'
    AND content IS NOT NULL
    AND length(trim(content)) > 0
  );

CREATE POLICY "Match participants can update received messages"
  ON public.chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = chat_messages.match_id
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
    AND sender_id <> auth.uid()
  )
  WITH CHECK (true);

COMMENT ON COLUMN public.chat_messages.match_id IS 'FK to public.matches.id (mutual match thread).';
