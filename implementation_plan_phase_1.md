# LinkMyStore Platform Overhaul — Phase 1 Implementation Plan

This is a **massively scoped** project to transform LinkMyStore from a basic MVP into a stan.store-level premium platform. Given the size, we'll execute in phases. **This plan covers Phase 1 — Quick Wins & Core UI Overhaul** which can be implemented now.

> [!IMPORTANT]
> **Full scope encompasses 6 phases.** This plan details Phase 1 only. Phases 2-6 (AI-powered products, digital product categories like coaching/courses/calendars, premium analytics, storefront redesign, Instagram auto-DMs) will require separate planning sessions.

## User Review Required

> [!WARNING]
> **Database schema changes needed.** Phase 1 requires adding `stock`, `full_name`, and `mobile_number` columns to Supabase tables. These ALTER TABLE statements must be run against your Supabase database.

> [!IMPORTANT]
> **Phase 1 scope decision:** Should I implement ALL of Phase 1 in this session, or would you prefer me to tackle a subset first? Phase 1 alone involves ~15 file changes.

---

## Proposed Changes

### 1. Database Schema Updates (Supabase SQL)

Add new columns for stock management, onboarding data, and reviews:

```sql
-- Add stock to products
ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT NULL; -- NULL = unlimited

-- Add full_name and mobile_number to creators
ALTER TABLE creators ADD COLUMN full_name TEXT;
ALTER TABLE creators ADD COLUMN mobile_number TEXT;

-- Create reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_reviews_product ON reviews(product_id);

-- RLS for reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (true);
```

---

### 2. TypeScript Types

#### [MODIFY] [index.ts](file:///d:/Anveeresh/linkmystore/types/index.ts)

- Add `stock?: number | null` to [Product](file:///d:/Anveeresh/linkmystore/types/index.ts#23-39) interface
- Add `full_name?: string` and `mobile_number?: string` to [Creator](file:///d:/Anveeresh/linkmystore/types/index.ts#1-15) interface
- Add new `Review` interface  
- Add `digital_subtype` field to [Product](file:///d:/Anveeresh/linkmystore/types/index.ts#23-39) for future digital product categories

---

### 3. Onboarding Flow Revamp

#### [MODIFY] [page.tsx](file:///d:/Anveeresh/linkmystore/app/(auth)/onboarding/page.tsx)

Current flow: Step 1 (Store Name + Slug) → Step 2 (Photo + Bio + Instagram) → Dashboard

**New flow:**
1. **Step 1:** Slug Name + Full Name + Mobile Number → CONTINUE
2. **Step 2:** Product Type Selection — Two large, beautiful, color-filled blocks:
   - Block 1: **Digital Product** (with description)
   - Block 2: **Physical Product** (with description)
3. Redirect to the appropriate product creation page

Slug field gets auto-generated but is editable. Full name and mobile are required fields.

---

### 4. Settings Page Fixes

#### [MODIFY] [page.tsx](file:///d:/Anveeresh/linkmystore/app/(dashboard)/dashboard/settings/page.tsx)

- **Remove** the Danger Zone section entirely (lines 669-686)
- Keep Store Profile, Bank Details, Appearance, and Social Links sections

---

### 5. Dashboard Sidebar — Bank Account Button

#### [MODIFY] [layout.tsx](file:///d:/Anveeresh/linkmystore/app/(dashboard)/layout.tsx)

- Add new `Landmark` (bank) icon nav item to sidebar: **"Bank & Payments"** linking to `/dashboard/settings#bank`
- This provides quick, prominent access to bank/UPI settings

---

### 6. Product Stock Management

#### [MODIFY] [page.tsx](file:///d:/Anveeresh/linkmystore/app/(dashboard)/dashboard/products/new/page.tsx)

Add a **Stock Quantity** input field to the product creation form:
- Optional number field (empty = unlimited stock)
- Saves to the new `stock` column

#### [MODIFY] [page.tsx](file:///d:/Anveeresh/linkmystore/app/(dashboard)/dashboard/products/page.tsx) (products list)

- Show stock count per product with color coding (red if ≤5)
- Display shareable product link (miniaturized) with copy button for each product
- Add visibility toggle (eye icon) to show/hide products from store

---

### 7. Storefront Enhancements

#### [MODIFY] [page.tsx](file:///d:/Anveeresh/linkmystore/app/[slug]/page.tsx)

- Add **"Only X left!"** badge when stock ≤ 5
- Display product star ratings (query from reviews table)
- Improve the store header with better logo visibility
- Add subtle animations and premium feel

---

### 8. Landing Page Logo Fix

#### [MODIFY] [page.tsx](file:///d:/Anveeresh/linkmystore/app/page.tsx)

- Ensure the store logo is clearly visible (check contrast and sizing)

---

### 9. Premium CSS / Design Overhaul

#### [MODIFY] [globals.css](file:///d:/Anveeresh/linkmystore/app/globals.css)

- Add glassmorphism utility classes
- Add premium gradient backgrounds
- Enhance card styles with subtle depth
- Add micro-animation classes (pulse, shimmer, slide-in)
- Add premium button variants
- Improve overall visual polish

---

### 10. Checkout Stock Decrement

#### [MODIFY] [route.ts](file:///d:/Anveeresh/linkmystore/app/api/checkout/verify-payment/route.ts)

- After successful payment, decrement `stock` by `quantity` ordered
- If stock reaches 0, optionally deactivate the product

---

## Verification Plan

### Build Check
```bash
cd d:\Anveeresh\linkmystore && pnpm build
```
The build must complete without errors.

### Browser Testing (Manual)

1. **Settings Page**: Navigate to `/dashboard/settings` and verify the Danger Zone section is gone
2. **Onboarding Flow**: Create a new account and verify:
   - Step 1 shows: Slug, Full Name, Mobile fields
   - Step 2 shows: Digital Product / Physical Product selection blocks
3. **Sidebar**: Verify "Bank & Payments" button appears in the dashboard sidebar
4. **Products Page**: Check that each product shows a shareable link and visibility toggle
5. **Product Creation**: Verify the stock quantity field appears in the add product form
6. **Storefront**: Visit a store page and check for "Only X left" badges on low-stock items
7. **Landing Page**: Verify the logo is clearly visible with proper contrast

### Automated
No existing test suite was found in the project. Verification will be done via `pnpm build` (type checking) and manual browser testing.
