# PetForce API Reference

[Developer]

The PetForce API is a [tRPC](https://trpc.io/) v10 server running on [Hono](https://hono.dev/), available at `http://localhost:3001`. All data is serialized with [SuperJSON](https://github.com/blitz-js/superjson) (handles `Date` objects, etc.).

---

## Table of Contents

- [Authentication](#authentication)
- [Middleware](#middleware)
- [Routers](#routers)
  - [dashboard](#dashboard)
  - [household](#household)
  - [pet](#pet)
  - [activity](#activity)
  - [member](#member)
  - [invitation](#invitation)
  - [accessRequest](#accessrequest)
  - [feeding](#feeding)
  - [health](#health)
  - [calendar](#calendar)
  - [finance](#finance)
- [Common Types](#common-types)
- [Error Codes](#error-codes)

---

## Authentication

All requests require a Clerk JWT token in the `Authorization` header:

```
Authorization: Bearer <clerk-jwt-token>
```

The API extracts `userId` from the token and makes it available as `ctx.userId` in every procedure.

## Middleware

The API defines three procedure types:

| Procedure | Auth | Household | Use case |
|-----------|------|-----------|----------|
| `publicProcedure` | None | None | Public endpoints (none currently) |
| `protectedProcedure` | Required | None | User-level ops (list households, accept invitations) |
| `householdProcedure` | Required | Required (`householdId` input) | All household-scoped data |

**`householdProcedure`** automatically verifies the user is a member of the given household. It adds `ctx.householdId` and `ctx.membership` (the caller's member record) to the context. Every input object for a household procedure must include `householdId: string (UUID)`.

---

## Routers

### dashboard

Onboarding and dashboard data aggregation.

#### `dashboard.myHouseholds` — query

List all households the current user belongs to, with summary counts.

**Auth:** `protectedProcedure`
**Input:** None
**Returns:** `HouseholdSummary[]`

```ts
{ id: string, name: string, theme: object, petCount: number, memberCount: number }
```

---

#### `dashboard.get` — query

Get full dashboard data for a household.

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:**

```ts
{
  household: Household
  members: Member[]
  pets: Pet[]
  recentActivities: Activity[]   // last 20, newest first
  pendingInviteCount: number     // only for owner/admin, 0 otherwise
  pendingRequestCount: number    // only for owner/admin, 0 otherwise
}
```

---

#### `dashboard.onboard` — mutation

Create the user's first household during onboarding. The caller becomes the Owner.

**Auth:** `protectedProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `name` | string (1-100 chars) | yes |
| `displayName` | string (1-50 chars) | yes |
| `theme` | `{ primaryColor, secondaryColor, avatar }` | no |

**Returns:** `Household`

---

### household

CRUD operations for households.

#### `household.list` — query

List all households the current user is a member of.

**Auth:** `protectedProcedure`
**Input:** None
**Returns:** `Household[]`

---

#### `household.getById` — query

Get a single household by ID.

**Auth:** `protectedProcedure`
**Input:** `{ id: string (UUID) }`
**Returns:** `Household | null`

---

#### `household.create` — mutation

Create a new household. The caller becomes the Owner.

**Auth:** `protectedProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `name` | string (1-100 chars) | yes |
| `theme` | `{ primaryColor: hex, secondaryColor: hex, avatar: url \| null }` | no |

**Returns:** `Household`

---

#### `household.update` — mutation

Update household name and/or theme. Theme is merged (partial update).

**Auth:** `protectedProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `id` | string (UUID) | yes |
| `name` | string (1-100 chars) | no |
| `theme` | partial `{ primaryColor, secondaryColor, avatar }` | no |

**Returns:** `Household`

---

#### `household.delete` — mutation

Delete a household and all associated data (cascading).

**Auth:** `protectedProcedure`
**Input:** `{ id: string (UUID) }`
**Returns:** `{ success: true }`

---

#### `household.regenerateJoinCode` — mutation

Generate a new join code for the household. **Owner only.**

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:** `Household` (with new `joinCode`)
**Errors:** `FORBIDDEN` if caller is not owner

---

### pet

CRUD for pets within a household.

#### `pet.listByHousehold` — query

**Auth:** `protectedProcedure`
**Input:** `{ householdId: string (UUID) }`
**Returns:** `Pet[]`

---

#### `pet.getById` — query

**Auth:** `protectedProcedure`
**Input:** `{ id: string (UUID) }`
**Returns:** `Pet | null`

---

#### `pet.create` — mutation

**Auth:** `protectedProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `name` | string (1-100) | yes |
| `species` | `dog \| cat \| bird \| fish \| reptile \| other` | yes |
| `breed` | string (max 100) | no |
| `color` | string (max 50) | no |
| `sex` | `male \| female \| unknown` | no |
| `dateOfBirth` | Date | no |
| `weight` | number (positive) | no |
| `adoptionDate` | Date | no |
| `microchipNumber` | string (max 50) | no |
| `rabiesTagNumber` | string (max 50) | no |
| `medicalNotes` | string (max 5000) | no |

**Returns:** `Pet`

---

#### `pet.update` — mutation

All fields optional (partial update).

**Auth:** `protectedProcedure`
**Input:** `{ id: UUID, ...partial pet fields }`
**Returns:** `Pet`

---

#### `pet.delete` — mutation

**Auth:** `protectedProcedure`
**Input:** `{ id: string (UUID) }`
**Returns:** `{ success: true }`

---

### activity

Log and manage pet activities (walks, feedings, vet visits, etc.).

#### `activity.listByHousehold` — query

**Auth:** `protectedProcedure`
**Input:** `{ householdId: string (UUID) }`
**Returns:** `Activity[]`

---

#### `activity.listByPet` — query

**Auth:** `protectedProcedure`
**Input:** `{ petId: string (UUID) }`
**Returns:** `Activity[]`

---

#### `activity.create` — mutation

**Auth:** `protectedProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `memberId` | UUID | yes |
| `petId` | string | yes |
| `type` | `walk \| feeding \| vet_visit \| medication \| grooming \| play \| other` | yes |
| `title` | string (1-200) | yes |
| `notes` | string (max 2000) | no |
| `scheduledAt` | Date | no |

**Returns:** `Activity`

---

#### `activity.update` — mutation

All fields optional (partial update).

**Auth:** `protectedProcedure`
**Input:** `{ id: UUID, ...partial activity fields }`
**Returns:** `Activity`

---

#### `activity.complete` — mutation

Mark an activity as completed (sets `completedAt` to now).

**Auth:** `protectedProcedure`
**Input:** `{ id: string (UUID) }`
**Returns:** `Activity`

---

#### `activity.delete` — mutation

**Auth:** `protectedProcedure`
**Input:** `{ id: string (UUID) }`
**Returns:** `{ success: true }`

---

### member

Manage household members and their roles.

All member endpoints use `householdProcedure` — the `householdId` is implicit.

#### `member.listByHousehold` — query

List all members of the household.

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:** `Member[]`

---

#### `member.invite` — mutation

Add a user directly as a member. **Owner or Admin only.**

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `userId` | string | yes |
| `role` | `admin \| member \| sitter` | yes |
| `displayName` | string (1-50) | yes |

**Returns:** `Member`
**Errors:** `FORBIDDEN` (not owner/admin), `CONFLICT` (already a member)

---

#### `member.updateRole` — mutation

Change a member's role. **Owner or Admin only.**

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `memberId` | UUID | yes |
| `role` | `owner \| admin \| member \| sitter` | yes |

**Returns:** `Member`

---

#### `member.remove` — mutation

Remove a member from the household. **Owner or Admin only.** Cannot remove the last owner.

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, memberId: UUID }`
**Returns:** `{ success: true }`
**Errors:** `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST` (last owner)

---

### invitation

Email-based invitations to join a household.

#### `invitation.create` — mutation

Create an invitation link. **Owner or Admin only.** Expires in 7 days.

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `email` | string (email) | no |
| `role` | `admin \| member \| sitter` | yes |

**Returns:** `Invitation` (includes `token` for the invite link)

---

#### `invitation.listByHousehold` — query

List all invitations for the household. **Owner or Admin only.**

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:** `Invitation[]`

---

#### `invitation.getByToken` — query

Look up an invitation by its token (used on the join page).

**Auth:** `protectedProcedure`
**Input:** `{ token: string }`
**Returns:** `Invitation & { householdName: string }`

---

#### `invitation.accept` — mutation

Accept an invitation and become a member with the invited role.

**Auth:** `protectedProcedure`
**Input:** `{ token: string }`
**Returns:** `Member`
**Errors:** `NOT_FOUND`, `BAD_REQUEST` (already used/expired), `CONFLICT` (already a member)

---

#### `invitation.decline` — mutation

Decline a pending invitation.

**Auth:** `protectedProcedure`
**Input:** `{ token: string }`
**Returns:** `{ success: true }`

---

#### `invitation.revoke` — mutation

Revoke a pending invitation. **Owner or Admin only.**

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, invitationId: UUID }`
**Returns:** `Invitation`

---

### accessRequest

Join-code-based requests to join a household (requires approval).

#### `accessRequest.create` — mutation

Submit a request to join a household using its join code.

**Auth:** `protectedProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `joinCode` | string | yes |
| `displayName` | string (1-50) | yes |
| `message` | string (max 500) | no |

**Returns:** `AccessRequest`
**Errors:** `NOT_FOUND` (bad code), `CONFLICT` (already member or pending request)

---

#### `accessRequest.listByHousehold` — query

List pending access requests. **Owner or Admin only.**

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:** `AccessRequest[]` (pending only)

---

#### `accessRequest.approve` — mutation

Approve a request — the requester becomes a `member`. **Owner or Admin only.**

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, requestId: UUID }`
**Returns:** `Member`

---

#### `accessRequest.deny` — mutation

Deny a request. **Owner or Admin only.**

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, requestId: UUID }`
**Returns:** `{ success: true }`

---

### feeding

Manage daily feeding schedules and track completions.

#### `feeding.listSchedules` — query

List all active feeding schedules for the household.

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:** `FeedingSchedule[]` (active only)

---

#### `feeding.createSchedule` — mutation

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `petId` | UUID | yes |
| `label` | string (1-50) | yes |
| `time` | string `HH:mm` | yes |
| `foodType` | string (max 100) | no |
| `amount` | string (max 100) | no |
| `notes` | string (max 500) | no |

**Returns:** `FeedingSchedule`

---

#### `feeding.updateSchedule` — mutation

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `id` | UUID | yes |
| `label` | string (1-50) | no |
| `time` | string `HH:mm` | no |
| `foodType` | string (max 100) | no |
| `amount` | string (max 100) | no |
| `notes` | string (max 500) | no |
| `isActive` | boolean | no |

**Returns:** `FeedingSchedule`

---

#### `feeding.deleteSchedule` — mutation

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID }`
**Returns:** `{ success: true }`

---

#### `feeding.todayStatus` — query

Get today's feeding completion status grouped by pet. Used by the dashboard tile.

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `date` | string `YYYY-MM-DD` | no (defaults to today) |

**Returns:**

```ts
{
  date: string                    // "YYYY-MM-DD"
  pets: PetFeedingStatus[]        // grouped by pet
  totalScheduled: number
  totalCompleted: number
}

// PetFeedingStatus
{
  petId: string
  petName: string
  schedules: {
    schedule: FeedingSchedule
    log: FeedingLog | null       // null = not yet fed
  }[]
}
```

---

#### `feeding.logCompletion` — mutation

Mark a feeding as done for a specific date.

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `feedingScheduleId` | UUID | yes |
| `feedingDate` | string `YYYY-MM-DD` | yes |
| `notes` | string (max 500) | no |

**Returns:** `FeedingLog`

---

#### `feeding.undoCompletion` — mutation

Undo a feeding completion.

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, feedingLogId: UUID }`
**Returns:** `{ success: true }`

---

### health

Manage health records (vet visits, vaccinations, checkups, procedures) and medications.

#### `health.listRecords` — query

List all health records, optionally filtered by type.

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `type` | `vet_visit \| vaccination \| checkup \| procedure` | no |

**Returns:** `HealthRecord[]`

---

#### `health.createRecord` — mutation

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `petId` | UUID | yes |
| `type` | `vet_visit \| vaccination \| checkup \| procedure` | yes |
| `date` | Date | yes |
| `vetOrClinic` | string (max 200) | no |
| `reason` | string (max 500) | no |
| `notes` | string (max 2000) | no |
| `cost` | number (>= 0) | no |
| `vaccineName` | string (max 200) | no |
| `nextDueDate` | Date | no |

**Returns:** `HealthRecord`

---

#### `health.updateRecord` — mutation

All fields optional (partial update).

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID, ...partial fields }`
**Returns:** `HealthRecord`

---

#### `health.deleteRecord` — mutation

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID }`
**Returns:** `{ success: true }`

---

#### `health.listMedications` — query

List medications, optionally only active ones.

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `activeOnly` | boolean | no |

**Returns:** `Medication[]`

---

#### `health.createMedication` — mutation

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `petId` | UUID | yes |
| `name` | string (1-200) | yes |
| `dosage` | string (max 100) | no |
| `frequency` | string (max 100) | no |
| `startDate` | Date | no |
| `endDate` | Date | no |
| `prescribedBy` | string (max 200) | no |
| `notes` | string (max 2000) | no |

**Returns:** `Medication`

---

#### `health.updateMedication` — mutation

All fields optional.

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID, ...partial fields }`
**Returns:** `Medication`

---

#### `health.deleteMedication` — mutation

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID }`
**Returns:** `{ success: true }`

---

#### `health.summary` — query

Get health dashboard summary: active medication count, overdue vaccination count, next appointment.

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:**

```ts
{
  activeMedicationCount: number
  overdueVaccinationCount: number
  nextAppointment: {
    petName: string
    date: string        // ISO date
    reason: string | null
  } | null
}
```

---

### calendar

Unified calendar combining activities, feedings, health records, birthdays, and pet holidays.

#### `calendar.monthEvents` — query

Get all events for a given month, grouped by day.

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `month` | string `YYYY-MM` | yes |

**Returns:**

```ts
{
  month: string                          // "YYYY-MM"
  days: Record<string, CalendarEvent[]>  // key = "YYYY-MM-DD"
}
```

**Event sources included:**
- Scheduled activities
- Active feeding schedules (one event per day per schedule)
- Health records (vet visits, vaccinations, checkups, procedures)
- Pet birthdays (calculated from `dateOfBirth`)
- Pet holidays (150+ national pet awareness days)

---

#### `calendar.upcoming` — query

Get the next N upcoming events across all sources (used by the dashboard tile).

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `limit` | number (1-20) | no (default: 5) |

**Returns:**

```ts
{
  events: CalendarEvent[]    // sorted by scheduledAt ascending
  totalUpcoming: number      // total before trimming to limit
}
```

**Includes:** Future activities (not yet completed), today's remaining feedings, future health appointments, pet birthdays within 30 days, pet holidays within 7 days.

---

#### CalendarEvent shape

```ts
{
  id: string
  kind: "activity" | "feeding" | "birthday" | "holiday" | "health"
  title: string
  petId: string
  petName: string
  memberId: string | null
  memberName: string | null
  type: string               // activity type, health record type, or special types
  scheduledAt: string         // ISO datetime
  completedAt: string | null  // ISO datetime, null = not completed
}
```

---

### finance

Track pet expenses and view spending analytics. Merges general expenses with health record costs.

#### `finance.listExpenses` — query

List all expenses, optionally filtered by pet.

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `petId` | UUID | no |

**Returns:** `Expense[]`

---

#### `finance.createExpense` — mutation

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `petId` | UUID | yes |
| `category` | `food \| treats \| toys \| grooming \| boarding \| insurance \| supplies \| training \| other` | yes |
| `description` | string (1-200) | yes |
| `amount` | number (positive) | yes |
| `date` | Date | yes |
| `notes` | string (max 2000) | no |

**Returns:** `Expense`

---

#### `finance.updateExpense` — mutation

All fields optional.

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID, ...partial fields }`
**Returns:** `Expense`

---

#### `finance.deleteExpense` — mutation

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID }`
**Returns:** `{ success: true }`

---

#### `finance.summary` — query

Get monthly spending summary with breakdowns. **Automatically includes health record costs** (vet visits, vaccinations, etc. with a `cost` field).

**Auth:** `householdProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `householdId` | UUID | yes |
| `month` | string `YYYY-MM` | no (defaults to current month) |

**Returns:**

```ts
{
  monthlyTotal: number                    // expenses + health costs
  previousMonthTotal: number              // for comparison
  byCategory: { category: string, total: number }[]   // sorted by total desc
  byPet: { petId: string, petName: string, total: number }[]
  recentExpenses: FinanceSummaryItem[]    // last 5 items
}

// FinanceSummaryItem
{
  id: string
  description: string
  amount: number
  date: string           // ISO date
  category: string       // expense category or health record type
  petId: string
  petName: string
  source: "expense" | "health"   // where the cost came from
}
```

---

## Common Types

### Enums

| Type | Values |
|------|--------|
| Member roles | `owner`, `admin`, `member`, `sitter` |
| Pet species | `dog`, `cat`, `bird`, `fish`, `reptile`, `other` |
| Pet sex | `male`, `female`, `unknown` |
| Activity types | `walk`, `feeding`, `vet_visit`, `medication`, `grooming`, `play`, `other` |
| Health record types | `vet_visit`, `vaccination`, `checkup`, `procedure` |
| Expense categories | `food`, `treats`, `toys`, `grooming`, `boarding`, `insurance`, `supplies`, `training`, `other` |
| Invitation status | `pending`, `accepted`, `declined`, `expired` |
| Access request status | `pending`, `approved`, `denied` |
| Calendar event kinds | `activity`, `feeding`, `birthday`, `holiday`, `health` |

## Error Codes

The API uses standard tRPC error codes:

| Code | Meaning |
|------|---------|
| `UNAUTHORIZED` | Missing or invalid auth token |
| `FORBIDDEN` | Authenticated but insufficient permissions (not a member, wrong role) |
| `NOT_FOUND` | Resource doesn't exist |
| `BAD_REQUEST` | Invalid input or business rule violation |
| `CONFLICT` | Duplicate resource (already a member, pending request exists) |

## Usage from the Web App

```tsx
import { trpc } from "@/lib/trpc";

// Query
const { data: pets } = trpc.pet.listByHousehold.useQuery({
  householdId: "...",
});

// Mutation
const createPet = trpc.pet.create.useMutation();
await createPet.mutateAsync({
  householdId: "...",
  name: "Buddy",
  species: "dog",
});
```

All input validation is handled by Zod schemas defined in `@petforce/core`. Invalid inputs will throw a `BAD_REQUEST` error with field-level details.
