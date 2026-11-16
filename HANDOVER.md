# SwingSet (`com.motophile.swingset`) — Project State & Architecture Handover
**Last Updated:** November 15, 2026
**Local Path:** `D:\My Documents\nfc-icebreaker`
**Backend:** Supabase (`https://fpyaipqcesbycyanflsq.supabase.co`)
**Stack:** Expo Router (React Native / TypeScript), Supabase (`supabase-js`), `expo-web-browser`, `expo-linking`, NFC/Bluetooth proximity (`src/hardware/proximityAndNfc.ts`)

---

## 1. Current State & Recently Completed Work
- **Static Profiles & SSO Auto-Population (`public.profiles` + `context/UserContext.tsx`):**
  - Profiles are **static and persistent** across logins while remaining **private (non-searchable)**.
  - Updated `public.handle_new_user()` trigger and `UserContext.refreshProfileFromSupabase()` to auto-populate `sso_full_name`, `default_display_name`, `contact_email`, and `avatar_url` from Google/Apple SSO metadata (`user_metadata`).
  - Added explicit `onboarding_completed`, `karaoke_song`, `favorite_travel_spot`, `hidden_skill`, `play_style`, `play_boundaries`, `partner_link_code`, and `linked_partner_code` columns to `public.profiles` so every setting is remembered when a user logs back in.
  - Fixed a bug in `app/host/create.tsx` that previously overwrote `default_display_name` with `'Host User'`.
- **"Little Black Book" (`app/(tabs)/leaderboard.tsx` & `src/services/contactExchangeService.ts`):**
  - Replaced the mock leaderboard tab with the persistent **Little Black Book** (`Black Book` tab):
    1. **Mutual Contacts (Unlocked Vault):** Permanent list of all users who mutually agreed to exchange contact info across all past events, merging unlocked snapshots with live `public.profiles` Contact Vault fields (`phone`, `email`, `instagram`, `sls`, `club_account`, `custom_fields`).
    2. **All-Time Tapped History:** Complete all-time log of everyone the user has tapped in a game (`public.event_taps`), allowing 1-tap **"Request Mutual Contact Exchange"** or **"Accept / Decline"** at any time.
  - Added RLS helper functions `public.has_accepted_exchange_with(uuid)` and `public.has_tapped_attendee(uuid)` (`supabase/migrations/003_static_profiles_black_book_and_tiers.sql`) so tapped attendees and mutual contacts can view permitted data without any global user search.
- **Monetization & Access Tiers (`public.profiles` + `app/(tabs)/profile.tsx`):**
  - Added database-backed monetization columns to `public.profiles`:
    - `subscription_tier` (`'free' | 'plus' | 'vip' | 'host_pro'`)
    - `subscription_status` (`'none' | 'trialing' | 'active' | 'past_due' | 'canceled'`)
    - `subscription_expires_at` (`timestamptz`)
    - `can_host_events` (`boolean`)
  - Added an interactive **My Private Contact Vault** editor and **Membership Tier & Access Level** selector to `app/(tabs)/profile.tsx`.

---

## 2. Next Verification Steps in Expo Go
1. **SSO Login & Static Profile Persistence:**
   - Sign in with Google SSO (`roy.k.merritt@gmail.com`). Verify Step 1 pre-fills your SSO name (`Roy Merritt`), complete onboarding once (`onboarding_completed = true`), then sign out and sign back in — verify it routes directly to `/(tabs)` and remembers your alias, prompts, Contact Vault, and tier.
2. **Little Black Book & Mutual Contact Exchange:**
   - Save your phone/Instagram/SLS in **Profile -> My Private Contact Vault**.
   - Tap a player in a live event round (`app/event/[id]/index.tsx`) and verify they appear permanently in the **Black Book** tab under **All-Time Tapped**, then test **Request Mutual Contact Exchange** -> **Accept & Unlock**.
