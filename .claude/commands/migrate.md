---
description: Safe database migration workflow with /guard enforcement
allowed-tools: Bash, Read
---
Run `/guard` first — mandatory before any schema change.

Then follow the canonical migration checklist in `packages/db/CLAUDE.md`.

Do NOT run `pnpm db:migrate` or `drizzle-kit push` without first reading the generated SQL diff.
