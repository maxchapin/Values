-- ================================================================
-- Migration 024: push_tokens
--   - Stores Expo push tokens per user/device for re-engagement
--     notifications. The notification edge function (D6) uses the
--     service-role key and bypasses RLS entirely — these policies
--     only govern the client's own register/unregister.
-- Run AFTER 023_get_nearby_venues.sql
-- ================================================================

CREATE TABLE push_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  expo_token  text        NOT NULL,
  device_id   text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, expo_token)
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_insert_own"
  ON push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_tokens_select_own"
  ON push_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "push_tokens_update_own"
  ON push_tokens FOR UPDATE
  TO authenticated
  USING    (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_tokens_delete_own"
  ON push_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
