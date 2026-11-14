# Phase 2 — Host Event Creation and Management

## Goal
Let hosts build events from templates or from scratch, manage host roles, set event configuration, and control live operations.

## Host event creation wizard
Core inputs:
- event title
- date/time (optional/variable support)
- location(s) / venues (single or multi-destination)
- expected guest count (host uses a number first; guest list starts empty)
- host roles (multiple hosts supported)
- game set + prompts
- dress code and other event-specific settings

Constraints:
- The event should be built via a wizard with:
  - presets + custom options
  - template defaults
  - ability to duplicate past events
- Guest list begins as a blank count/number; do not force adding every guest during creation.

## Live event operations (flexible control)
- Hosts can edit live in response to unexpected situations.
- Host dashboard should support live changes to:
  - active prompt/game
  - timing / round progression
  - targeted groups (singles/couples/etc.)
  - venue/destination state

## Host visibility
- Hosts can see everything relevant to run the event.

## Learning loop
- After games/events, hosts can rate game success.
- The app should store learnings to improve recommendations/templates.

## Phase 2 open decisions (to be answered next)
- exact round state machine
- how event/group targeting is represented
- event templates data model
