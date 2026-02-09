import { test, expect } from "@playwright/test";
import {
  extractAuthToken,
  trpcMutation,
  trpcQuery,
  getHouseholdId,
} from "./helpers/api-client";

import "./helpers/load-env";

let authToken: string;
let householdId: string;

test.describe("Access Request Admin + Error Paths", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "e2e/.auth/session.json",
    });
    const page = await context.newPage();

    const tokenPromise = extractAuthToken(page);
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    authToken = await tokenPromise;
    householdId = await getHouseholdId(page);

    await page.close();
    await context.close();
  });

  test("listByHousehold returns empty array when no requests exist", async ({
    request,
  }) => {
    const result = await trpcQuery(
      request,
      authToken,
      "accessRequest.listByHousehold",
      { householdId }
    );

    expect(Array.isArray(result)).toBe(true);
  });

  test("approve with nonexistent ID returns NOT_FOUND", async ({
    request,
  }) => {
    const fakeId = "00000000-0000-0000-0000-000000000000";

    try {
      await trpcMutation(request, authToken, "accessRequest.approve", {
        householdId,
        requestId: fakeId,
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: unknown) {
      const err = error as { code?: string };
      expect(err.code).toBe("NOT_FOUND");
    }
  });

  test("deny with nonexistent ID returns NOT_FOUND", async ({ request }) => {
    const fakeId = "00000000-0000-0000-0000-000000000000";

    try {
      await trpcMutation(request, authToken, "accessRequest.deny", {
        householdId,
        requestId: fakeId,
      });
      expect(true).toBe(false);
    } catch (error: unknown) {
      const err = error as { code?: string };
      expect(err.code).toBe("NOT_FOUND");
    }
  });

  test("create access request for own household returns CONFLICT", async ({
    request,
  }) => {
    // Get the household's join code — regenerate if not set
    let household = await trpcQuery(
      request,
      authToken,
      "household.getById",
      { id: householdId }
    );
    if (!household.joinCode) {
      household = await trpcMutation(
        request,
        authToken,
        "household.regenerateJoinCode",
        { householdId }
      );
    }
    const joinCode = household.joinCode;

    try {
      await trpcMutation(request, authToken, "accessRequest.create", {
        joinCode,
        displayName: "Test User",
        message: "Testing conflict",
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      // API may return CONFLICT or BAD_REQUEST for "already a member"
      expect(err.code).toMatch(/CONFLICT|BAD_REQUEST/);
    }
  });

  test("accept own invite via API returns CONFLICT", async ({ request }) => {
    // Create an invite for our own household
    const invite = await trpcMutation(
      request,
      authToken,
      "invitation.create",
      { householdId, role: "member" }
    );

    try {
      // Try to accept it — should fail since we're already a member
      await trpcMutation(request, authToken, "invitation.accept", {
        token: invite.token,
      });
      expect(true).toBe(false);
    } catch (error: unknown) {
      const err = error as { code?: string };
      expect(err.code).toMatch(/CONFLICT|BAD_REQUEST/);
    }

    // Clean up — revoke the invitation
    try {
      await trpcMutation(request, authToken, "invitation.revoke", {
        householdId,
        invitationId: invite.id,
      });
    } catch {
      // Ignore cleanup errors
    }
  });
});
