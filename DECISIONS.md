# SwingSet Decisions Log

This file records important product, UX, and technical decisions so they remain easy to review without re-reading every phase document.

## Product decisions

### Product identity
- **Working name:** SwingSet
- **Default attendee language:** attendees
- **Tone:** premium and exclusive
- **Primary product goal:** encourage people to put phones down and talk

### What the app is not
SwingSet should never feel like:
- a dating app
- a hookup app
- a chat app
- an explicit app
- a generic game app

### Audience and access
- Audience includes both hosts and attendees equally
- App access is invitation-only
- Guest discovery/search is not allowed
- Profiles are private
- Events can support lifestyle-focused or vanilla audiences

### Event model
- Events are event-specific
- Game sets are event-specific
- Event duration is flexible within a fairly rigid overall event start/end timeline
- Multiple hosts are supported
- Hosts can make live edits during the event
- Events can be single-venue or multi-venue / multi-destination
- For v1, events should use a timeline-first model rather than a vague date/time field
- Moves between destinations should use explicit travel/transition blocks
- Travel/transition blocks may optionally include one simple in-transit activity

### Host creation model
Hosts can create events using:
- a wizard
- presets and custom options
- template defaults
- duplicated past events
- saved user templates
- a linear ordered event timeline with explicit timeline segments in v1
- a wizard order where timeline planning comes before detailed location setup in multi-destination events
- a separate final schedule/publish action after review and draft save

In v1, templates should act as reusable event setup starters and may include:
- event type/category
- default timeline structure
- suggested activity blocks
- suggested prompts
- suggested travel/transition blocks when relevant
- suggested timing defaults
- suggested settings such as dress code or notes

Recommended simplest v1 host roles:
- owner host
- co-host

Owner host should control structural event management, including:
- deleting an event
- changing co-host assignments
- changing the overall event timeline structure
- ending the event

Co-hosts should be able to run and adjust the event live, including:
- opening check-in
- starting, pausing, skipping, or ending active blocks early
- changing prompts or games live
- marking destination transitions
- adjusting timing and other live event operations during the event

### Host targeting model
- In v1, hosts should target activities/prompts using simple audience buckets:
  - everyone
  - singles
  - couples
  - groups
- Everyone should be the default targeting option
- Attendee-by-attendee manual targeting should not be part of core v1
- Custom host-defined tags should be a later feature
- Sensitive profile preferences and boundaries should be used more for later matching logic than direct host targeting controls in v1

### Round and timeline block state model
- In v1, activity blocks and travel/transition blocks should share the same basic state model
- Block states should include:
  - Planned
  - Announced
  - Active
  - Paused
  - Ended
  - Skipped
  - Ended Early
- Recommended transitions include:
  - Planned → Announced
  - Announced → Active
  - Active → Paused
  - Paused → Active
  - Active → Ended
  - Active → Ended Early
  - Planned → Skipped
  - Announced → Skipped

### Host learning loop
- Hosts can rate games for success / what worked / what did not
- The product should eventually learn what works for that host

### Profile model
- Detailed onboarding happens before the event
- Profile picture is not required at install
- Event-day photo is required when the event begins
- Profiles are editable before the event
- Some edits may be limited during the active event
- Profiles become dormant after the event

### Contact and privacy
- Contact exchange is mutual only
- Attendees choose what is public vs private
- Some fields may unlock only after verified/tap confirmation
- No in-app messaging
- Contact preferences are set during onboarding and confirmed again during event check-in

### Event check-in model
Host can provide at least one of:
- QR code
- NFC tag
- 6-digit alphanumeric fallback code

### Event-day activation flow
Current intended order:
1. Invite / access verification
2. Confirm or enter display name
3. Check-in success
4. Take event photo
5. Confirm or adjust contact preferences
6. Recap event rules
7. Enter ready state

### Ready state concept
After check-in, attendees enter a host-controlled waiting/ready state where hosts can:
- preload trivia/questions
- add photos/content
- select an icebreaker game
- start the first activity when ready

## Phase completion notes
- Phase 0 — Product Rules and Scope has been reviewed, confirmed, and marked Ready for Execution.
- Phase 2 — Host Event Creation and Management has been reviewed, confirmed, and marked Ready for Execution.

## Current open decision areas
These are not yet fully resolved and should be worked phase by phase:
- template storage/editing technical model
- v1 game mode list
- scoring and balancing approach
- verification thresholds and messaging
- hardware fallback strategy
- route/venue unlock rules
- exact consent UX for contact unlock
- supported contact fields in v1
- backend choice and persistence strategy
- retention/deletion policies

## Usage note
When a new important decision is made, add it here and also update the relevant phase document(s).

### Venue and Route Decisions (Phase 5)
- **Event Scope:** v1 supports both single-venue and multi-destination/multi-venue events.
- **Venue Transitions:** Features an automated 15-minute warning notification, an in-app travel message ("It's time to go!" with the destination address), and an arrival confirmation prompt.
- **Check-in Flexibility:** Check-in is optional during event creation; co-hosts can display a check-in QR code directly on their phone for locations lacking printable versions.
- **Venue Content & Games:** Venue content is fully customizable, with each venue featuring a unique game, activity, or prompt set.

### Game System Design Decisions (Phase 3)
- **Unified Engine:** v1 interactive games use a single two-phase engine (**Phase 1: The Scramble** + **Phase 2: The Mingle**) with swappable visual/prompt **Skins** (use_spark, outbreak, drop_beat, secret_agent, cocktail_mixer).
- **No Scoring / Pure Social:** Games have no points or competitive leaderboards; hosts may optionally configure physical/promo rewards for final Catalyst holders or matched pairs.
- **Simultaneous Activity:** Every targeted player has an active objective during Phase 1 (Catalyst holders offload; Hunters pair up) so nobody stands idle.
- **Independent Devices & Couple Reconnect:** Every attendee phone plays independently; multi-venue and long events should include scheduled **Couple Reconnect** windows before venue transitions or at host-defined intervals.
- **Odd-Number & Anti-Stall Rules:** Unpaired players at Phase 1 end are auto-paired via BLE proximity (forming a trio if odd); stagnant Catalysts auto-transfer after 18 seconds.
### Real-World Interaction & "Taps Tonight" Decisions (Phase 4)
- **Fast Handshake:** Player-to-player game verification uses **NFC Tap** with a **3-character short code** fallback gated by **BLE proximity** (no camera QR scanning during fast rounds).
- **Taps Tonight History:** Every verified tap logs an ephemeral connection (Display Name + Event-Day Photo + Context) in a private **Taps Tonight** list available during the event and through the next-day post-event window.
- **Contact Exchange Bridge:** Attendees can initiate mutual contact exchange requests directly from their **Taps Tonight** list without ever exposing a searchable guest directory.

### Game System Design Decisions (Phase 3)
- **Unified Engine:** v1 interactive games use a single two-phase engine (**Phase 1: The Scramble** + **Phase 2: The Mingle**) with swappable visual/prompt **Skins** (use_spark, outbreak, drop_beat, secret_agent, cocktail_mixer).
- **No Scoring / Pure Social:** Games have no points or competitive leaderboards; hosts may optionally configure physical/promo rewards for final Catalyst holders or matched pairs.
- **Simultaneous Activity:** Every targeted player has an active objective during Phase 1 (Catalyst holders offload; Hunters pair up) so nobody stands idle.
- **Independent Devices & Couple Reconnect:** Every attendee phone plays independently; multi-venue and long events should include scheduled **Couple Reconnect** windows before venue transitions or at host-defined intervals.
- **Odd-Number & Anti-Stall Rules:** Unpaired players at Phase 1 end are auto-paired via BLE proximity (forming a trio if odd); stagnant Catalysts auto-transfer after 18 seconds.

### Real-World Interaction & "Taps Tonight" Decisions (Phase 4)
- **Fast Handshake:** Player-to-player game verification uses **NFC Tap** with a **3-character short code** fallback gated by **BLE proximity** (no camera QR scanning during fast rounds).
- **Taps Tonight History:** Every verified tap logs an ephemeral connection (Display Name + Event-Day Photo + Context) in a private **Taps Tonight** list available during the event and through the next-day post-event window.
- **Contact Exchange Bridge:** Attendees can initiate mutual contact exchange requests directly from their **Taps Tonight** list without ever exposing a searchable guest directory.

### Contact Exchange and Privacy Decisions (Phase 6)
- **Strictly Mutual Exchange:** Contact information is only shared when both parties mutually consent. No in-app messaging.
- **v1 Supported Contact Fields:** Includes Phone Number, Email, Instagram, **Club accounts**, **SLS**, and **3�4 custom labelled fields** for lifestyle/community apps (Telegram, FetLife, etc.).
- **Consent UX ("Request Exchange"):** Initiated from the private **"Taps Tonight"** list; recipient receives an alert with an **Accept / Decline** toggle. Once accepted, permitted contact fields uncloak and remain mutually available.
- **Profiles & Privacy:** Event-day photo is required at start; profiles go dormant after the event.

### Persistence and Production Hardening Decisions (Phase 7)
- **Backend Stack:** **Supabase** for real-time WebSocket sync, auth, and database storage.
- **Data Retention:** Indefinite for v1, structured to scale with future host monetization and event archiving tiers.
- **Mutual Contact Persistence:** Users retain permanent access to all mutually accepted contacts across past events (a persistent personal address book).
- **Host Moderation:** Hosts can remove attendees as a last resort, safeguarded by a **2-step confirmation prompt** to prevent accidental taps.
- **Offline Resilience:** Local device timers and queued host actions ensure graceful degradation during venue connectivity drops.
