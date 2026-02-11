import { test, expect } from "@playwright/test";
import { safeGoto } from "./helpers/api-client";

import "./helpers/load-env";

test.describe("Add Pet Form", () => {
  test("form renders all three sections with correct fields", async ({ page }) => {
    await safeGoto(page, "/dashboard/add-pet");

    // Verify page title
    await expect(page.getByRole("heading", { name: "Add a pet" })).toBeVisible();

    // Verify all three fieldset sections
    await expect(page.locator("legend", { hasText: "Basic Info" })).toBeVisible();
    await expect(page.locator("legend", { hasText: "Identification" })).toBeVisible();
    await expect(page.locator("legend", { hasText: "Notes" })).toBeVisible();

    // Basic Info fields
    await expect(page.locator('input[placeholder="Buddy"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Golden Retriever"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Golden"]')).toBeVisible();
    await expect(page.locator('input[placeholder="25"]')).toBeVisible();

    // Species select has all options
    const speciesSelect = page.locator("select").first();
    await expect(speciesSelect.locator("option")).toHaveCount(6);

    // Sex select has placeholder + 3 options
    const sexSelect = page.locator("select").nth(1);
    await expect(sexSelect.locator("option")).toHaveCount(4);

    // Identification fields
    await expect(page.locator('input[placeholder="900123456789012"]')).toBeVisible();
    await expect(page.locator('input[placeholder="R-12345"]')).toBeVisible();

    // Notes textarea
    await expect(page.locator('textarea[placeholder*="Allergies"]')).toBeVisible();

    // Buttons
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Pet" })).toBeVisible();

    await page.screenshot({
      path: "test-results/screenshots/20-add-pet-form-empty.png",
      fullPage: true,
    });
  });

  test("submit pet with all fields and verify on dashboard", async ({ page }) => {
    await safeGoto(page, "/dashboard/add-pet");
    await expect(page.getByRole("heading", { name: "Add a pet" })).toBeVisible();

    // Use a unique name so we can find it on the dashboard
    const petName = `TestPet-${Date.now()}`;

    // Fill Basic Info
    await page.locator('input[placeholder="Buddy"]').fill(petName);
    await page.locator("select").first().selectOption("cat");
    await page.locator('input[placeholder="Golden Retriever"]').fill("Siamese");
    await page.locator('input[placeholder="Golden"]').fill("Cream");
    await page.locator("select").nth(1).selectOption("female");
    await page.locator('input[type="date"]').first().fill("2022-06-15");
    await page.locator('input[placeholder="25"]').fill("9.5");

    // Fill Identification
    await page.locator('input[type="date"]').nth(1).fill("2022-08-01");
    await page.locator('input[placeholder="900123456789012"]').fill("123456789012345");
    await page.locator('input[placeholder="R-12345"]').fill("R-99999");

    // Fill Notes
    await page.locator('textarea[placeholder*="Allergies"]').fill("Allergic to chicken. Needs daily thyroid medication.");

    await page.screenshot({
      path: "test-results/screenshots/21-add-pet-form-filled.png",
      fullPage: true,
    });

    // Submit
    await page.getByRole("button", { name: "Add Pet" }).click();

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard$/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: "test-results/screenshots/22-dashboard-after-add-pet.png",
      fullPage: true,
    });

    // Verify the pet appears on the dashboard
    await expect(page.getByText(petName)).toBeVisible({ timeout: 10000 });
  });

  test("submit pet with only required fields", async ({ page }) => {
    await safeGoto(page, "/dashboard/add-pet");
    await expect(page.getByRole("heading", { name: "Add a pet" })).toBeVisible();

    const petName = `MinimalPet-${Date.now()}`;

    // Only fill required fields
    await page.locator('input[placeholder="Buddy"]').fill(petName);
    // Species defaults to "dog" — leave as is

    // Submit
    await page.getByRole("button", { name: "Add Pet" }).click();

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard$/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Verify the pet appears
    await expect(page.getByText(petName)).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: "test-results/screenshots/23-dashboard-after-minimal-pet.png",
      fullPage: true,
    });
  });

  test("cancel button navigates back without creating a pet", async ({ page }) => {
    // Start on dashboard so "back" has somewhere to go
    await safeGoto(page, "/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await safeGoto(page, "/dashboard/add-pet");
    await expect(page.getByRole("heading", { name: "Add a pet" })).toBeVisible();

    // Fill some data but cancel
    await page.locator('input[placeholder="Buddy"]').fill("ShouldNotExist");

    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForTimeout(2000);

    // Should NOT be on the add-pet page anymore
    expect(page.url()).not.toContain("/add-pet");
  });
});
