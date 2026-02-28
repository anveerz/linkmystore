-- Phase 7: Free vs Pro Plan System
-- Adds subscription management, plan column on creators, branding/SEO flags

-- 1. Add plan column to creators (denormalized for fast lookups)
ALTER TABLE creators ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE creators ADD CONSTRAINT creators_plan_check CHECK (plan IN ('free', 'pro'));

-- 2. Add category and return_policy to creators (needed for revised onboarding)
ALTER TABLE creators ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS return_policy TEXT;

-- 3. Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  razorpay_subscription_id TEXT,
  razorpay_plan_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(creator_id)
);

-- 4. Add branding and SEO flags to store_settings
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_branding BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS seo_enabled BOOLEAN DEFAULT false;

-- 5. RLS policies for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own subscription"
  ON subscriptions FOR SELECT
  USING (creator_id IN (
    SELECT id FROM creators WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role full access on subscriptions"
  ON subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator_id ON subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_creators_plan ON creators(plan);
