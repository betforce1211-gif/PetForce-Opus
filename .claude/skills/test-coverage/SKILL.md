---
name: test-coverage
description: Scan tRPC routers for untested procedures, generate a coverage report, and optionally scaffold missing test files
---

# /test-coverage — tRPC Router Test Coverage Scanner

Identify tRPC procedures without test coverage and optionally scaffold missing tests.

**Usage:** `/test-coverage` or `/test-coverage <router-name>`

## Process

### Step 1: Discover All Routers and Procedures

Read `apps/api/src/router.ts` to get the list of registered routers. For each router file in `apps/api/src/routers/`:

1. Parse the router file to extract procedure names and types (query/mutation)
2. Build a map: `{ routerName: [{ procedure, type }] }`

Example output after scanning:
```
pet: [listByHousehold (query), getById (query), create (mutation), update (mutation), delete (mutation)]
household: [list (query), getById (query), create (mutation), update (mutation), delete (mutation)]
...
```

### Step 2: Scan for Existing Tests

Search for test files that exercise each procedure:

1. **E2E tests** in `tests/e2e/` — search for `trpcQuery` and `trpcMutation` calls with procedure paths like `"pet.create"`, `"pet.listByHousehold"`
2. **Unit tests** co-located in `apps/api/src/routers/*.test.ts` — search for procedure name references
3. **Integration tests** in `tests/integration/` (if exists)

For each procedure, determine:
- **Covered**: at least one test calls this procedure
- **Partial**: test file exists for the router but doesn't cover this specific procedure
- **Uncovered**: no test references this procedure at all

### Step 3: Generate Coverage Report

```
## tRPC Router Test Coverage Report

### Summary
- Total routers: 18
- Total procedures: 72
- Covered: 45 (62.5%)
- Partial: 12 (16.7%)
- Uncovered: 15 (20.8%)

### Coverage by Router

| Router         | Procedures | Covered | Partial | Uncovered | Coverage |
|----------------|-----------|---------|---------|-----------|----------|
| pet            | 5         | 5       | 0       | 0         | 100%     |
| household      | 5         | 3       | 1       | 1         | 60%      |
| feeding        | 8         | 6       | 2       | 0         | 75%      |
| notification   | 4         | 0       | 0       | 4         | 0%       |
| ...            |           |         |         |           |          |

### Uncovered Procedures (sorted by priority)

1. **notification.list** (query) — no tests
2. **notification.markRead** (mutation) — no tests
3. **export.generatePdf** (mutation) — no tests
...
```

### Step 4: Scaffold Option

If the user passes `--scaffold` or asks to generate tests, create test files for uncovered routers following the `pet-crud.test.ts` pattern:

For each uncovered router, generate `tests/e2e/<router-name>.test.ts`:

```ts
import { test, expect } from "@playwright/test";
import {
  extractAuthToken,
  trpcMutation,
  trpcQuery,
  getHouseholdId,
  safeGoto,
} from "./helpers/api-client";
import "./helpers/load-env";

let authToken: string;
let householdId: string;

test.describe("<RouterName> CRUD", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "e2e/.auth/session.json",
    });
    const page = await context.newPage();
    const tokenPromise = extractAuthToken(page);
    await safeGoto(page, "/dashboard");
    await page.waitForTimeout(3000);
    authToken = await tokenPromise;
    householdId = await getHouseholdId(page);
    await page.close();
    await context.close();
  });

  // One test per procedure...
});
```

Each test follows the create → verify → update → verify → delete → verify pattern.

### Step 5: Prioritization

Rank uncovered procedures by risk:
- **Critical**: mutations that modify data (create, update, delete) — test these first
- **High**: queries that enforce access control (membership checks) — security-sensitive
- **Medium**: read-only queries with pagination or filtering
- **Low**: utility queries (health checks, public endpoints)

## Rules

- This skill is primarily read-only — only writes files when `--scaffold` is requested
- Search for procedure names as string literals (e.g., `"pet.create"`) in test files
- Count a procedure as covered only if a test actually calls it, not just if the file exists
- If a single router is specified as argument, scope the report to just that router
