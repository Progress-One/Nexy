-- 039_insights_tracking.sql
-- Add tracking for when the "Insights Reveal" screen was shown to the user.
-- Used by Discovery flow to show the "aha" moment exactly once (after N answers).

ALTER TABLE user_flow_state
  ADD COLUMN IF NOT EXISTS insights_shown_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_flow_state_insights
  ON user_flow_state(insights_shown_at)
  WHERE insights_shown_at IS NOT NULL;
