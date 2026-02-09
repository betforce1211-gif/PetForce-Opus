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

// Track invitations for cleanup
const createdInvitationIds: string[] = [];

test.describe("Join Page — Token Mode (Accept Invite)", () => {
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

  test.afterEach(async ({ request }) => {
    for (const id of createdInvitationIds) {
      try {
        await trpcMutation(request, authToken, "invitation.revoke", {
          householdId,
          invitationId: id,
        });
      } catch {
        // Already revoked or doesn't exist
      }
    }
    createdInvitationIds.length = 0;
  });

  test("valid pending token shows household name and action buttons", async ({
    page,
    request,
  }) => {
    // Create a real invite
    const invite = await trpcMutation(
      request,
      authToken,
      "invitation.create",
      { householdId, role: "member" }
    );
    createdInvitationIds.push(invite.id);

    // Navigate to join page with token
    await safeGoto(page, `/join?token=${invite.token}`);
    await page.waitForTimeout(1000);

    // Should show "You're invited to join" text
    await expect(page.getByText("You're invited to join")).toBeVisible({
      timeout: 10_000,
    });

    // Should show the household name
    const householdDetails = await trpcQuery(
      request,
      authToken,
      "invitation.getByToken",
      { token: invite.token }
    );
    await expect(
      page.getByText(householdDetails.householdName)
    ).toBeVisible();

    // Should show role
    await expect(page.getByText(/member/i)).toBeVisible();

    // Should show Accept & Join and Decline buttons
    await expect(
      page.locator('button:has-text("Accept & Join")')
    ).toBeVisible();
    await expect(
      page.locator('button:has-text("Decline")')
    ).toBeVisible();

    await page.screenshot({
      path: "test-results/screenshots/join-01-valid-token.png",
      fullPage: true,
    });
  });

  test("invalid token shows Invitation Not Found", async ({ page }) => {
    await safeGoto(page, "/join?token=nonexistent-invalid-token-xyz");
    await page.waitForTimeout(1000);

    await expect(
      page.getByRole("heading", { name: "Invitation Not Found" })
    ).toBeVisible({ timeout: 10_000 });

    await page.screenshot({
      path: "test-results/screenshots/join-02-invalid-token.png",
      fullPage: true,
    });
  });

  test("revoked token shows expired/non-pending state", async ({
    page,
    request,
  }) => {
    // Create and immediately revoke an invite
    const invite = await trpcMutation(
      request,
      authToken,
      "invitation.create",
      { householdId, role: "member" }
    );
    await trpcMutation(request, authToken, "invitation.revoke", {
      householdId,
      invitationId: invite.id,
    });

    await safeGoto(page, `/join?token=${invite.token}`);
    await page.waitForTimeout(1000);

    // Should show that invitation is expired/used
    const expiredText = page
      .getByText(/expired/i)
      .or(page.getByText(/already been/i))
      .or(page.getByRole("heading", { name: "Invitation Not Found" }));
    await expect(expiredText.first()).toBeVisible({ timeout: 10_000 });

    await page.screenshot({
      path: "test-results/screenshots/join-03-revoked-token.png",
      fullPage: true,
    });
  });

  test("accepting own invite via API returns CONFLICT", async ({ request }) => {
    // Create an invite — but the test user is already a member
    const invite = await trpcMutation(
      request,
      authToken,
      "invitation.create",
      { householdId, role: "member" }
    );
    createdInvitationIds.push(invite.id);

    // Accept via API — should fail since we're already a household member
    try {
      await trpcMutation(request, authToken, "invitation.accept", {
        token: invite.token,
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error: unknown) {
      const err = error as { code?: string };
      expect(err.code).toMatch(/CONFLICT|BAD_REQUEST/);
    }
  });

  test("declining invite redirects to dashboard and updates API status", async ({
    page,
    request,
  }) => {
    const invite = await trpcMutation(
      request,
      authToken,
      "invitation.create",
      { householdId, role: "member" }
    );
    // Don't add to cleanup — we're declining it

    await safeGoto(page, `/join?token=${invite.token}`);
    await page.waitForTimeout(1000);

    // Click Decline
    const declineBtn = page.locator('button:has-text("Decline")');
    await expect(declineBtn).toBeVisible({ timeout: 10_000 });
    await declineBtn.click();

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });

    // Verify API status is "declined"
    const details = await trpcQuery(
      request,
      authToken,
      "invitation.getByToken",
      { token: invite.token }
    );
    expect(details.status).toBe("declined");
  });
});

test.describe("Join Page — Request Mode (No Token)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ browser }) => {
    // If Token Mode already set these, reuse them
    if (authToken && householdId) return;

    const context = await browser.newContext({
      storageState: "e2e/.auth/session.json",
    });
    const page = await context.newPage();

    const tokenPromise = extractAuthToken(page);
    await safeGoto(page, "/dashboard");
    await page.waitForTimeout(1000);

    authToken = await tokenPromise;
    householdId = await getHouseholdId(page);

    await page.close();
    await context.close();
  });

  test("shows join form with code, name, and message fields", async ({
    page,
  }) => {
    await safeGoto(page, "/join");
    await page.waitForTimeout(1000);

    // Should show "Join a Household" heading
    await expect(page.getByText("Join a Household")).toBeVisible({
      timeout: 10_000,
    });

    // Join Code input
    const codeInput = page.locator('input[placeholder="ABC-1234"]');
    await expect(codeInput).toBeVisible();

    // Display Name input
    const nameInput = page.locator(
      'input[placeholder="How you\'d like to appear"]'
    );
    await expect(nameInput).toBeVisible();

    // Message textarea
    const messageField = page.locator("textarea");
    await expect(messageField).toBeVisible();

    // Request Access button
    await expect(
      page.locator('button:has-text("Request Access")')
    ).toBeVisible();

    await page.screenshot({
      path: "test-results/screenshots/join-05-request-form.png",
      fullPage: true,
    });
  });

  test("access request with own household join code returns CONFLICT via API", async ({
    request,
  }) => {
    // Get the join code — regenerate if not set
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
    expect(joinCode).toBeDefined();
    expect(typeof joinCode).toBe("string");

    // Submit access request via API — should fail since we're already a member
    try {
      await trpcMutation(request, authToken, "accessRequest.create", {
        joinCode,
        displayName: "Test User",
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error: unknown) {
      const err = error as { code?: string };
      expect(err.code).toMatch(/CONFLICT|BAD_REQUEST/);
    }
  });

  test("access request with nonexistent code returns NOT_FOUND via API", async ({
    request,
  }) => {
    try {
      await trpcMutation(request, authToken, "accessRequest.create", {
        joinCode: "ZZZ-9999",
        displayName: "Nobody",
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error: unknown) {
      const err = error as { code?: string };
      expect(err.code).toBe("NOT_FOUND");
    }
  });
});
