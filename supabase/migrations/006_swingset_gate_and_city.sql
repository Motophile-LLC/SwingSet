-- SwingSet Migration 006: Mainstream Home City & SwingSet Lifestyle Opt-In Gate

alter table public.profiles
  add column if not exists home_city text,
  add column if not exists swingset_opted_in boolean not null default false,
  add column if not exists swingset_accepted_at timestamptz;
