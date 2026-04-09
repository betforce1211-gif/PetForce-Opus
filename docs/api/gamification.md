<!-- owner: backend -->

# gamification router

[Developer]

XP, levels, streaks, and badges for members, the household as a whole, and individual pets. Stats are derived from completion history and can be rebuilt on demand via `recalculate`.

**Auth level:** `householdProcedure`

---

## Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `gamification.getStats` | query | household | Full gamification data for all entities in the household |
| `gamification.recalculate` | mutation | household | Rebuild all gamification stats from completion history |

---

## `gamification.getStats` — query

Get full gamification data for all entities in the household.

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:**

```ts
{
  members: MemberGameStats[]
  household: HouseholdGameStats
  pets: PetGameStats[]
  currentUserId: string
}

// Each stats object (member, household, pet) includes:
{
  level: number
  levelName: string
  totalXp: number
  xpToNextLevel: number
  currentStreak: number
  longestStreak: number
  unlockedBadgeIds: string[]
}
```

---

## `gamification.recalculate` — mutation

Rebuild all gamification stats from completion history. Use when stats appear incorrect or after bulk data imports.

**Auth:** `householdProcedure`
**Input:** `{ householdId: string }`
**Returns:** `{ success: true }`

---

## Related routers

- [feeding](./feeding.md) — feeding completions award XP
- [activity](./activity.md) — activity completions award XP
- [reporting](./reporting.md) — completion history is the source of truth for XP
- [notification](./notification.md) — achievement unlocks trigger push notifications when `achievementAlerts` is enabled
