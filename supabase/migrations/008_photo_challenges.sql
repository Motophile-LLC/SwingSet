-- SwingSet Migration 008: Mad-Lib Photo Challenges & Live Downtime Story Reel

create table if not exists public.event_photo_submissions (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  story_id text not null,
  slot_index int not null,
  slot_prompt text not null,
  story_caption text not null,
  image_data_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_photo_submissions_event_status
  on public.event_photo_submissions (event_id, status, created_at);

alter table public.event_photo_submissions enable row level security;

drop policy if exists "Event participants view approved or own photos" on public.event_photo_submissions;
create policy "Event participants view approved or own photos"
  on public.event_photo_submissions for select
  using (
    status = 'approved'
    or user_id = auth.uid()
    or public.is_event_host(event_id)
  );

drop policy if exists "Attendees submit own challenge photos" on public.event_photo_submissions;
create policy "Attendees submit own challenge photos"
  on public.event_photo_submissions for insert
  with check (
    user_id = auth.uid()
    and (public.is_active_attendee(event_id) or public.is_event_host(event_id))
  );

drop policy if exists "Hosts moderate challenge photos" on public.event_photo_submissions;
create policy "Hosts moderate challenge photos"
  on public.event_photo_submissions for update
  using (public.is_event_host(event_id));
