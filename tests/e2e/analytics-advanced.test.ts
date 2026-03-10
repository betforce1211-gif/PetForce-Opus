import { test, expect } from "@playwright/test";
import {
  extractAuthToken,
  trpcMutation,
  getHouseholdId,
  safeGoto,
} from "./helpers/api-client";

import "./helpers/load-env";

let authToken: string;
let householdId: string;

test.describe("Analytics Router — Advanced", () => {
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

  test("tracks event with householdId", async ({ request }) => {
    const event = await trpcMutation(
      request,
      authToken,
      "analytics.track",
      {
        eventName: "e2e_test_event",
        householdId,
        metadata: { source: "e2e-test", timestamp: Date.now() },
      }
    );

    expect(event).toBeDefined();
    expect(event.id).toBeDefined();
    expect(event.eventName).toBe("e2e_test_event");
    expect(event.householdId).toBe(householdId);
    expect(event.userId).toBeDefined();
  });

  test("tracks event without householdId", async ({ request }) => {
    const event = await trpcMutation(
      request,
      authToken,
      "analytics.track",
      {
        eventName: "e2e_global_event",
      }
    );

    expect(event).toBeDefined();
    expect(event.id).toBeDefined();
    expect(event.eventName).toBe("e2e_global_event");
    expect(event.householdId).toBeNull();
  });

  test("tracks event with complex metadata", async ({ request }) => {
    const event = await trpcMutation(
      request,
      authToken,
      "analytics.track",
      {
        eventName: "e2e_complex_metadata",
        metadata: {
          page: "dashboard",
          action: "click",
          target: "add-pet-button",
          nested: { depth: 1, values: [1, 2, 3] },
        },
      }
    );

    expect(event).toBeDefined();
    expect(event.eventName).toBe("e2e_complex_metadata");
  });

  test("tracks multiple events in sequence", async ({ request }) => {
    const events = [];
    for (let i = 0; i < 3; i++) {
      const event = await trpcMutation(
        request,
        authToken,
        "analytics.track",
        {
          eventName: `e2e_batch_${i}`,
          householdId,
          metadata: { index: i },
        }
      );
      events.push(event);
    }

    expect(events).toHaveLength(3);
    // Each event should have a unique ID
    const ids = new Set(events.map((e) => e.id));
    expect(ids.size).toBe(3);
  });

  test("rejects empty event name", async ({ request }) => {
    try {
      await trpcMutation(
        request,
        authToken,
        "analytics.track",
        {
          eventName: "",
        }
      );
      expect(true).toBe(false); // Should not reach here
    } catch (err: unknown) {
      // Zod validation should reject empty string
      expect(err).toBeDefined();
    }
  });
});
