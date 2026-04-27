create extension if not exists pgcrypto;

create table if not exists public.internal_outreach_leads (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  platform text not null default 'instagram' check (platform in ('instagram')),
  handle text not null,
  display_name text null,
  profile_url text null,
  niche text null,
  audience_region text not null default 'mixed' check (audience_region in ('india', 'mixed', 'global')),
  follower_count integer null check (follower_count is null or follower_count >= 0),
  average_reel_views integer null check (average_reel_views is null or average_reel_views >= 0),
  status text not null default 'new' check (status in ('new', 'shortlisted', 'contacted', 'replied', 'interested', 'won', 'lost', 'ignored')),
  tier text not null default 'possible' check (tier in ('ideal', 'strong', 'possible', 'low')),
  score integer not null default 0 check (score >= 0 and score <= 100),
  pitch_angles text[] not null default array[]::text[],
  reasons text[] not null default array[]::text[],
  notes text null,
  last_contacted_at timestamptz null,
  signals jsonb not null default '{}'::jsonb,
  scoring_breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_internal_outreach_leads_owner_platform_handle
  on public.internal_outreach_leads (owner_user_id, platform, lower(handle));

create index if not exists idx_internal_outreach_leads_owner_score
  on public.internal_outreach_leads (owner_user_id, score desc, created_at desc);

create index if not exists idx_internal_outreach_leads_owner_status
  on public.internal_outreach_leads (owner_user_id, status, created_at desc);

alter table public.internal_outreach_leads enable row level security;

drop policy if exists "internal_outreach_leads_owner_all" on public.internal_outreach_leads;
create policy "internal_outreach_leads_owner_all"
on public.internal_outreach_leads
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());
