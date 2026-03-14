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

test.describe("Feeding Advanced Operations", () => {
  test.describe.configure({ mode: "serial" });

  let scheduleId: string;

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
    if (pets.items && pets.items.length > 0) {
      testPetId = pets.items[0].id;
    }
  });

  test.afterAll(async ({ request }) => {
    if (scheduleId) {
      try {
        await trpcMutation(request, authToken, "feeding.deleteSchedule", {
          householdId,
          id: scheduleId,
        });
      } catch {
        // Already deleted
      }
    }
  });

  test("creates a feeding schedule via API", async ({ request }) => {
    if (!testPetId) test.skip();

    const schedule = await trpcMutation(
      request,
      authToken,
      "feeding.createSchedule",
      {
        householdId,
        petId: testPetId,
        label: `E2E-Feeding-${Date.now()}`,
        time: "08:00",
        foodType: "Dry kibble",
        amount: "1 cup",
      }
    );

    expect(schedule.id).toBeDefined();
    expect(schedule.label).toContain("E2E-Feeding");
    expect(schedule.time).toBe("08:00");
    scheduleId = schedule.id;
  });

  test("updates a feeding schedule via API", async ({ request }) => {
    if (!scheduleId) test.skip();

    const updated = await trpcMutation(
      request,
      authToken,
      "feeding.updateSchedule",
      {
        householdId,
        id: scheduleId,
        label: "Updated Feeding",
        time: "09:00",
        amount: "2 cups",
      }
    );

    expect(updated.label).toBe("Updated Feeding");
    expect(updated.time).toBe("09:00");
  });

  test("todayStatus returns feeding status for today", async ({ request }) => {
    const today = new Date().toISOString().split("T")[0];
    const status = await trpcQuery(
      request,
      authToken,
      "feeding.todayStatus",
      { householdId, date: today }
    );

    expect(status).toBeDefined();
    expect(status.date).toBe(today);
    expect(Array.isArray(status.pets)).toBe(true);
  });

  test("logs feeding completion and undoes it", async ({ request }) => {
    if (!scheduleId) test.skip();

    const today = new Date().toISOString().split("T")[0];

    // Log completion
    const log = await trpcMutation(
      request,
      authToken,
      "feeding.logCompletion",
      {
        householdId,
        feedingScheduleId: scheduleId,
        feedingDate: today,
        notes: "Fed via E2E test",
      }
    );

    expect(log).toBeDefined();
    expect(log.id).toBeDefined();

    // Undo completion
    await trpcMutation(request, authToken, "feeding.undoCompletion", {
      householdId,
      feedingLogId: log.id,
    });

    // Verify status no longer shows as completed
    const status = await trpcQuery(
      request,
      authToken,
      "feeding.todayStatus",
      { householdId, date: today }
    );
    expect(status).toBeDefined();
  });

  test("snoozes a feeding and undoes it", async ({ request }) => {
    if (!scheduleId) test.skip();

    const today = new Date().toISOString().split("T")[0];

    // Snooze
    const snooze = await trpcMutation(
      request,
      authToken,
      "feeding.snooze",
      {
        householdId,
        feedingScheduleId: scheduleId,
        feedingDate: today,
        snoozeDurationMinutes: 30,
      }
    );

    expect(snooze).toBeDefined();

    // Undo snooze
    await trpcMutation(request, authToken, "feeding.undoSnooze", {
      householdId,
      feedingScheduleId: scheduleId,
      feedingDate: today,
    });
  });

  test("logs a skipped feeding", async ({ request }) => {
    if (!scheduleId) test.skip();

    const today = new Date().toISOString().split("T")[0];

    const log = await trpcMutation(
      request,
      authToken,
      "feeding.logCompletion",
      {
        householdId,
        feedingScheduleId: scheduleId,
        feedingDate: today,
        skipped: true,
        notes: "Skipped — pet not hungry",
      }
    );

    expect(log).toBeDefined();

    // Cleanup
    await trpcMutation(request, authToken, "feeding.undoCompletion", {
      householdId,
      feedingLogId: log.id,
    });
  });

  test("deletes a feeding schedule via API", async ({ request }) => {
    if (!scheduleId) test.skip();

    await trpcMutation(request, authToken, "feeding.deleteSchedule", {
      householdId,
      id: scheduleId,
    });

    // Verify it's gone from the list
    const schedules = await trpcQuery(
      request,
      authToken,
      "feeding.listSchedules",
      { householdId }
    );
    const found = schedules.items.find((s: { id: string }) => s.id === scheduleId);
    expect(found).toBeUndefined();

    scheduleId = ""; // Prevent afterAll from trying to delete again
  });
});
