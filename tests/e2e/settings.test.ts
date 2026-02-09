import { test, expect } from "@playwright/test";
import { goToSettings } from "./helpers/api-client";

import "./helpers/load-env";

test.describe("Settings Page (Real Data)", () => {
  test.describe.configure({ mode: "serial" });

  test("navigates to settings from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Click Settings button in the dashboard header
    const settingsBtn = page.getByRole("link", { name: "Settings" }).or(
      page.locator('a:has-text("Settings"), button:has-text("Settings")')
    );
    await settingsBtn.first().click();
    await page.waitForURL(/\/dashboard\/settings/, { timeout: 10_000 });

    expect(page.url()).toContain("/dashboard/settings");

    await page.screenshot({
      path: "test-results/screenshots/settings-01-navigation.png",
      fullPage: true,
    });
  });

  test("Members tab shows tabs, real members, and owner role", async ({ page }) => {
    await goToSettings(page);

    // Verify all 3 tabs render
    await expect(page.getByText("Members", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Invites", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Settings", { exact: true }).first()).toBeVisible();

    // Members tab should be active by default — show at least one member with Owner role
    const ownerSelect = page.locator("select").first();
    await expect(ownerSelect).toBeVisible({ timeout: 10_000 });
    const value = await ownerSelect.inputValue();
    expect(value).toBe("owner");

    await page.screenshot({
      path: "test-results/screenshots/settings-02-members.png",
      fullPage: true,
    });
  });

  test("Invites and Settings tabs show expected content", async ({ page }) => {
    await goToSettings(page);

    // --- Invites tab ---
    await page.getByText("Invites", { exact: true }).first().click();
    await page.waitForTimeout(1000);

    await expect(page.getByText("Create Invitation")).toBeVisible({ timeout: 5000 });
    const emailInput = page.locator('input[placeholder="friend@example.com"]');
    await expect(emailInput).toBeVisible();
    await expect(
      page.locator('button:has-text("Create Invite")')
    ).toBeVisible();

    await page.screenshot({
      path: "test-results/screenshots/settings-03-invites-tab.png",
      fullPage: true,
    });

    // --- Settings tab ---
    const settingsTab = page.getByText("Settings", { exact: true });
    await settingsTab.last().click();
    await page.waitForTimeout(1000);

    // General section
    await expect(page.getByText("General")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Household Name")).toBeVisible();

    // Color pickers
    await expect(page.getByText("Primary Color")).toBeVisible();
    await expect(page.getByText("Secondary Color")).toBeVisible();

    // Join Code section
    await expect(page.getByText("Join Code")).toBeVisible();
    const codeOrNotSet = page
      .locator("text=/[A-HJ-NP-Z]{3}-\\d{4}/")
      .or(page.getByText("Not set"));
    await expect(codeOrNotSet.first()).toBeVisible({ timeout: 5000 });

    // Danger Zone
    await expect(page.getByText("Danger Zone")).toBeVisible();
    await expect(
      page.locator('button:has-text("Delete Household")')
    ).toBeVisible();

    await page.screenshot({
      path: "test-results/screenshots/settings-04-settings-tab.png",
      fullPage: true,
    });
  });
});
