---
name: scaffold-router
description: Generate a complete CRUD tRPC router with Drizzle schema, Zod validation, and tests from a single command
---

# /scaffold-router — tRPC Router Generator

Generate a complete CRUD tRPC router for PetForce following existing codebase patterns.

**Usage:** `/scaffold-router <EntityName>` (e.g., `/scaffold-router Reminder`)

## Input

The argument is the **PascalCase entity name** (e.g., `Reminder`, `Vaccination`, `Task`).

If not provided, ask for it. Optionally ask:
- Does it belong to a household? (default: yes)
- Does it belong to a pet? (default: no)
- Extra fields beyond the standard ones? (provide as comma-separated `name:type` pairs)

## What Gets Generated

### 1. Drizzle Schema Addition (`packages/db/src/schema.ts`)

Add a new table to the existing schema file. Follow these conventions exactly:
- Table name: `camelCase` plural (e.g., `reminders`)
- Primary key: `uuid("id").primaryKey().defaultRandom()`
- Always include `householdId` FK to `households` with `onDelete: "cascade"` and an index
- Include `createdAt` and `updatedAt` timestamps with `withTimezone: true` and `defaultNow()`
- If pet-scoped, add `petId` FK to `pets` with `onDelete: "cascade"`
- Add appropriate indexes in the table config function

Example pattern (from existing `healthRecords` table):
```ts
export const reminders = pgTable("reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  // ... entity fields ...
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdIdx: index("reminders_household_idx").on(table.householdId),
}));
```

### 2. Export from `packages/db/src/index.ts`

Ensure the new table is exported from the package barrel.

### 3. Zod Schemas (`packages/core/src/schemas.ts`)

Add `create<Entity>Schema` and `update<Entity>Schema` following existing patterns:
- Create schema: required fields + optional fields with `.nullable().optional()`
- Update schema: `id: z.uuid()` + all other fields optional
- Use `z.uuid()` for IDs, `z.coerce.date()` for dates, `z.string().max(N)` for text
- Export from `packages/core/src/index.ts`

### 4. tRPC Router (`apps/api/src/routers/<entity>.ts`)

Generate a router with these five procedures following the `pet.ts` pattern:

```ts
import { z } from "zod";
import { eq, desc, count as drizzleCount } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, householdProcedure, router, verifyMembership } from "../trpc.js";
import { db, <table> } from "@petforce/db";
import { create<Entity>Schema, update<Entity>Schema, paginationInput } from "@petforce/core";

export const <entity>Router = router({
  listByHousehold: householdProcedure
    .input(paginationInput)
    .query(async ({ ctx, input }) => { /* paginated list with count */ }),

  getById: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => { /* fetch + verify membership */ }),

  create: householdProcedure
    .input(create<Entity>Schema)
    .mutation(async ({ ctx, input }) => { /* insert + return */ }),

  update: protectedProcedure
    .input(z.object({ id: z.uuid(), ...update<Entity>Schema.shape }))
    .mutation(async ({ ctx, input }) => { /* find + verify + update */ }),

  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => { /* find + verify admin + delete */ }),
});
```

### 5. Register in Root Router (`apps/api/src/router.ts`)

Add the import and register the router in the `appRouter` object.

### 6. E2E Test (`tests/e2e/<entity>.test.ts`)

Generate a Playwright test following the `pet-crud.test.ts` pattern:
- Import helpers from `./helpers/api-client`
- Use `test.describe.configure({ mode: "serial" })`
- Tests: create, update, getById, delete, verify deletion
- Clean up test data in each test

## Post-Generation Checklist

After generating, tell the user:
1. Run `pnpm build --filter=@petforce/db --filter=@petforce/core --filter=api` to verify compilation
2. Run `pnpm --filter=@petforce/db db:generate` to create the migration
3. Review the generated SQL in `packages/db/drizzle/`
4. Run `pnpm --filter=@petforce/db db:push` to apply
5. Run `pnpm lint` to verify no lint errors

## Rules

- Never modify existing tables or schemas — only add new ones
- Always use the exact import patterns from existing routers (`.js` extensions)
- Use `householdProcedure` for list/create, `protectedProcedure` for get/update/delete
- Delete requires `requireAdmin` check
- All text fields need max length constraints
