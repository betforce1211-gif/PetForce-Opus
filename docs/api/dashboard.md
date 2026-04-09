<!-- owner: backend -->

# dashboard router

[Developer]

Onboarding flow and dashboard data aggregation. Provides the entry point for listing a user's households and fetching full household dashboard state.

**Auth level:** mixed (`protectedProcedure` for user-level ops, `householdProcedure` for household-scoped data)

---

## Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `dashboard.myHouseholds` | query | protected | List all households the current user belongs to |
| `dashboard.get` | query | household | Full dashboard data for a household |
| `dashboard.onboard` | mutation | protected | Create the user's first household during onboarding |

---

## `dashboard.myHouseholds` — query

List all households the current user belongs to, with summary counts.

**Auth:** `protectedProcedure`
**Input:** None
**Returns:** `HouseholdSummary[]`

```ts
{ id: string, name: string, theme: object, petCount: number, memberCount: number }
```

---

## `dashboard.get` — query

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

## `dashboard.onboard` — mutation

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

## Related routers

- [household](./household.md) — full household CRUD
- [member](./member.md) — member management
- [pet](./pet.md) — pet management
- [activity](./activity.md) — activity log
