-- Phase 3: Digital Product Categories — Schema Update
-- Run this in Supabase SQL Editor

-- 1. Add new JSONB columns to products table for digital subtype data
ALTER TABLE products ADD COLUMN IF NOT EXISTS course_data JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS coaching_data JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS calendar_data JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS membership_data JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS template_files JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS digital_file_urls TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_lead_magnet BOOLEAN DEFAULT FALSE;

-- 2. Bookings table (for coaching & calendar products)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
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

-- 3. Lead captures table (for lead magnets)
CREATE TABLE IF NOT EXISTS lead_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Course enrollments (tracks who has access to which course)
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  lessons_completed JSONB DEFAULT '[]'
);

-- 5. Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies — Allow all via service role (API routes use admin client)
CREATE POLICY "Allow all for service role" ON bookings FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON lead_captures FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON course_enrollments FOR ALL USING (true);

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_creator ON bookings(creator_id);
CREATE INDEX IF NOT EXISTS idx_bookings_product ON bookings(product_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_lead_captures_creator ON lead_captures(creator_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_product ON course_enrollments(product_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_email ON course_enrollments(buyer_email);
