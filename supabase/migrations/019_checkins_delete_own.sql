-- Allow users to delete their own check-ins (Places tab "remove" action)
CREATE POLICY "checkins_delete_own"
  ON checkins FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
