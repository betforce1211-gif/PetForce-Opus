import { test, expect } from "@playwright/test";
import {
  extractAuthToken,
  trpcMutation,
  trpcQuery,
  getHouseholdId,
  goToSettings,
} from "./helpers/api-client";

import "./helpers/load-env";

let authToken: string;
let householdId: string;

// Track invitations created during tests for cleanup
const createdInvitationIds: string[] = [];

test.describe("Invitation Lifecycle (Admin)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ browser }) => {
    // Extract auth token and household ID from a real authenticated session
    const context = await browser.newContext({
      storageState: "e2e/.auth/session.json",
    });
    const page = await context.newPage();

    // Start listening for tRPC requests before navigating
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
    // Clean up: revoke any pending invitations created during tests
    for (const id of createdInvitationIds) {
      try {
        await trpcMutation(request, authToken, "invitation.revoke", {
          householdId,
          invitationId: id,
        });
      } catch {
        // Already revoked or doesn't exist — ignore
      }
    }
    createdInvitationIds.length = 0;
  });

  test("creates invite via API with correct fields", async ({ request }) => {
    const result = await trpcMutation(
      request,
      authToken,
      "invitation.create",
      {
        householdId,
        role: "member",
      }
    );

    expect(result).toBeDefined();
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe("string");
    expect(result.status).toBe("pending");
    expect(result.role).toBe("member");
    expect(result.householdId).toBe(householdId);
    expect(result.expiresAt).toBeDefined();

    // Verify expiration is roughly 7 days from now
    const expiresAt = new Date(result.expiresAt).getTime();
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiresAt - now).toBeGreaterThan(sevenDaysMs - 60_000); // within 1 min
    expect(expiresAt - now).toBeLessThan(sevenDaysMs + 60_000);

    createdInvitationIds.push(result.id);
  });

  test("lists invitations via API", async ({ request }) => {
    // Create an invite first
    const created = await trpcMutation(
      request,
      authToken,
      "invitation.create",
      { householdId, role: "sitter" }
    );
    createdInvitationIds.push(created.id);

    // List invitations
    const invites = await trpcQuery(
      request,
      authToken,
      "invitation.listByHousehold",
      { householdId }
    );

    expect(Array.isArray(invites)).toBe(true);
    const found = invites.find(
      (i: { id: string }) => i.id === created.id
    );
    expect(found).toBeDefined();
    expect(found.status).toBe("pending");
    expect(found.role).toBe("sitter");
  });

  test("getByToken returns invite details with household name", async ({
    request,
  }) => {
    const created = await trpcMutation(
      request,
      authToken,
      "invitation.create",
      { householdId, role: "sitter" }
    );
    createdInvitationIds.push(created.id);

    const details = await trpcQuery(
      request,
      authToken,
      "invitation.getByToken",
      { token: created.token }
    );

    expect(details).toBeDefined();
    expect(details.token).toBe(created.token);
    expect(details.role).toBe("sitter");
    expect(details.status).toBe("pending");
    expect(details.householdName).toBeDefined();
    expect(typeof details.householdName).toBe("string");
    expect(details.householdName.length).toBeGreaterThan(0);
  });

  test("revokes invite via API", async ({ request }) => {
    const created = await trpcMutation(
      request,
      authToken,
      "invitation.create",
      { householdId, role: "member" }
    );

    const revoked = await trpcMutation(
      request,
      authToken,
      "invitation.revoke",
      {
        householdId,
        invitationId: created.id,
      }
    );

    expect(revoked.status).toBe("expired");
    expect(revoked.id).toBe(created.id);
  });

  test("cannot revoke already-revoked invite", async ({ request }) => {
    const created = await trpcMutation(
      request,
      authToken,
      "invitation.create",
      { householdId, role: "member" }
    );

    // Revoke once
    await trpcMutation(request, authToken, "invitation.revoke", {
      householdId,
      invitationId: created.id,
    });

    // Revoke again — should fail
    await expect(
      trpcMutation(request, authToken, "invitation.revoke", {
        householdId,
        invitationId: created.id,
      })
    ).rejects.toThrow();
  });

  test("creates invite via UI and shows link", async ({ page }) => {
    await goToSettings(page);

    // Navigate to Invites tab
    await page.getByText("Invites", { exact: true }).first().click();
    await page.waitForTimeout(1000);

    // Fill the form
    await expect(page.getByText("Create Invitation")).toBeVisible({
      timeout: 5000,
    });
    // Role select — pick "member"
    const roleSelect = page.locator("select").first();
    await roleSelect.selectOption("member");

    // Click create
    await page.locator('button:has-text("Create Invite")').click();

    // Wait for the invite link to appear
    const linkText = page.locator("text=/\\/join\\?token=/");
    await expect(linkText.first()).toBeVisible({ timeout: 10_000 });

    await page.screenshot({
      path: "test-results/screenshots/invite-01-created-via-ui.png",
      fullPage: true,
    });

    // Extract the invitation ID from the pending list for cleanup
    try {
      const invites = await trpcQuery(
        page.request,
        authToken,
        "invitation.listByHousehold",
        { householdId }
      );
      if (Array.isArray(invites)) {
        for (const inv of invites) {
          if (inv.status === "pending") {
            createdInvitationIds.push(inv.id);
          }
        }
      }
    } catch {
      // Best effort cleanup tracking
    }
  });

  test("pending invite appears in UI list", async ({ page, request }) => {
    // Create invite via API
    const created = await trpcMutation(
      request,
      authToken,
      "invitation.create",
      { householdId, role: "admin", email: "uicheck@example.com" }
    );
    createdInvitationIds.push(created.id);

    await goToSettings(page);
    await page.getByText("Invites", { exact: true }).first().click();
    await page.waitForTimeout(2000);

    // Should show Pending Invitations section
    await expect(
      page.getByText("Pending Invitations")
    ).toBeVisible({ timeout: 10_000 });

    // Should show the invite email or "Link invite"
    const inviteRow = page.getByText("uicheck@example.com").or(
      page.getByText("Link invite")
    );
    await expect(inviteRow.first()).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: "test-results/screenshots/invite-02-pending-list.png",
      fullPage: true,
    });
  });

  test("revokes invite via UI Revoke button", async ({ page, request }) => {
    // Create invite via API
    const created = await trpcMutation(
      request,
      authToken,
      "invitation.create",
      { householdId, role: "member" }
    );
    // Don't add to cleanup — we're revoking in this test

    await goToSettings(page);
    await page.getByText("Invites", { exact: true }).first().click();
    await page.waitForTimeout(2000);

    // Click the Revoke button for the pending invitation
    const revokeBtn = page.locator('button:has-text("Revoke")').first();
    await expect(revokeBtn).toBeVisible({ timeout: 5000 });
    await revokeBtn.click();
    await page.waitForTimeout(2000);

    // The invite should move to Past Invitations with expired badge
    await expect(page.getByText("Past Invitations")).toBeVisible({
      timeout: 10_000,
    });

    await page.screenshot({
      path: "test-results/screenshots/invite-03-revoked-ui.png",
      fullPage: true,
    });
  });
});
