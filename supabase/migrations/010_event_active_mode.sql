-- SwingSet Migration 010: Persist Active Room Mode on Events for Host -> Attendee Sync

alter table public.events
  add column if not exists active_mode text not null default 'social'
  check (active_mode in ('social', 'trivia', 'photos'));
