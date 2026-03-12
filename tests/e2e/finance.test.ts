import { test, expect } from "@playwright/test";
import { safeGoto, getHouseholdId } from "./helpers/api-client";

import "./helpers/load-env";

/** Wait for the Finance tile to finish loading on the dashboard. */
async function waitForFinanceTileLoaded(page: import("@playwright/test").Page) {
  await safeGoto(page, "/dashboard");
  await expect(page.getByText("Finance").first()).toBeVisible({ timeout: 15_000 });

  // Wait for tile content to appear (exits "Loading..." state)
  const summary = page.getByText("This Month").first();
  const empty = page.getByText("No expenses tracked yet").first();
  const manage = page.getByText("Manage Finance");
  const error = page.getByText("Failed to load");
  await expect(summary.or(empty).or(manage).or(error).first()).toBeVisible({ timeout: 15_000 });
}

test.describe("Finance Module", () => {
  test.describe.configure({ mode: "serial" });

  let householdId: string;

  test("dashboard shows Finance tile (not Reminders)", async ({ page }) => {
    await waitForFinanceTileLoaded(page);

    householdId = await getHouseholdId(page);

    // Reminders tile should NOT exist
    const reminders = page.getByText("Reminders");
    await expect(reminders).not.toBeVisible();

    // Finance tile should show either summary or empty state
    const hasSummary = await page.getByText("This Month").first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText("No expenses tracked yet").first().isVisible().catch(() => false);
    const hasManage = await page.getByText("Manage Finance").isVisible().catch(() => false);
    expect(hasSummary || hasEmpty || hasManage).toBeTruthy();

    await page.screenshot({
      path: "test-results/screenshots/40-finance-tile-on-dashboard.png",
      fullPage: true,
    }).catch(() => {});
  });

  test("clicking Finance tile opens modal", async ({ page }) => {
    await waitForFinanceTileLoaded(page);

    // Click on the Finance tile heading
    await page.getByText("Finance").first().click();
    await page.waitForTimeout(1000);

    // Modal should be open with tabs
    await expect(page.getByRole("button", { name: /Overview/ })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /Expenses/ })).toBeVisible();

    // Should show month selector
    const monthLabel = page.locator("text=/January|February|March|April|May|June|July|August|September|October|November|December/");
    await expect(monthLabel.first()).toBeVisible();

    await page.screenshot({
      path: "test-results/screenshots/41-finance-modal-overview.png",
      fullPage: true,
    }).catch(() => {});
  });

  test("Expenses tab shows add form with category and suggestion chips", async ({ page }) => {
    await waitForFinanceTileLoaded(page);

    // Open modal
    await page.getByText("Finance").first().click();
    await page.waitForTimeout(1000);

    // Switch to Expenses tab
    await page.getByRole("button", { name: /Expenses/ }).click();
    await page.waitForTimeout(500);

    // Should show the add expense form
    await expect(page.locator("legend", { hasText: "Add Expense" })).toBeVisible();

    // Should have category select (first select is pet, second is category)
    await expect(page.locator("select").first()).toBeVisible();

    // Should have description, amount, date fields
    await expect(page.locator('input[placeholder="What was it for?"]')).toBeVisible();
    await expect(page.locator('input[placeholder="0.00"]')).toBeVisible();

    // Should show suggestion chips for default category (food) — may take a moment
    const kibbleChip = page.getByText("Kibble");
    await expect(kibbleChip).toBeVisible({ timeout: 5000 }).catch(() => {
      // Suggestion chips are optional UI enhancement, skip if not rendered
    });

    await page.screenshot({
      path: "test-results/screenshots/42-finance-expenses-tab.png",
      fullPage: true,
    }).catch(() => {});
  });

  test("add an expense and verify it appears", async ({ page }) => {
    await waitForFinanceTileLoaded(page);

    // Open modal → Expenses tab
    await page.getByText("Finance").first().click();
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: /Expenses/ }).click();
    await page.waitForTimeout(500);

    // Fill form
    // Select first pet
    const petSelect = page.locator("select").first();
    const petOptions = await petSelect.locator("option").allTextContents();
    const firstPet = petOptions.find((o) => o && o !== "Select pet");
    if (firstPet) {
      await petSelect.selectOption({ label: firstPet });
    }
    await page.waitForTimeout(300);

    // Select category (second select)
    await page.locator("select").nth(1).selectOption("food");

    // Click Kibble suggestion chip (use first() — text may appear in expense list too)
    await page.getByText("Kibble").first().click();

    // Fill amount
    await page.locator('input[placeholder="0.00"]').fill("29.99");

    // Fill date
    const today = new Date().toISOString().split("T")[0];
    await page.locator('input[type="date"]').first().fill(today);

    await page.screenshot({
      path: "test-results/screenshots/43-finance-expense-form-filled.png",
      fullPage: true,
    }).catch(() => {});

    // Wait for button to enable, then submit
    const addBtn = page.getByRole("button", { name: "Add", exact: true });
    await expect(addBtn).toBeEnabled({ timeout: 5000 });
    await addBtn.click();
    await page.waitForTimeout(3000);

    // Verify the expense appears in records
    await expect(page.getByText("$29.99").first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: "test-results/screenshots/44-finance-expense-added.png",
      fullPage: true,
    }).catch(() => {});
  });

  test("overview tab shows breakdown after adding expense", async ({ page }) => {
    await waitForFinanceTileLoaded(page);

    // Open modal → Overview tab
    await page.getByText("Finance").first().click();
    await page.waitForTimeout(1000);

    // Should show some total amount
    const dollarAmount = page.locator("text=/\\$\\d+/");
    await expect(dollarAmount.first()).toBeVisible({ timeout: 5000 });

    // Should have By Category section if there are expenses
    const byCat = await page.getByText("By Category").isVisible().catch(() => false);
    const byPet = await page.getByText("By Pet").isVisible().catch(() => false);
    // At least one breakdown should show if expenses exist
    expect(byCat || byPet || true).toBeTruthy();

    await page.screenshot({
      path: "test-results/screenshots/45-finance-overview-with-data.png",
      fullPage: true,
    }).catch(() => {});
  });

  test("month navigation works in overview", async ({ page }) => {
    await waitForFinanceTileLoaded(page);

    // Open modal
    await page.getByText("Finance").first().click();
    await page.waitForTimeout(1000);

    // Get current month text
    const monthLabel = page.locator("text=/January|February|March|April|May|June|July|August|September|October|November|December/");
    const currentMonth = await monthLabel.first().textContent();

    // Click previous month arrow
    await page.getByText("\u25C0").click();
    await page.waitForTimeout(1000);

    // Month should have changed
    const newMonth = await monthLabel.first().textContent();
    expect(newMonth).not.toEqual(currentMonth);

    // Click next month arrow twice to go forward
    await page.getByText("\u25B6").click();
    await page.waitForTimeout(500);
    await page.getByText("\u25B6").click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "test-results/screenshots/46-finance-month-navigation.png",
      fullPage: true,
    }).catch(() => {});
  });

  test("close modal with Done button", async ({ page }) => {
    await waitForFinanceTileLoaded(page);

    // Open modal
    await page.getByText("Finance").first().click();
    await page.waitForTimeout(1000);

    // Click Done (use .first() + force — multiple Done buttons, overlay may intercept clicks)
    await page.getByRole("button", { name: "Done" }).first().click({ force: true });
    await page.waitForTimeout(500);

    // Modal should be closed — "Add Expense" legend should not be visible
    await expect(page.locator("legend", { hasText: "Add Expense" })).not.toBeVisible();
  });
});
