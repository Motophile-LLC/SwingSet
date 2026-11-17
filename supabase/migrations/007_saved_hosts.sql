-- SwingSet Migration 007: Follow / Save Favorite Hosts

create table if not exists public.saved_hosts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  host_key text not null,
  host_name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, host_key)
);

alter table public.saved_hosts enable row level security;

drop policy if exists "Users manage own saved hosts" on public.saved_hosts;
create policy "Users manage own saved hosts"
  on public.saved_hosts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
