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

// Track notes created during tests for cleanup
const createdNoteIds: string[] = [];

test.describe("Notes CRUD", () => {
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

  test.afterAll(async ({ request }) => {
    for (const id of createdNoteIds) {
      try {
        await trpcMutation(request, authToken, "notes.delete", {
          householdId,
          id,
        });
      } catch {
        // Already deleted — ignore
      }
    }
    createdNoteIds.length = 0;
  });

  test("creates a household note via API", async ({ request }) => {
    const note = await trpcMutation(request, authToken, "notes.create", {
      householdId,
      title: `E2E Note ${Date.now()}`,
      content: "This is a test note created by E2E tests.",
    });

    expect(note).toBeDefined();
    expect(note.id).toBeDefined();
    expect(note.title).toContain("E2E Note");
    expect(note.content).toBe("This is a test note created by E2E tests.");
    expect(note.petId).toBeNull();

    createdNoteIds.push(note.id);
  });

  test("creates a pet-specific note via API", async ({ request }) => {
    // Get a pet to attach the note to
    const pets = await trpcQuery(request, authToken, "pet.listByHousehold", {
      householdId,
    });

    if (!pets.items || pets.items.length === 0) {
      test.skip();
      return;
    }

    const petId = pets.items[0].id;
    const note = await trpcMutation(request, authToken, "notes.create", {
      householdId,
      petId,
      title: `Pet Note ${Date.now()}`,
      content: "Pet-specific note from E2E.",
    });

    expect(note).toBeDefined();
    expect(note.petId).toBe(petId);
    createdNoteIds.push(note.id);
  });

  test("lists all notes via API", async ({ request }) => {
    const notes = await trpcQuery(request, authToken, "notes.list", {
      householdId,
    });

    expect(Array.isArray(notes.items)).toBe(true);
    // Should contain at least the notes we just created
    const ourNotes = notes.items.filter((n: { title: string }) =>
      n.title.includes("E2E Note") || n.title.includes("Pet Note")
    );
    expect(ourNotes.length).toBeGreaterThanOrEqual(1);
  });

  test("lists household-only notes (petId=null filter)", async ({ request }) => {
    const notes = await trpcQuery(request, authToken, "notes.list", {
      householdId,
      petId: null,
    });

    expect(Array.isArray(notes.items)).toBe(true);
    for (const note of notes.items) {
      expect(note.petId).toBeNull();
    }
  });

  test("gets recent notes with snippets", async ({ request }) => {
    const result = await trpcQuery(request, authToken, "notes.recent", {
      householdId,
    });

    expect(result).toBeDefined();
    expect(result.notes).toBeDefined();
    expect(Array.isArray(result.notes)).toBe(true);
    expect(typeof result.totalCount).toBe("number");
    expect(result.notes.length).toBeLessThanOrEqual(4);
  });

  test("updates a note via API", async ({ request }) => {
    // Create a note to update
    const note = await trpcMutation(request, authToken, "notes.create", {
      householdId,
      title: `Update Test ${Date.now()}`,
      content: "Original content.",
    });
    createdNoteIds.push(note.id);

    const updated = await trpcMutation(request, authToken, "notes.update", {
      householdId,
      id: note.id,
      title: "Updated Title",
      content: "Updated content from E2E.",
    });

    expect(updated.title).toBe("Updated Title");
    expect(updated.content).toBe("Updated content from E2E.");
  });

  test("deletes a note via API", async ({ request }) => {
    const note = await trpcMutation(request, authToken, "notes.create", {
      householdId,
      title: `Delete Test ${Date.now()}`,
      content: "This will be deleted.",
    });

    await trpcMutation(request, authToken, "notes.delete", {
      householdId,
      id: note.id,
    });

    // Verify it no longer appears in the list
    const notes = await trpcQuery(request, authToken, "notes.list", {
      householdId,
    });
    const found = notes.items.find((n: { id: string }) => n.id === note.id);
    expect(found).toBeUndefined();
  });
});
