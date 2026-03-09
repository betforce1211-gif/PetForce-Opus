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

// Track activities created during tests for cleanup
const createdActivityIds: string[] = [];

test.describe("Activity CRUD", () => {
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
    // Get a pet ID for activity tests
    const pets = await trpcQuery(request, authToken, "pet.listByHousehold", {
      householdId,
    });
    if (Array.isArray(pets) && pets.length > 0) {
      testPetId = pets[0].id;
    }
  });

  test.afterAll(async ({ request }) => {
    for (const id of createdActivityIds) {
      try {
        await trpcMutation(request, authToken, "activity.delete", {
          id,
        });
      } catch {
        // Already deleted — ignore
      }
    }
    createdActivityIds.length = 0;
  });

  test("creates an activity via API", async ({ request }) => {
    if (!testPetId) test.skip();

    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const activity = await trpcMutation(
      request,
      authToken,
      "activity.create",
      {
        householdId,
        petId: testPetId,
        type: "walk",
        title: `E2E Walk ${Date.now()}`,
        notes: "Test walk activity",
        scheduledAt,
      }
    );

    expect(activity).toBeDefined();
    expect(activity.id).toBeDefined();
    expect(activity.type).toBe("walk");
    expect(activity.title).toContain("E2E Walk");
    expect(activity.petId).toBe(testPetId);

    createdActivityIds.push(activity.id);
  });

  test("lists activities by household", async ({ request }) => {
    const activities = await trpcQuery(
      request,
      authToken,
      "activity.listByHousehold",
      { householdId }
    );

    expect(Array.isArray(activities)).toBe(true);
  });

  test("lists activities by pet", async ({ request }) => {
    if (!testPetId) test.skip();

    const activities = await trpcQuery(
      request,
      authToken,
      "activity.listByPet",
      { householdId, petId: testPetId }
    );

    expect(Array.isArray(activities)).toBe(true);
    for (const a of activities) {
      expect(a.petId).toBe(testPetId);
    }
  });

  test("updates an activity via API", async ({ request }) => {
    if (!testPetId) test.skip();

    const activity = await trpcMutation(
      request,
      authToken,
      "activity.create",
      {
        householdId,
        petId: testPetId,
        type: "feeding",
        title: `Update Test ${Date.now()}`,
        scheduledAt: new Date().toISOString(),
      }
    );
    createdActivityIds.push(activity.id);

    const updated = await trpcMutation(
      request,
      authToken,
      "activity.update",
      {
        id: activity.id,
        title: "Updated Activity Title",
        notes: "Updated notes",
      }
    );

    expect(updated.title).toBe("Updated Activity Title");
    expect(updated.notes).toBe("Updated notes");
  });

  test("completes an activity via API", async ({ request }) => {
    if (!testPetId) test.skip();

    const activity = await trpcMutation(
      request,
      authToken,
      "activity.create",
      {
        householdId,
        petId: testPetId,
        type: "vet_visit",
        title: `Complete Test ${Date.now()}`,
        scheduledAt: new Date().toISOString(),
      }
    );
    createdActivityIds.push(activity.id);

    const completed = await trpcMutation(
      request,
      authToken,
      "activity.complete",
      { id: activity.id }
    );

    expect(completed.completedAt).toBeDefined();
  });

  test("deletes an activity via API", async ({ request }) => {
    if (!testPetId) test.skip();

    const activity = await trpcMutation(
      request,
      authToken,
      "activity.create",
      {
        householdId,
        petId: testPetId,
        type: "walk",
        title: `Delete Test ${Date.now()}`,
        scheduledAt: new Date().toISOString(),
      }
    );

    await trpcMutation(request, authToken, "activity.delete", {
      id: activity.id,
    });

    // Verify it no longer appears in the list
    const activities = await trpcQuery(
      request,
      authToken,
      "activity.listByHousehold",
      { householdId }
    );
    const found = activities.find((a: { id: string }) => a.id === activity.id);
    expect(found).toBeUndefined();
  });
});
