# QA/Testing Agent — tests/

## Role

Owns the testing strategy, test suites, E2E tests, and quality assurance for the entire PetForce monorepo.

## Scope

- `tests/` — shared E2E tests, integration tests, test utilities
- `apps/*/src/**/*.test.ts` — unit tests co-located with source (coordinate with app agents)
- `packages/*/src/**/*.test.ts` — package-level unit tests

## What You Own

- **E2E Tests** — end-to-end tests that exercise the full stack (API + web)
- **Integration Tests** — cross-package integration tests
- **Test Utilities** — shared test helpers, fixtures, factories, mocks
- **CI Test Config** — test scripts, coverage thresholds, test matrix
- **Test Documentation** — how to write tests, what to test, testing conventions

## Current File Structure

```
tests/
├── CLAUDE.md                  # This file
├── .env.example               # Template for test credentials
├── package.json               # Test dependencies (vitest, playwright)
├── playwright.config.ts       # E2E test configuration
├── global.setup.ts            # Env loading and screenshot dir setup
├── vitest.config.ts           # Unit/integration test configuration
├── e2e/
│   ├── auth.setup.ts          # Clerk session establishment
│   ├── api-client.ts          # Test helpers (safeGoto, ensureAuthenticated, etc.)
│   ├── helpers/
│   │   └── load-env.ts        # Env loading helper
│   ├── infra-health.test.ts   # Infrastructure gate tests
│   ├── smoke.test.ts          # Unauthenticated page tests
│   ├── authenticated.test.ts  # Dashboard loading tests
│   ├── add-pet.test.ts        # Pet creation tests
│   ├── feeding.test.ts        # Feeding schedule CRUD tests
│   ├── health.test.ts         # Health record tests
│   ├── finance.test.ts        # Expense tracking tests
│   ├── calendar.test.ts       # Calendar navigation tests
│   ├── gamification.test.ts   # Badge/achievement tests
│   ├── settings.test.ts       # Household settings tests
│   ├── invite-admin.test.ts   # Invitation management tests
│   ├── invite-join-page.test.ts # Accept/decline invite tests
│   ├── access-request.test.ts # Join-code request tests
│   ├── household-creation-limit.test.ts # One-household limit tests
│   ├── onboard-scenarios.test.ts # Onboarding flow tests (mocked)
│   ├── dashboard.test.ts      # Dashboard rendering tests (mocked)
│   └── manual-signin.test.ts  # Manual sign-in flow tests
└── test-results/              # Screenshots and reports (gitignored)
```

### Planned (not yet implemented)

- `tests/unit/` — Vitest unit tests for @petforce/core schemas
- `tests/integration/` — API integration tests (tRPC router tests)
- `tests/fixtures/` — Test data factories

## Tech

- **Unit/Integration:** Vitest (fast, TypeScript-native, compatible with monorepo)
- **E2E (Web):** Playwright (cross-browser, reliable)
- **E2E (Mobile):** Detox or Maestro (coordinate with Mobile agent)
- **Mocking:** MSW (Mock Service Worker) for API mocking in frontend tests
- **Coverage:** Vitest built-in coverage with v8

## Conventions

- **Co-located unit tests:** `*.test.ts` files live next to the source they test
- **Shared tests in `tests/`:** E2E and integration tests that span multiple packages
- **Test naming:** `describe("feature")` → `it("should do X when Y")`
- **Factories over fixtures:** Prefer factory functions (`createTestHousehold()`) over static fixtures for flexibility
- **No test DB pollution:** Each test suite sets up and tears down its own data
- **Coverage targets:** Aim for 80%+ on `packages/core` and `apps/api`, 60%+ on frontends

## Commands

```bash
# Run all tests
pnpm test

# Run unit tests for a specific package
pnpm test --filter=@petforce/core

# Run E2E tests
pnpm test:e2e

# Run with coverage
pnpm test --coverage
```

## Coordination

- **Backend agent** adds an endpoint → write integration test in `tests/integration/`
- **Core agent** adds a schema → write unit tests for validation edge cases
- **Web/Mobile agents** add features → coordinate on E2E test coverage
- **DevOps agent** sets up CI → ensure test commands are wired into the pipeline
