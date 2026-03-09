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

test.describe("Household Management", () => {
  test.describe.configure({ mode: "serial" });

  let originalName: string;

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

  test("getById returns household details", async ({ request }) => {
    const household = await trpcQuery(
      request,
      authToken,
      "household.getById",
      { householdId }
    );

    expect(household).toBeDefined();
    expect(household.id).toBe(householdId);
    expect(household.name).toBeDefined();
    expect(typeof household.name).toBe("string");

    originalName = household.name;
  });

  test("updates household name and theme", async ({ request }) => {
    const updated = await trpcMutation(
      request,
      authToken,
      "household.update",
      {
        householdId,
        name: `E2E-Updated-${Date.now()}`,
      }
    );

    expect(updated.name).toContain("E2E-Updated");
  });

  test("restores original household name", async ({ request }) => {
    if (!originalName) test.skip();

    const restored = await trpcMutation(
      request,
      authToken,
      "household.update",
      {
        householdId,
        name: originalName,
      }
    );

    expect(restored.name).toBe(originalName);
  });

  test("regenerates join code", async ({ request }) => {
    // Get current join code
    const before = await trpcQuery(
      request,
      authToken,
      "household.getById",
      { householdId }
    );
    const oldCode = before.joinCode;

    // Regenerate
    const result = await trpcMutation(
      request,
      authToken,
      "household.regenerateJoinCode",
      { householdId }
    );

    expect(result.joinCode).toBeDefined();
    expect(typeof result.joinCode).toBe("string");
    expect(result.joinCode.length).toBeGreaterThan(0);
    expect(result.joinCode).not.toBe(oldCode);
  });

  test("lists household members", async ({ request }) => {
    const members = await trpcQuery(
      request,
      authToken,
      "member.listByHousehold",
      { householdId }
    );

    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBeGreaterThanOrEqual(1);

    // Current user should be in the list as owner
    const owner = members.find(
      (m: { role: string }) => m.role === "owner"
    );
    expect(owner).toBeDefined();
  });

  test("canCreateHousehold returns false for existing owner", async ({
    request,
  }) => {
    const result = await trpcQuery(
      request,
      authToken,
      "dashboard.canCreateHousehold",
    );

    expect(result).toBeDefined();
    expect(result.canCreate).toBe(false);
  });
});
