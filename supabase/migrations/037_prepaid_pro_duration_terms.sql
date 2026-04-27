ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS term_months INTEGER,
  ADD COLUMN IF NOT EXISTS amount_paid_paisa INTEGER;

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_term_months_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_term_months_check
  CHECK (term_months IS NULL OR term_months IN (1, 3, 6, 12));

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_razorpay_order_id
  ON subscriptions(razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_razorpay_payment_id
  ON subscriptions(razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;
