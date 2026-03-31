# PetForce Product Development Principles

These are the rules we build by. Every feature, every PR, every sprint decision runs through these.

---

## 1. The Household is the Product

We are not building a pet tracker. We are building a coordination layer for households. Every feature must answer: does this make household collaboration better? A solo user logging a feeding is useful. A household where everyone sees who fed the dog, who scheduled the vet visit, and who is covering tonight — that is a billion-dollar product. Multi-player always beats single-player.

- **Always:** Design for 2+ people sharing a household. Default to shared visibility.
- **Never:** Build features that only work for a single user with one pet.

## 2. Capture the Moment, Not the Form

Pet care happens in motion — standing at the food bowl, rushing out the door, at the vet with a barking dog. If logging an event takes more than 3 seconds, people will not do it. We must be the fastest path from "I just did something" to "it is recorded."

- **Always:** One-tap logging. Pre-filled defaults. Smart suggestions based on time of day, species, and history.
- **Never:** Multi-step forms for routine events. Required fields that could be inferred.

## 3. Data In, Insight Out

Raw logs are not valuable. Patterns are. "You fed Luna 3x today" is a notification. "Luna has been eating 20% less this week — last time this happened, she had a UTI" is a product that saves a pet's life. We collect granular data so we can surface insights no one else can.

- **Always:** Store structured, timestamped data. Build toward pattern detection and proactive alerts.
- **Never:** Treat the database as a dumb log. Every data point should serve a future insight.

## 4. Trust the Schema, Ship the Feature

Our Drizzle schema is the contract between every app, every agent, and every feature. It must be treated with the gravity of a database migration at a bank. But above the schema, we move fast. New UI, new screens, new workflows — ship it. If the schema is solid, the feature can always be iterated.

- **Always:** Use /guard before touching packages/db or packages/core. Review generated SQL. Think about downstream consumers.
- **Never:** Rush a schema change to unblock a UI feature. The schema outlives every UI decision.

## 5. GitHub is the Source of Truth

If it is not in a PR, it did not happen. If an issue is not on GitHub, it is not real work. Every agent, every sprint, every feature must be traceable through git history and GitHub issues. Paperclip coordinates, GitHub records.

- **Always:** Every task gets a GitHub issue. Every PR references an issue. Every merge closes an issue.
- **Never:** Mark work "done" in Paperclip without a corresponding commit or PR on GitHub.

## 6. Earn the Right to Complexity

Phase 1 is profiles and care logging. Phase 2 is schedules and health tracking. Phase 3 is gamification and offline. Phase 4 is calendar sync and polish. We do not skip phases. Each phase earns the trust and data to justify the next. Gamification without reliable logging is a gimmick. Offline sync without a stable schema is a disaster.

- **Always:** Ship the boring foundation before the exciting feature. Validate each phase with real usage.
- **Never:** Jump to Phase 3 features when Phase 2 has bugs.

## 7. Multi-Platform is a Requirement, Not a Nice-to-Have

Household coordination fails if one person is on web and the other is on mobile and they see different data or different UI. Tamagui + tRPC + shared Zod schemas exist so that every platform gets the same experience from the same source of truth.

- **Always:** Build shared components in packages/ui. Use tRPC procedures that serve both web and mobile.
- **Never:** Build a web-only feature without a plan for mobile parity within the same sprint.

## 8. Security at the Household Boundary

Every API call must verify household membership. Period. A user in Household A must never see, modify, or infer data from Household B. This is not a nice-to-have security feature — it is the product. Families trust us with their pets' medical records, their spending data, their daily routines. One IDOR vulnerability and that trust is gone forever.

- **Always:** Verify household membership in every mutating tRPC procedure. Test for IDOR in every PR that touches data access.
- **Never:** Return data without checking the caller belongs to the target household.

## 9. Delight Through Reliability, Not Decoration

A feeding reminder that fires on time every time is worth more than an animated confetti celebration. Users will forgive an ugly screen if it never loses their data. They will never forgive a beautiful app that missed their dog's medication reminder.

- **Always:** Prioritize data integrity, notification reliability, and sync correctness.
- **Never:** Ship cosmetic polish over functional reliability.

## 10. Build for the Household That Grows

A household starts with one person and one pet. Then a partner joins. Then a sitter. Then a second pet. Then a puppy. Then grandma wants read-only access. Our architecture must handle this growth gracefully — roles, permissions, species-specific logic, scaling from 1 pet to 10.

- **Always:** Test with multi-member, multi-pet, multi-species households. Design roles and permissions from day one.
- **Never:** Hardcode assumptions about household size, pet count, or member roles.

---

**The north star:** PetForce becomes indispensable the day a household realizes they cannot coordinate pet care without it. Every principle above serves that moment.
