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

test.describe("Member Router", () => {
  test.describe.configure({ mode: "serial" });

  let testMemberId: string;

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

  test("listByHousehold returns members array", async ({ request }) => {
    const members = await trpcQuery(
      request,
      authToken,
      "member.listByHousehold",
      { householdId }
    );

    expect(Array.isArray(members.items)).toBe(true);
    expect(members.items.length).toBeGreaterThanOrEqual(1);

    // Every member should have required fields
    for (const m of members.items) {
      expect(m.id).toBeDefined();
      expect(m.householdId).toBe(householdId);
      expect(m.userId).toBeDefined();
      expect(m.role).toBeDefined();
      expect(["owner", "admin", "member", "sitter"]).toContain(m.role);
    }
  });

  test("invite adds a new member", async ({ request }) => {
    const testUserId = `test-user-${Date.now()}`;
    const member = await trpcMutation(
      request,
      authToken,
      "member.invite",
      {
        householdId,
        userId: testUserId,
        role: "member",
        displayName: `E2E Test Member ${Date.now()}`,
      }
    );

    expect(member).toBeDefined();
    expect(member.id).toBeDefined();
    expect(member.role).toBe("member");
    expect(member.userId).toBe(testUserId);
    testMemberId = member.id;
  });

  test("updateRole changes member role", async ({ request }) => {
    if (!testMemberId) test.skip();

    const updated = await trpcMutation(
      request,
      authToken,
      "member.updateRole",
      {
        householdId,
        memberId: testMemberId,
        role: "admin",
      }
    );

    expect(updated.role).toBe("admin");
  });

  test("remove deletes the test member", async ({ request }) => {
    if (!testMemberId) test.skip();

    const result = await trpcMutation(
      request,
      authToken,
      "member.remove",
      {
        householdId,
        memberId: testMemberId,
      }
    );

    expect(result.success).toBe(true);
  });

  test("remove non-existent member throws NOT_FOUND", async ({ request }) => {
    try {
      await trpcMutation(
        request,
        authToken,
        "member.remove",
        {
          householdId,
          memberId: "00000000-0000-0000-0000-000000000000",
        }
      );
      expect(true).toBe(false); // Should not reach here
    } catch (err: unknown) {
      const error = err as { message: string };
      expect(error.message).toContain("not found");
    }
  });
});
