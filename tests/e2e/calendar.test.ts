import { test, expect } from "@playwright/test";
import { safeGoto } from "./helpers/api-client";

import "./helpers/load-env";

/**
 * Wait for the Calendar tile on the dashboard to finish loading.
 * The tile shows "Loading..." until the calendar.upcoming query completes
 * (which runs 7 sequential DB queries and can be slow). After loading it
 * shows either "+ Add Event" (with or without events) or "Failed to load".
 */
async function waitForCalendarTileLoaded(page: import("@playwright/test").Page) {
  await safeGoto(page, "/dashboard");

  // Wait for the Calendar heading to appear on the dashboard
  await expect(page.getByText("Calendar").first()).toBeVisible({ timeout: 10_000 });

  // Wait for the tile to exit "Loading..." — look for content that only appears after loading
  const addEventBtn = page.getByText("+ Add Event");
  const emptyState = page.getByText("No upcoming events");
  const errorState = page.getByText("Failed to load");
  await expect(addEventBtn.or(emptyState).or(errorState).first()).toBeVisible({ timeout: 15_000 });
}

test.describe("Calendar Module", () => {
  test.describe.configure({ mode: "serial" });

  test("dashboard shows Calendar tile with upcoming events", async ({ page }) => {
    await waitForCalendarTileLoaded(page);

    // Should show upcoming events or empty state (not error)
    const hasEvents = await page.getByText("+ Add Event").isVisible().catch(() => false);
    const hasEmpty = await page.getByText("No upcoming events").isVisible().catch(() => false);
    expect(hasEvents || hasEmpty).toBeTruthy();

    await page.screenshot({
      path: "test-results/screenshots/70-calendar-tile-on-dashboard.png",
      fullPage: true,
    }).catch(() => {});
  });

  test("clicking Calendar tile opens full calendar modal", async ({ page }) => {
    await waitForCalendarTileLoaded(page);

    // Click on the Calendar tile heading to open modal
    await page.getByRole("heading", { name: /Calendar/ }).click();
    await page.waitForTimeout(1500);

    // Calendar modal should show month name and navigation arrows
    const monthLabel = page.locator("text=/January|February|March|April|May|June|July|August|September|October|November|December/");
    await expect(monthLabel.first()).toBeVisible({ timeout: 5000 });

    // Should show day-of-week headers (exact match to avoid "This Month" etc.)
    await expect(page.getByText("Sun", { exact: true })).toBeVisible();
    await expect(page.getByText("Mon", { exact: true })).toBeVisible();
    await expect(page.getByText("Sat", { exact: true })).toBeVisible();

    // Should have Today button (unique to modal)
    await expect(page.getByRole("button", { name: "Today" })).toBeVisible();

    // Should have holiday and feeding toggles
    await expect(page.getByText("Holidays On", { exact: false }).or(page.getByText("Holidays Off", { exact: false }))).toBeVisible();
    await expect(page.getByText("Feedings On", { exact: false }).or(page.getByText("Feedings Off", { exact: false }))).toBeVisible();

    await page.screenshot({
      path: "test-results/screenshots/71-calendar-modal-full.png",
      fullPage: true,
    }).catch(() => {});
  });

  test("navigate months with prev/next arrows", async ({ page }) => {
    await waitForCalendarTileLoaded(page);

    // Open calendar modal
    await page.getByRole("heading", { name: /Calendar/ }).click();
    await page.waitForTimeout(1500);

    // Get current month — scope to the calendar modal h2 (not dashboard h2s)
    const monthHeading = page.locator("h2").filter({ hasText: /January|February|March|April|May|June|July|August|September|October|November|December/ });
    const currentMonthText = await monthHeading.first().textContent();

    // Click previous month arrow
    await page.locator("button", { hasText: "<" }).first().click();
    await page.waitForTimeout(1000);

    const prevMonthText = await monthHeading.first().textContent();
    expect(prevMonthText).not.toEqual(currentMonthText);

    await page.screenshot({
      path: "test-results/screenshots/72-calendar-prev-month.png",
      fullPage: true,
    }).catch(() => {});

    // Click next month twice to go one month ahead
    await page.locator("button", { hasText: ">" }).first().click();
    await page.waitForTimeout(500);
    await page.locator("button", { hasText: ">" }).first().click();
    await page.waitForTimeout(1000);

    const nextMonthText = await monthHeading.first().textContent();
    expect(nextMonthText).not.toEqual(prevMonthText);

    await page.screenshot({
      path: "test-results/screenshots/73-calendar-next-month.png",
      fullPage: true,
    }).catch(() => {});
  });

  test("Today button returns to current month", async ({ page }) => {
    await waitForCalendarTileLoaded(page);

    // Open calendar modal
    await page.getByRole("heading", { name: /Calendar/ }).click();
    await page.waitForTimeout(1500);

    // Navigate away from current month
    await page.locator("button", { hasText: "<" }).first().click();
    await page.waitForTimeout(500);
    await page.locator("button", { hasText: "<" }).first().click();
    await page.waitForTimeout(500);

    // Click Today
    await page.getByRole("button", { name: "Today" }).click();
    await page.waitForTimeout(1000);

    // Should be back to the current month
    const now = new Date();
    const expectedMonth = now.toLocaleDateString([], { month: "long", year: "numeric" });
    const monthHeading = page.locator("h2").filter({ hasText: /January|February|March|April|May|June|July|August|September|October|November|December/ });
    const monthText = await monthHeading.first().textContent();
    expect(monthText).toContain(expectedMonth);
  });

  test("clicking a day shows detail panel", async ({ page }) => {
    await waitForCalendarTileLoaded(page);

    // Open calendar modal
    await page.getByRole("heading", { name: /Calendar/ }).click();
    await page.waitForTimeout(1500);

    // Click on day 15 (should exist in any month)
    // Calendar renders days as <span> inside clickable <div> containers
    const daySpan = page.locator("span").filter({ hasText: /^15$/ }).first();
    await expect(daySpan).toBeVisible({ timeout: 10_000 });
    await daySpan.click();
    await page.waitForTimeout(1000);

    // Detail panel should appear — look for any new content after clicking
    // The panel shows the date and an Add button
    const addButton = page.getByRole("button", { name: /Add/ });
    const dateHeader = page.locator("text=/\\d{4}-\\d{2}-15/");
    await expect(addButton.or(dateHeader).first()).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: "test-results/screenshots/74-calendar-day-detail.png",
      fullPage: true,
    }).catch(() => {});
  });

  test("toggle holiday filter", async ({ page }) => {
    await waitForCalendarTileLoaded(page);

    // Open calendar modal
    await page.getByRole("heading", { name: /Calendar/ }).click();
    await page.waitForTimeout(1500);

    // Holidays should be on by default
    const holidayBtn = page.getByText("Holidays On", { exact: false });
    const isOn = await holidayBtn.isVisible().catch(() => false);

    if (isOn) {
      // Toggle off
      await holidayBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText("Holidays Off", { exact: false })).toBeVisible();

      // Toggle back on
      await page.getByText("Holidays Off", { exact: false }).click();
      await page.waitForTimeout(500);
      await expect(page.getByText("Holidays On", { exact: false })).toBeVisible();
    }

    await page.screenshot({
      path: "test-results/screenshots/75-calendar-holiday-toggle.png",
      fullPage: true,
    }).catch(() => {});
  });

  test("close calendar modal with X button", async ({ page }) => {
    await waitForCalendarTileLoaded(page);

    // Open calendar modal
    await page.getByRole("heading", { name: /Calendar/ }).click();
    await page.waitForTimeout(1500);

    // Verify modal is open
    await expect(page.getByRole("button", { name: "Today" })).toBeVisible();

    // Close with X button
    await page.getByLabel("Close").click();
    await page.waitForTimeout(500);

    // Modal should be closed — Today button should not be visible
    await expect(page.getByRole("button", { name: "Today" })).not.toBeVisible();
  });
});
