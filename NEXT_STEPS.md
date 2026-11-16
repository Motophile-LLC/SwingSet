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
