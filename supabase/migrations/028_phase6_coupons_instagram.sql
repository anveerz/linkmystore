-- Phase 6: Coupons + Instagram Auto-DM automation

create extension if not exists pgcrypto;

-- =========================
-- Coupons
-- =========================
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  code text not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  max_discount_amount integer null check (max_discount_amount is null or max_discount_amount > 0),
  min_order_amount integer null check (min_order_amount is null or min_order_amount >= 0),
  usage_limit integer null check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  starts_at timestamptz null,
  ends_at timestamptz null,
  applicable_product_ids uuid[] null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_coupons_creator_code
  on public.coupons (creator_id, lower(code));

create index if not exists idx_coupons_creator_active
  on public.coupons (creator_id, is_active, created_at desc);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid null references public.products(id) on delete set null,
  code text not null,
  discount_amount integer not null check (discount_amount >= 0),
  created_at timestamptz not null default now()
);

create unique index if not exists ux_coupon_redemptions_order
  on public.coupon_redemptions (order_id);

create index if not exists idx_coupon_redemptions_creator_created
  on public.coupon_redemptions (creator_id, created_at desc);

alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

drop policy if exists "coupons_creator_all" on public.coupons;
create policy "coupons_creator_all"
on public.coupons
for all
using (
  creator_id in (
    select id from public.creators where user_id = auth.uid()
  )
)
with check (
  creator_id in (
    select id from public.creators where user_id = auth.uid()
  )
);

drop policy if exists "coupon_redemptions_creator_read" on public.coupon_redemptions;
create policy "coupon_redemptions_creator_read"
on public.coupon_redemptions
for select
using (
  creator_id in (
    select id from public.creators where user_id = auth.uid()
  )
);

-- =========================
-- Instagram Auto-DM
-- =========================
create table if not exists public.instagram_automation_settings (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null unique references public.creators(id) on delete cascade,
  enabled boolean not null default false,
  ig_business_account_id text null,
  page_access_token text null,
  trigger_keywords text[] not null default array['link']::text[],
  dm_template text not null default 'Hey! Here is your link: {product_link}',
  default_product_id uuid null references public.products(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instagram_dm_logs (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  ig_business_account_id text null,
  recipient_id text null,
  trigger_text text null,
  sent_message text null,
  status text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  error_message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_instagram_dm_logs_creator_created
  on public.instagram_dm_logs (creator_id, created_at desc);

alter table public.instagram_automation_settings enable row level security;
alter table public.instagram_dm_logs enable row level security;

drop policy if exists "instagram_settings_creator_all" on public.instagram_automation_settings;
create policy "instagram_settings_creator_all"
on public.instagram_automation_settings
for all
using (
  creator_id in (
    select id from public.creators where user_id = auth.uid()
  )
)
with check (
  creator_id in (
    select id from public.creators where user_id = auth.uid()
  )
);

drop policy if exists "instagram_logs_creator_read" on public.instagram_dm_logs;
create policy "instagram_logs_creator_read"
on public.instagram_dm_logs
for select
using (
  creator_id in (
    select id from public.creators where user_id = auth.uid()
  )
);
