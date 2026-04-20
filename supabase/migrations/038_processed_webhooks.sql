-- 038_processed_webhooks.sql
-- Idempotency tracking for external webhooks (Stripe, etc.).
-- Prevents double-processing when a provider retries delivery.

CREATE TABLE IF NOT EXISTS processed_webhooks (
  event_id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'stripe',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_processed_at
  ON processed_webhooks(processed_at);
