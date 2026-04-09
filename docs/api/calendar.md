<!-- owner: backend -->

# calendar router

[Developer]

Unified calendar that aggregates events from multiple sources: scheduled activities, feeding schedules, health records, pet birthdays, and national pet holidays. No separate calendar entities are stored — all data is pulled live from the source routers.

**Auth level:** `householdProcedure`

---

## Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `calendar.monthEvents` | query | household | All events for a given month, grouped by day |
| `calendar.upcoming` | query | household | Next N upcoming events across all sources |

---

## `calendar.monthEvents` — query

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

## `calendar.upcoming` — query

Get the next N upcoming events across all sources. Used by the dashboard tile.

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

## CalendarEvent shape

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
  scheduledAt: string        // ISO datetime
  completedAt: string | null // ISO datetime, null = not completed
}
```

---

## Related routers

- [activity](./activity.md) — scheduled activities
- [feeding](./feeding.md) — active feeding schedules
- [health](./health.md) — health appointments
- [pet](./pet.md) — pet birthdays via `dateOfBirth`
- [dashboard](./dashboard.md) — upcoming events shown in dashboard tile
