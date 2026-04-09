<!-- owner: backend -->

# analytics router

[Developer]

Usage event tracking for the PetForce platform. Captures client-side events for product analytics and behavioral insights.

**Auth level:** `protectedProcedure`

---

## Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `analytics.track` | mutation | protected | Record an analytics event |

---

## `analytics.track` — mutation

Record an analytics event. `householdId` and `metadata` are optional — include them when the event is scoped to a household or carries additional context.

**Auth:** `protectedProcedure`
**Input:**

| Field | Type | Required |
|-------|------|----------|
| `eventName` | string (1-100) | yes |
| `householdId` | UUID | no |
| `metadata` | `Record<string, unknown>` | no |

**Returns:** `AnalyticsEvent`

---

## Related routers

- [reporting](./reporting.md) — aggregate completion reporting (separate from event tracking)
- [gamification](./gamification.md) — XP and streaks derived from completion events
