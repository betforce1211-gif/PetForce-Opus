<!-- owner: architect -->

# Code Conventions

[Developer]

Shared patterns and conventions across the PetForce monorepo.

---

## Package Naming

- All packages use the `@petforce/` scope: `@petforce/core`, `@petforce/db`, `@petforce/ui`
- Internal dependencies use workspace protocol: `"@petforce/core": "workspace:*"`

## File Organization

### API routers (`apps/api/src/routers/`)

- One file per domain: `pet.ts`, `feeding.ts`, `health.ts`
- Each file exports a single router created with `router({})`
- Routers are combined in `apps/api/src/router.ts`

### Database schema (`packages/db/src/`)

- All tables defined in a single `schema.ts` file
- Migrations managed by `drizzle-kit`
- Schema changes must go through `packages/db/` — no raw SQL in app code

### Shared types (`packages/core/src/`)

- Zod schemas in `schemas.ts` — used for both frontend validation and API input parsing
- TypeScript types inferred from Zod schemas with `z.infer<>`
- Enums and constants shared across all packages

### Components (`packages/ui/src/`)

- Tamagui components for cross-platform (web + mobile)
- Each component in its own file
- Theme tokens support household customization (primaryColor, secondaryColor)

---

## Schema Conventions

### Zod schemas

- Schema names follow the pattern: `create{Entity}Schema`, `update{Entity}Schema`
- Update schemas make all fields optional (partial updates)
- Date fields validated with regex: `YYYY-MM-DD`
- Time fields validated with regex: `HH:mm`
- String fields have explicit min/max length constraints
- UUIDs validated with `z.string().uuid()`

### Example

```ts
export const createPetSchema = z.object({
  name: z.string().min(1).max(100),
  species: z.enum(["dog", "cat", "bird", "fish", "reptile", "other"]),
  breed: z.string().max(100).optional(),
});

export const updatePetSchema = createPetSchema.partial();
```

---

## tRPC Conventions

### Procedure types

| Type | When to use |
|------|-------------|
| `publicProcedure` | No auth required (not currently used) |
| `protectedProcedure` | User-level operations (listing own households, accepting invites) |
| `householdProcedure` | All household-scoped data access |

### Input patterns

- Household-scoped: always include `householdId` in input
- Entity operations: use `{ id: UUID }` for get/delete, `{ id: UUID, ...fields }` for update
- Listing with filters: optional filter fields in the input object

### Response patterns

- Create/Update: return the full entity
- Delete: return `{ success: true }` or the deleted entity
- List: return a paginated array (see pagination below)
- Summary/aggregation: return a typed object

### Pagination

All list endpoints must accept `limit` and `offset` parameters. Default limit: 50, max: 200. No unbounded queries.

```ts
// Input
z.object({
  householdId: z.string().uuid(),
  limit: z.number().min(1).max(200).default(50),
  offset: z.number().min(0).default(0),
})

// Query
const results = await db
  .select()
  .from(table)
  .where(eq(table.householdId, input.householdId))
  .limit(input.limit)
  .offset(input.offset);
```

### Error handling

- Use tRPC error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`, `CONFLICT`
- Throw `TRPCError` with descriptive message
- Permission checks early in the procedure body

---

## Role-Based Access Control

Permissions are checked in router procedures, not middleware:

```ts
// Owner/Admin only
if (!["owner", "admin"].includes(ctx.membership.role)) {
  throw new TRPCError({ code: "FORBIDDEN" });
}
```

| Action | owner | admin | member | sitter |
|--------|-------|-------|--------|--------|
| View data | yes | yes | yes | yes |
| Create/edit pets, records | yes | yes | yes | no |
| Log feedings/activities | yes | yes | yes | yes |
| Manage members | yes | yes | no | no |
| Delete household | yes | no | no | no |
| Regenerate join code | yes | no | no | no |

---

## Naming Conventions

### Files

- Router files: lowercase domain name (`feeding.ts`, `health.ts`)
- Schema files: `schema.ts` (singular)
- Test files: `{feature}.test.ts`
- Helpers: `{purpose}.ts` in a `helpers/` directory

### Variables

- camelCase for variables and functions
- PascalCase for types and interfaces
- UPPER_SNAKE_CASE for environment variables and constants

### Database

- Table names: camelCase plural (`feedingSchedules`, `healthRecords`)
- Column names: camelCase (`petId`, `createdAt`, `scheduledAt`)
- Foreign keys: `{entity}Id` (e.g., `householdId`, `petId`, `memberId`)

---

## Activity Logging

User actions that modify data are logged to the `activityLog` table:

```ts
await db.insert(activityLog).values({
  householdId,
  action: "created",           // created, updated, deleted, completed
  subjectType: "pet",          // entity type
  subjectId: pet.id,
  subjectName: pet.name,
  performedBy: ctx.userId,
  metadata: {},                // optional JSON context
});
```

Not all operations log — focus on user-visible actions (creating pets, completing feedings, updating settings).

---

## Environment Variables

- All env vars in a single root `.env.local`
- Apps load via `dotenv-cli` in their dev scripts
- Test credentials in `tests/.env`
- Never commit `.env` files
- Use `infra/scripts/setup-env.sh` to symlink from `~/.config/petforce/`

---

## Error Handling

- API: throw `TRPCError` — never return error objects in success responses
- Frontend: use tRPC's built-in error handling (`onError`, `isError`)
- Validation: Zod schemas catch bad input before it reaches business logic
- Database: Drizzle throws on constraint violations — catch and map to tRPC errors

---

## Testing

- E2E tests in `tests/e2e/` — Playwright against real services
- Unit tests co-located with source: `*.test.ts` next to the file
- Test data uses `Date.now()` for unique identifiers
- Tests clean up after themselves (afterAll/afterEach)
- Serial mode for tests with shared state: `test.describe.configure({ mode: "serial" })`
