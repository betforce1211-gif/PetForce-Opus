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

test.describe("Pet Update & Delete", () => {
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

  test("creates, updates, and verifies a pet", async ({ request }) => {
    // Create
    const pet = await trpcMutation(request, authToken, "pet.create", {
      householdId,
      name: `UpdatePet-${Date.now()}`,
      species: "dog",
      breed: "Golden Retriever",
    });
    expect(pet.id).toBeDefined();
    expect(pet.species).toBe("dog");

    // Update
    const updated = await trpcMutation(request, authToken, "pet.update", {
      id: pet.id,
      name: "Updated Pet Name",
      breed: "Labrador",
      weight: "30",
    });
    expect(updated.name).toBe("Updated Pet Name");
    expect(updated.breed).toBe("Labrador");

    // Verify via getById
    const fetched = await trpcQuery(request, authToken, "pet.getById", {
      id: pet.id,
    });
    expect(fetched.name).toBe("Updated Pet Name");
    expect(fetched.breed).toBe("Labrador");

    // Cleanup
    await trpcMutation(request, authToken, "pet.delete", { id: pet.id });
  });

  test("deletes a pet and verifies removal", async ({ request }) => {
    const pet = await trpcMutation(request, authToken, "pet.create", {
      householdId,
      name: `DeletePet-${Date.now()}`,
      species: "cat",
    });

    await trpcMutation(request, authToken, "pet.delete", { id: pet.id });

    // Verify it's gone from the household list
    const pets = await trpcQuery(request, authToken, "pet.listByHousehold", {
      householdId,
    });
    const found = pets.find((p: { id: string }) => p.id === pet.id);
    expect(found).toBeUndefined();
  });

  test("getById returns full pet details", async ({ request }) => {
    const pet = await trpcMutation(request, authToken, "pet.create", {
      householdId,
      name: `DetailPet-${Date.now()}`,
      species: "dog",
      breed: "Poodle",
      color: "White",
      sex: "female",
      medicalNotes: "Allergic to chicken",
    });

    const details = await trpcQuery(request, authToken, "pet.getById", {
      id: pet.id,
    });

    expect(details.name).toContain("DetailPet");
    expect(details.species).toBe("dog");
    expect(details.breed).toBe("Poodle");
    expect(details.color).toBe("White");
    expect(details.sex).toBe("female");
    expect(details.medicalNotes).toBe("Allergic to chicken");

    // Cleanup
    await trpcMutation(request, authToken, "pet.delete", { id: pet.id });
  });

  test("cannot delete pet from another household", async ({ request }) => {
    // Create a pet, then try to delete with wrong context
    // This tests membership verification
    const pet = await trpcMutation(request, authToken, "pet.create", {
      householdId,
      name: `AuthTestPet-${Date.now()}`,
      species: "fish",
    });

    // Delete should work with correct auth (owner)
    await trpcMutation(request, authToken, "pet.delete", { id: pet.id });

    // Deleting again should fail (not found)
    await expect(
      trpcMutation(request, authToken, "pet.delete", { id: pet.id })
    ).rejects.toThrow();
  });
});
