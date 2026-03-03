import { test, expect } from "@playwright/test";
import {
  extractAuthToken,
  trpcQuery,
  trpcMutation,
  getHouseholdId,
  safeGoto,
} from "./helpers/api-client";

import "./helpers/load-env";

/**
 * Household Creation Limit — Authenticated E2E Tests
 *
 * Tests the one-household-creation-per-user enforcement against real API:
 * - canCreateHousehold query returns false for existing owner
 * - myHouseholds includes role field
 * - FORBIDDEN guard on dashboard.onboard
 * - FORBIDDEN guard on household.create
 * - Onboard page redirects owner to dashboard
 */

let authToken: string;
let householdId: string;

test.describe("Household Creation Limit", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "e2e/.auth/session.json",
    });
    const page = await context.newPage();

    const tokenPromise = extractAuthToken(page);

    // Use safeGoto to handle Clerk session expiry/redirect loops
    await safeGoto(page, "/dashboard");

    // Handle case where user lands on /onboard (needs household first)
    if (page.url().includes("/onboard")) {
      await page.waitForTimeout(3000);
      const nameInput = page.locator('input[placeholder="The Smith Family"]');
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill("Limit Test Household");
        const displayInput = page.locator('input[placeholder="Jane Smith"]');
        await displayInput.fill("Test Owner");
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/dashboard/, { timeout: 15000 });
        await page.waitForTimeout(2000);
      }
    }

    authToken = await tokenPromise;
    householdId = await getHouseholdId(page);

    await page.close();
    await context.close();
  });

  // ── API-level tests ──

  test("canCreateHousehold returns false for existing owner", async ({
    request,
  }) => {
    const result = await trpcQuery(
      request,
      authToken,
      "dashboard.canCreateHousehold"
    );

    expect(result).toEqual({ canCreate: false });
  });

  test("myHouseholds includes role field", async ({ request }) => {
    const result = await trpcQuery(
      request,
      authToken,
      "dashboard.myHouseholds"
    );

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    for (const household of result) {
      expect(household).toHaveProperty("role");
      expect(["owner", "admin", "member", "sitter"]).toContain(household.role);
    }

    // The test user should be an owner of at least one household
    const ownerHousehold = result.find(
      (h: { role: string }) => h.role === "owner"
    );
    expect(ownerHousehold).toBeDefined();
  });

  test("dashboard.onboard rejects second household creation with FORBIDDEN", async ({
    request,
  }) => {
    try {
      await trpcMutation(request, authToken, "dashboard.onboard", {
        name: "Second Household",
        displayName: "Should Fail",
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toContain("already created a household");
    }
  });

  test("household.create rejects second household creation with FORBIDDEN", async ({
    request,
  }) => {
    try {
      await trpcMutation(request, authToken, "household.create", {
        name: "Another Second Household",
      });
      expect(true).toBe(false);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toContain("already created a household");
    }
  });

  // ── UI test (authenticated) ──

  test("onboard page redirects owner to dashboard", async ({ page }) => {
    await safeGoto(page, "/onboard");
    await page.waitForTimeout(4000);

    await page
      .screenshot({
        path: "test-results/screenshots/creation-limit-01-onboard-redirect.png",
        fullPage: true,
      })
      .catch(() => {});

    // Owner who already has a household should be redirected to dashboard
    expect(page.url()).toContain("/dashboard");
  });
});
