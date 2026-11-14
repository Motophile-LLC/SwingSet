# Phase 7 — Persistence and Production Hardening

## Goal
Replace simulation with real app behavior (data persistence, real verification, real host/attendee sync).

## Systems to define
- backend choice (Supabase vs Firebase)
- auth
- storage
- sync
- offline behavior
- retries and error handling
- security
- analytics
- host moderation tools

## Reliability principle
- Events run in the real world; the app must degrade gracefully
- host control must remain functional under weak connectivity

## Phase 7 open decisions
- what persists server-side vs locally
- how to handle partial failures (e.g., photo upload fails)
- data retention and deletion policies
