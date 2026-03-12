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

test.describe("Health Advanced Operations", () => {
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

  // --- Health Records CRUD ---

  test("creates, updates, and deletes a health record", async ({ request }) => {
    if (!testPetId) test.skip();

    const today = new Date().toISOString().split("T")[0];

    // Create
    const record = await trpcMutation(
      request,
      authToken,
      "health.createRecord",
      {
        householdId,
        petId: testPetId,
        type: "vet_visit",
        date: today,
        vetOrClinic: "Dr. E2E Vet",
        reason: "Annual checkup",
        notes: "All good",
        cost: 150.00,
      }
    );

    expect(record.id).toBeDefined();
    expect(record.type).toBe("vet_visit");
    expect(record.vetOrClinic).toBe("Dr. E2E Vet");

    // Update
    const updated = await trpcMutation(
      request,
      authToken,
      "health.updateRecord",
      {
        householdId,
        id: record.id,
        reason: "Updated reason",
        cost: 200.00,
      }
    );

    expect(updated.reason).toBe("Updated reason");

    // Delete
    await trpcMutation(request, authToken, "health.deleteRecord", {
      householdId,
      id: record.id,
    });

    // Verify deletion
    const records = await trpcQuery(
      request,
      authToken,
      "health.listRecords",
      { householdId }
    );
    const found = records.find((r: { id: string }) => r.id === record.id);
    expect(found).toBeUndefined();
  });

  test("lists health records filtered by type", async ({ request }) => {
    const records = await trpcQuery(
      request,
      authToken,
      "health.listRecords",
      { householdId, type: "vaccination" }
    );

    expect(Array.isArray(records)).toBe(true);
    for (const r of records) {
      expect(r.type).toBe("vaccination");
    }
  });

  test("health summary returns correct shape", async ({ request }) => {
    const summary = await trpcQuery(
      request,
      authToken,
      "health.summary",
      { householdId }
    );

    expect(summary).toBeDefined();
    expect(typeof summary.activeMedicationCount).toBe("number");
    expect(typeof summary.overdueVaccinationCount).toBe("number");
  });

  // --- Medication CRUD ---

  test("creates, updates, and deletes a medication", async ({ request }) => {
    if (!testPetId) test.skip();

    // Create
    const med = await trpcMutation(
      request,
      authToken,
      "health.createMedication",
      {
        householdId,
        petId: testPetId,
        name: `E2E-Med-${Date.now()}`,
        dosage: "50mg",
        frequency: "Once daily",
        startDate: new Date().toISOString().split("T")[0],
        notes: "Test medication",
      }
    );

    expect(med.id).toBeDefined();
    expect(med.name).toContain("E2E-Med");
    expect(med.dosage).toBe("50mg");

    // Update
    const updated = await trpcMutation(
      request,
      authToken,
      "health.updateMedication",
      {
        householdId,
        id: med.id,
        dosage: "100mg",
        notes: "Dosage increased",
      }
    );

    expect(updated.dosage).toBe("100mg");

    // Delete
    await trpcMutation(request, authToken, "health.deleteMedication", {
      householdId,
      id: med.id,
    });
  });

  test("lists medications with activeOnly filter", async ({ request }) => {
    const meds = await trpcQuery(
      request,
      authToken,
      "health.listMedications",
      { householdId, activeOnly: true }
    );

    expect(Array.isArray(meds)).toBe(true);
  });

  // --- Medication Daily Status ---

  test("medication daily status, log completion, and undo", async ({
    request,
  }) => {
    if (!testPetId) test.skip();

    const today = new Date().toISOString().split("T")[0];

    // Create a medication first
    const med = await trpcMutation(
      request,
      authToken,
      "health.createMedication",
      {
        householdId,
        petId: testPetId,
        name: `MedLog-${Date.now()}`,
        dosage: "25mg",
        frequency: "Twice daily",
        startDate: today,
      }
    );

    // Check today's status
    const status = await trpcQuery(
      request,
      authToken,
      "health.todayMedicationStatus",
      { householdId, date: today }
    );
    expect(status).toBeDefined();

    // Log completion
    const log = await trpcMutation(
      request,
      authToken,
      "health.logMedicationCompletion",
      {
        householdId,
        medicationId: med.id,
        loggedDate: today,
      }
    );
    expect(log).toBeDefined();
    expect(log.id).toBeDefined();

    // Undo
    await trpcMutation(request, authToken, "health.undoMedicationLog", {
      householdId,
      medicationLogId: log.id,
    });

    // Cleanup
    await trpcMutation(request, authToken, "health.deleteMedication", {
      householdId,
      id: med.id,
    });
  });

  test("medication snooze and undo", async ({ request }) => {
    if (!testPetId) test.skip();

    const today = new Date().toISOString().split("T")[0];

    const med = await trpcMutation(
      request,
      authToken,
      "health.createMedication",
      {
        householdId,
        petId: testPetId,
        name: `MedSnooze-${Date.now()}`,
        dosage: "10mg",
        frequency: "Once daily",
        startDate: today,
      }
    );

    // Snooze
    const snooze = await trpcMutation(
      request,
      authToken,
      "health.snoozeMedication",
      {
        householdId,
        medicationId: med.id,
        snoozeDate: today,
        snoozeDurationMinutes: 60,
      }
    );
    expect(snooze).toBeDefined();

    // Undo snooze
    await trpcMutation(request, authToken, "health.undoMedicationSnooze", {
      householdId,
      medicationId: med.id,
      snoozeDate: today,
    });

    // Cleanup
    await trpcMutation(request, authToken, "health.deleteMedication", {
      householdId,
      id: med.id,
    });
  });
});
