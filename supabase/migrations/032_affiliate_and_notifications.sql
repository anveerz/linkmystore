-- Phase 4 + Phase 5 support
-- Affiliate product tracking, earnings ledgers, and creator WhatsApp field

-- 1) Creator WhatsApp number (used for Pro notifications)
ALTER TABLE creators ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- 2) Affiliate product fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_affiliate BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS affiliate_platform TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS affiliate_original_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS affiliate_tagged_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS affiliate_product_data JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_affiliate_platform_check'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_affiliate_platform_check
      CHECK (
        affiliate_platform IS NULL OR affiliate_platform IN (
          'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho'
        )
      );
  END IF;
END $$;

-- 3) Affiliate clicks table
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  affiliate_platform TEXT NOT NULL,
  visitor_id TEXT,
  session_id TEXT,
  clicked_at TIMESTAMPTZ DEFAULT now()
);

-- 4) Affiliate earnings table (monthly ledger entries)
CREATE TABLE IF NOT EXISTS affiliate_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  affiliate_platform TEXT NOT NULL,
  period_month TEXT NOT NULL,
  gross_commission INTEGER NOT NULL DEFAULT 0,
  platform_share INTEGER NOT NULL DEFAULT 0,
  creator_share INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5) RLS
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can view own affiliate clicks" ON affiliate_clicks;
CREATE POLICY "Creators can view own affiliate clicks"
  ON affiliate_clicks FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creators WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Creators can view own affiliate earnings" ON affiliate_earnings;
CREATE POLICY "Creators can view own affiliate earnings"
  ON affiliate_earnings FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creators WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access on affiliate clicks" ON affiliate_clicks;
CREATE POLICY "Service role full access on affiliate clicks"
  ON affiliate_clicks FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on affiliate earnings" ON affiliate_earnings;
CREATE POLICY "Service role full access on affiliate earnings"
  ON affiliate_earnings FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_products_affiliate ON products(is_affiliate);
CREATE INDEX IF NOT EXISTS idx_products_affiliate_platform ON products(affiliate_platform);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_creator_id ON affiliate_clicks(creator_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_product_id ON affiliate_clicks(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_clicked_at ON affiliate_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_creator_id ON affiliate_earnings(creator_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_period ON affiliate_earnings(period_month);
