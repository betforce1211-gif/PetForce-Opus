# Sprint 3: Gamification System & Household Finance PRD

**Owner:** CPO
**Status:** In progress
**Paperclip:** PET-135
**Date:** 2026-04-01

---

## Problem

PetForce tracks pet care well, but it doesn't reward the behavior it wants to see. Households that log consistently get no recognition. Members who pick up slack for others get no visibility. And nobody knows how much they're spending on their pets.

Two problems, one sprint:
1. **Engagement** — care logging drops off after the novelty period. We need intrinsic motivation loops.
2. **Financial awareness** — pet owners consistently underestimate spending. We have expense tracking, but no budgets, alerts, or accountability.

## Success Metrics

| Metric | Target | How We Measure |
|--------|--------|----------------|
| 7-day care logging retention | +15% vs. pre-gamification | % of households with ≥1 activity logged per day for 7 consecutive days |
| Streak maintenance | 60% of active members maintain ≥3-day streak | memberGameStats.currentStreak |
| Budget adoption | 30% of households set a budget within 2 weeks of launch | budgets table row count |
| Expense logging frequency | +20% | expenses table inserts per household per week |

---

## Part 1: Gamification System

### What's Already Built

The foundation is solid. We ship on top of it, not beside it.

| Layer | Status | Details |
|-------|--------|---------|
| Schema | Done | 5 tables: memberGameStats, householdGameStats, petGameStats, achievements, memberAchievements |
| Badge definitions | Done | 149 badges across 3 groups (member/household/pet), 6 categories each, rule-based evaluation |
| XP system | Done | Feeding 10 XP, medication 15 XP, activity 20 XP. Polynomial level curve (100 levels) |
| Level names | Done | 8 species-specific tracks with 100 unique names each |
| Router | Done | 6 procedures: getStats, recalculate, leaderboard, achievements, memberAchievements, recentAchievements |
| Web UI | Done | Dashboard tile (3-view toggle) + full modal (Members/Household/Pets tabs, badge grid) |
| E2E tests | Done | 4 Playwright tests covering tile + modal tabs |
| Streak calc | Done | computeStreaks helper with current + longest tracking |

### What We're Building Now

#### US-G1: Inline XP Awards on Activity Creation
**Assigned:** Integration Engineer (PET-146, in progress)

When a member logs a feeding, medication, or activity, award XP immediately — don't wait for the nightly recalculate batch.

- On activity/feeding/medication create, increment memberGameStats.totalXp by the appropriate XP value
- Recalculate level if XP crosses threshold
- Update streak (extend if same day or consecutive, reset if gap)
- Evaluate badge rules — if new badge unlocked, insert into memberAchievements
- Invalidate gamification cache for the household
- Return XP delta and any new badges in the mutation response

**Why this matters:** Instant feedback is the core gamification loop. A 10-second delay kills the dopamine hit.

#### US-G1b: Gamification Config Table & Feature Flags
**Assigned:** Integration Engineer (PET-147, todo)

Add a `gamification_config` table so we can tune without deploys:

```
gamification_config
  id: uuid PK
  householdId: uuid FK → households (unique)
  enabled: boolean (default true)
  xpMultiplier: real (default 1.0) — for double-XP events
  streakGracePeriodHours: integer (default 0) — forgiveness window
  createdAt, updatedAt
```

New tRPC procedures:
- `gamification.getConfig` — returns config for household (creates default if missing)
- `gamification.updateConfig` — admin/owner only, partial update

**Why:** We need kill switches and tuning knobs before launch. If gamification drives perverse behavior (e.g., fake logging for XP), we need to throttle it per-household without a deploy.

#### US-G2: Celebration Animations & Badge Detail
**Assigned:** UX Designer (PET-151, todo) → then Frontend

When a badge is unlocked:
- Show a celebration toast/overlay with the badge icon, name, and description
- Toast auto-dismisses after 4 seconds, tappable to expand
- Badge detail view shows: icon, name, description, unlock criteria, date unlocked, rarity (% of household members who have it)

**Acceptance criteria:**
- [ ] Badge unlock triggers a visual celebration (not just a silent state change)
- [ ] Badge detail shows all fields including rarity percentage
- [ ] Animation works on both web and mobile
- [ ] Celebration can be dismissed without blocking the user's flow

#### US-G3: Streak Reminders
**Not yet assigned — Phase 3b**

Push notification at a configurable time: "You're on a 5-day streak! Log today to keep it going."

- Requires notification preferences infrastructure (PET-148)
- Only send if user has an active streak ≥2 days and hasn't logged today
- Respect notification quiet hours

### Gamification Anti-Patterns to Avoid

These are product decisions, not tech ones:

1. **No public shaming.** Leaderboard shows rank, not "you're last." Members with 0 XP show as "Getting Started," not rank #5 of 5.
2. **No pay-to-win.** XP comes from real care actions only.
3. **No loss aversion traps.** Breaking a streak says "Great run! Start a new one." not "You lost your streak."
4. **No notification spam.** Max 1 gamification notification per day per member.
5. **No fake scarcity.** All badges are earnable by everyone. No time-limited badges in v1.

---

## Part 2: Household Finance — Budgets & Alerts

### What's Already Built

| Layer | Status | Details |
|-------|--------|---------|
| Expense schema | Done | `expenses` table: householdId, petId, category (9 types), description, amount, date, notes |
| Finance router | Done | 5 procedures: listExpenses, createExpense, updateExpense, deleteExpense, summary |
| Summary | Done | Monthly totals, month-over-month trend, byCategory, byPet, recentExpenses |
| Health cost integration | Done | Vet visits and medication costs auto-included in finance totals |
| Web UI | Done | Finance tab with overview, expense list, add form |

### What We're Building Now

#### US-F1: Household & Pet Budgets
**Assigned:** Full-Stack Engineer (PET-149, todo)

New `budgets` table:

```
budgets
  id: uuid PK
  householdId: uuid FK → households
  petId: uuid FK → pets (nullable — null means household-wide budget)
  period: text enum ["monthly", "yearly"]
  amount: real NOT NULL
  category: text (nullable — null means all categories)
  createdAt, updatedAt

  unique(householdId, petId, period, category) — one budget per scope
```

New tRPC procedures:
- `finance.listBudgets` — returns all budgets for household
- `finance.setBudget` — upsert a budget (admin/owner only)
- `finance.deleteBudget` — remove a budget
- `finance.budgetStatus` — for each budget, return: budget amount, spent so far this period, remaining, percentage used

**User stories:**
- As a household owner, I want to set a monthly budget for all pet expenses so I can track if we're overspending.
- As a household owner, I want to set per-pet budgets so I know which pet costs the most.
- As a household owner, I want to set category-specific budgets (e.g., $200/month for food) so I can control spending in specific areas.

#### US-F2: Budget Alerts
**Part of PET-149**

When an expense is created or updated, check if any budget threshold is crossed:
- At 80% spent: "Heads up — you've used 80% of your monthly pet food budget ($160 of $200)."
- At 100% spent: "Budget exceeded — you've spent $215 of your $200 monthly pet food budget."

Alert delivery:
- In-app notification (stored in notifications table)
- Push notification (when notification prefs infrastructure is ready, PET-148)
- Budget status badge on the Finance tab (yellow at 80%, red at 100%)

**Acceptance criteria:**
- [ ] Budget alerts fire at 80% and 100% thresholds
- [ ] Alerts are idempotent — don't re-alert for the same threshold in the same period
- [ ] Budget status is visible on the Finance tab without navigating
- [ ] Per-pet and per-category budgets roll up correctly to household totals

#### US-F3: Budget Dashboard Enhancements
**Part of PET-150 (Mobile) and web frontend work**

- Budget progress bars on Finance overview (per budget)
- Color coding: green (<60%), yellow (60-80%), orange (80-100%), red (>100%)
- Monthly trend chart: budget vs. actual spending over last 6 months
- "Set Budget" CTA on Finance tab if no budgets exist

---

## Shared Infrastructure

#### US-S1: Notification Preferences
**Assigned:** Full-Stack Engineer (PET-148, todo)

Both gamification and finance need notification delivery. Build once:

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

tRPC procedures:
- `notifications.getPreferences` — returns prefs (creates default if missing)
- `notifications.updatePreferences` — partial update

---

## Data Model Summary (New Tables)

| Table | Owner | Depends On |
|-------|-------|------------|
| `gamification_config` | Integration Engineer | households |
| `budgets` | Full-Stack Engineer | households, pets |
| `notification_preferences` | Full-Stack Engineer | members, households |

All three are additive — no changes to existing tables.

---

## tRPC Procedure Summary (New)

| Router | Procedure | Type | Owner |
|--------|-----------|------|-------|
| gamification | getConfig | query | Integration Engineer |
| gamification | updateConfig | mutation | Integration Engineer |
| finance | listBudgets | query | Full-Stack Engineer |
| finance | setBudget | mutation | Full-Stack Engineer |
| finance | deleteBudget | mutation | Full-Stack Engineer |
| finance | budgetStatus | query | Full-Stack Engineer |
| notifications | getPreferences | query | Full-Stack Engineer |
| notifications | updatePreferences | mutation | Full-Stack Engineer |

Plus inline XP award logic added to existing activity/feeding/medication create mutations.

---

## Prioritization

**Build order (dependencies flow top to bottom):**

1. **Inline XP Awards (US-G1)** — already in progress. Unblocks celebration UX.
2. **Gamification Config (US-G1b)** — quick table + 2 procedures. Unblocks safe launch.
3. **Budgets + Alerts (US-F1, US-F2)** — new table + 4 procedures + alert logic.
4. **Notification Preferences (US-S1)** — shared infra for both features.
5. **Celebration Animations (US-G2)** — UX wireframes first, then frontend.
6. **Budget Dashboard (US-F3)** — web + mobile, depends on budgets backend.
7. **Streak Reminders (US-G3)** — requires notifications infra. Phase 3b.

Items 1-4 are Sprint 3 scope. Items 5-6 can start as soon as UX wireframes land. Item 7 is deferred.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Gamification drives fake logging (XP farming) | Config table with kill switch + XP multiplier. Monitor XP/activity ratio. |
| Budget alerts are noisy | Threshold-based (80%, 100% only). Respect quiet hours. Per-category granularity. |
| Inline XP calculation is slow under load | Lightweight delta calculation (not full recalculate). Cache invalidation is scoped to household. |
| Feature flag complexity | Single boolean `enabled` on gamification_config. No complex flag matrix. |
| Mobile parity lag | UX wireframes (PET-151) cover both web and mobile. Mobile agent (PET-150) tracks separately. |

---

## Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| XP values: 10/15/20 for feeding/medication/activity | Medication adherence is harder to remember; activities take more effort. Simple ratios. | Pre-sprint |
| 149 badges, not fewer | Dense badge trees increase surface area for "almost there" motivation. Prune later if needed. | Pre-sprint |
| Budgets are per-household, not per-member | Finances are shared in a household. One person shouldn't set contradictory budgets. | 2026-04-01 |
| No time-limited badges in v1 | Avoid FOMO mechanics until we understand baseline engagement. | 2026-04-01 |
| Streak grace period is 0 by default | Strict streaks are more meaningful. Grace period is configurable via gamification_config for households that want leniency. | 2026-04-01 |
