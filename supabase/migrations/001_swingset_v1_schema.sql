-- SwingSet v1 Database Schema & Row-Level Security
-- Stack: Supabase (PostgreSQL + Auth + Realtime)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. ENUMS
-- ==========================================
create type event_status as enum ('draft', 'scheduled', 'active', 'ended');
create type host_role as enum ('owner', 'co_host');
create type block_type as enum ('activity', 'travel_transition', 'couple_reconnect');
create type block_state as enum (
  'planned',
  'announced',
  'active',
  'paused',
  'ended',
  'skipped',
  'ended_early'
);
create type audience_bucket as enum ('everyone', 'singles', 'couples', 'groups');
create type attendee_bucket_type as enum ('single', 'couple', 'group');
create type exchange_status as enum ('pending', 'accepted', 'declined');

-- ==========================================
-- 2. USER PROFILES (Base Account & Contact Vault)
-- ==========================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  default_display_name text not null,
  bucket_type attendee_bucket_type not null default 'single',
  bio_tagline text,
  -- Contact Vault (Strictly private until mutual exchange accepted)
  contact_phone text,
  contact_email text,
  contact_instagram text,
  contact_club_account text,
  contact_sls text,
  -- Up to 4 custom-labeled fields: [{"label": "Telegram", "value": "@handle"}, ...]
  contact_custom_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint max_four_custom_fields check (jsonb_array_length(contact_custom_fields) <= 4)
);

-- ==========================================
-- 3. EVENTS & VENUES (Timeline-First Model)
-- ==========================================
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text,
  dress_code text,
  event_rules text,
  is_lifestyle boolean not null default false,
  status event_status not null default 'draft',
  invite_code text unique not null,
  checkin_pin_6 char(6) not null,
  checkin_nfc_tag_id text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_hosts (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role host_role not null default 'co_host',
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);

create table public.event_venues (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  sort_order int not null default 0,
  name text not null,
  address text,
  notes text,
  checkin_pin_6 char(6),
  checkin_nfc_tag_id text,
  created_at timestamptz not null default now()
);

create table public.timeline_blocks (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  venue_id uuid references public.event_venues(id) on delete set null,
  sort_order int not null default 0,
  type block_type not null default 'activity',
  state block_state not null default 'planned',
  title text not null,
  target_bucket audience_bucket not null default 'everyone',
  -- Game / Activity Config (e.g., skin_id, scramble_min_sec, scramble_max_sec, mingle_sec, promo_text)
  config jsonb not null default '{}'::jsonb,
  scheduled_start timestamptz,
  duration_minutes int not null default 15,
  -- Host Learning Loop
  host_rating int check (host_rating between 1 and 3), -- 1: Skip Next Time, 2: Mixed, 3: Worked Great
  host_feedback_note text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- ==========================================
-- 4. EVENT ATTENDEES (Ephemeral Event-Day State)
-- ==========================================
create table public.event_attendees (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  bucket_type attendee_bucket_type not null default 'single',
  -- Event-day photo required at check-in; profiles go dormant when event ends
  event_photo_url text,
  is_checked_in boolean not null default false,
  checked_in_at timestamptz,
  current_venue_id uuid references public.event_venues(id) on delete set null,
  -- Snapshot of permitted contact keys for this specific event: ["phone", "instagram", "sls", "custom_0"]
  shared_field_keys jsonb not null default '[]'::jsonb,
  -- Emergency host moderation removal (requires 2-step UI confirmation)
  is_removed boolean not null default false,
  removed_at timestamptz,
  removed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);

-- ==========================================
-- 5. TAPS TONIGHT & MUTUAL CONTACT EXCHANGE
-- ==========================================
create table public.event_taps (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  venue_id uuid references public.event_venues(id) on delete set null,
  block_id uuid references public.timeline_blocks(id) on delete set null,
  -- Always store smaller UUID in attendee_a_id to prevent duplicate mirror rows
  attendee_a_id uuid not null references public.event_attendees(id) on delete cascade,
  attendee_b_id uuid not null references public.event_attendees(id) on delete cascade,
  interaction_context text not null, -- e.g. 'Matched in Fuse & Spark'
  verification_method text not null check (verification_method in ('nfc', 'ble_code', 'ble_auto_pair')),
  tapped_at timestamptz not null default now(),
  constraint distinct_attendees check (attendee_a_id <> attendee_b_id),
  unique(event_id, block_id, attendee_a_id, attendee_b_id)
);

create table public.contact_exchanges (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  requester_user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  status exchange_status not null default 'pending',
  -- Snapshot of permitted fields unlocked upon acceptance (persists in permanent address book)
  requester_unlocked_data jsonb,
  recipient_unlocked_data jsonb,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  unique(event_id, requester_user_id, recipient_user_id)
);

-- ==========================================
-- 6. ROW LEVEL SECURITY (Zero Global Directory)
-- ==========================================
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_hosts enable row level security;
alter table public.event_venues enable row level security;
alter table public.timeline_blocks enable row level security;
alter table public.event_attendees enable row level security;
alter table public.event_taps enable row level security;
alter table public.contact_exchanges enable row level security;

-- Helper: Check if user is host of an event
create or replace function public.is_event_host(p_event_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.event_hosts
    where event_id = p_event_id and user_id = auth.uid()
  );
$$;

-- Helper: Check if user is an active (non-removed) attendee of an event
create or replace function public.is_active_attendee(p_event_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.event_attendees
    where event_id = p_event_id and user_id = auth.uid() and is_removed = false
  );
$$;

-- PROFILES: Users can only read/edit their own profile (no public profile search)
create policy "Users manage own profile"
  on public.profiles for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- EVENTS: Visible to hosts and invited/checked-in attendees
create policy "Hosts manage own events"
  on public.events for all
  using (public.is_event_host(id) or owner_id = auth.uid());

create policy "Attendees view invited events"
  on public.events for select
  using (public.is_active_attendee(id));

-- EVENT HOSTS
create policy "Hosts view event hosts"
  on public.event_hosts for select
  using (public.is_event_host(event_id));

create policy "Owner manages co-hosts"
  on public.event_hosts for all
  using (exists (select 1 from public.events where id = event_id and owner_id = auth.uid()));

-- VENUES & TIMELINE BLOCKS
create policy "Hosts manage venues"
  on public.event_venues for all
  using (public.is_event_host(event_id));

create policy "Attendees view venues"
  on public.event_venues for select
  using (public.is_active_attendee(event_id));

create policy "Hosts manage timeline blocks"
  on public.timeline_blocks for all
  using (public.is_event_host(event_id));

create policy "Attendees view timeline blocks"
  on public.timeline_blocks for select
  using (public.is_active_attendee(event_id));

-- EVENT ATTENDEES:
-- Attendees can read their own row, hosts can read/manage all rows,
-- and attendees can ONLY read another attendee if they have a verified Tap together!
create policy "Hosts manage event attendees"
  on public.event_attendees for all
  using (public.is_event_host(event_id));

create policy "Attendees manage own check-in row"
  on public.event_attendees for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Attendees view tapped connections only"
  on public.event_attendees for select
  using (
    exists (
      select 1 from public.event_taps t
      join public.event_attendees me on me.event_id = t.event_id and me.user_id = auth.uid()
      where (t.attendee_a_id = me.id and t.attendee_b_id = event_attendees.id)
         or (t.attendee_b_id = me.id and t.attendee_a_id = event_attendees.id)
    )
  );

-- EVENT TAPS: Only participants in the tap (or event hosts) can view
create policy "Attendees view own taps"
  on public.event_taps for select
  using (
    exists (
      select 1 from public.event_attendees me
      where me.user_id = auth.uid()
        and (me.id = event_taps.attendee_a_id or me.id = event_taps.attendee_b_id)
    )
  );

create policy "Attendees insert verified taps"
  on public.event_taps for insert
  with check (
    exists (
      select 1 from public.event_attendees me
      where me.user_id = auth.uid()
        and me.is_removed = false
        and (me.id = event_taps.attendee_a_id or me.id = event_taps.attendee_b_id)
    )
  );

-- CONTACT EXCHANGES: Strictly requester and recipient
create policy "Users view own contact exchanges"
  on public.contact_exchanges for select
  using (requester_user_id = auth.uid() or recipient_user_id = auth.uid());

create policy "Users request contact exchange"
  on public.contact_exchanges for insert
  with check (requester_user_id = auth.uid());

create policy "Recipients respond to contact exchange"
  on public.contact_exchanges for update
  using (recipient_user_id = auth.uid());

-- Enable Realtime on live operational tables
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.timeline_blocks;
alter publication supabase_realtime add table public.event_attendees;
alter publication supabase_realtime add table public.contact_exchanges;