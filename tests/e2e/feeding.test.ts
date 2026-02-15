import { test, expect } from "@playwright/test";
import { safeGoto } from "./helpers/api-client";

import "./helpers/load-env";

test.describe("Feeding Module", () => {
  test.describe.configure({ mode: "serial" });

  test("dashboard shows Feeding tile", async ({ page }) => {
    await safeGoto(page, "/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Feeding tile should be visible
    await expect(page.getByText("Feeding").first()).toBeVisible({ timeout: 10000 });

    // Should show schedule status or empty state
    const hasSchedules = await page.getByText("Manage Schedules").isVisible().catch(() => false);
    const hasEmpty = await page.getByText("No feeding schedules").isVisible().catch(() => false);
    const hasAddLink = await page.getByText("+ Add Schedule").isVisible().catch(() => false);
    expect(hasSchedules || hasEmpty || hasAddLink).toBeTruthy();

    await page.screenshot({
      path: "test-results/screenshots/60-feeding-tile-on-dashboard.png",
      fullPage: true,
    });
  });

  test("clicking Manage Schedules opens feeding modal", async ({ page }) => {
    await safeGoto(page, "/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Click Manage Schedules or + Add Schedule link on the feeding tile
    const manageBtn = page.getByText("Manage Schedules");
    const addBtn = page.getByText("+ Add Schedule");
    const hasManage = await manageBtn.isVisible().catch(() => false);
    if (hasManage) {
      await manageBtn.click();
    } else {
      await addBtn.click();
    }
    await page.waitForTimeout(1000);

    // Modal should open
    await expect(page.getByText("Manage Feeding Schedules")).toBeVisible({ timeout: 5000 });

    // Should have add form and current schedules section
    await expect(page.locator("legend", { hasText: "Add New Schedule" })).toBeVisible();
    await expect(page.locator("legend", { hasText: "Current Schedules" })).toBeVisible();

    await page.screenshot({
      path: "test-results/screenshots/61-feeding-modal-open.png",
      fullPage: true,
    });
  });

  test("feeding modal has suggestion chips", async ({ page }) => {
    await safeGoto(page, "/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Open feeding modal
    const manageBtn = page.getByText("Manage Schedules");
    const addBtn = page.getByText("+ Add Schedule");
    const hasManage = await manageBtn.isVisible().catch(() => false);
    if (hasManage) {
      await manageBtn.click();
    } else {
      await addBtn.click();
    }
    await page.waitForTimeout(1000);

    // Should show suggestion chips: Breakfast, Lunch, Dinner, Snack
    await expect(page.getByRole("button", { name: "Breakfast" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Lunch" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Dinner" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Snack" })).toBeVisible();

    // Should have label, time, food type, amount inputs
    await expect(page.locator('input[placeholder="Breakfast"]')).toBeVisible();
    await expect(page.locator('input[type="time"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Kibble"]')).toBeVisible();
    await expect(page.locator('input[placeholder="1 cup"]')).toBeVisible();
  });

  test("clicking suggestion chip auto-fills label and time", async ({ page }) => {
    await safeGoto(page, "/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Open feeding modal
    const manageBtn = page.getByText("Manage Schedules");
    const addBtn = page.getByText("+ Add Schedule");
    const hasManage = await manageBtn.isVisible().catch(() => false);
    if (hasManage) {
      await manageBtn.click();
    } else {
      await addBtn.click();
    }
    await page.waitForTimeout(1000);

    // Click Dinner suggestion chip
    await page.getByRole("button", { name: "Dinner" }).click();
    await page.waitForTimeout(300);

    // Label should be filled with "Dinner"
    const labelInput = page.locator('input[placeholder="Breakfast"]');
    await expect(labelInput).toHaveValue("Dinner");

    // Time should be pre-filled with 18:00
    const timeInput = page.locator('input[type="time"]');
    await expect(timeInput).toHaveValue("18:00");

    await page.screenshot({
      path: "test-results/screenshots/62-feeding-suggestion-chip.png",
      fullPage: true,
    });
  });

  test("add a feeding schedule", async ({ page }) => {
    await safeGoto(page, "/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Open feeding modal
    const manageBtn = page.getByText("Manage Schedules");
    const addBtn = page.getByText("+ Add Schedule");
    const hasManage = await manageBtn.isVisible().catch(() => false);
    if (hasManage) {
      await manageBtn.click();
    } else {
      await addBtn.click();
    }
    await page.waitForTimeout(1000);

    // Select first pet
    const petSelect = page.locator("select").first();
    const petOptions = await petSelect.locator("option").allTextContents();
    const firstPet = petOptions.find((o) => o && o !== "Select pet");
    if (firstPet) {
      await petSelect.selectOption({ label: firstPet });
    }
    await page.waitForTimeout(500);

    // Fill the form with unique label
    const scheduleLabel = `E2ETest-${Date.now()}`;
    await page.locator('input[placeholder="Breakfast"]').fill(scheduleLabel);
    await page.locator('input[type="time"]').fill("07:30");
    await page.locator('input[placeholder="Kibble"]').fill("Dry food");
    await page.locator('input[placeholder="1 cup"]').fill("2 scoops");

    // Wait for button to enable, then submit and capture the tRPC response
    const submitBtn = page.getByRole("button", { name: "Add", exact: true });
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });

    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes("trpc") && resp.url().includes("createSchedule"),
        { timeout: 15000 }
      ).catch(() => null),
      submitBtn.click(),
    ]);

    // If mutation succeeded, form should clear (label input goes back to empty)
    if (response && response.ok()) {
      const labelInput = page.locator('input[placeholder="Breakfast"]');
      await expect(labelInput).toHaveValue("", { timeout: 5000 });
    }
    await page.waitForTimeout(2000);

    // Verify schedule appears (may be in modal list or on dashboard tile after refresh)
    const appeared = await page.getByText(scheduleLabel).isVisible().catch(() => false);
    if (!appeared) {
      // Reload page to force fresh data fetch
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(2000);
    }
    await expect(page.getByText(scheduleLabel).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: "test-results/screenshots/63-feeding-schedule-added.png",
      fullPage: true,
    }).catch(() => {});
  });

  test("close feeding modal with Done", async ({ page }) => {
    await safeGoto(page, "/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Open feeding modal
    const manageBtn = page.getByText("Manage Schedules");
    const addBtn = page.getByText("+ Add Schedule");
    const hasManage = await manageBtn.isVisible().catch(() => false);
    if (hasManage) {
      await manageBtn.click();
    } else {
      await addBtn.click();
    }
    await page.waitForTimeout(1000);
    await expect(page.getByText("Manage Feeding Schedules")).toBeVisible();

    // Close
    await page.getByRole("button", { name: "Done" }).click();
    await page.waitForTimeout(500);

    // Modal should be closed
    await expect(page.getByText("Manage Feeding Schedules")).not.toBeVisible();
  });
});
