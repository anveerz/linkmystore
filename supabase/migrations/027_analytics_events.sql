-- Phase 4 analytics events for funnel conversion + traffic attribution.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  event_type text not null check (event_type in ('store_view', 'product_view', 'checkout_start', 'purchase')),
  product_id uuid null references public.products(id) on delete set null,
  order_id uuid null references public.orders(id) on delete set null,
  visitor_id text null,
  session_id text null,
  source text null,
  medium text null,
  campaign text null,
  referrer text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_creator_created
  on public.analytics_events (creator_id, created_at desc);

create index if not exists idx_analytics_events_creator_type_created
  on public.analytics_events (creator_id, event_type, created_at desc);

create index if not exists idx_analytics_events_order
  on public.analytics_events (order_id);

alter table public.analytics_events enable row level security;

-- Creators can read only their own analytics.
drop policy if exists "analytics_events_creator_read" on public.analytics_events;
create policy "analytics_events_creator_read"
on public.analytics_events
for select
using (
  creator_id in (
    select id from public.creators where user_id = auth.uid()
  )
);

-- Public tracking endpoint inserts via service role (bypasses RLS).
-- Optional: authenticated creator inserts (for internal tools) are allowed.
drop policy if exists "analytics_events_creator_insert" on public.analytics_events;
create policy "analytics_events_creator_insert"
on public.analytics_events
for insert
with check (
  creator_id in (
    select id from public.creators where user_id = auth.uid()
  )
);
