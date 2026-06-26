-- ================================================================
-- Migration 031: lock chat_messages UPDATE down to is_read only
--
--   Migration 003's "Users can update read status of messages they
--   received" policy uses `WITH CHECK (true)`, so the policy itself
--   doesn't stop the recipient of a message from rewriting any
--   column on it — content, sender_id, created_at — via a direct
--   UPDATE. Nothing in the app's own UI does this today (chat only
--   ever INSERTs and flips is_read), but the policy is reachable by
--   anyone holding a valid JWT for a shared match via REST/RPC.
--
--   Fix: add a trigger that rejects any UPDATE touching a column
--   other than is_read, so the broad WITH CHECK is backed by a real
--   invariant at the table level rather than relying on client
--   behavior.
-- ----------------------------------------------------------------
-- Run AFTER 030_atomic_checkin.sql
-- ================================================================

CREATE OR REPLACE FUNCTION public.chat_messages_lock_immutable_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.match_id IS DISTINCT FROM OLD.match_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.message_type IS DISTINCT FROM OLD.message_type
     OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Only is_read may be updated on chat_messages';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS chat_messages_lock_immutable_fields_trigger ON public.chat_messages;
CREATE TRIGGER chat_messages_lock_immutable_fields_trigger
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_messages_lock_immutable_fields();
