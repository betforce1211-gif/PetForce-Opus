import { test, expect } from "@playwright/test";
import {
  extractAuthToken,
  trpcQuery,
  getHouseholdId,
  safeGoto,
} from "./helpers/api-client";

import "./helpers/load-env";

let authToken: string;
let householdId: string;

test.describe("Reporting System", () => {
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

  // Use a 30-day window for all queries
  const to = new Date().toISOString().split("T")[0];
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  test("completionLog returns paginated entries", async ({ request }) => {
    const result = await trpcQuery(
      request,
      authToken,
      "reporting.completionLog",
      { householdId, from, to, limit: 50 }
    );

    expect(Array.isArray(result)).toBe(true);
    for (const entry of result) {
      expect(entry.completedAt).toBeDefined();
      expect(entry.taskType).toBeDefined();
    }
  });

  test("completionLog filters by taskType", async ({ request }) => {
    const result = await trpcQuery(
      request,
      authToken,
      "reporting.completionLog",
      { householdId, from, to, taskType: "feeding", limit: 50 }
    );

    expect(Array.isArray(result)).toBe(true);
    for (const entry of result) {
      expect(entry.taskType).toBe("feeding");
    }
  });

  test("contributions returns member breakdown", async ({ request }) => {
    const result = await trpcQuery(
      request,
      authToken,
      "reporting.contributions",
      { householdId, from, to }
    );

    expect(Array.isArray(result)).toBe(true);
    for (const contrib of result) {
      expect(contrib.memberId).toBeDefined();
      expect(typeof contrib.completed).toBe("number");
      expect(typeof contrib.skipped).toBe("number");
    }
  });

  test("trends returns daily data points", async ({ request }) => {
    const result = await trpcQuery(
      request,
      authToken,
      "reporting.trends",
      { householdId, from, to, granularity: "daily" }
    );

    expect(Array.isArray(result)).toBe(true);
    for (const point of result) {
      expect(point.date).toBeDefined();
      expect(typeof point.completed).toBe("number");
      expect(typeof point.skipped).toBe("number");
    }
  });

  test("trends returns weekly data points", async ({ request }) => {
    const result = await trpcQuery(
      request,
      authToken,
      "reporting.trends",
      { householdId, from, to, granularity: "weekly" }
    );

    expect(Array.isArray(result)).toBe(true);
  });

  test("summary returns comprehensive stats", async ({ request }) => {
    const result = await trpcQuery(
      request,
      authToken,
      "reporting.summary",
      { householdId, from, to }
    );

    expect(result).toBeDefined();
    expect(typeof result.totalCompleted).toBe("number");
    expect(typeof result.skipped).toBe("number");
    expect(typeof result.completionRate).toBe("number");
    expect(result.completionRate).toBeGreaterThanOrEqual(0);
    expect(result.completionRate).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.contributions)).toBe(true);
  });
});
