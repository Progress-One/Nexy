-- Migration: Invite improvements
-- Adds expires_at for invitations, partner_email field, and notifications table

-- Add expires_at for invitation expiry (7 days default)
ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add partner_email to store email when sending invite via email
ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS partner_email TEXT;

-- Update existing pending invitations to expire in 7 days from now
UPDATE partnerships
SET expires_at = NOW() + INTERVAL '7 days'
WHERE status = 'pending' AND expires_at IS NULL;

-- Index for efficient expiry queries
CREATE INDEX IF NOT EXISTS idx_partnerships_expires_at
ON partnerships(expires_at) WHERE status = 'pending';

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('invite_accepted', 'invite_declined', 'new_match', 'partner_activity')),
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can insert notifications (for API routes)
CREATE POLICY "Service can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Index for efficient notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
