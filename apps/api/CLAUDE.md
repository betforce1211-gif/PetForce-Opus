# Backend API — apps/api/

## Overview

Hono HTTP server with tRPC for type-safe API endpoints. Connects to PostgreSQL via Drizzle ORM.

## Tech

- **HTTP:** Hono (lightweight, fast)
- **API layer:** tRPC v10 (end-to-end type safety)
- **Database:** Drizzle ORM via `@petforce/db`
- **Validation:** Zod schemas from `@petforce/core`
- **Serialization:** SuperJSON (handles Dates, etc.)

## Commands

```bash
pnpm dev --filter=api   # Start dev server on :3001 (hot-reload via tsx)
pnpm build --filter=api # TypeScript compile
```

## File Structure

```
src/
├── index.ts           # Hono server entry point
├── trpc.ts            # tRPC initialization, context, procedures
├── router.ts          # Root router (combines all sub-routers)
└── routers/
    ├── household.ts   # Household CRUD
    ├── pet.ts         # Pet CRUD
    └── activity.ts    # Activity CRUD
```

## Conventions

- **Routers** go in `src/routers/`, one file per domain entity
- **Validation:** Use Zod schemas from `@petforce/core` as tRPC `.input()`
- **Database access:** Import `db` and schema from `@petforce/db`
- **Auth:** Use `protectedProcedure` for endpoints requiring authentication
- **Context:** `ctx.userId` is extracted from request headers (Clerk integration TODO)
- **New routers** must be registered in `src/router.ts`

## Adding a New Router

1. Create `src/routers/<entity>.ts`
2. Define procedures using `publicProcedure` or `protectedProcedure`
3. Import and add to the root router in `src/router.ts`

## Database

Schema is defined in `packages/db/src/schema.ts`. Use Drizzle query builder:

```ts
import { db, households } from "@petforce/db";
import { eq } from "drizzle-orm";

const result = await db.select().from(households).where(eq(households.id, id));
```

## Dependencies

- `@petforce/core` — shared types and Zod schemas
- `@petforce/db` — database client and schema
