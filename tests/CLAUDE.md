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

## File Structure

```
tests/
├── CLAUDE.md                  # This file
├── e2e/
│   ├── households.test.ts     # E2E: household CRUD flows
│   ├── pets.test.ts           # E2E: pet management flows
│   └── activities.test.ts     # E2E: activity tracking flows
├── integration/
│   ├── api-db.test.ts         # API ↔ Database integration
│   └── trpc-client.test.ts    # tRPC client ↔ server integration
├── fixtures/
│   ├── households.ts          # Test household data
│   ├── pets.ts                # Test pet data
│   └── members.ts             # Test member data
├── helpers/
│   ├── setup.ts               # Test environment setup/teardown
│   ├── db.ts                  # Test database utilities (seed, reset)
│   └── auth.ts                # Mock auth helpers
├── package.json               # Test dependencies (vitest, playwright, etc.)
└── vitest.config.ts           # Shared test configuration
```

## Tech

- **Unit/Integration:** Vitest (fast, TypeScript-native, compatible with monorepo)
- **E2E (Web):** Playwright (cross-browser, reliable)
- **E2E (Mobile):** Detox or Maestro (coordinate with Mobile agent)
- **Mocking:** MSW (Mock Service Worker) for API mocking in frontend tests
- **Coverage:** Vitest built-in coverage with c8/istanbul

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
