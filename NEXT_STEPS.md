# SwingSet Next Steps

## Current overall status
- Roadmap structure exists and phases 0–7 are documented at a high level
- Phases 0, 1, and 2 are marked Ready for Execution
- Phases 3–7 still need deeper discovery before implementation

## Recommended next focus
### Primary next stage
**Phase 2 — Host Event Creation and Management**

Why this is next:
- It connects the product rules from Phase 0 to the attendee flow in Phase 1
- It determines how hosts actually create and control events
- It influences data structure, game setup, and future implementation choices

## Phase 2 key open questions
- How should template storage/editing work technically in later phases?
- Are there any special-case block types that need different state rules later?

## Suggested immediate workflow
1. Treat Phase 2 as completed and confirmed
2. Choose the next planning focus
3. Update the next phase document in discovery
4. Record locked decisions in `DECISIONS.md`
5. Reassess the next phase status after discovery

## Secondary documentation improvements
As future work, consider adding:
- `COPILOT_PROMPT.md`
- a simple glossary of terms
- a feature inventory for v1 vs later
- a risk / moderation note

## Rule for future sessions
Before asking new questions, first summarize:
- what is already decided
- what remains open
- which single stage is the best next focus

## Current recommendation to copilot
Stay in planning mode unless execution is explicitly requested.


## v1 Execution Priorities (Simplified v1)
- Focus on a usable v1 model: streamlined guest onboarding, Google & Apple SSO authentication, single-venue event rooms, and an Auto/Host Control deck where hosts can start and stop random game rounds with minimal friction.
- Multi-venue routing and complex route planning are deferred to post-v1 research and gameplay testing.

## Product Direction Update — Public Discovery, Host Tiers & Photo Challenges (Nov 16, 2026)
Captured from brainstorming session (also recorded in `PROJECT_OVERVIEW.md` and `DECISIONS.md`):

### Decided
- **"Nearby" Discovery Tab:** Replaces "Venues" as the top-level discovery surface so users have a reason to open the app between events to find **Public** events happening near them. ("Venues" remains inside the event model for single- and multi-location planning.)
- **Event Creation Step 1 — Public vs. Private:** First question in host event creation is **Public** (listed in Nearby) vs. **Private** (invite-only, hidden from Nearby).
- **Lifestyle vs. Vanilla Filtering:** Retained as an event vibe/community tag for attendee comfort and expectation-setting (not explicit content). **Lifestyle** events are **visible in Nearby and clearly marked/badged**, alongside clear badges for all event types, with filters available so users can filter categories in or out.
- **Public Event Discovery & Entry:** Public events in Nearby show their **address**; joining/check-in happens at the venue via **door code or NFC/QR tap**.
- **Monetization & Tiers:**
  - **Attendees:** Free (future paid attendee tier deferred for later).
  - **Hosts:** All hosts pay, split into **2 tiers**:
    - **Tier 1 (Standard Host):** Single-location events only, Public & Private events, simple planner (presets/standard games), solo host (or 1 co-host), basic challenge photos sent to host.
    - **Tier 2 (Pro / Multi-Location Host):** Multi-location / multi-venue events (plus single-location), Public & Private events, advanced planner (custom timeline/prompts/saved templates), multiple co-hosts & transitions, live downtime photo screensaver/reel + curation.
- **In-App Photo Challenges & Live Downtime Feed:**
  - Attendees can take photos through the app for challenges/prompts.
  - Photos are sent to the host's account for review and use.
  - Hosts can display photos live inside the app during downtime between game rounds (e.g., as an event screensaver/reel).
- **Trivia Module & Point System:**
  - Supports **both** standalone **Trivia Night** events and Trivia rounds inside mixed social events.
  - **Team Mode:** Captain is designated; teammates submit suggested answers, and the **Captain sees group answers and locks in the final answer** (Solo/Singles also supported).
  - **Q&A Database:** Curated, genre-organized Trivia Q&A database (updated periodically). **Tier 1** pulls from the database; **Tier 2** can also write custom Q&A.
  - **Points & Rankings:** Re-introduce a **point system** for Trivia / public game modes—supporting live leaderboards, cross-event score comparisons on public Trivia Nights, and ranked events by people/score.

### Open Questions to Pick Up Next
1. **Main App Name & SwingSet Separation (Onboarding Split):** Finalize the main public app name (TBD). Build the **1-step Mainstream SSO sign-up** (confirm nickname/city) and move the existing Partner Linking + Play Style/Boundaries onboarding **behind the SwingSet Code-of-Conduct Gate**.
2. **3-Tier Ranking Boards (Event / Local / National — Local/National Deferred):** Event-level live leaderboards are built in `TriviaModule.tsx`. Local & National ranking boards are intentionally **held off until post-launch traction** so the app doesn't show empty leaderboards early on.
3. **Follow / Save Hosts:** Add a "Follow Host" button on event cards & a "Saved Hosts / Upcoming Events" view.
4. **In-App Photo Challenges & Live Downtime Feed:** Build the camera + Host Inbox + live screensaver reel.
5. **Paid Attendee Tier (Later):** Revisit what perks would justify a paid attendee tier down the road.
