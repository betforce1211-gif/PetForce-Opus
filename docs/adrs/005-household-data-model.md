# ADR-005: Household-Centric Data Model

**Status:** Accepted
**Date:** 2026-04-08
**Author:** Architect

## Context

PetForce is fundamentally about collaborative pet care — families, sitters, and vets sharing responsibility for animals. The data model must reflect this multi-player reality from the ground up.

The core design question: what is the root entity that everything else belongs to? The answer to this question determines the shape of every foreign key, every permission check, and every API procedure in the system. Getting it wrong at the data model level requires a full database migration and API rewrite to fix.

Early prototypes used a user-centric model where pets belonged to users. This immediately created problems: how does a sitter log a feeding for a pet they don't "own"? How does a family of four share access to the same pet without duplicating records? The user-centric model had no natural answer.

## Decision

The **Household** is the root entity. All data — pets, activities, health records, expenses, schedules, gamification stats — belongs to a Household, not to an individual User. Users join Households as Members with explicit roles: `owner`, `admin`, `member`, or `sitter`.

All database tables with household-scoped data include a `householdId` foreign key. All tRPC procedures accessing household-scoped data go through `householdProcedure` middleware, which validates that the requesting user is a member of the specified household and injects `ctx.householdId` and `ctx.memberRole` into the procedure context.

## Rationale

The Household model maps directly onto how pet care actually works. A family's dog isn't owned by one person in the system — it belongs to the household. When a sitter comes for a week, they join the household as a sitter and get scoped access. When they leave, removing their membership revokes all access without touching any pet or activity data.

This model also future-proofs the permission system. Role-based access at the household level (`owner`, `admin`, `member`, `sitter`) can be enforced at the middleware layer rather than scattered across individual procedures. Adding a new role or changing a permission is a single middleware change, not an audit of 97 procedures.

Foreign key cascades through `householdId` mean data cleanup is automatic and complete. There's no orphaned data problem.

## Consequences

- Natural multi-member collaboration: a sitter logs a feeding, a parent sees it, a vet reviews health records — all within the same household context without special sharing logic.
- Foreign keys cascade through `householdId` — deleting a Household deletes ALL its data (pets, activities, records, stats). This is intentional and documented in the user guide.
- `joinCode` enables access requests for new members — this is an attack surface. Join codes have a 7-day expiry and require approval from an `owner` or `admin` before access is granted.
- Every database query on household-scoped data MUST filter by `householdId` — enforced at the middleware level via `ctx.householdId`.
- Pets belong to Households, not to Users — a pet doesn't "move" or become inaccessible when a family member leaves the household.
- **Agent constraint (SECURITY):** Every household-scoped tRPC procedure MUST use `householdProcedure` middleware, never `protectedProcedure`. Using `protectedProcedure` for household data is a SECURITY FAILURE — it skips household membership validation and allows cross-household data access (IDOR vulnerability). This is the most critical security invariant in the codebase. No exceptions under any circumstances. If you are unsure whether a procedure is household-scoped, it is — default to `householdProcedure`.

## Alternatives Considered

**User-centric model:** Each user owns their pets directly, with optional sharing. Rejected because: no natural collaboration model — sharing a pet requires complex ownership transfer or record duplication. Two parents managing the same dog would create two separate pet records or a complicated co-ownership system. Directly undermines the core product vision (P1: The Household is the Product).

**Pet-centric model:** Pets are top-level entities with user associations. Rejected because: unclear ownership and permission boundaries — who can edit a pet's health records if the pet has multiple associated users? Permissions become per-pet rather than per-household, requiring N permission checks per request instead of 1.
