---
name: petforce-guardrails
description: PetForce monorepo safety rules. Auto-loads for all Conductor sessions in this repo. Activates when editing any file in packages/.
---

# PetForce Guardrails

## Protected surfaces — run /guard before touching these
- **packages/db** — Drizzle schema is shared across ALL apps (web, mobile, api).
  - Never drop columns — deprecate first, migrate data, drop in a separate PR.
  - Always run `pnpm db:generate` before `pnpm db:migrate` and review the SQL diff.
  - One concern per migration PR only.
- **packages/core** — Shared Zod schemas + business logic. A breaking type change here
  fails web AND mobile simultaneously.
- **packages/config** — Shared TS/ESLint configs. Touches the entire monorepo build.

## App boundary rules
- Never hardcode :3000 or :3001 outside their respective app configs.
- packages/ui is Tamagui — shared by web AND mobile. After any component change,
  verify both apps render correctly before marking done.
- Clerk is the single auth layer. Never implement parallel auth logic anywhere.

## Conductor worktree rules
- Each worktree session owns ONE app or ONE package. Never cross boundaries mid-session.
- Use /review before every PR. Use /qa before every merge to main.
- Use /investigate when debugging — it auto-freezes to the affected module so you
  don't accidentally break something else while fixing one thing.
- /guard is mandatory before any edit to packages/db or packages/core. No exceptions.

## Drizzle migration checklist
Before any schema change, follow the canonical 6-step migration workflow in `packages/db/CLAUDE.md`.
The checklist lives there as the single source of truth — do not duplicate it here.
