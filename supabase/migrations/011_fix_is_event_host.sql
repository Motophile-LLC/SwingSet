-- SwingSet Migration 011: Include events.owner_id in is_event_host()
-- Fixes RLS for Photo Inbox moderation, Trivia attendees, and timeline blocks for event owners.

create or replace function public.is_event_host(p_event_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.event_hosts
    where event_id = p_event_id and user_id = auth.uid()
  )
  or exists (
    select 1 from public.events
    where id = p_event_id and owner_id = auth.uid()
  );
$$;
