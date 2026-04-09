# ADR-006: Gamification as Lazy Recalculation

**Status:** Accepted
**Date:** 2026-04-08
**Author:** Architect

## Context

PetForce includes gamification: XP points, levels, badges, and streaks for members, households, and pets. These stats are derived from completion history — feeding logs, medication logs, activity completions. The system tracks three stat scopes: per-member, per-household, and per-pet.

The design question: how are gamification stats maintained as new completions are logged? Options range from real-time event-driven updates to fully lazy recalculation from source data on demand.

This decision has significant implications for correctness, debuggability, and the complexity of adding new XP rules or badge types in the future.

## Decision

Gamification stats are stored in denormalized tables (`memberGameStats`, `householdGameStats`, `petGameStats`) and recalculated on-demand from completion history via `gamification.recalculate`. Stats are NOT maintained in real-time as events occur.

The recalculation procedure reads all relevant completion records for the target scope (member, household, or pet), recomputes XP totals, levels, streaks, and badge criteria from scratch, and upserts the result into the stats tables. The operation is idempotent.

## Rationale

The gamification domain has two failure modes that must be weighted against each other:

1. **Stale stats**: stats don't reflect the most recent activity for a short window
2. **Corrupt/drifted stats**: stats diverge permanently from source data and cannot be trusted

Real-time event-driven updates optimize for (1) at the cost of (2). Every new event type, every new badge, and every XP rule change requires adding a new event handler. Concurrent household members logging activities simultaneously create race conditions on the stats counters. When bugs occur (and they will), the stats tables may be in an indeterminate state with no way to know which records caused the drift.

Lazy recalculation accepts occasional staleness in exchange for strong correctness guarantees. The stats tables are always recoverable — if anything ever looks wrong, run `gamification.recalculate` and the stats will reflect exactly what the completion history says they should. Adding a new badge type means updating the recalculation logic in one place and the next recalculation picks it up automatically, retroactively awarding the badge based on existing history.

For the current scale (< 1,000 households), recalculation from source data is fast enough to be called after any significant completion event without user-perceptible latency.

## Consequences

- Stats can be temporarily stale between recalculations — this is by design, not a bug. The UI should present gamification stats as "as of last update" rather than implying real-time accuracy.
- Adding new badge types or XP rules requires updating the recalculation logic in the gamification router. The change is automatically applied retroactively on next recalculation — no backfill migration needed.
- Recalculation is idempotent and safe to call multiple times. Running it twice produces the same result as running it once.
- Stats tables are always recoverable from source data. There is no "stat corruption" scenario that cannot be resolved by recalculating.
- **Agent constraint:** Never update `memberGameStats`, `householdGameStats`, or `petGameStats` tables directly with INSERT/UPDATE statements or Drizzle writes. Always call `gamification.recalculate` (the tRPC procedure or its underlying service function) to update stats. Direct writes to the stats tables will be silently overwritten on the next recalculation, causing confusing behavior that is difficult to debug. Any procedure that completes an activity and wants to update stats should call `recalculate` as its final step — not perform arithmetic on the existing stat values.

## Alternatives Considered

**Event-driven real-time updates:** Update stats immediately and incrementally when a feeding/medication is logged. Rejected because: complex event handling infrastructure, race conditions with concurrent household members logging activities, and difficult to debug when stats drift. Adding a new XP rule or badge requires adding new event handlers and a backfill migration for existing history.

**CQRS with separate read models:** Maintain a separate read-optimized stats store updated by domain events, with event sourcing for the completion history. Rejected because: significantly over-engineered for current scale (< 1,000 households). CQRS adds event bus infrastructure, event versioning concerns, and eventual consistency complexity. The benefit — truly real-time stat updates at high write throughput — is not needed at this stage.

**Database triggers:** Maintain stats via PostgreSQL triggers on the completion tables. Rejected because: hidden logic in the database is difficult to test, debug, and evolve. Trigger logic is not visible in the TypeScript codebase and breaks the principle that business logic lives in the application layer.
