-- Broadcast chat_messages changes to Supabase Realtime subscribers.
-- Safe to re-run: ignores duplicate membership errors.

DO $migration$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END;
$migration$;
