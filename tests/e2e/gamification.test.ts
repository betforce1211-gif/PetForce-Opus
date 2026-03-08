import { test, expect } from "@playwright/test";
import { safeGoto } from "./helpers/api-client";

import "./helpers/load-env";

/** Wait for the Gamification tile to finish loading on the dashboard. */
async function waitForGamificationTileLoaded(page: import("@playwright/test").Page) {
  await safeGoto(page, "/dashboard");
  await expect(page.locator("text=Gamification").first()).toBeVisible({ timeout: 10_000 });

  // Wait for tile content to appear (exits "Loading..." state)
  const viewDetails = page.locator("text=View Details").first();
  const noStats = page.getByText("No stats yet");
  const error = page.getByText("Failed to load");
  await expect(viewDetails.or(noStats).or(error).first()).toBeVisible({ timeout: 15_000 });
}

test.describe("Gamification Modal", () => {
  test("tile renders on dashboard", async ({ page }) => {
    await waitForGamificationTileLoaded(page);

    expect(page.url()).toContain("/dashboard");

    await page.screenshot({
      path: "test-results/screenshots/gamification-01-dashboard.png",
      fullPage: true,
    }).catch(() => {});
  });

  test("modal Members tab shows category-grouped badges", async ({ page }) => {
    await waitForGamificationTileLoaded(page);

    await page.locator("text=View Details").first().click();
    await page.waitForTimeout(1500);

    const modalText = await page.textContent("body");
    expect(modalText).toContain("Gamification");
    expect(modalText).toContain("Member Badges");
    expect(modalText).toContain("Milestones");

    await page.screenshot({
      path: "test-results/screenshots/gamification-02-modal-members.png",
      fullPage: true,
    }).catch(() => {});
  });

  test("modal Household tab shows category-grouped badges", async ({ page }) => {
    await waitForGamificationTileLoaded(page);

    await page.locator("text=View Details").first().click();
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "\uD83C\uDFE0 Household" }).click();
    await page.waitForTimeout(500);

    const text = await page.textContent("body");
    expect(text).toContain("Household Badges");

    await page.screenshot({
      path: "test-results/screenshots/gamification-03-modal-household.png",
      fullPage: true,
    }).catch(() => {});
  });

  test("modal Pets tab shows category-grouped badges", async ({ page }) => {
    await waitForGamificationTileLoaded(page);

    await page.locator("text=View Details").first().click();
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "\uD83D\uDC3E Pets" }).click();
    await page.waitForTimeout(500);

    const text = await page.textContent("body");
    expect(text).toContain("Pet Badges");

    await page.screenshot({
      path: "test-results/screenshots/gamification-04-modal-pets.png",
      fullPage: true,
    }).catch(() => {});
  });
});
