-- SwingSet Migration 004: Public Events for Nearby Discovery, Categories & Host Tiers

alter table public.events
  add column if not exists is_public boolean not null default false,
  add column if not exists category text not null default 'Social Mixer',
  add column if not exists venue_name text,
  add column if not exists venue_address text,
  add column if not exists host_tier text not null default 'tier_1',
  add column if not exists is_multi_location boolean not null default false;

create index if not exists idx_events_public_active
  on public.events (is_public, status, starts_at)
  where is_public = true and status = 'active';

drop policy if exists "Public active events visible in Nearby" on public.events;
create policy "Public active events visible in Nearby"
  on public.events for select
  using (is_public = true and status = 'active');
