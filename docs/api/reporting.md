<!-- owner: backend -->

# reporting router

[Developer]

Aggregate completion data (feedings, medications, activities) over configurable date ranges. Provides raw completion logs, per-member contribution breakdowns, time-series trends, and summary statistics.

**Auth level:** `householdProcedure`

---

## Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `reporting.completionLog` | query | household | Paginated list of all task completions in a date range |
| `reporting.contributions` | query | household | Per-member breakdown of task completions |
| `reporting.trends` | query | household | Completion counts over time (daily or weekly) |
| `reporting.summary` | query | household | Comprehensive stats for a date range |

---

## `reporting.completionLog` — query

**Auth:** `householdProcedure`
**Input:** `{ householdId, from, to, memberId?, petId?, taskType?, limit?, offset? }`
**Returns:** `TaskCompletionEntry[]` sorted by `completedAt` desc

```ts
{
  id: string
  taskType: "feeding" | "medication" | "activity"
  title: string
  petName: string
  memberName: string
  completedAt: string
  skipped: boolean
}
```

Pagination: `limit` (1-200), `offset`.

---

## `reporting.contributions` — query

Per-member breakdown over a date range.

**Auth:** `householdProcedure`
**Input:** `{ householdId, from: YYYY-MM-DD, to: YYYY-MM-DD }`
**Returns:** `MemberContribution[]`

```ts
{
  memberId: string
  memberName: string
  completed: number
  skipped: number
  byType: {
    feeding: { completed: number, skipped: number }
    medication: { completed: number, skipped: number }
    activity: { completed: number, skipped: number }
  }
}
```

---

## `reporting.trends` — query

Completion counts bucketed by day or week.

**Auth:** `householdProcedure`
**Input:** `{ householdId, from, to, granularity?: "daily" | "weekly" }`
**Returns:** `TrendDataPoint[]`

```ts
{
  date: string     // YYYY-MM-DD (start of period)
  completed: number
  skipped: number
}
```

---

## `reporting.summary` — query

Comprehensive stats for a date range.

**Auth:** `householdProcedure`
**Input:** `{ householdId, from: YYYY-MM-DD, to: YYYY-MM-DD }`
**Returns:**

```ts
{
  totalCompleted: number
  skipped: number
  missed: number
  expected: number
  completionRate: number         // 0-100 percentage
  topContributor: string | null  // member name
  contributions: MemberContribution[]
}
```

---

## Related routers

- [feeding](./feeding.md) — feeding completions counted in reports
- [health](./health.md) — medication completions counted in reports
- [activity](./activity.md) — activity completions counted in reports
- [member](./member.md) — contributions broken down by member
- [gamification](./gamification.md) — completion data drives XP and streaks
