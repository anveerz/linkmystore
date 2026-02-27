-- Migration: Ensure all required tables exist
-- Run this in Supabase SQL Editor if tables are missing

-- =========================
-- BOOKINGS TABLE (for coaching/calendar products)
-- =========================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  buyer_phone TEXT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no_show')),
  meeting_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- COURSE ENROLLMENTS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  lessons_completed JSONB DEFAULT '[]'::jsonb
);

-- =========================
-- LEAD CAPTURES TABLE
-- =========================
CREATE TABLE IF NOT EXISTS public.lead_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- ENABLE RLS
-- =========================
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_captures ENABLE ROW LEVEL SECURITY;

-- =========================
-- RLS POLICIES
-- =========================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all for service role" ON public.bookings;
DROP POLICY IF EXISTS "Allow all for service role" ON public.course_enrollments;
DROP POLICY IF EXISTS "Allow all for service role" ON public.lead_captures;

-- Create policies that allow service role (used by API routes) full access
CREATE POLICY "Allow all for service role" ON public.bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON public.course_enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON public.lead_captures FOR ALL USING (true) WITH CHECK (true);

-- =========================
-- INDEXES FOR PERFORMANCE
-- =========================
CREATE INDEX IF NOT EXISTS idx_bookings_creator ON public.bookings(creator_id);
CREATE INDEX IF NOT EXISTS idx_bookings_product ON public.bookings(product_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_order ON public.bookings(order_id);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_product ON public.course_enrollments(product_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_email ON public.course_enrollments(buyer_email);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_order ON public.course_enrollments(order_id);

CREATE INDEX IF NOT EXISTS idx_lead_captures_creator ON public.lead_captures(creator_id);
CREATE INDEX IF NOT EXISTS idx_lead_captures_product ON public.lead_captures(product_id);

-- =========================
-- ADD MISSING COLUMNS TO PRODUCTS TABLE (if not exist)
-- =========================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS course_data JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS coaching_data JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS calendar_data JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS membership_data JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS template_files JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS digital_file_urls TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_lead_magnet BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS digital_subtype TEXT;

-- =========================
-- ADD MISSING COLUMNS TO ORDERS TABLE (if not exist)
-- =========================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS digital_download_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS digital_downloaded BOOLEAN DEFAULT FALSE;

-- =========================
-- ENSURE ANALYTICS EVENTS TABLE EXISTS
-- =========================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  visitor_id TEXT,
  session_id TEXT,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  referrer TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service role" ON public.analytics_events;
CREATE POLICY "Allow all for service role" ON public.analytics_events FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_analytics_events_creator ON public.analytics_events(creator_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON public.analytics_events(created_at);