# SwingSet (`com.motophile.swingset`) — Project State & Architecture Handover
**Last Updated:** November 16, 2026
**Local Path:** `D:\My Documents\nfc-icebreaker`
**Backend:** Supabase (`https://fpyaipqcesbycyanflsq.supabase.co`)
**Stack:** Expo Router (React Native / TypeScript), Supabase (`supabase-js`), `expo-web-browser`, `expo-linking`, NFC/Bluetooth proximity (`src/hardware/proximityAndNfc.ts`)

---

## 1. Current State & Recently Completed Work
- **Brand & Onboarding Split (Mainstream App vs. SwingSet Lifestyle Gate):**
  - **Streamlined 1-Step Mainstream Sign-Up (`app/(onboarding)/step1-identity.tsx`):** Auto-populates SSO name, lets users confirm Display Name + optional Home City, and drops straight into the app.
  - **SwingSet Lifestyle Gate (`app/swingset-gate.tsx`):** Separated Lifestyle space gated behind an explicit agreement & **Code of Conduct** (body positivity, consent first, acceptance of all, discretion). Partner Linking (`step2-partner.tsx`), Play Boundaries (`step3-preferences.tsx`), and Lifestyle Contact Vault fields (`SLS`, `Club Account`) in `app/(tabs)/profile.tsx` remain hidden until opted in (`supabase/migrations/006_swingset_gate_and_city.sql`).
- **Nearby Public Event Discovery (`app/(tabs)/locations.tsx` & `app/(tabs)/_layout.tsx`):**
  - Replaced the `Venues` tab with **Nearby** (`Nearby Public Events`), querying live `is_public = true` events from Supabase (`supabase/migrations/004_public_events_and_categories.sql`) alongside curated sample events.
  - Supports search, time filters (`All`, `Tonight`, `This Weekend`), category badges (`Trivia Night`, `Social Mixer`, `Singles`, `Bar / Pub Crawl`, `Lifestyle`, `Corporate / Team`), and a Lifestyle visibility toggle.
- **Public/Private & Host Tier Event Creation (`app/host/create.tsx`):**
  - Step 1: **Public** (listed in Nearby with address; join at venue via code/tap) vs. **Private** (invite-only).
  - Step 2: **Category / Vibe** selection.
  - Step 3: **Tier 1 (Standard, single-location)** vs. **Tier 2 (Pro, multi-location/custom)** planner + Venue Name & Address.
- **Live Trivia Module & Rotating Q&A Database (`src/components/TriviaModule.tsx`, `src/data/triviaBank.ts`):**
  - Supports **Teams (Captain Consensus)**—teammates suggest answers and the Captain locks in the final answer—and **Solo / Singles** play with live leaderboards and Tier 2 custom Q&A.
  - Backed by `supabase/migrations/005_trivia_module.sql` (with `set_code` and `status` for archiving/rotating sets) and seeded with **550 Q&As** (50 per topic × 11 topics) via `supabase/seeds/trivia_vol_1.sql`.
- **Host & Attendee Game Intro Guides (`src/components/HostIntroBox.tsx`, `src/config/gameSkins.ts`):**
  - Added verbatim **Host Intro — Read Aloud** scripts for all 5 social game skins and Trivia, plus plain-English **How This Game Works** cards on attendee screens before/during rounds.
- **Logo-Matched Dark Theme (`constants/theme.ts`, `app.json`):**
  - Deep neutral black surfaces (`#0A0A10`, `#12121C`, `#161622`) paired with the logo's midnight indigo (`#1B1464`) splash and electric periwinkle-blue (`#5A6BFF`) accents.
- **Static Profiles, Little Black Book & Monetization Columns:**
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
