<!-- owner: architect -->

# PetForce Product Development Principles

These are the rules we build by. Every feature, every PR, every sprint decision runs through these. They are non-negotiable. They are what separates a side project from a billion-user product.

---

## 1. The Household is the Product

We are not building a pet tracker. We are building a coordination layer for households. Every feature must answer: does this make household collaboration better? A solo user logging a feeding is useful. A household where everyone sees who fed the dog, who scheduled the vet visit, and who is covering tonight — that is a billion-dollar product. Multi-player always beats single-player.

- **Always:** Design for 2+ people sharing a household. Default to shared visibility.
- **Never:** Build features that only work for a single user with one pet.

## 2. Capture the Moment, Not the Form

Pet care happens in motion — standing at the food bowl, rushing out the door, at the vet with a barking dog. If logging an event takes more than 3 seconds, people will not do it. We must be the fastest path from "I just did something" to "it is recorded."

- **Always:** One-tap logging. Pre-filled defaults. Smart suggestions based on time of day, species, and history.
- **Never:** Multi-step forms for routine events. Required fields that could be inferred.

## 3. Run the App from the Lock Screen

The phone is the primary device. Most interactions should happen without opening the app. A feeding schedule notification pops up — tap "Done" from the lock screen. Someone else already fed the dog — the notification disappears. The app must be as lightweight as a text message and as powerful as a dashboard when you open it.

- **Always:** Support actionable notifications — complete tasks, snooze, delegate from the notification itself. Sync dismissals across household members in real time.
- **Never:** Require the user to open the app for routine actions. Never assume they are sitting at a desk.

## 4. Data In, Insight Out

Raw logs are not valuable. Patterns are. "You fed Luna 3x today" is a notification. "Luna has been eating 20% less this week — last time this happened, she had a UTI" is a product that saves a pet's life. We collect granular data so we can surface insights no one else can.

- **Always:** Store structured, timestamped data. Build toward pattern detection and proactive alerts.
- **Never:** Treat the database as a dumb log. Every data point should serve a future insight.

## 5. Architect for a Billion Users on Day One

We are small today but we will not rewrite the foundation later. Every table, every query, every cache decision should assume the system will serve 1 billion users across millions of households. This means: partitioned tables for high-write data, read replicas for hot paths, stateless API servers behind load balancers, and connection pooling from day one. If a design choice works at 1,000 users but breaks at 1,000,000, it is the wrong choice.

- **Always:** Use indexed queries, paginated responses, connection pooling, and horizontal-ready architecture. Partition activityLogs and other high-write tables by date. Cache expensive aggregations in Redis.
- **Never:** Write a query that scans a full table. Never store computed data that should be derived. Never assume a single database instance is enough.

## 6. Trust the Schema, Ship the Feature

Our Drizzle schema is the contract between every app, every agent, and every feature. It must be treated with the gravity of a database migration at a bank. But above the schema, we move fast. New UI, new screens, new workflows — ship it. If the schema is solid, the feature can always be iterated.

- **Always:** Use /guard before touching packages/db or packages/core. Review generated SQL. Think about downstream consumers.
- **Never:** Rush a schema change to unblock a UI feature. The schema outlives every UI decision.

## 7. Zero Trust Security — No Exceptions

Every API call must verify household membership. Period. A user in Household A must never see, modify, or infer data from Household B. Families trust us with their pets' medical records, their spending data, their daily routines. One breach and that trust is gone forever — and so is the company.

Security is not a feature. It is the foundation. We treat it the way banks treat money: assume every input is hostile, every boundary will be tested, every secret will be sought.

- **Always:** Verify household membership in every tRPC procedure. Validate all inputs at the boundary with Zod. Rotate secrets on a schedule. Run security audits on every PR that touches data access. Encrypt sensitive data at rest and in transit.
- **Never:** Return data without verifying the caller's membership. Never store secrets in code. Never skip auth checks "because it's an internal endpoint." Never trust client-side validation alone.

## 8. Document Everything

If it is not documented, it does not exist. Every new feature ships with user-facing docs. Every architectural decision gets a rationale recorded. Every API endpoint has a reference entry. Every runbook is current enough to hand to a new hire at 2am during an incident.

Documentation is not an afterthought — it is a deliverable. PRs without docs are incomplete.

- **Always:** Update user guides when shipping features. Write API docs for every new tRPC router. Record "why" in ADRs (Architecture Decision Records), not just "what." Keep runbooks tested and current.
- **Never:** Ship a feature without updating the relevant docs. Never let docs drift more than one sprint behind reality. Never assume the next person will "just know."

## 9. Test Like the Customer Depends on It — Because They Do

If we push something to production and it breaks existing features, we have failed. Automated testing is not optional overhead — it is the only thing standing between us and shipping broken software to families who depend on us to track their pet's medication.

Every PR needs tests. Every tRPC procedure needs a unit test. Every critical user flow needs an E2E test. If the test suite passes, we should be confident enough to deploy on a Friday.

- **Always:** Write unit tests for every tRPC procedure. Write E2E tests for every critical user flow (onboarding, feeding log, health record, household invite). Run the full suite on every PR. Fix broken tests before adding new features.
- **Never:** Skip tests "because it's a small change." Never mock the database in integration tests (we learned this lesson). Never merge with failing tests. Never let test coverage decrease.

## 10. Reliability is the Product

A feeding reminder that fires on time every time is worth more than an animated confetti celebration. Users will forgive an ugly screen if it never loses their data. They will never forgive a beautiful app that missed their dog's medication reminder.

This means: offline support so the app works without signal. Multi-region deployment so an AWS outage does not take us down. Automated failover so a database crash is invisible to users. Graceful degradation so a failed service does not cascade.

- **Always:** Design for offline-first on mobile — queue actions locally, sync when reconnected. Plan for regional failover. Monitor uptime with real alerts, not dashboards nobody watches. Test disaster recovery quarterly.
- **Never:** Assume the network is reliable. Never let a single point of failure exist in production. Never ship cosmetic polish over functional reliability.

## 11. GitHub is the Source of Truth

If it is not in a PR, it did not happen. If an issue is not on GitHub, it is not real work. Every agent, every sprint, every feature must be traceable through git history and GitHub issues. Paperclip coordinates, GitHub records.

- **Always:** Every task gets a GitHub issue. Every PR references an issue. Every merge closes an issue.
- **Never:** Mark work "done" in Paperclip without a corresponding commit or PR on GitHub.

## 12. Earn the Right to Complexity

Phase 1 is profiles and care logging. Phase 2 is schedules and health tracking. Phase 3 is gamification and offline. Phase 4 is calendar sync and polish. We do not skip phases. Each phase earns the trust and data to justify the next. Gamification without reliable logging is a gimmick. Offline sync without a stable schema is a disaster.

- **Always:** Ship the boring foundation before the exciting feature. Validate each phase with real usage.
- **Never:** Jump to Phase 3 features when Phase 2 has bugs.

## 13. Multi-Platform is a Requirement, Not a Nice-to-Have

Household coordination fails if one person is on web and the other is on mobile and they see different data or different UI. Tamagui + tRPC + shared Zod schemas exist so that every platform gets the same experience from the same source of truth.

- **Always:** Build shared components in packages/ui. Use tRPC procedures that serve both web and mobile.
- **Never:** Build a web-only feature without a plan for mobile parity within the same sprint.

## 14. Build for the Household That Grows

A household starts with one person and one pet. Then a partner joins. Then a sitter. Then a second pet. Then a puppy. Then grandma wants read-only access. Our architecture must handle this growth gracefully — roles, permissions, species-specific logic, scaling from 1 pet to 10.

- **Always:** Test with multi-member, multi-pet, multi-species households. Design roles and permissions from day one.
- **Never:** Hardcode assumptions about household size, pet count, or member roles.

---

**The north star:** PetForce becomes indispensable the day a household realizes they cannot coordinate pet care without it. Every principle above serves that moment.
