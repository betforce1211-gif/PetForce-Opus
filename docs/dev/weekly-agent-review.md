[Developer]

# Weekly Agent Review Framework

A structured framework for evaluating each agent's output weekly, identifying improvement areas, and deciding when to add skills or new agents.

---

## How to Use This Framework

1. **Schedule**: Run reviews every Friday (or end of sprint)
2. **Process**: For each agent, pull their branch, review commits since last review, and score each dimension 1-5
3. **Output**: Fill in the scorecard, write action items, update the cumulative tracker at the bottom
4. **Decisions**: Use the "Agent Gap Analysis" section to decide if new agents or skills are needed

---

## Scoring Scale

| Score | Meaning |
|-------|---------|
| 1 | Blocked / no output / major regressions |
| 2 | Below expectations — incomplete work, frequent errors |
| 3 | Meets expectations — functional but room to improve |
| 4 | Above expectations — clean, thorough, proactive |
| 5 | Exceptional — anticipates needs, zero rework required |

---

## Agent Scorecards

### 1. Architect (`main`)

**Function**: Architecture decisions, schema design, cross-cutting concerns, agent coordination

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Decision Quality** — Are architectural choices sound, scalable, and well-reasoned? | /5 | |
| **Cross-Agent Coordination** — Are breaking changes communicated? Are interfaces clear? | /5 | |
| **Schema Design** — Are migrations safe, indexed, and backward-compatible? | /5 | |
| **Technical Debt Awareness** — Are shortcuts tracked and scheduled for cleanup? | /5 | |
| **Documentation of Decisions** — Are ADRs or rationale captured for non-obvious choices? | /5 | |

**Key Questions**:
- Did any agent get blocked by unclear or missing architecture guidance?
- Were there any schema changes that caused downstream breakage?
- Is the domain model evolving correctly (Household > Pets > Activities)?

---

### 2. Backend (`agent/backend`)

**Function**: tRPC routers, Drizzle queries, API middleware, business logic

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Security** — Are all endpoints using correct auth middleware (`householdProcedure` vs `protectedProcedure`)? Resource-level checks? | /5 | |
| **Query Performance** — No N+1s, proper use of `inArray()`, `Promise.all()`, pagination? | /5 | |
| **Error Handling** — Proper `TRPCError` codes, no raw `throw new Error()`? | /5 | |
| **Input Validation** — All inputs validated with Zod schemas from `@petforce/core`? | /5 | |
| **API Consistency** — Naming conventions, response shapes, consistent patterns across routers? | /5 | |

**Key Questions**:
- Run `grep -r "protectedProcedure" apps/api/src/routers/` — are any using `protectedProcedure` where `householdProcedure` is needed?
- Run `grep -r "throw new Error" apps/api/src/routers/` — any raw errors instead of TRPCError?
- Are new endpoints documented in the router index?

---

### 3. Web Frontend (`agent/web`)

**Function**: Next.js pages, layouts, web-specific hooks, UI implementation

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Correctness** — Do features work end-to-end? Are API contracts matched (input shapes, field names)? | /5 | |
| **Error States** — Loading, error, and empty states handled for every data-fetching component? | /5 | |
| **Memory Safety** — Blob URLs cleaned up, event listeners removed, no stale closures? | /5 | |
| **Accessibility** — Keyboard navigation, ARIA labels, focus management on modals? | /5 | |
| **Build Health** — Does `pnpm --filter=web build` pass clean with no warnings? | /5 | |

**Key Questions**:
- Run `pnpm --filter=web build` — any TypeScript errors or warnings?
- Are new pages wrapped in appropriate error boundaries?
- Do form submissions disable buttons during mutation and show feedback?

---

### 4. Mobile (`agent/mobile`)

**Function**: Expo screens, native navigation, push notifications, platform-specific code

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Feature Parity** — Are mobile screens keeping up with web features? | /5 | |
| **Navigation** — Stack/tab navigation correct, deep links working? | /5 | |
| **Platform Behavior** — iOS/Android differences handled (safe areas, permissions, keyboards)? | /5 | |
| **Offline Handling** — Graceful degradation when network is unavailable? | /5 | |
| **Performance** — No unnecessary re-renders, lists use `FlatList`, images cached? | /5 | |

**Key Questions**:
- Does the app build for both iOS and Android without errors?
- Are shared components from `@petforce/ui` being used (not duplicated)?
- Is the navigation structure matching the web's information architecture?

---

### 5. Design System (`agent/design-system`)

**Function**: Tamagui components, theming, household customization, cross-platform consistency

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Component Quality** — Props well-typed, composable, follows Tamagui patterns? | /5 | |
| **Theme Compliance** — Household `primaryColor`/`secondaryColor` applied correctly? | /5 | |
| **Cross-Platform** — Components render correctly on both web and mobile? | /5 | |
| **Reusability** — Are web/mobile agents actually consuming these components? | /5 | |
| **Visual Consistency** — Spacing, typography, colors consistent across all components? | /5 | |

**Key Questions**:
- Are web or mobile agents creating one-off styled components that should be in the design system?
- Run `grep -r "style={{" apps/web/src/` — how much inline styling exists vs using shared components?
- Does the Storybook/preview (if any) show all component variants?

---

### 6. Core/Shared (`agent/core`)

**Function**: Zod schemas, shared types, business logic, validation rules

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Schema Coverage** — Every API input/output has a corresponding Zod schema? | /5 | |
| **Type Safety** — Are inferred types used across the stack (no manual `interface` duplication)? | /5 | |
| **Validation Rules** — Edge cases handled (min/max lengths, optional vs required, date ranges)? | /5 | |
| **Breaking Changes** — Were schema changes backward-compatible or coordinated with consumers? | /5 | |
| **Business Logic** — Shared helpers are pure, well-tested, and reusable? | /5 | |

**Key Questions**:
- Are there any `z.object({...})` definitions inline in routers that should be in `@petforce/core`?
- Run `grep -r "z\.object" apps/api/src/routers/` — how many inline schemas exist vs imported ones?
- Are all enum values (species, roles, statuses) defined once in core?

---

### 7. Documentation (`agent/docs`)

**Function**: User guides, config guides, API docs, runbooks, onboarding

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Accuracy** — Do docs match the current code? No stale instructions? | /5 | |
| **Coverage** — Are all features, setup steps, and troubleshooting scenarios documented? | /5 | |
| **Clarity** — Can a new developer follow setup docs and get running on first try? | /5 | |
| **Runbook Quality** — Are incident procedures actionable with specific commands? | /5 | |
| **Freshness** — Were docs updated when other agents shipped changes this week? | /5 | |

**Key Questions**:
- Did any agent ship a feature without corresponding doc updates?
- Try following `docs/dev/setup.md` from scratch — does it work?
- Are API docs auto-generated or manually maintained (and is the approach sustainable)?

---

### 8. QA/Testing (`agent/tests`)

**Function**: E2E tests, integration tests, coverage, test utilities

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Test Coverage** — Are new features covered? Any regressions in existing tests? | /5 | |
| **Test Reliability** — Flaky test rate this week? Any tests depending on timing/order? | /5 | |
| **Test Speed** — Full suite completes in reasonable time? Slow tests identified? | /5 | |
| **Helper Quality** — Are test utilities (`safeGoto`, `ensureAuthenticated`) robust? | /5 | |
| **Failure Diagnostics** — Do test failures produce clear error messages and screenshots? | /5 | |

**Key Questions**:
- Run the full E2E suite — what's the pass rate?
- Are there tests for the security fixes (IDOR, auth bypass)?
- Is there unit test coverage for `@petforce/core` schemas?

---

### 9. DevOps/Infra (`agent/infra`)

**Function**: CI/CD, Docker, deployments, monitoring, scripts

| Dimension | Score | Notes |
|-----------|-------|-------|
| **CI Reliability** — Is the pipeline green? Are failures from real issues (not flaky infra)? | /5 | |
| **Deploy Safety** — Are there rollback procedures? Health checks? Canary deploys? | /5 | |
| **Security Posture** — Secrets managed properly? No credentials in code or logs? | /5 | |
| **Monitoring** — Are errors, latency, and key metrics observable? | /5 | |
| **Developer Experience** — Are `pnpm dev`, build, and test commands fast and reliable? | /5 | |

**Key Questions**:
- How long does CI take end-to-end?
- Is there a staging environment, or only production?
- Are database migrations automated in the deploy pipeline?

---

## Weekly Summary Template

```
## Week of [DATE]

### Top-Line Scores
| Agent | Avg Score | Trend | Blocked? |
|-------|-----------|-------|----------|
| Architect | /5 | -- | No |
| Backend | /5 | -- | No |
| Web Frontend | /5 | -- | No |
| Mobile | /5 | -- | No |
| Design System | /5 | -- | No |
| Core/Shared | /5 | -- | No |
| Documentation | /5 | -- | No |
| QA/Testing | /5 | -- | No |
| DevOps/Infra | /5 | -- | No |

### Highlights
- [What went well]

### Issues Found
- [P0/P1 issues discovered during review]

### Action Items
- [ ] [Specific fix or improvement, assigned to agent]

### Skill Gaps Identified
- [Area where an agent consistently underperforms — candidate for skill addition]

### New Agent Candidates
- [If a responsibility area is unowned or consistently neglected, note it here]
```

---

## Agent Gap Analysis

Use this section to track recurring patterns that suggest a new agent or skill is needed.

### Signals That a New Skill is Needed

- An agent scores 1-2 on the same dimension for 3+ consecutive weeks
- A specific task type (e.g., "write migration rollback scripts") keeps getting skipped
- An agent's scope has grown beyond its original function

### Signals That a New Agent is Needed

- Two existing agents are both partially responsible for an area, but neither owns it fully
- A category of work (e.g., analytics, ML features, i18n) has no clear owner
- Review consistently finds unowned files or directories with no agent responsible

### Candidate Tracker

| Gap Area | First Noticed | Weeks Recurring | Proposed Solution | Status |
|----------|--------------|-----------------|-------------------|--------|
| | | | Add skill to [agent] / New agent | |

---

## Quick Review Commands

Run these as part of every weekly review to get a baseline health check:

```bash
# Build everything — any errors?
pnpm build

# Lint everything — any warnings?
pnpm lint

# Check for raw errors in API (should use TRPCError)
grep -r "throw new Error" apps/api/src/routers/

# Check for missing householdProcedure (potential IDOR)
grep -r "protectedProcedure" apps/api/src/routers/ | grep -v "getByToken\|create\|decline"

# Check for inline Zod schemas that should be in @petforce/core
grep -rn "z\.object(" apps/api/src/routers/ | grep -v "import"

# Check for blob URL leaks (createObjectURL without revokeObjectURL)
grep -rn "createObjectURL" apps/web/src/

# Check for console.log that isn't [AUDIT] tagged
grep -rn "console\.log" apps/api/src/ | grep -v "\[AUDIT\]" | grep -v node_modules

# E2E test pass rate
cd tests && npx playwright test --reporter=list 2>&1 | tail -5

# Git activity per agent branch this week
for branch in backend web mobile design-system core docs tests infra; do
  echo "=== agent/$branch ==="
  git log --oneline --since="1 week ago" "agent/$branch" 2>/dev/null | head -5
done
```
