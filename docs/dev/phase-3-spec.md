# Phase 3 Feature Specification

[Developer]

**Status:** Active — Sprint 3 (gamification + finance) in progress
**Owner:** Product Manager
**PRD:** `docs/exec-plans/active/sprint-3-gamification-finance.md`
**Date:** 2026-04-01

---

## Scope

Phase 3 covers three feature areas per product principles (#12: "Earn the Right to Complexity"):

| Area | Sprint | Status |
|------|--------|--------|
| **Gamification** — XP awards, streaks, badges, leaderboards | Sprint 3 (current) | In progress |
| **Household Finance** — budgets, alerts, dashboard | Sprint 3 (current) | Todo |
| **Offline Support** — offline-first data sync | Sprint 4 (Phase 3b) | Not started |

Phase 3 assumes Phase 1 (profiles + care logging) and Phase 2 (schedules + health tracking) are stable. If Phase 2 has open bugs, those block Phase 3 work.

---

## Sprint 3 Scope: Gamification + Finance

### What's Already Shipped

Before Sprint 3 started, the following gamification and finance infrastructure was built:

**Gamification (shipped):**
- 5 tables: `memberGameStats`, `householdGameStats`, `petGameStats`, `achievements`, `memberAchievements`
- 149 badges across member/household/pet groups, 6 categories each
- XP system: feeding 10 XP, medication 15 XP, activity 20 XP, polynomial level curve (100 levels)
- 8 species-specific level name tracks with 100 names each
- 6 tRPC procedures: `getStats`, `recalculate`, `leaderboard`, `achievements`, `memberAchievements`, `recentAchievements`
- Web dashboard tile (3-view toggle) + full modal (Members/Household/Pets tabs, badge grid)
- 4 Playwright E2E tests
- `computeStreaks` helper with current + longest tracking

**Finance (shipped):**
- `expenses` table with 9 categories
- 5 tRPC procedures: `listExpenses`, `createExpense`, `updateExpense`, `deleteExpense`, `summary`
- Monthly summary with month-over-month trends, category/pet breakdowns
- Health cost auto-integration (vet visits, medications roll into finance totals)
- Web Finance tab with overview, expense list, add form

### Sprint 3 User Stories

---

#### US-G1: Inline XP Awards on Activity Creation
**Ticket:** PET-146 (critical, integration engineer, in progress)

**Problem:** XP is currently batch-recalculated. Users get no instant feedback when they log care.

**Spec:** When a member logs a feeding, medication, or activity, award XP inline in the same request:
- Increment `memberGameStats.totalXp` by the XP value (10/15/20)
- Recalculate level if XP crosses threshold
- Extend or reset streak based on date gap
- Evaluate badge rules — insert new unlocks into `memberAchievements`
- Invalidate gamification cache for the household
- Return `{ xpAwarded, newLevel, newBadges[] }` in the mutation response

**Acceptance Criteria:**
- [ ] `feeding.logFeeding` returns `xpAwarded` (10) and updates `memberGameStats`
- [ ] `health.logMedication` returns `xpAwarded` (15) and updates `memberGameStats`
- [ ] `activity.create` returns `xpAwarded` (20) and updates `memberGameStats`
- [ ] Level recalculates correctly when XP crosses a level boundary
- [ ] Streak extends when logging on consecutive days
- [ ] Streak resets when there's a gap > 1 day
- [ ] Newly unlocked badges are returned in `newBadges[]`
- [ ] `petGameStats` and `householdGameStats` are also updated inline
- [ ] Periodic `recalculate` still works as a fallback/consistency check
- [ ] No duplicate XP on retry (idempotency via activity dedup)

---

#### US-G1b: Gamification Config Table & Feature Flags
**Ticket:** PET-147 (critical, integration engineer, todo)

**Problem:** No way to tune XP values, disable gamification, or run double-XP events without a deploy.

**Spec:** New `gamification_config` table:
```
gamification_config
  id: uuid PK
  householdId: uuid FK → households (unique)
  enabled: boolean (default true)
  xpMultiplier: real (default 1.0)
  streakGracePeriodHours: integer (default 0)
  createdAt, updatedAt
```

New tRPC procedures:
- `gamification.getConfig` — returns config for household (creates default row if missing)
- `gamification.updateConfig` — admin/owner only, partial update via Zod `.partial()`

**Acceptance Criteria:**
- [ ] Config table is created via Drizzle migration (not `push`)
- [ ] `getConfig` returns defaults for households with no explicit config
- [ ] `updateConfig` is restricted to admin/owner roles
- [ ] `enabled: false` prevents XP awards on activity creation (US-G1 respects this flag)
- [ ] `xpMultiplier` scales XP awards (e.g., 2.0 = double XP)
- [ ] `streakGracePeriodHours` extends the streak window (e.g., 6 = 30 hours instead of 24)
- [ ] Zod schemas added to `@petforce/core`
- [ ] Member/sitter roles cannot update config (returns FORBIDDEN)

---

#### US-F1: Household & Pet Budgets
**Ticket:** PET-149 (critical, full-stack engineer, todo)

**Problem:** Households track expenses but can't set spending targets.

**Spec:** New `budgets` table:
```
budgets
  id: uuid PK
  householdId: uuid FK → households
  petId: uuid FK → pets (nullable — null = household-wide)
  period: text enum ["monthly", "yearly"]
  amount: real NOT NULL
  category: text (nullable — null = all categories)
  createdAt, updatedAt

  unique(householdId, petId, period, category)
```

New tRPC procedures:
- `finance.listBudgets` — returns all budgets for household
- `finance.setBudget` — upsert (admin/owner only)
- `finance.deleteBudget` — remove a budget (admin/owner only)
- `finance.budgetStatus` — for each budget: amount, spent this period, remaining, percentage

**Acceptance Criteria:**
- [ ] Budgets table created via Drizzle migration
- [ ] Household-wide budget (petId = null) tracks total spending
- [ ] Per-pet budgets track spending for a specific pet
- [ ] Per-category budgets (e.g., $200/month for food) work correctly
- [ ] `budgetStatus` calculates spent amount from both `expenses` and health record costs
- [ ] Unique constraint prevents duplicate budget scopes
- [ ] Only admin/owner can create/update/delete budgets
- [ ] Zod schemas added to `@petforce/core`

---

#### US-F2: Budget Alerts
**Ticket:** PET-149 (part of same ticket as US-F1)

**Problem:** No proactive notification when spending exceeds plan.

**Spec:** On expense creation/update, check budget thresholds:
- 80% threshold: warning notification
- 100% threshold: exceeded notification

Alert delivery:
- Return alert flag in `createExpense` / `updateExpense` response
- Store in-app notification (when notification infrastructure exists)
- Budget status badge on Finance tab (yellow at 80%, red at 100%)

**Acceptance Criteria:**
- [ ] `createExpense` returns `{ budgetAlerts: [{ budgetId, threshold, spent, limit }] }` when thresholds crossed
- [ ] Alert fires at 80% and 100% thresholds
- [ ] Alerts are idempotent — don't re-alert for same threshold in same period
- [ ] Per-pet and per-category budgets evaluated independently
- [ ] Alert includes human-readable message (e.g., "You've used 80% of your $200 monthly food budget")

---

#### US-S1: Notification Preferences Infrastructure
**Ticket:** PET-148 (high, full-stack engineer, todo)

**Problem:** Multiple features need per-member notification controls. Build the shared layer once.

**Spec:** New `notification_preferences` table:
```
notification_preferences
  id: uuid PK
  memberId: uuid FK → members (unique)
  householdId: uuid FK → households
  gamificationAlerts: boolean (default true)
  budgetAlerts: boolean (default true)
  streakReminders: boolean (default true)
  quietHoursStart: time (nullable)
  quietHoursEnd: time (nullable)
  createdAt, updatedAt
```

New tRPC procedures:
- `notifications.getPreferences` — returns prefs (creates default row if missing)
- `notifications.updatePreferences` — partial update, any member can update their own

**Acceptance Criteria:**
- [ ] Table created via Drizzle migration
- [ ] Default preferences are all-enabled when no row exists
- [ ] Members can only read/update their own preferences (not other members')
- [ ] Quiet hours respected: no notifications between start and end times
- [ ] Zod schemas in `@petforce/core`
- [ ] Downstream features (streak reminders, budget alerts) check preferences before sending

---

#### US-G2: Celebration Animations & Badge Detail
**Ticket:** PET-151 (medium, UX designer — wireframes first, then frontend)

**Problem:** Badge unlocks happen silently. No reward moment.

**Spec:**
- Toast/overlay on badge unlock: badge icon, name, description
- Auto-dismiss after 4 seconds, tappable to expand
- Badge detail view: icon, name, description, unlock criteria, date unlocked, rarity (% of household members who have it)
- Level-up celebration: confetti + new level badge display (2s, dismissible)
- Streak milestone animations at 7, 14, 30, 60, 90, 180, 365 days
- Reduced-motion accessibility variants

**Acceptance Criteria:**
- [ ] Badge unlock triggers a visual celebration (not silent)
- [ ] Badge detail modal shows all fields including rarity percentage
- [ ] Level-up shows the new level name and XP progress to next
- [ ] Celebration can be dismissed without blocking the user's flow
- [ ] Animation works on both web and mobile
- [ ] `prefers-reduced-motion` is respected (no animation, still shows info)
- [ ] Streak milestones show the specific milestone reached

---

#### US-F3: Budget Dashboard (Mobile)
**Ticket:** PET-150 (critical, mobile engineer, todo)

**Problem:** Mobile has no budget visibility or gamification feedback.

**Spec (gamification):**
- Toast/snackbar showing "+N XP" after logging activity
- Level-up notification if `newLevel` returned
- Badge-unlock overlay if `newBadges[]` returned
- Streak-at-risk banner on home screen (after 6pm, streak ≥3 days, no activity today)

**Spec (finance):**
- Budget progress bar with color coding (green <75%, yellow 75-90%, red >90%)
- Monthly budget overview on Finance tab
- "Set Budget" CTA if no budgets exist

**Acceptance Criteria:**
- [ ] XP toast appears within 500ms of activity logging
- [ ] Toast shows correct XP amount from mutation response
- [ ] Level-up notification appears with new level name
- [ ] Badge overlay shows badge icon, name, description
- [ ] Streak-at-risk banner only shows when conditions met (after 6pm, streak ≥3, no activity)
- [ ] Budget progress bar colors match spec thresholds
- [ ] Budget data refreshes on expense creation
- [ ] "Set Budget" CTA visible when `listBudgets` returns empty

---

#### PET-145: Build Gamification tRPC Router (Enhancements)
**Ticket:** PET-145 (high, engineer, in progress)

**Problem:** The gamification router needs leaderboard, achievement, and streak query enhancements.

**Acceptance Criteria:**
- [ ] `leaderboard` query returns household members ranked by total XP
- [ ] `achievements` query returns all available badges with unlock status per member
- [ ] `memberAchievements` query returns a specific member's unlocked badges with dates
- [ ] `recentAchievements` query returns recently unlocked badges across the household
- [ ] All queries are household-scoped (no cross-household data leakage)
- [ ] Leaderboard shows "Getting Started" for 0 XP members, not a rank position
- [ ] Unit tests cover streak edge cases (timezone boundaries, gap days)

---

## Phase 3b: Offline Support (Sprint 4 — Not Yet Scoped)

Offline support is the second pillar of Phase 3 per product principles. It is **not in Sprint 3 scope** and will be specced separately after Sprint 3 ships.

### Known Requirements (from product principles)
- Offline-first data entry: log feedings, medications, activities without connectivity
- Sync queue: store mutations locally, replay on reconnect
- Conflict resolution: last-write-wins with household-level merge
- Cache layer: read from local cache, hydrate on app open

### Why It's Deferred
- Offline sync requires a stable schema. Sprint 3 adds 3 new tables (gamification_config, budgets, notification_preferences). Syncing before these stabilize is risky.
- Mobile app needs the gamification and finance UI first — offline support is infrastructure that runs underneath.
- Per principle #12: "Each phase earns the trust and data to justify the next."

### Pre-Requisites for Phase 3b
- [ ] Sprint 3 gamification and finance tables are migrated and stable
- [ ] No open schema migration issues
- [ ] Mobile gamification + finance screens are shipped
- [ ] Conflict resolution strategy is designed (separate spec needed)

---

## Dependencies Between Sprint 3 User Stories

```
US-G1 (Inline XP)
  ↓ unblocks
US-G1b (Config) ──── US-G1 must respect config flags
  ↓ unblocks
US-G2 (Celebrations) ── needs xpAwarded/newBadges in response

US-F1 (Budgets)
  ↓ unblocks
US-F2 (Budget Alerts) ── needs budgets to check against
  ↓ unblocks
US-F3 (Budget Dashboard) ── needs budgetStatus endpoint

US-S1 (Notification Prefs) ── consumed by streak reminders (Phase 3b) and budget alerts
```

**Critical path:** US-G1 → US-G1b → US-G2 (gamification) and US-F1 → US-F2 → US-F3 (finance) can run in parallel. US-S1 is independent.

---

## Anti-Patterns (Non-Negotiable)

These are product decisions from the Sprint 3 PRD. All engineers must follow them:

1. **No public shaming.** 0 XP = "Getting Started", not last place.
2. **No pay-to-win.** XP from real care actions only.
3. **No loss aversion.** Broken streaks say "Great run!" not "You lost."
4. **No notification spam.** Max 1 gamification notification per day per member.
5. **No fake scarcity.** All badges earnable by everyone. No time-limited badges in v1.
6. **Budgets are per-household.** One person doesn't set contradictory budgets.

---

## Testing Requirements

Per product principle #9: "Test Like the Customer Depends on It"

| User Story | Required Tests |
|------------|---------------|
| US-G1 | Unit: XP calculation, streak logic, badge evaluation. Integration: mutation returns xpAwarded |
| US-G1b | Unit: config defaults, role authorization. Integration: config affects XP awards |
| US-F1 | Unit: budget upsert logic, uniqueness. Integration: budgetStatus calculation |
| US-F2 | Unit: threshold detection, idempotency. Integration: alert returned in createExpense |
| US-S1 | Unit: preference defaults, ownership check. Integration: preferences checked before notification |
| US-G2 | E2E: badge unlock shows celebration. E2E: level-up animation triggers |
| US-F3 | E2E: budget bar renders with correct colors. E2E: "Set Budget" CTA when empty |

No database mocks. Integration tests hit real PostgreSQL.

---

## Document History

| Date | Author | Change |
|------|--------|--------|
| 2026-04-01 | Product Manager | Initial Phase 3 spec — consolidated from Sprint 3 PRD (PET-135) with AC for all tickets |
