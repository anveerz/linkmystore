# LinkMyStore — Project Instructions

> **Paste this file into any AI coding assistant (Cline, Claude Code, Cursor, ChatGPT) to give it full project context.**
> Last updated: February 2026

---

## 1. What Is This?

LinkMyStore (linkmystore.in) is a storefront builder for Indian Instagram sellers. Creators get a single link (linkmystore.in/storename) they put in their Instagram bio. Their followers visit, browse products, pay via UPI (Razorpay), and the creator gets notified on WhatsApp. Weekly payouts to creator's bank account after 4% platform commission.

We are NOT a marketplace. We don't bring buyers. Creators bring their own audience from Instagram. We provide the infrastructure: catalogue + checkout + order notifications + payouts.

**One-line pitch:** "Shopify for Indian Instagram sellers — set up in 5 minutes, get paid via UPI."

---

## 2. Tech Stack

| Component       | Technology                                          |
| --------------- | --------------------------------------------------- |
| Framework       | Next.js 14 (App Router) + TypeScript                |
| Styling         | Tailwind CSS                                        |
| Database        | Supabase (PostgreSQL) with Row Level Security (RLS) |
| Auth            | Supabase Auth (Phone OTP via MSG91 or Twilio)       |
| File Storage    | Supabase Storage (product images + digital files)   |
| Payments        | Razorpay Payment Gateway                            |
| Payouts         | Manual bank transfer for MVP (RazorpayX later)      |
| Notifications   | WhatsApp Business API (Interakt/Wati) + SMS backup  |
| Hosting         | Vercel (frontend) + Supabase (backend)              |
| Analytics       | PostHog (free tier)                                 |
| Package Manager | pnpm (preferred) or npm                             |

---

## 3. Folder Structure

```
linkmystore/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx            # Phone OTP login
│   │   └── onboarding/page.tsx       # Store setup wizard
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx        # Creator home — stats, earnings
│   │   ├── products/page.tsx         # Product list (CRUD)
│   │   ├── products/new/page.tsx     # Add product form
│   │   ├── products/[id]/page.tsx    # Edit product
│   │   ├── orders/page.tsx           # Order list with status
│   │   ├── orders/[id]/page.tsx      # Order detail + update status
│   │   ├── payouts/page.tsx          # Payout history
│   │   └── settings/page.tsx         # Store settings, bank details, theme
│   ├── (public)/
│   │   └── [slug]/
│   │       ├── page.tsx              # Public storefront page
│   │       └── [productId]/page.tsx  # Product detail + buy now
│   ├── checkout/
│   │   ├── [orderId]/page.tsx        # Checkout form (name, phone, address)
│   │   └── success/page.tsx          # Order confirmation
│   ├── api/
│   │   ├── auth/
│   │   │   ├── otp-send/route.ts
│   │   │   └── otp-verify/route.ts
│   │   ├── products/route.ts         # CRUD
│   │   ├── products/[id]/route.ts
│   │   ├── store/[slug]/route.ts     # Public store data
│   │   ├── checkout/
│   │   │   ├── create-order/route.ts # Create Razorpay order
│   │   │   └── verify-payment/route.ts
│   │   ├── webhooks/
│   │   │   └── razorpay/route.ts     # Payment status webhook
│   │   ├── orders/route.ts
│   │   ├── orders/[id]/ship/route.ts
│   │   ├── dashboard/stats/route.ts
│   │   └── payouts/route.ts
│   ├── layout.tsx
│   ├── page.tsx                       # Landing page (marketing)
│   └── globals.css
├── components/
│   ├── ui/                            # Reusable UI (button, input, card, modal)
│   ├── storefront/                    # Public store components
│   ├── dashboard/                     # Dashboard components
│   └── checkout/                      # Checkout components
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  # Browser client
│   │   ├── server.ts                  # Server client
│   │   └── admin.ts                   # Service role client (for webhooks)
│   ├── razorpay.ts                    # Razorpay SDK init + helpers
│   ├── whatsapp.ts                    # WhatsApp API helper
│   ├── sms.ts                         # SMS helper
│   ├── utils.ts                       # General utilities
│   └── constants.ts                   # Platform fee %, limits, etc.
├── types/
│   └── index.ts                       # All TypeScript interfaces
├── public/
├── middleware.ts                       # Auth redirect middleware
├── INSTRUCTIONS.md                    # THIS FILE
├── .env.local                         # Environment variables
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Database Schema

### 4.1 `creators` table

```sql
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  store_slug TEXT UNIQUE NOT NULL,          -- URL identifier: linkmystore.in/store_slug
  store_name TEXT NOT NULL,
  bio TEXT,                                 -- max 200 chars
  profile_image_url TEXT,
  instagram_handle TEXT,
  bank_account JSONB,                       -- { account_number, ifsc, name, upi_id }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast slug lookups (public storefront)
CREATE UNIQUE INDEX idx_creators_slug ON creators(store_slug);
```

### 4.2 `products` table

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,                   -- Price in PAISA (₹500 = 50000)
  compare_price INTEGER,                    -- Strikethrough price in paisa
  type TEXT NOT NULL CHECK (type IN ('physical', 'digital')),
  images TEXT[] DEFAULT '{}',               -- Array of Supabase Storage URLs
  variants JSONB DEFAULT '[]',              -- [{ name: "Red / M", price: 50000, stock: null }]
  digital_file_url TEXT,                    -- Supabase Storage URL for digital product
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_creator ON products(creator_id);
```

### 4.3 `orders` table

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,        -- Human readable: LMS-20260224-001
  creator_id UUID REFERENCES creators(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  variant JSONB,                            -- Selected variant details
  quantity INTEGER DEFAULT 1,
  
  -- Buyer info (guest checkout, no account needed)
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  buyer_email TEXT,
  shipping_address JSONB,                   -- { line1, line2, city, state, pincode }
  
  -- Payment
  amount INTEGER NOT NULL,                  -- Total in paisa
  platform_fee INTEGER NOT NULL,            -- 4% in paisa
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  
  -- Fulfillment
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'shipped', 'delivered', 'cancelled')),
  tracking_number TEXT,
  tracking_url TEXT,
  
  -- Digital delivery
  digital_download_url TEXT,                -- Signed URL for digital products
  digital_downloaded BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_creator ON orders(creator_id);
CREATE INDEX idx_orders_status ON orders(status);
```

### 4.4 `payouts` table

```sql
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES creators(id) NOT NULL,
  amount INTEGER NOT NULL,                  -- In paisa
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  order_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  razorpay_payout_id TEXT,                  -- For RazorpayX (future)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.5 `store_settings` table

```sql
CREATE TABLE store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE UNIQUE NOT NULL,
  theme TEXT DEFAULT 'default',             -- 'default', 'minimal', 'bold', 'elegant', 'dark'
  accent_color TEXT DEFAULT '#FF6B35',      -- Hex color
  social_links JSONB DEFAULT '{}',          -- { instagram, youtube, whatsapp, website }
  announcement_text TEXT,                   -- Top banner text
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.6 Row Level Security (RLS) Policies

```sql
-- Creators can only read/update their own row
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creators_own" ON creators FOR ALL USING (user_id = auth.uid());
-- Public can read creator by slug (for storefront)
CREATE POLICY "creators_public_read" ON creators FOR SELECT USING (is_active = true);

-- Products: creator manages own, public reads active
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_own" ON products FOR ALL USING (
  creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
);
CREATE POLICY "products_public_read" ON products FOR SELECT USING (is_active = true);

-- Orders: creator reads own orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_own" ON orders FOR ALL USING (
  creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
);
-- Orders can be INSERTED by anyone (guest checkout via service role)

-- Payouts: creator reads own
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts_own" ON payouts FOR SELECT USING (
  creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
);

-- Store settings: creator manages own, public reads
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_own" ON store_settings FOR ALL USING (
  creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
);
CREATE POLICY "settings_public_read" ON store_settings FOR SELECT USING (true);
```

---

## 5. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxx

# WhatsApp (Interakt or Wati)
WHATSAPP_API_KEY=xxx
WHATSAPP_API_URL=https://api.interakt.ai/v1

# SMS (MSG91)
MSG91_AUTH_KEY=xxx
MSG91_SENDER_ID=LNKMYS
MSG91_OTP_TEMPLATE_ID=xxx

# App
NEXT_PUBLIC_APP_URL=https://linkmystore.in
PLATFORM_FEE_PERCENT=4
```

---

## 6. API Routes Reference

| Method | Route                          | Auth     | Purpose                                  |
| ------ | ------------------------------ | -------- | ---------------------------------------- |
| POST   | /api/auth/otp-send             | Public   | Send OTP to phone number                 |
| POST   | /api/auth/otp-verify           | Public   | Verify OTP, create/login user            |
| GET    | /api/store/[slug]              | Public   | Get store + products for public page     |
| GET    | /api/products                  | Creator  | List creator's products                  |
| POST   | /api/products                  | Creator  | Create product                           |
| PUT    | /api/products/[id]             | Creator  | Update product                           |
| DELETE | /api/products/[id]             | Creator  | Delete product                           |
| POST   | /api/checkout/create-order     | Public   | Create Razorpay order for product        |
| POST   | /api/checkout/verify-payment   | Public   | Verify Razorpay payment signature        |
| POST   | /api/webhooks/razorpay         | Webhook  | Razorpay payment status callback         |
| GET    | /api/orders                    | Creator  | List creator's orders                    |
| GET    | /api/orders/[id]               | Creator  | Get single order details                 |
| POST   | /api/orders/[id]/ship          | Creator  | Mark as shipped + notify buyer           |
| GET    | /api/dashboard/stats           | Creator  | Sales stats (total sales, orders, etc.)  |
| GET    | /api/payouts                   | Creator  | Payout history                           |
| PUT    | /api/settings                  | Creator  | Update store settings/theme              |
| PUT    | /api/settings/bank             | Creator  | Update bank/UPI details                  |

---

## 7. MVP Features (Build in This Order)

### Phase 1 — Week 1-2: Foundation
- [x] Next.js + Supabase + Tailwind project setup
- [ ] Database schema + RLS policies in Supabase
- [ ] Phone OTP auth flow (Supabase Auth)
- [ ] Creator onboarding wizard: choose slug → store name → bio → profile photo
- [ ] Product CRUD: create, edit, delete, toggle active/inactive
- [ ] Image upload to Supabase Storage with client-side compression (max 1200px, WebP)
- [ ] Dashboard layout with sidebar navigation

### Phase 2 — Week 3-4: Storefront & Checkout
- [ ] Public storefront page at /[slug] — mobile-first, product grid
- [ ] Product detail page — image gallery, variants, description, Buy Now button
- [ ] Checkout form — guest checkout (name, phone, address for physical, email for digital)
- [ ] Razorpay integration — create order → open checkout → verify payment
- [ ] Order creation on successful payment
- [ ] Digital product: generate signed download URL after payment
- [ ] WhatsApp notification to creator on new order

### Phase 3 — Week 5: Dashboard & Orders
- [ ] Creator dashboard: total sales, orders, earnings, pending payout
- [ ] Orders page: list all orders, filter by status
- [ ] Order detail: view buyer info, update status, add tracking number
- [ ] Buyer notification when order is shipped (WhatsApp/SMS)
- [ ] Bank account / UPI ID setup
- [ ] Payout history page

### Phase 4 — Week 6: Polish & Launch
- [ ] Performance: image lazy loading, Next.js Image optimization, caching
- [ ] SEO: meta tags, Open Graph images for storefront pages
- [ ] Mobile testing across devices
- [ ] Landing page at / (marketing page to attract creators)
- [ ] Error handling, loading states, empty states
- [ ] Onboard first 10-20 beta creators

---

## 8. Key Business Rules

```typescript
// lib/constants.ts
export const PLATFORM_FEE_PERCENT = 4;        // 4% platform commission
export const RAZORPAY_FEE_PERCENT = 2;        // ~2% Razorpay charges
export const FREE_PRODUCT_LIMIT = 10;         // Max products on free tier
export const MAX_IMAGES_PER_PRODUCT = 5;
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_DIGITAL_FILE_SIZE_MB = 100;
export const MIN_PAYOUT_AMOUNT = 10000;       // ₹100 in paisa
export const PAYOUT_DAY = 'Monday';           // Weekly payouts
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
```

---

## 9. Payment Flow (Critical)

```
1. Buyer clicks "Buy Now" on product page
2. Buyer fills checkout form (name, phone, address)
3. Frontend calls POST /api/checkout/create-order
   → Server creates Razorpay order via Razorpay API
   → Server returns razorpay_order_id to frontend
4. Frontend opens Razorpay checkout popup (UPI shown first)
5. Buyer pays via UPI/Card/Netbanking
6. Razorpay returns payment response to frontend
7. Frontend calls POST /api/checkout/verify-payment
   → Server verifies Razorpay signature (CRITICAL SECURITY)
   → Server creates order in DB with payment details
   → Server calculates platform_fee (4% of amount)
   → If digital: generates signed download URL
   → Sends WhatsApp notification to creator
8. Buyer sees order confirmation page
9. Razorpay also sends webhook to /api/webhooks/razorpay (backup verification)

MONEY FLOW: All money goes to OUR Razorpay account.
Weekly: Calculate each creator's earnings, deduct 4%, bank transfer remaining.
MVP: Manual bank transfers. Phase 2: RazorpayX automated payouts.
```

---

## 10. Design Rules

- **Mobile-first**: Design for 375px width first. 90%+ users on mobile.
- **Page speed**: Storefront must load < 2 seconds on 4G. Use Next.js Image, lazy loading, minimal JS.
- **UPI-first**: In Razorpay checkout, UPI should be the primary/first payment option.
- **No buyer accounts**: Guest checkout only. Never ask buyer to create an account.
- **Indian aesthetic**: Clean, card-based layout. Think Instagram, not Shopify.
- **Font**: Use system fonts or Inter. No heavy custom fonts.
- **Colors**: Orange (#FF6B35) as primary brand color. Customizable per store via accent_color.
- **Empty states**: Always show helpful empty states ("No products yet. Add your first product!")
- **Loading states**: Skeleton loaders, not spinners.
- **Error handling**: Toast notifications (sonner or react-hot-toast). User-friendly error messages.
- **Currency**: Always display as ₹XXX (not paisa). Store in paisa internally, convert for display.

---

## 11. Key TypeScript Types

```typescript
// types/index.ts
export interface Creator {
  id: string;
  user_id: string;
  phone: string;
  email?: string;
  store_slug: string;
  store_name: string;
  bio?: string;
  profile_image_url?: string;
  instagram_handle?: string;
  bank_account?: BankAccount;
  is_active: boolean;
  created_at: string;
}

export interface BankAccount {
  account_number?: string;
  ifsc?: string;
  account_name?: string;
  upi_id?: string;
}

export interface Product {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  price: number;              // In paisa
  compare_price?: number;     // In paisa
  type: 'physical' | 'digital';
  images: string[];
  variants: Variant[];
  digital_file_url?: string;
  category?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Variant {
  name: string;               // "Red / M" or "Large"
  price?: number;             // Override price in paisa (null = use product price)
  stock?: number;             // null = unlimited
}

export interface Order {
  id: string;
  order_number: string;
  creator_id: string;
  product_id: string;
  variant?: Variant;
  quantity: number;
  buyer_name: string;
  buyer_phone: string;
  buyer_email?: string;
  shipping_address?: ShippingAddress;
  amount: number;             // In paisa
  platform_fee: number;       // In paisa
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  status: 'new' | 'shipped' | 'delivered' | 'cancelled';
  tracking_number?: string;
  tracking_url?: string;
  digital_download_url?: string;
  digital_downloaded: boolean;
  created_at: string;
}

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Payout {
  id: string;
  creator_id: string;
  amount: number;
  period_start: string;
  period_end: string;
  order_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface StoreSettings {
  id: string;
  creator_id: string;
  theme: 'default' | 'minimal' | 'bold' | 'elegant' | 'dark';
  accent_color: string;
  social_links: {
    instagram?: string;
    youtube?: string;
    whatsapp?: string;
    website?: string;
  };
  announcement_text?: string;
}

export interface DashboardStats {
  total_sales: number;        // In paisa
  total_orders: number;
  total_earnings: number;     // After platform fee, in paisa
  pending_payout: number;     // In paisa
  this_month_sales: number;
  this_month_orders: number;
}
```

---

## 12. NOT in MVP (Do NOT Build These)

- ❌ Pro/Business subscription plans
- ❌ Custom domains
- ❌ Course/video hosting
- ❌ Email marketing
- ❌ Regional languages (Hindi etc.)
- ❌ Discount codes / coupons
- ❌ Shipping integration (Shiprocket/Delhivery)
- ❌ Instagram DM automation
- ❌ Cart / multi-product checkout (single product Buy Now only)
- ❌ Reviews & ratings
- ❌ Advanced analytics
- ❌ Buyer accounts / login
- ❌ Search across stores (no marketplace)
- ❌ Admin panel (use Supabase dashboard directly for MVP)

---

## 13. Competitor Context

**BioStore.in** (direct competitor): Digital products only, 7.5% fee on free tier, Navi Mumbai. Does NOT support physical products, no order management, no WhatsApp notifications. Our edge: physical product support, lower 4% fee, WhatsApp order alerts, shipping status tracking.

Our positioning: "The complete selling system for Instagram sellers" — not just a link page, but catalogue + checkout + order management + payouts.

---

## 14. Quick Reference Commands

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Build
pnpm build

# Generate Supabase types (after schema changes)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts

# Deploy to Vercel
git push origin main  # Auto-deploys via Vercel Git integration
```

---

## 15. Development Guidelines

1. **Always use server components** where possible. Client components only for interactivity.
2. **All prices in paisa** internally. Display as ₹ with `(price / 100).toLocaleString('en-IN')`.
3. **Use Supabase service role** for webhook handlers and order creation (bypasses RLS).
4. **Use Supabase anon client** for authenticated creator operations (RLS enforced).
5. **Validate everything server-side**. Never trust client data for prices or fees.
6. **Image uploads**: Compress on client before upload. Max 1200px width, WebP format, < 500KB.
7. **Store slugs**: Lowercase, alphanumeric + hyphens only. Min 3 chars. Check uniqueness on creation.
8. **Order numbers**: Format `LMS-YYYYMMDD-XXX` (e.g., LMS-20260224-001). Auto-increment per day.
9. **Error messages**: User-friendly in English. Never expose technical details to users.
10. **Commit often**. Small, working increments. Deploy to Vercel after each feature is complete.
