<!-- owner: backend -->

# activity router

[Developer]

Log and manage pet activities: walks, feedings, vet visits, medications, grooming, play, and more. Activities support scheduling (future `scheduledAt`) and completion tracking.

**Auth level:** `protectedProcedure`

---

## Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `activity.listByHousehold` | query | protected | All activities for a household |
| `activity.listByPet` | query | protected | All activities for a specific pet |
| `activity.create` | mutation | protected | Log a new activity |
| `activity.update` | mutation | protected | Update activity fields (partial) |
| `activity.complete` | mutation | protected | Mark an activity as completed |
| `activity.delete` | mutation | protected | Remove an activity |

---

## `activity.listByHousehold` — query

**Auth:** `protectedProcedure`
**Input:** `{ householdId: string (UUID) }`
**Returns:** `Activity[]`

---

## `activity.listByPet` — query

**Auth:** `protectedProcedure`
**Input:** `{ petId: string (UUID) }`
**Returns:** `Activity[]`

---

## `activity.create` — mutation

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

## `activity.update` — mutation

All fields optional (partial update). `id` is always required.

**Auth:** `protectedProcedure`
**Input:** `{ id: UUID, ...partial activity fields }`
**Returns:** `Activity`

---

## `activity.complete` — mutation

Mark an activity as completed. Sets `completedAt` to the current timestamp.

**Auth:** `protectedProcedure`
**Input:** `{ id: string (UUID) }`
**Returns:** `Activity`

---

## `activity.delete` — mutation

**Auth:** `protectedProcedure`
**Input:** `{ id: string (UUID) }`
**Returns:** `{ success: true }`

---

## Key types

```ts
// Activity type enum
type ActivityType = "walk" | "feeding" | "vet_visit" | "medication" | "grooming" | "play" | "other"
```

---

## Related routers

- [dashboard](./dashboard.md) — recent activities shown in dashboard
- [calendar](./calendar.md) — scheduled activities appear in calendar
- [reporting](./reporting.md) — activity completion counts in reports
- [gamification](./gamification.md) — completions award XP
