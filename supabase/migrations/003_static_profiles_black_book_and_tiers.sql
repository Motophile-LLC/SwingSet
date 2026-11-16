-- SwingSet Migration 003: Static Profiles, SSO Auto-Population, Little Black Book RLS & Monetization Tiers

-- 1. Add persistent profile, SSO, icebreaker, and monetization/tier columns to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sso_full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS karaoke_song text,
  ADD COLUMN IF NOT EXISTS favorite_travel_spot text,
  ADD COLUMN IF NOT EXISTS hidden_skill text,
  ADD COLUMN IF NOT EXISTS play_style text NOT NULL DEFAULT 'Play Together as a Unit',
  ADD COLUMN IF NOT EXISTS play_boundaries text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS partner_link_code text,
  ADD COLUMN IF NOT EXISTS linked_partner_code text,
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'plus', 'vip', 'host_pro')),
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none' CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'canceled')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS can_host_events boolean NOT NULL DEFAULT true;

-- 2. Update handle_new_user() trigger function to auto-populate SSO name, email, and avatar_url
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    default_display_name,
    sso_full_name,
    contact_email,
    avatar_url,
    onboarding_completed
  )
  VALUES (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1),
      'Guest'
    ),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    sso_full_name = coalesce(EXCLUDED.sso_full_name, public.profiles.sso_full_name),
    contact_email = coalesce(EXCLUDED.contact_email, public.profiles.contact_email),
    avatar_url = coalesce(EXCLUDED.avatar_url, public.profiles.avatar_url);
  RETURN new;
END;
$function$;

-- 3. Helper functions for Little Black Book RLS (No global search; strictly tap/exchange-gated)
CREATE OR REPLACE FUNCTION public.has_accepted_exchange_with(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contact_exchanges ce
    WHERE ce.status = 'accepted'
      AND (
        (ce.requester_user_id = (SELECT auth.uid()) AND ce.recipient_user_id = target_user_id)
        OR (ce.recipient_user_id = (SELECT auth.uid()) AND ce.requester_user_id = target_user_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_tapped_attendee(target_attendee_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_taps t
    JOIN public.event_attendees me ON me.event_id = t.event_id AND me.user_id = (SELECT auth.uid())
    WHERE (t.attendee_a_id = me.id AND t.attendee_b_id = target_attendee_id)
       OR (t.attendee_b_id = me.id AND t.attendee_a_id = target_attendee_id)
  );
$$;

CREATE POLICY "Mutual contacts can view profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR public.has_accepted_exchange_with(id)
  );
