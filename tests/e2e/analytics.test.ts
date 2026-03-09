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

test.describe("Analytics & Gamification API", () => {
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

  // --- Analytics ---

  test("tracks an analytics event", async ({ request }) => {
    const result = await trpcMutation(
      request,
      authToken,
      "analytics.track",
      {
        eventName: "e2e_test_event",
        householdId,
        metadata: { source: "e2e", timestamp: Date.now() },
      }
    );

    expect(result).toBeDefined();
  });

  test("tracks event without householdId", async ({ request }) => {
    const result = await trpcMutation(
      request,
      authToken,
      "analytics.track",
      {
        eventName: "e2e_global_event",
        metadata: { type: "page_view" },
      }
    );

    expect(result).toBeDefined();
  });

  // --- Gamification API ---

  test("getStats returns full gamification data", async ({ request }) => {
    const stats = await trpcQuery(
      request,
      authToken,
      "gamification.getStats",
      { householdId }
    );

    expect(stats).toBeDefined();
    expect(Array.isArray(stats.members)).toBe(true);
    expect(stats.household).toBeDefined();
    expect(Array.isArray(stats.pets)).toBe(true);
    expect(stats.currentUserId).toBeDefined();

    // Check member stats shape
    if (stats.members.length > 0) {
      const member = stats.members[0];
      expect(typeof member.level).toBe("number");
      expect(typeof member.totalXp).toBe("number");
      expect(typeof member.currentStreak).toBe("number");
      expect(Array.isArray(member.unlockedBadgeIds)).toBe(true);
    }

    // Check household stats shape
    expect(typeof stats.household.level).toBe("number");
    expect(typeof stats.household.totalXp).toBe("number");
  });

  test("recalculate updates gamification stats", async ({ request }) => {
    const result = await trpcMutation(
      request,
      authToken,
      "gamification.recalculate",
      { householdId }
    );

    expect(result).toBeDefined();
  });
});
