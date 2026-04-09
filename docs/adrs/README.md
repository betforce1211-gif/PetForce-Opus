# Architecture Decision Records

ADRs capture the reasoning behind significant architectural decisions. They help agents and developers understand not just *what* the system does, but *why* it was built this way.

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](001-trpc-api-layer.md) | Use tRPC over REST for API layer | Accepted | 2026-04-08 |
| [002](002-drizzle-orm.md) | Use Drizzle ORM over Prisma | Accepted | 2026-04-08 |
| [003](003-clerk-auth.md) | Use Clerk for authentication | Accepted | 2026-04-08 |
| [004](004-tamagui-ui.md) | Use Tamagui for cross-platform UI | Accepted | 2026-04-08 |
| [005](005-household-data-model.md) | Household-centric data model | Accepted | 2026-04-08 |
| [006](006-gamification-lazy-recalc.md) | Gamification as lazy recalculation | Accepted | 2026-04-08 |

## Creating a New ADR

1. Copy `template.md` to `NNN-short-title.md`
2. Fill in all sections — especially Alternatives Considered and Consequences
3. Submit as a PR for review
4. Update this README index table

## Principles

- ADRs are **immutable once accepted** — if a decision changes, create a new ADR that supersedes the old one
- The **Consequences** section must include at least one operationally-specific constraint that directly affects how agents write code
- Keep ADRs **concise** (60-100 lines) — link to deeper docs rather than duplicating
