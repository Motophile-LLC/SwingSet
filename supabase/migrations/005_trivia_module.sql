-- SwingSet Migration 005: Trivia Q&A Database, Teams (Captain Consensus), & Scoring

create table if not exists public.trivia_questions (
  id uuid primary key default uuid_generate_v4(),
  set_code text not null default 'vol_1',
  status text not null default 'active' check (status in ('active', 'archived', 'draft')),
  genre text not null,
  question text not null,
  options jsonb not null,
  correct_index int not null check (correct_index >= 0 and correct_index <= 3),
  points int not null default 100,
  is_custom boolean not null default false,
  last_rotated_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_trivia_questions_active_genre
  on public.trivia_questions (status, genre)
  where status = 'active';

create table if not exists public.trivia_teams (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  captain_user_id uuid not null references public.profiles(id) on delete cascade,
  score int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.trivia_team_members (
  team_id uuid not null references public.trivia_teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  primary key (team_id, user_id)
);

create table if not exists public.trivia_submissions (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  question_id text not null,
  team_id uuid references public.trivia_teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  selected_index int not null check (selected_index >= 0 and selected_index <= 3),
  is_final_team_answer boolean not null default false,
  is_correct boolean not null default false,
  points_awarded int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.trivia_questions enable row level security;
alter table public.trivia_teams enable row level security;
alter table public.trivia_team_members enable row level security;
alter table public.trivia_submissions enable row level security;

drop policy if exists "Anyone authenticated reads curated trivia" on public.trivia_questions;
create policy "Anyone authenticated reads curated trivia"
  on public.trivia_questions for select
  using ((is_custom = false and status = 'active') or created_by = auth.uid());

drop policy if exists "Hosts create custom trivia" on public.trivia_questions;
create policy "Hosts create custom trivia"
  on public.trivia_questions for insert
  with check (created_by = auth.uid());

drop policy if exists "Event participants manage trivia teams" on public.trivia_teams;
create policy "Event participants manage trivia teams"
  on public.trivia_teams for all
  using (public.is_active_attendee(event_id) or public.is_event_host(event_id));

drop policy if exists "Event participants manage team members" on public.trivia_team_members;
create policy "Event participants manage team members"
  on public.trivia_team_members for all
  using (true);

drop policy if exists "Event participants manage trivia submissions" on public.trivia_submissions;
create policy "Event participants manage trivia submissions"
  on public.trivia_submissions for all
  using (public.is_active_attendee(event_id) or public.is_event_host(event_id));
