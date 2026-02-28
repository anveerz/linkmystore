-- Phase 7.2: UPI Direct Payment Flow
-- Adds UPI payment fields to orders table for direct UPI payments

-- 1. Add UPI payment fields to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'razorpay';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS upi_reference_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;

-- 2. Add check constraint for payment method
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_method_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
      CHECK (payment_method IN ('razorpay', 'upi_direct'));
  END IF;
END $$;

-- 3. Index for filtering UPI orders pending verification
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_payment_verified ON orders(payment_verified) WHERE payment_method = 'upi_direct';
