# Engineering Standards

[Developer]

How the 14 product principles translate into enforceable engineering practices. Every PR, every architecture decision, and every agent task must comply.

Last updated: 2026-03-31

---

## Principle-to-Practice Map

### P1: The Household is the Product

**Engineering requirement:** Every data entity belongs to a `householdId`. Every query filters by it.

| Standard | Status | Enforced by |
|----------|--------|-------------|
| All new tables include `householdId` FK with cascade delete | Done | Schema review (`/guard`) |
| `householdProcedure` used for all household-scoped endpoints | Done | Code review |
| No single-user-only features ship without household collaboration path | Required | PR review checklist |
| Real-time sync of household state (e.g., feeding dismissal) | Gap | Needs WebSocket/SSE (PET-116) |

**Gap:** We have no real-time push when a household member completes an action. Other members must refresh to see changes. This undermines the coordination promise. Priority: high for Phase 3+.

---

### P2: Capture the Moment (sub-3-second logging)

**Engineering requirement:** Critical write paths must complete in < 200ms server-side. UI must feel instant.

| Standard | Status | Enforced by |
|----------|--------|-------------|
| Feeding/medication log mutations are single-insert operations | Done | Code structure |
| No multi-step form wizards for routine logging | Done | UX review |
| Optimistic UI updates on write mutations | Gap | Frontend standard |
| API latency budget: p95 < 200ms for log mutations | Gap | Needs `/benchmark` baseline |

**Gap:** No performance baselines exist. We cannot verify the 3-second promise without latency monitoring. Action: establish benchmarks with `/benchmark` and add p95 alerting.

---

### P3: Run the App from the Lock Screen

**Engineering requirement:** Push notifications must be actionable. Notification state syncs across household.

| Standard | Status | Enforced by |
|----------|--------|-------------|
| Push notification infrastructure (Expo, BullMQ) | Done | PR #162 merged |
| Actionable notification payloads (action buttons) | Gap | Mobile agent |
| Cross-household notification dismissal | Gap | Needs real-time sync |
| Notification preference controls per member | Gap | Needs UX + API |

**Gap:** Notifications exist but are not yet actionable from the lock screen. The "tap Done without opening the app" flow is not implemented. This is a Phase 2/3 deliverable.

---

### P4: Data In, Insight Out

**Engineering requirement:** All user actions produce structured, queryable records. Reporting aggregations exist.

| Standard | Status | Enforced by |
|----------|--------|-------------|
| `activityLog` table captures all user-visible mutations | Done | Convention in `conventions.md` |
| `analyticsEvents` table for usage tracking | Done | Analytics router |
| Reporting router with trends, contributions, summary | Done | 4 reporting procedures |
| Pattern detection / proactive alerts | Gap | Not started |

**Gap:** We store data but don't yet surface insights. "Luna ate 20% less this week" requires a background analysis job. This is a Phase 3+ feature that depends on sufficient data volume.

---

### P5: Architect for a Billion Users

**Engineering requirement:** No full-table scans. Paginated responses. Connection pooling. Partition-ready schema.

| Standard | Status | Enforced by |
|----------|--------|-------------|
| All list queries are paginated or bounded | Partial | Code review |
| Connection pooling via Supabase | Done | `packages/db` config |
| Indexed queries for all hot paths | Partial | Schema review |
| `activityLog` partitioned by date | Gap | PET-115 (backlog) |
| Redis caching for expensive aggregations | Gap | PET-38 (backlog) |
| Read replica for hot read paths | Gap | PET-118 (backlog) |

**Enforcement rule:** Every new list endpoint must accept `limit` and `offset` (or cursor). Default limit: 50, max: 200. PRs that add unbounded queries will be rejected.

**Gap:** Several list endpoints return unbounded results. Audit needed. Table partitioning and read replicas are planned but not started.

---

### P6: Trust the Schema, Ship the Feature

**Engineering requirement:** Schema changes are gated. UI changes ship fast.

| Standard | Status | Enforced by |
|----------|--------|-------------|
| `/guard` mandatory before editing `packages/db` or `packages/core` | Done | CLAUDE.md, guardrails skill |
| Generated SQL reviewed before `db:migrate` | Done | Convention |
| Schema changes require CTO or Architect approval | Done | CODEOWNERS |
| UI-only PRs can land with 1 review | Done | Branch protection |

**No gaps.** This is well-enforced.

---

### P7: Zero Trust Security

**Engineering requirement:** Household membership verified on every API call. All inputs validated. Secrets rotated.

| Standard | Status | Enforced by |
|----------|--------|-------------|
| `householdProcedure` middleware verifies membership | Done | All 15 routers |
| Zod validation on all tRPC inputs | Done | Convention |
| No secrets in source code | Done | `.gitignore`, CI scan |
| Security scan CI check on every PR | Done | GitHub Actions |
| RBAC checks in router procedures | Done | `conventions.md` |
| Secret rotation schedule | Gap | No schedule defined |
| IDOR testing in E2E suite | Gap | Not yet automated |
| Rate limiting on auth endpoints | Gap | Not implemented |

**Enforcement rule:** Any PR that adds a new tRPC procedure without `householdProcedure` or explicit `protectedProcedure` justification will be rejected.

**Gap:** No automated IDOR (Insecure Direct Object Reference) testing. A user in Household A should never be able to access Household B data by manipulating IDs. We need cross-household E2E tests. Also missing: rate limiting and secret rotation schedule.

---

### P8: Document Everything

**Engineering requirement:** PRs include docs. API docs stay current. Runbooks are tested.

| Standard | Status | Enforced by |
|----------|--------|-------------|
| PR template includes Documentation section | Done | `.github/PULL_REQUEST_TEMPLATE.md` |
| API docs for all 15 routers | Done | `docs/api/` |
| User guide for all shipped features | Done | `docs/user-guide/` |
| Runbooks for DB migration, deployment, incident response | Done | `docs/runbooks/` |
| ADRs (Architecture Decision Records) | Gap | No ADR directory |

**Enforcement rule:** PRs that add new features or endpoints without updating the relevant docs section will be flagged in review.

**Gap:** We have no ADR (Architecture Decision Record) practice. Key decisions (why Tamagui over NativeWind, why Hono over Express, why BullMQ for jobs) are not recorded. Create `docs/adr/` and backfill the top 5 decisions.

---

### P9: Test Like the Customer Depends on It

**Engineering requirement:** Unit tests for every router. E2E for every critical flow. No database mocks.

| Standard | Status | Enforced by |
|----------|--------|-------------|
| E2E tests for all 15 domains | Done | `tests/e2e/` |
| Unit tests for tRPC procedures | Gap | Quality score: 0% |
| E2E runs in CI | Gap | Tests exist but not in CI |
| No database mocks in integration tests | Done | Convention |
| Test coverage does not decrease | Gap | No coverage tracking |

**Enforcement rule:** New tRPC procedures must ship with co-located unit tests (`*.test.ts`). E2E tests required for any new critical user flow (onboarding, feeding, health, invite).

**Critical gap:** Zero unit tests across all 15 routers. This is the single biggest quality debt. Every router is grade B when it should be A. Priority: immediate. Tracked as a quality-score improvement item.

---

### P10: Reliability is the Product

**Engineering requirement:** Offline-first mobile. Multi-region ready. Automated failover. Graceful degradation.

| Standard | Status | Enforced by |
|----------|--------|-------------|
| DR runbook and rollback scripts | Done | Merged via PR #162 |
| Supabase PITR enabled | Unverified | PET-9 (todo) |
| Offline queue for mobile actions | Gap | Not started |
| Multi-region API deployment | Gap | PET-119 (backlog) |
| Health check endpoints | Partial | API has `/health` |
| Graceful degradation (failed service != cascade) | Gap | No circuit breakers |

**Gap:** Offline-first is not implemented on mobile. This is a Phase 3 requirement. Circuit breakers and graceful degradation patterns are not in place — a Redis outage would likely crash the API once caching is added.

---

### P11: GitHub is the Source of Truth

**Engineering requirement:** Every task has an issue. Every PR references an issue. Every merge closes an issue.

| Standard | Status | Enforced by |
|----------|--------|-------------|
| Branch naming: `agent/<name>/<desc>` | Done | Convention |
| PR body includes `Closes #<issue>` | Done | PR template |
| GitHub-Paperclip sync via `/paperclip sync` | Done | Paperclip bridge skill |
| No direct commits to main | Done | Branch protection |
| CODEOWNERS auto-requests reviewers | Done | `.github/CODEOWNERS` |

**No major gaps.** Enforcement is solid. Minor issue: some Paperclip tasks still lack GitHub issue sync (11 unsynced as of today).

---

### P12: Earn the Right to Complexity

**Engineering requirement:** Phases are sequential. No Phase N+1 work until Phase N is stable.

| Standard | Status | Enforced by |
|----------|--------|-------------|
| Phase gates defined in product roadmap | Partial | `docs/dev/product-principles.md` |
| Phase 1 (profiles + care logging) shipped | Done | All CRUD routers |
| Phase 2 (schedules + health) shipped | Done | Feeding, health, medication routers |
| Phase 3 work gated on Phase 2 stability | Active | Sprint planning |

**Gap:** No formal "phase gate" checklist. How do we know Phase 2 is stable enough to start Phase 3? Need: zero P0 bugs, E2E coverage for all Phase 2 flows, and 1 week of clean production metrics.

---

### P13: Multi-Platform Parity

**Engineering requirement:** Web and mobile ship the same features in the same sprint.

| Standard | Status | Enforced by |
|----------|--------|-------------|
| Shared components in `packages/ui` (Tamagui) | Done | Package structure |
| Shared types/schemas in `packages/core` | Done | Package structure |
| Same tRPC API for both clients | Done | Architecture |
| Mobile E2E test coverage | Gap | Zero tests |
| Feature parity tracking | Gap | No tracking mechanism |

**Gap:** Mobile has zero automated tests. We cannot verify parity without them. Also missing: a feature parity matrix that tracks which features exist on web vs. mobile.

---

### P14: Build for the Household That Grows

**Engineering requirement:** Multi-member, multi-pet, multi-species tested. Roles enforced. No hardcoded limits.

| Standard | Status | Enforced by |
|----------|--------|-------------|
| RBAC with 4 roles (owner, admin, member, sitter) | Done | Conventions |
| Species enum is extensible ("other" option) | Done | Schema |
| No hardcoded pet or member limits | Done | Schema review |
| E2E tests with multi-member households | Partial | Some tests use 1 member |

**Gap:** E2E tests don't consistently test with multi-member, multi-role scenarios. Need test fixtures that create households with owner + member + sitter, then verify permission boundaries.

---

## Summary: Top 5 Engineering Gaps

| Priority | Gap | Principle | Action |
|----------|-----|-----------|--------|
| 1 | Zero unit tests for tRPC procedures | P9 | Add co-located `*.test.ts` for all 15 routers |
| 2 | No API performance baselines | P2, P5 | Run `/benchmark`, establish p95 targets |
| 3 | No real-time household sync | P1, P3 | Implement WebSocket/SSE for live updates |
| 4 | No IDOR security tests | P7 | Add cross-household access tests to E2E suite |
| 5 | No offline-first mobile | P10 | Design offline queue architecture for Phase 3 |

---

## Enforcement Checklist (for PR reviewers)

Every PR must pass these checks before merge:

- [ ] **Household scoping:** New data entities include `householdId`. New endpoints use `householdProcedure`.
- [ ] **Input validation:** All inputs validated with Zod. No raw user input reaches business logic.
- [ ] **Pagination:** List endpoints accept `limit`/`offset`. No unbounded queries.
- [ ] **Tests:** New procedures have unit tests. New flows have E2E tests.
- [ ] **Docs:** New features update relevant docs (API, user guide, or dev docs).
- [ ] **Security:** No secrets in code. Auth checks present. RBAC verified for destructive operations.
- [ ] **Schema safety:** `packages/db` and `packages/core` changes used `/guard`. SQL reviewed.
- [ ] **Mobile parity:** UI features have a plan for both web and mobile.
