-- Analytics events table for tracking user funnel and engagement
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for funnel queries
CREATE INDEX idx_analytics_events_name ON analytics_events (event_name);
CREATE INDEX idx_analytics_events_user ON analytics_events (user_id);
CREATE INDEX idx_analytics_events_created ON analytics_events (created_at);

-- RLS: users can insert their own events, only admins can read all
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);
