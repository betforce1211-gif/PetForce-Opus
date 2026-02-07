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

## Migration Workflow

1. Modify `src/schema.ts`
2. Run `pnpm --filter=@petforce/db db:generate` to create a migration
3. Review the generated SQL in `drizzle/`
4. Run `pnpm --filter=@petforce/db db:push` to apply

## Environment

Requires `DATABASE_URL` environment variable. See root `.env.example`.

## Consumers

- `@petforce/api` — imports `db` client and schema for queries
