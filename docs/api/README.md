# PetForce API Reference

[Developer]

The PetForce API is a [tRPC](https://trpc.io/) v10 server running on [Hono](https://hono.dev/), available at `http://localhost:3001`. All data is serialized with [SuperJSON](https://github.com/blitz-js/superjson) (handles `Date` objects, etc.).

---

## Auth Model

All requests require a Clerk JWT token in the `Authorization` header:

```
Authorization: Bearer <clerk-jwt-token>
```

The API defines three procedure types:

| Procedure | Auth | Household check | Use case |
|-----------|------|-----------------|----------|
| `publicProcedure` | None | None | Public endpoints (none currently) |
| `protectedProcedure` | Clerk JWT | None | User-level ops (list households, accept invitations) |
| `householdProcedure` | Clerk JWT | Required (`householdId` input) | All household-scoped data |

`householdProcedure` verifies membership on every call and injects `ctx.householdId` and `ctx.membership`. Every household-scoped input must include `householdId: string (UUID)`.

---

## Routers

| Router | Procedures | Auth level | Detail |
|--------|-----------|------------|--------|
| [dashboard](./dashboard.md) | 3 | mixed | Onboarding and dashboard aggregation |
| [household](./household.md) | 6 | mixed | Household CRUD and join-code management |
| [pet](./pet.md) | 5 | protected | Pet CRUD within a household |
| [activity](./activity.md) | 6 | protected | Activity logging (walks, feedings, vet visits) |
| [member](./member.md) | 4 | household | Member management and role assignment |
| [invitation](./invitation.md) | 6 | mixed | Email-based household invitations |
| [access-request](./access-request.md) | 4 | mixed | Join-code-based membership requests |
| [feeding](./feeding.md) | 7 | household | Feeding schedules and completion tracking |
| [health](./health.md) | 9 | household | Health records, vaccinations, and medications |
| [calendar](./calendar.md) | 2 | household | Unified calendar across all event sources |
| [finance](./finance.md) | 9 | household | Expense tracking, budgets, and spending analytics |
| [notification](./notification.md) | 5 | household | Push tokens and notification preferences |
| [notes](./notes.md) | 5 | household | Household and pet-specific notes/journals |
| [reporting](./reporting.md) | 4 | household | Completion logs, trends, and contribution stats |
| [analytics](./analytics.md) | 1 | protected | Usage event tracking |
| [gamification](./gamification.md) | 2 | household | XP, levels, streaks, and badges |

---

## Common Patterns

### Pagination

Paginated endpoints accept `limit` (default 50, max 200) and `offset` parameters. Results include a `totalCount` field.

### Date formats

- Dates: `YYYY-MM-DD` strings
- Month filters: `YYYY-MM` strings
- Timestamps: ISO 8601 strings (e.g., `2024-01-15T09:30:00.000Z`)

### Error codes

| Code | Meaning |
|------|---------|
| `UNAUTHORIZED` | Missing or invalid auth token |
| `FORBIDDEN` | Authenticated but insufficient permissions (not a member, wrong role) |
| `NOT_FOUND` | Resource doesn't exist |
| `BAD_REQUEST` | Invalid input or business rule violation |
| `CONFLICT` | Duplicate resource (already a member, pending request exists) |

### Client usage (web)

```tsx
import { trpc } from "@/lib/trpc";

const { data: pets } = trpc.pet.listByHousehold.useQuery({ householdId: "..." });

const createPet = trpc.pet.create.useMutation();
await createPet.mutateAsync({ householdId: "...", name: "Buddy", species: "dog" });
```

All input validation uses Zod schemas from `@petforce/core`. Invalid inputs throw `BAD_REQUEST` with field-level details.

---

See [docs/dev/conventions.md](../dev/conventions.md) for full tRPC conventions and patterns.
