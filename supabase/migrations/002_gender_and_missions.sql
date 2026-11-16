-- SwingSet Migration 002: Individual Gender & Match Preferences + Private Couple Check-Ins

-- 1. Create gender enum type
do $$
begin
  if not exists (select 1 from pg_type where typname = 'gender_type') then
    create type gender_type as enum ('man', 'woman', 'non_binary');
  end if;
end $$;

-- 2. Add gender and interested_in to profiles
alter table public.profiles
  add column if not exists gender gender_type not null default 'man',
  add column if not exists interested_in text[] not null default '{"everyone"}'::text[];

-- 3. Add gender and interested_in to event_attendees
alter table public.event_attendees
  add column if not exists gender gender_type not null default 'man',
  add column if not exists interested_in text[] not null default '{"everyone"}'::text[];

-- 4. Create couple_private_checkins table (100% private, strictly linked partners, 0 points)
create table if not exists public.couple_private_checkins (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  partner_user_id uuid references public.profiles(id) on delete cascade,
  note text,
  mood text,
  checked_in_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Enable RLS for couple_private_checkins
alter table public.couple_private_checkins enable row level security;

-- Policies: only the two linked partners can read/write their private check-ins
create policy "Partners view own private checkins"
  on public.couple_private_checkins for select
  using (user_id = auth.uid() or partner_user_id = auth.uid());

create policy "Partners insert own private checkins"
  on public.couple_private_checkins for insert
  with check (user_id = auth.uid());

-- Realtime for private couple checkins
alter publication supabase_realtime add table public.couple_private_checkins;
