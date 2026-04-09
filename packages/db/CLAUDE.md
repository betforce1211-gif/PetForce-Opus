# Database — packages/db/

## Overview

Drizzle ORM schema and PostgreSQL client. All database access in the monorepo goes through this package.

## Tech

- **ORM:** Drizzle ORM
- **Database:** PostgreSQL (hosted on Supabase)
- **Migrations:** Drizzle Kit

## Commands

```bash
pnpm build --filter=@petforce/db       # TypeScript compile
pnpm --filter=@petforce/db db:generate  # Generate migration from schema changes
pnpm --filter=@petforce/db db:push      # Push schema to database
```

## File Structure

```
src/
├── index.ts         # Public exports (schema + client)
├── schema.ts        # Drizzle table definitions
└── client.ts        # Database connection + Drizzle instance
drizzle.config.ts    # Drizzle Kit configuration
drizzle/             # Generated migration files (auto-generated)
```

## Schema Conventions

- **Tables** use `pgTable()` from `drizzle-orm/pg-core`
- **Primary keys:** UUID with `defaultRandom()`
- **Timestamps:** `timestamp("...", { withTimezone: true }).notNull().defaultNow()`
- **Foreign keys:** Use `.references(() => table.id, { onDelete: "cascade" })`
- **Enums:** Use `text("...", { enum: [...] })` for simple enums
- **JSON:** Use `jsonb().$type<T>()` for typed JSON columns

## Tables

- `households` — name, theme (JSONB), timestamps
- `members` — links users to households with roles
- `pets` — belongs to a household, species/breed/medical info
- `activities` — links pets + members, tracks care events

## Migration Workflow (canonical checklist)

This is the single source of truth for the Drizzle migration process. All other references (guardrails, rules, commands) point here.

1. **Run `/guard`** — mandatory before any schema change, no exceptions
2. **Modify `src/schema.ts`** — make your schema changes
3. **Run `pnpm --filter=@petforce/db db:generate`** — generates migration SQL
4. **Read the generated SQL in `drizzle/`** — confirm it does exactly what you expect. Never skip this step.
5. **Run `pnpm --filter=@petforce/db db:push`** — applies the migration
6. **Verify all three apps boot** — run `pnpm dev` and confirm web (:3000), API (:3001), and mobile all start without errors

Never drop columns — deprecate first, migrate data, drop in a separate PR.
One concern per migration PR only.

## Environment

Requires `DATABASE_URL` environment variable. The `db:push` and `db:generate` scripts automatically load `DATABASE_URL` from the root `.env.local` via `dotenv-cli` — no manual `export` needed.

## Consumers

- `@petforce/api` — imports `db` client and schema for queries
