-- V3 payments + trust baseline
-- PG-primary checkout, temporary UPI fallback, webhook audit trails

-- 1) New payment domain tables
CREATE TABLE IF NOT EXISTS public.payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL UNIQUE REFERENCES public.creators(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'razorpay' CHECK (provider IN ('razorpay', 'none')),
  payment_mode TEXT NOT NULL DEFAULT 'pg_primary' CHECK (payment_mode IN ('pg_primary', 'upi_fallback')),
  pg_status TEXT NOT NULL DEFAULT 'not_started' CHECK (
    pg_status IN ('not_started', 'onboarding_started', 'pending_kyc', 'under_review', 'active', 'rejected', 'suspended')
  ),
  pg_account_label TEXT,
  pg_key_id TEXT,
  pg_secret_encrypted TEXT,
  pg_webhook_secret_encrypted TEXT,
  upi_id TEXT,
  upi_fallback_enabled BOOLEAN NOT NULL DEFAULT true,
  upi_fallback_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('processed', 'ignored', 'failed')),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Order table enhancements for V3 state machine
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS legacy_revenue_model BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gateway_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gateway_provider TEXT;

UPDATE public.orders
SET legacy_revenue_model = true
WHERE legacy_revenue_model IS DISTINCT FROM true;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('razorpay', 'upi_direct', 'pg_razorpay', 'upi_manual'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'awaiting_manual_proof', 'processing', 'paid', 'failed', 'refunded', 'chargeback'));

-- 3) Trust tables
CREATE TABLE IF NOT EXISTS public.store_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  store_slug TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_email TEXT,
  order_reference TEXT,
  upi_reference TEXT,
  evidence_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'rejected')),
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seller_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL UNIQUE REFERENCES public.creators(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'unverified' CHECK (tier IN ('unverified', 'identity_verified', 'business_verified')),
  pan_last4 TEXT,
  gstin TEXT,
  verification_notes TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grievance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'abuse', 'fraud', 'ip', 'privacy')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  related_url TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'rejected')),
  acknowledgement_deadline TIMESTAMPTZ,
  resolution_deadline TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_payment_accounts_creator_id ON public.payment_accounts(creator_id);
CREATE INDEX IF NOT EXISTS idx_payment_accounts_pg_status ON public.payment_accounts(pg_status);
CREATE INDEX IF NOT EXISTS idx_payment_events_order_id ON public.payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_creator_id ON public.payment_events(creator_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_type ON public.payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_orders_gateway_order_id ON public.orders(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_legacy_revenue_model ON public.orders(legacy_revenue_model);
CREATE INDEX IF NOT EXISTS idx_store_reports_creator_id ON public.store_reports(creator_id);
CREATE INDEX IF NOT EXISTS idx_store_reports_status ON public.store_reports(status);
CREATE INDEX IF NOT EXISTS idx_grievance_tickets_status ON public.grievance_tickets(status);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_tier ON public.seller_verifications(tier);

-- 5) RLS + permissive service-role policies
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grievance_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on payment_accounts" ON public.payment_accounts;
CREATE POLICY "Service role full access on payment_accounts"
  ON public.payment_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Creators can view own payment accounts" ON public.payment_accounts;
CREATE POLICY "Creators can view own payment accounts"
  ON public.payment_accounts FOR SELECT
  USING (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access on payment_events" ON public.payment_events;
CREATE POLICY "Service role full access on payment_events"
  ON public.payment_events FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on store_reports" ON public.store_reports;
CREATE POLICY "Service role full access on store_reports"
  ON public.store_reports FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on seller_verifications" ON public.seller_verifications;
CREATE POLICY "Service role full access on seller_verifications"
  ON public.seller_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on grievance_tickets" ON public.grievance_tickets;
CREATE POLICY "Service role full access on grievance_tickets"
  ON public.grievance_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);
