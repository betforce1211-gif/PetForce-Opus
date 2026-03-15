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

// Track resources created during tests for cleanup
let petId: string;
const createdActivityIds: string[] = [];
const createdNoteIds: string[] = [];

test.describe("Full-text search", () => {
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

    // Create a pet with searchable fields
    const pet = await trpcMutation(request, authToken, "pet.create", {
      householdId,
      name: "SearchTestBuddy",
      species: "dog",
      breed: "Golden Retriever",
      medicalNotes: "Allergic to chicken treats",
    });
    petId = pet.id;

    // Create an activity with searchable title/notes
    const activity = await trpcMutation(request, authToken, "activity.create", {
      householdId,
      petId,
      type: "vet_visit",
      title: "Annual vaccination appointment",
      notes: "Bring rabies certificate from last year",
    });
    createdActivityIds.push(activity.id);

    // Create a note with searchable content
    const note = await trpcMutation(request, authToken, "notes.create", {
      householdId,
      petId,
      title: "Dietary restrictions",
      content: "No chicken treats due to allergy. Prefers salmon-based food.",
    });
    createdNoteIds.push(note.id);

    await page.close();
    await context.close();
  });

  test.afterAll(async ({ request }) => {
    // Cleanup in reverse order of dependencies
    for (const id of createdNoteIds) {
      try {
        await trpcMutation(request, authToken, "notes.delete", { householdId, id });
      } catch { /* ignore */ }
    }
    for (const id of createdActivityIds) {
      try {
        await trpcMutation(request, authToken, "activity.delete", { householdId, id });
      } catch { /* ignore */ }
    }
    if (petId) {
      try {
        await trpcMutation(request, authToken, "pet.delete", { householdId, id: petId });
      } catch { /* ignore */ }
    }
  });

  test("search returns pets by name", async ({ request }) => {
    const result = await trpcQuery(request, authToken, "search.query", {
      householdId,
      query: "SearchTestBuddy",
    });

    expect(result.items.length).toBeGreaterThanOrEqual(1);
    const petResult = result.items.find(
      (item: { entityType: string }) => item.entityType === "pet"
    );
    expect(petResult).toBeDefined();
    expect(petResult.title).toBe("SearchTestBuddy");
  });

  test("search returns pets by breed", async ({ request }) => {
    const result = await trpcQuery(request, authToken, "search.query", {
      householdId,
      query: "Golden Retriever",
    });

    const petResult = result.items.find(
      (item: { entityType: string; title: string }) =>
        item.entityType === "pet" && item.title === "SearchTestBuddy"
    );
    expect(petResult).toBeDefined();
  });

  test("search returns activities by title", async ({ request }) => {
    const result = await trpcQuery(request, authToken, "search.query", {
      householdId,
      query: "vaccination appointment",
    });

    const activityResult = result.items.find(
      (item: { entityType: string }) => item.entityType === "activity"
    );
    expect(activityResult).toBeDefined();
    expect(activityResult.title).toContain("vaccination");
  });

  test("search returns notes by content", async ({ request }) => {
    const result = await trpcQuery(request, authToken, "search.query", {
      householdId,
      query: "salmon",
    });

    const noteResult = result.items.find(
      (item: { entityType: string }) => item.entityType === "note"
    );
    expect(noteResult).toBeDefined();
    expect(noteResult.title).toBe("Dietary restrictions");
  });

  test("search filters by entity type", async ({ request }) => {
    const result = await trpcQuery(request, authToken, "search.query", {
      householdId,
      query: "chicken",
      entityTypes: ["pet"],
    });

    // Should only return pet results (medical notes mention chicken)
    for (const item of result.items) {
      expect(item.entityType).toBe("pet");
    }
  });

  test("search returns empty for non-matching query", async ({ request }) => {
    const result = await trpcQuery(request, authToken, "search.query", {
      householdId,
      query: "xyznonexistent12345",
    });

    expect(result.items).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });

  test("search supports pagination", async ({ request }) => {
    const result = await trpcQuery(request, authToken, "search.query", {
      householdId,
      query: "chicken",
      limit: 1,
      offset: 0,
    });

    expect(result.items.length).toBeLessThanOrEqual(1);
    expect(typeof result.totalCount).toBe("number");
  });
});
