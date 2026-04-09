# ADR-002: Use Drizzle ORM over Prisma

**Status:** Accepted
**Date:** 2026-04-08
**Author:** Architect

## Context

PetForce needs an ORM for PostgreSQL (hosted on Supabase) that:
- Provides TypeScript type safety for database operations
- Supports fine-grained query control (joins, aggregations, subqueries)
- Generates and manages database migrations as reviewable SQL files
- Has a lightweight footprint suitable for serverless-friendly deployment

The database layer is the most critical shared surface in the monorepo. All 9 agent teams write queries against `packages/db`. The ORM must be legible to engineers unfamiliar with the specific library, and the migration tooling must produce SQL that is reviewable before execution.

## Decision

Use Drizzle ORM with `drizzle-kit` for schema-as-code and migration management. All table definitions live in `packages/db/src/schema.ts`. Migrations are auto-generated SQL files in `packages/db/drizzle/`. See `packages/db/CLAUDE.md` for the canonical 6-step migration checklist.

## Rationale

Drizzle's SQL-like query API means a developer reading a Drizzle query can mentally map it to SQL without learning an abstraction. For a team of agents and engineers working across domain boundaries, this legibility reduces cognitive overhead significantly.

The schema-as-code model — where the TypeScript schema definition in `schema.ts` IS the source of truth — eliminates the dual-source problem that Prisma has (TypeScript types generated from `schema.prisma`, which is a separate source of truth). In Drizzle, the TypeScript schema and the database schema are the same artifact.

Drizzle also has no query engine binary. Prisma requires shipping a compiled binary per platform, which complicates serverless deployment and cold starts. Drizzle is a thin TypeScript library.

## Consequences

- SQL-like API means agents can write complex queries (joins, aggregations, window functions) without fighting an abstraction layer — Drizzle queries read like SQL.
- Lightweight: no query engine binary (unlike Prisma), faster cold starts in serverless environments.
- Schema-as-code: the TypeScript schema definition IS the source of truth — no schema.prisma or separate migration DSL.
- Migration files are auto-generated SQL in `packages/db/drizzle/` — always review the diff before applying.
- Less mature ecosystem than Prisma means fewer community examples and StackOverflow answers — consult Drizzle docs directly for edge cases.
- **Agent constraint:** All schema changes go through `packages/db/src/schema.ts` → `drizzle-kit generate` → review SQL diff → `drizzle-kit push`. Never write raw migration SQL by hand, and never edit existing migration files. The 6-step checklist in `packages/db/CLAUDE.md` is mandatory for every schema change — skipping steps leads to migration drift that is painful to recover from.

## Alternatives Considered

**Prisma:** Most popular TypeScript ORM with excellent DX and tooling. Rejected because: opaque query engine binary adds deployment complexity, limited control over complex queries (especially aggregations), and the `schema.prisma` file is a separate source of truth from TypeScript types requiring codegen on every schema change.

**Knex:** Mature query builder with migration support. Rejected because: no schema-as-code (migrations are hand-written), no TypeScript type inference from schema definitions, high risk of types drifting from the actual database structure.

**Raw SQL:** Maximum control and zero abstraction. Rejected because: no type safety, manual migration management, high maintenance burden for 20+ tables across a multi-agent team.
