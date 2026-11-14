# Phase 1 — Foundation, Onboarding, Check-in, and Event Activation

## Goal
Get users into the app cleanly before the event, then activate them on event day through a guided check-in flow.

## Pre-event (installation + readiness)
- Users can **pre-download and install** the app.
- A profile picture is **not required** at install.
- Attendees should complete **detailed profile onboarding before the event**.

## Pre-event profile onboarding (detailed, but simple UI)
Attendees set up (before the event):
- adult / age confirmation
- relationship status (single, couple, group, etc.)
- openness / boundaries (e.g., soft swap, full swap, separate room, same room)
- who they are looking for (singles, couples, etc.)
- contact preferences
- visibility preferences

UI constraint:
- Use **simple cards or lists**; keep it minimal and premium.

## Edit rules
- Attendees can edit their profile **anytime before the event**.
- During the event, edits are **limited** (some fields may be locked once the event is active).

## Invite/access model
- Invitation-only.

## Event-day entry (host check-in)
Host provides at least one of:
- QR code for check-in
- NFC tag for check-in
- fallback access: **6-digit alphanumeric code** (for cases when QR/NFC are unavailable)

## Wizard order (event check-in wizard)
The attendee must complete the wizard in this order:
1. Invite / access verification (QR/NFC/code)
2. Confirm/enter display name
3. Check-in success
4. Take event photo (required at event start)
5. Confirm or adjust contact preferences for this event
6. Recap event rules
7. Enter ready state

Important: The photo and event activation happen **after check-in**.

## Ready state (host-controlled waiting)
After check-in, attendees enter a host-controlled waiting state where the host can:
- preload trivia and questions related to the event topic
- add photos/content
- select an icebreaker game
- start the first activity when ready

Hosts should be able to add content both:
- preloaded before event
- added live during the event

## Contact preference timing
- Contact-sharing preferences are set **both**:
  - during pre-event profile onboarding
  - confirmed again during event check-in

## Phase 1 ready
Yes — enough to implement once we switch to work mode.
