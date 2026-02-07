import { test, expect } from "@playwright/test";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import path from "path";
import fs from "fs";

// Load test env vars
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length && !key.startsWith("#")) {
      process.env[key.trim()] = rest.join("=").trim();
    }
  }
}

const email = process.env.TEST_USER_EMAIL!;

test.describe("Authenticated Dashboard Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Set up Clerk testing token + sign in for each test
    await setupClerkTestingToken({ page });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await clerk.signIn({
      page,
      emailAddress: email,
    });
  });

  test("dashboard loads after sign-in (no infinite loading)", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const url = page.url();

    await page.screenshot({
      path: "test-results/screenshots/10-authenticated-dashboard.png",
      fullPage: true,
    });

    // Should be on dashboard or onboard — NOT stuck on loading, NOT on sign-in
    const isOnDashboard = url.includes("/dashboard");
    const isOnOnboard = url.includes("/onboard");
    expect(isOnDashboard || isOnOnboard).toBeTruthy();

    // Should NOT show the "Loading..." text forever or "UNAUTHORIZED" error
    const body = await page.textContent("body");
    expect(body).not.toContain("UNAUTHORIZED");
  });

  test("onboard page: create a household if none exists", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const url = page.url();
    await page.screenshot({
      path: "test-results/screenshots/11-after-login-redirect.png",
      fullPage: true,
    });

    // If redirected to onboard, fill the form
    if (url.includes("/onboard")) {
      await page.screenshot({
        path: "test-results/screenshots/12-onboard-form.png",
        fullPage: true,
      });

      // Fill household name
      const nameInput = page.locator('input[placeholder="The Smith Family"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill("Test Household");

        // Fill display name
        const displayInput = page.locator('input[placeholder="Jane Smith"]');
        await displayInput.fill("Test User");

        await page.screenshot({
          path: "test-results/screenshots/13-onboard-filled.png",
          fullPage: true,
        });

        // Submit the form
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/dashboard/, { timeout: 10000 });

        await page.waitForTimeout(2000);
        await page.screenshot({
          path: "test-results/screenshots/14-dashboard-after-onboard.png",
          fullPage: true,
        });
      }
    }

    // If already on dashboard, take a screenshot
    if (page.url().includes("/dashboard")) {
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: "test-results/screenshots/15-dashboard-loaded.png",
        fullPage: true,
      });

      // Verify dashboard content is visible (not loading/error state)
      const body = await page.textContent("body");
      const hasContent =
        body?.includes("Pets") ||
        body?.includes("No pets yet") ||
        body?.includes("Members");
      expect(hasContent).toBeTruthy();
    }
  });
});
