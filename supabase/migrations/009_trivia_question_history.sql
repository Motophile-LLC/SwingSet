-- SwingSet Migration 009: Track Used Trivia Questions by Host & Venue

create table if not exists public.trivia_question_history (
  id uuid primary key default uuid_generate_v4(),
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  venue_key text not null default '',
  question_id text not null,
  event_id uuid references public.events(id) on delete set null,
  used_at timestamptz not null default now()
);

create index if not exists idx_trivia_history_host_venue
  on public.trivia_question_history (host_user_id, venue_key, used_at desc);

alter table public.trivia_question_history enable row level security;

drop policy if exists "Hosts manage own trivia question history" on public.trivia_question_history;
create policy "Hosts manage own trivia question history"
  on public.trivia_question_history for all
  using (auth.uid() = host_user_id)
  with check (auth.uid() = host_user_id);
