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
let testPetId: string;

test.describe("Finance CRUD & Summary", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "e2e/.auth/session.json",
    });
    const page = await context.newPage();

    const tokenPromise = extractAuthToken(page);
    await safeGoto(page, "/dashboard");
    await page.waitForTimeout(3000);

    authToken = await tokenPromise;
    householdId = await getHouseholdId(page);

    await page.close();
    await context.close();
  });

  test.beforeAll(async ({ request }) => {
    const pets = await trpcQuery(request, authToken, "pet.listByHousehold", {
      householdId,
    });
    if (Array.isArray(pets) && pets.length > 0) {
      testPetId = pets[0].id;
    }
  });

  test("creates, updates, and deletes an expense", async ({ request }) => {
    if (!testPetId) test.skip();

    const today = new Date().toISOString().split("T")[0];

    // Create
    const expense = await trpcMutation(
      request,
      authToken,
      "finance.createExpense",
      {
        householdId,
        petId: testPetId,
        category: "food",
        description: `E2E Kibble ${Date.now()}`,
        amount: "45.99",
        date: today,
        notes: "Premium kibble",
      }
    );

    expect(expense.id).toBeDefined();
    expect(expense.category).toBe("food");
    expect(expense.description).toContain("E2E Kibble");

    // Update
    const updated = await trpcMutation(
      request,
      authToken,
      "finance.updateExpense",
      {
        householdId,
        id: expense.id,
        amount: "55.99",
        notes: "Price went up",
      }
    );

    expect(updated.notes).toBe("Price went up");

    // Delete
    await trpcMutation(request, authToken, "finance.deleteExpense", {
      householdId,
      id: expense.id,
    });

    // Verify deletion
    const expenses = await trpcQuery(
      request,
      authToken,
      "finance.listExpenses",
      { householdId }
    );
    const found = expenses.find((e: { id: string }) => e.id === expense.id);
    expect(found).toBeUndefined();
  });

  test("lists expenses filtered by petId", async ({ request }) => {
    if (!testPetId) test.skip();

    const expenses = await trpcQuery(
      request,
      authToken,
      "finance.listExpenses",
      { householdId, petId: testPetId }
    );

    expect(Array.isArray(expenses)).toBe(true);
    for (const e of expenses) {
      expect(e.petId).toBe(testPetId);
    }
  });

  test("finance summary returns monthly breakdown", async ({ request }) => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const summary = await trpcQuery(
      request,
      authToken,
      "finance.summary",
      { householdId, month: currentMonth }
    );

    expect(summary).toBeDefined();
    expect(typeof summary.monthlyTotal).toBe("number");
    expect(typeof summary.previousMonthTotal).toBe("number");
    expect(Array.isArray(summary.byCategory)).toBe(true);
    expect(Array.isArray(summary.byPet)).toBe(true);
    expect(Array.isArray(summary.recentExpenses)).toBe(true);
    expect(summary.recentExpenses.length).toBeLessThanOrEqual(5);
  });

  test("creates expenses across categories", async ({ request }) => {
    if (!testPetId) test.skip();

    const today = new Date().toISOString().split("T")[0];
    const categories = ["grooming", "toys", "insurance"] as const;
    const createdIds: string[] = [];

    for (const category of categories) {
      const expense = await trpcMutation(
        request,
        authToken,
        "finance.createExpense",
        {
          householdId,
          petId: testPetId,
          category,
          description: `E2E ${category} test`,
          amount: "19.99",
          date: today,
        }
      );
      expect(expense.category).toBe(category);
      createdIds.push(expense.id);
    }

    // Cleanup
    for (const id of createdIds) {
      await trpcMutation(request, authToken, "finance.deleteExpense", {
        householdId,
        id,
      });
    }
  });
});
