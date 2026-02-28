-- Add missing UPDATE policy for proposals (defined in schema.sql but never applied via migration)
CREATE POLICY "Recipient can update proposal" ON proposals
  FOR UPDATE USING (auth.uid() = to_user_id);
