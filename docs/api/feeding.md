<!-- owner: backend -->

# feeding router

[Developer]

Manage daily feeding schedules and track per-day completions. Each pet can have multiple schedules (e.g., morning and evening). Members log completions against a specific date, enabling day-by-day tracking.

**Auth level:** `householdProcedure`

---

## Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `feeding.listSchedules` | query | household | List active feeding schedules for the household |
| `feeding.createSchedule` | mutation | household | Create a new feeding schedule for a pet |
| `feeding.updateSchedule` | mutation | household | Update schedule details or active status |
| `feeding.deleteSchedule` | mutation | household | Delete a schedule |
| `feeding.todayStatus` | query | household | Today's feeding completion status grouped by pet |
| `feeding.logCompletion` | mutation | household | Mark a feeding as done for a specific date |
| `feeding.undoCompletion` | mutation | household | Undo a feeding completion |

---

## `feeding.listSchedules` — query

List all active feeding schedules for the household.

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:** `FeedingSchedule[]` (active only)

---

## `feeding.createSchedule` — mutation

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

## `feeding.updateSchedule` — mutation

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

## `feeding.deleteSchedule` — mutation

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, id: UUID }`
**Returns:** `{ success: true }`

---

## `feeding.todayStatus` — query

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
  pets: PetFeedingStatus[]
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

## `feeding.logCompletion` — mutation

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

## `feeding.undoCompletion` — mutation

Undo a feeding completion.

**Auth:** `householdProcedure`
**Input:** `{ householdId: UUID, feedingLogId: UUID }`
**Returns:** `{ success: true }`

---

## Related routers

- [pet](./pet.md) — pets referenced by feeding schedules
- [calendar](./calendar.md) — active schedules generate calendar events
- [reporting](./reporting.md) — feeding completions counted in reports
- [gamification](./gamification.md) — completions award XP
