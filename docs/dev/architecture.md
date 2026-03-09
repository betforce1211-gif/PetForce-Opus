# System Architecture

[Developer]

This document describes the PetForce system architecture, domain model, data flow, and cross-package relationships.

---

## High-Level Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Next.js Web   │────>│  Hono + tRPC │────>│  Supabase        │
│   (port 3000)   │     │  API Server  │     │  PostgreSQL      │
└─────────────────┘     │  (port 3001) │     └──────────────────┘
                        └──────┬───────┘              │
┌─────────────────┐            │              ┌──────────────────┐
│   Expo Mobile   │────────────┘              │  Supabase        │
│   (React Native)│                           │  Storage (S3)    │
└─────────────────┘                           └──────────────────┘
         │
   ┌─────────────┐
   │   Clerk     │  ← Auth provider for all clients
   └─────────────┘
```

All clients (web, mobile) communicate with a single tRPC API server. The API server owns all database access through Drizzle ORM. No client talks to the database directly.

---

## Domain Model

The core domain centers on the **Household** — a shared collaboration space for pet care.

```
Household
  ├── name, theme (JSONB: primaryColor, secondaryColor, avatar)
  ├── joinCode (for access requests)
  │
  ├── Members (userId, role, displayName)
  │     └── role: owner | admin | member | sitter
  │
  ├── Pets (name, species, breed, medical info, photo)
  │     ├── Activities (walk, feeding, vet_visit, medication, grooming, play)
  │     ├── FeedingSchedules → FeedingLogs, FeedingSnoozes
  │     ├── HealthRecords (vet_visit, vaccination, checkup, procedure)
  │     ├── Medications → MedicationLogs, MedicationSnoozes
  │     ├── Expenses (food, treats, toys, grooming, etc.)
  │     ├── PetNotes (pet-specific journal entries)
  │     └── PetGameStats (XP, level, badges)
  │
  ├── PetNotes (household-level notes, petId = null)
  ├── Invitations (email-based, token, 7-day expiry)
  ├── AccessRequests (join-code-based, requires approval)
  ├── ActivityLog (audit trail of all actions)
  ├── AnalyticsEvents (usage tracking)
  ├── HouseholdGameStats (collective XP, badges)
  └── MemberGameStats (per-member XP, streaks, badges)
```

### Key relationships

- Every data entity belongs to a **Household** (enforced at the DB and middleware level)
- **Pets** belong to a Household, not a Member
- **Activities** reference both a Pet and the Member who logged them
- **FeedingLogs** and **MedicationLogs** track daily completions, linked to schedules
- **Expenses** and **HealthRecords** with costs both feed into the Finance summary
- **Gamification** stats are denormalized (recalculated from completion history)

---

## Package Dependency Graph

```
apps/web ──────┐
apps/mobile ───┤
               ├──> packages/core (types, Zod schemas, business logic)
apps/api ──────┤──> packages/db   (Drizzle schema, PostgreSQL client)
               └──> packages/ui   (Tamagui shared components)

packages/ui ──────> packages/core (types for component props)
packages/db ──────> packages/core (shared enums, types)
```

### Package responsibilities

| Package | Owns | Does NOT own |
|---------|------|-------------|
| `@petforce/core` | Zod schemas, TypeScript types, enums, shared constants | Database access, UI |
| `@petforce/db` | Drizzle schema, migrations, DB client, connection pool | Business logic |
| `@petforce/ui` | Tamagui components, theme tokens, household theming | Data fetching |
| `apps/api` | tRPC routers, middleware, auth verification, business logic | UI rendering |
| `apps/web` | Next.js pages, layouts, client-side state, tRPC hooks | Database access |
| `apps/mobile` | Expo screens, native navigation, push notifications | Database access |

---

## Data Flow

### Request lifecycle

1. **Client** makes a tRPC call (query or mutation)
2. **Hono** receives the HTTP request, passes to tRPC handler
3. **Auth middleware** (`protectedProcedure`) extracts and verifies the Clerk JWT
4. **Household middleware** (`householdProcedure`) verifies the user is a member of the requested household
5. **Router procedure** executes business logic using Drizzle ORM
6. **Response** is serialized with SuperJSON and returned

### Auth flow

```
Client → Clerk SDK → Clerk hosted auth → JWT issued → Client stores JWT
Client → API request with Bearer JWT → API verifies via CLERK_JWT_KEY → ctx.userId set
```

Clerk test mode: emails with `+clerk_test` suffix use OTP code `424242` — no real email verification.

### Household scoping

Every household-scoped query filters by `householdId`. The `householdProcedure` middleware:
1. Validates `householdId` is a valid UUID in the input
2. Looks up the caller's membership in that household
3. Adds `ctx.householdId` and `ctx.membership` to the procedure context
4. Rejects with `FORBIDDEN` if not a member

---

## Database Design

### Schema location

All tables are defined in `packages/db/src/schema.ts` using Drizzle ORM.

### 20 tables

| Table | Purpose |
|-------|---------|
| `households` | Core entity — name, theme (JSONB), joinCode |
| `members` | User-household membership with role |
| `pets` | Pet profiles with all metadata |
| `activities` | Logged activities (walks, play, etc.) |
| `invitations` | Email invitations with token and expiry |
| `accessRequests` | Join-code requests pending approval |
| `feedingSchedules` | Recurring feeding plans |
| `feedingLogs` | Daily feeding completion records |
| `feedingSnoozes` | Snoozed feeding notifications |
| `healthRecords` | Vet visits, vaccinations, checkups, procedures |
| `medications` | Active/past medication tracking |
| `medicationLogs` | Daily medication completion records |
| `medicationSnoozes` | Snoozed medication reminders |
| `expenses` | Financial expense records |
| `petNotes` | Notes/journals (household or pet-specific) |
| `memberGameStats` | Per-member gamification (XP, level, streaks) |
| `householdGameStats` | Household-level gamification |
| `petGameStats` | Per-pet gamification |
| `activityLog` | Audit trail of all user actions |
| `analyticsEvents` | Usage analytics tracking |

### Conventions

- All tables use UUID primary keys (Drizzle `uuid().defaultRandom()`)
- Timestamps use `timestamp().defaultNow()`
- Soft deletes are used for feeding schedules (`isActive` flag)
- Theme data is stored as JSONB
- Badge unlocks are stored as JSONB arrays of badge IDs
- All foreign keys cascade on delete through the household

---

## API Router Architecture

15 routers, each in its own file under `apps/api/src/routers/`:

| Router | Procedures | Auth level |
|--------|-----------|------------|
| dashboard | 4 | mixed (protected + household) |
| household | 6 | mixed |
| pet | 5 | mixed |
| activity | 6 | mixed |
| member | 4 | household |
| invitation | 6 | mixed |
| accessRequest | 4 | mixed |
| feeding | 9 | household |
| health | 13 | household |
| calendar | 2 | household |
| finance | 5 | household |
| notes | 5 | household |
| reporting | 4 | household |
| analytics | 1 | protected |
| gamification | 2 | household |

Total: **97 procedures** across 15 routers.

---

## Gamification System

Gamification is event-driven but lazily recalculated:

1. Feeding/medication completions accumulate XP
2. `gamification.recalculate` mutation rebuilds all stats from completion history
3. Stats stored in denormalized tables (memberGameStats, householdGameStats, petGameStats)
4. Badges are unlocked based on XP thresholds and streak milestones
5. Levels are calculated from total XP

---

## Calendar System

The calendar aggregates events from 5 sources into a unified view:

1. **Activities** — scheduled walks, play, grooming, etc.
2. **Feeding schedules** — one event per active schedule per day
3. **Health records** — vet visits, vaccinations with dates
4. **Pet birthdays** — calculated from `dateOfBirth`
5. **Pet holidays** — 150+ national pet awareness days (hardcoded)

Events are normalized into a `CalendarEvent` shape with `kind`, `title`, `petName`, and `scheduledAt`.

---

## Reporting System

Reporting queries aggregate completion data (feedings, medications, activities) over configurable date ranges:

- **completionLog** — paginated list of all completions
- **contributions** — per-member breakdown (completed, skipped, by type)
- **trends** — daily or weekly completion counts over time
- **summary** — overall stats with completion rate percentage
