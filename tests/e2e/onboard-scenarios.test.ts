import { test, expect, Page, Route } from "@playwright/test";
import { safeGoto } from "./helpers/api-client";

import "./helpers/load-env";

/**
 * Onboard Page Scenario Routing — Mocked UI Tests
 *
 * Uses auth session (to get past Clerk middleware) but mocks tRPC responses
 * to control which scenario the onboard page enters.
 *
 * tRPC uses httpBatchLink + superjson transformer, so responses must:
 *   1. Be an array (one element per procedure in the batch)
 *   2. Wrap data in SuperJSON format: { json: <data>, meta: { values: {} } }
 */

// ── SuperJSON response helpers ──

/** Wrap a value in SuperJSON batch response format */
function sjResult(data: unknown) {
  return { result: { data: { json: data, meta: { values: {} } } } };
}

/** Wrap an error in tRPC batch response format */
function sjError(message: string, code: string) {
  return {
    error: {
      json: {
        message,
        code: -32603,
        data: { code, httpStatus: code === "FORBIDDEN" ? 403 : 500 },
      },
    },
  };
}

interface MockConfig {
  myHouseholds: unknown[];
  canCreateHousehold: { canCreate: boolean };
}

/**
 * Intercepts all tRPC requests and returns SuperJSON-formatted mock data
 * based on procedure names in the batched URL.
 */
async function setupTrpcMocks(page: Page, config: MockConfig) {
  const mockMap: Record<string, unknown> = {
    "dashboard.myHouseholds": config.myHouseholds,
    "dashboard.canCreateHousehold": config.canCreateHousehold,
  };

  await page.route("**/trpc/**", async (route: Route) => {
    const url = route.request().url();
    const trpcPath = url.split("/trpc/")[1]?.split("?")[0] ?? "";
    const procedures = trpcPath.split(",");

    const batchResponse = procedures.map((proc) => {
      const data = mockMap[proc];
      if (data !== undefined) {
        return sjResult(data);
      }
      return sjResult(null);
    });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(batchResponse),
    });
  });
}

// ── Scenario tests ──

test.describe("Onboard Page Scenarios (mocked)", () => {
  test("new user (no households) sees welcome choose screen", async ({
    page,
  }) => {
    await setupTrpcMocks(page, {
      myHouseholds: [],
      canCreateHousehold: { canCreate: true },
    });

    await safeGoto(page, "/onboard");
    await page.waitForTimeout(2000);

    await page
      .screenshot({
        path: "test-results/screenshots/onboard-scenario-01-new-user-choose.png",
        fullPage: true,
      })
      .catch(() => {});

    await expect(page.getByText("Welcome to PetForce")).toBeVisible();
    await expect(page.getByText("Create a Household")).toBeVisible();
    await expect(page.getByText("Join a Household")).toBeVisible();
  });

  test("joined-only user sees create form directly (no choose screen)", async ({
    page,
  }) => {
    await setupTrpcMocks(page, {
      myHouseholds: [
        {
          id: "hh-joined",
          name: "Someone Else's Home",
          theme: {
            primaryColor: "#6366F1",
            secondaryColor: "#EC4899",
            avatar: null,
          },
          petCount: 2,
          memberCount: 3,
          role: "member",
        },
      ],
      canCreateHousehold: { canCreate: true },
    });

    await safeGoto(page, "/onboard");
    await page.waitForTimeout(3000);

    await page
      .screenshot({
        path: "test-results/screenshots/onboard-scenario-02-joined-user-create.png",
        fullPage: true,
      })
      .catch(() => {});

    // Should skip to the create form directly
    await expect(page.getByText("Create your household")).toBeVisible();
    await expect(
      page.locator('input[placeholder="The Smith Family"]')
    ).toBeVisible();

    // Should NOT show a back button (user came from header, has households)
    await expect(page.getByText("← Back")).not.toBeVisible();
  });

  test("owner user gets redirected to dashboard", async ({ page }) => {
    await setupTrpcMocks(page, {
      myHouseholds: [
        {
          id: "hh-owned",
          name: "My Home",
          theme: {
            primaryColor: "#6366F1",
            secondaryColor: "#EC4899",
            avatar: null,
          },
          petCount: 1,
          memberCount: 1,
          role: "owner",
        },
      ],
      canCreateHousehold: { canCreate: false },
    });

    await safeGoto(page, "/onboard");

    // Should redirect to /dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    await page
      .screenshot({
        path: "test-results/screenshots/onboard-scenario-03-owner-redirected.png",
        fullPage: true,
      })
      .catch(() => {});

    expect(page.url()).toContain("/dashboard");
  });

  test("new user can navigate between choose, create, and join", async ({
    page,
  }) => {
    await setupTrpcMocks(page, {
      myHouseholds: [],
      canCreateHousehold: { canCreate: true },
    });

    await safeGoto(page, "/onboard");
    await page.waitForTimeout(2000);

    // Start on choose screen
    await expect(page.getByText("Welcome to PetForce")).toBeVisible();

    // Click "Create a Household"
    await page.getByText("Create a Household").click();
    await page.waitForTimeout(500);

    await expect(page.getByText("Create your household")).toBeVisible();
    await expect(
      page.locator('input[placeholder="The Smith Family"]')
    ).toBeVisible();

    // Back button visible for new users
    await expect(page.getByText("← Back")).toBeVisible();

    // Go back
    await page.getByText("← Back").click();
    await page.waitForTimeout(500);
    await expect(page.getByText("Welcome to PetForce")).toBeVisible();

    // Click "Join a Household"
    await page.getByText("Join a Household").click();
    await page.waitForTimeout(500);

    await expect(page.getByText("Join a household")).toBeVisible();
    await expect(
      page.locator('input[placeholder="ABC-1234"]')
    ).toBeVisible();

    await page
      .screenshot({
        path: "test-results/screenshots/onboard-scenario-04-join-form.png",
        fullPage: true,
      })
      .catch(() => {});

    // Back again
    await page.getByText("← Back").click();
    await page.waitForTimeout(500);
    await expect(page.getByText("Welcome to PetForce")).toBeVisible();
  });

  test("FORBIDDEN error on create shows error message gracefully", async ({
    page,
  }) => {
    // Set up mocks for initial load
    await setupTrpcMocks(page, {
      myHouseholds: [],
      canCreateHousehold: { canCreate: true },
    });

    await safeGoto(page, "/onboard");
    await page.waitForTimeout(2000);

    // Go to create form
    await page.getByText("Create a Household").click();
    await page.waitForTimeout(500);

    // Fill the form
    await page
      .locator('input[placeholder="The Smith Family"]')
      .fill("Race Condition Test");
    await page
      .locator('input[placeholder="Jane Smith"]')
      .fill("Test User");

    // Override tRPC route to return FORBIDDEN for the onboard mutation
    await page.unroute("**/trpc/**");
    await page.route("**/trpc/**", async (route: Route) => {
      const url = route.request().url();
      const method = route.request().method();
      const trpcPath = url.split("/trpc/")[1]?.split("?")[0] ?? "";

      if (method === "POST" && trpcPath.includes("dashboard.onboard")) {
        const procedures = trpcPath.split(",");
        const batchResponse = procedures.map((proc) => {
          if (proc === "dashboard.onboard") {
            return sjError(
              "You have already created a household. You can join other households using a join code.",
              "FORBIDDEN"
            );
          }
          return sjResult(null);
        });
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(batchResponse),
        });
      }

      // GET queries — return same mock data
      const procedures = trpcPath.split(",");
      const batchResponse = procedures.map((proc) => {
        if (proc === "dashboard.myHouseholds") return sjResult([]);
        if (proc === "dashboard.canCreateHousehold")
          return sjResult({ canCreate: true });
        return sjResult(null);
      });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(batchResponse),
      });
    });

    // Submit
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    await page
      .screenshot({
        path: "test-results/screenshots/onboard-scenario-05-forbidden-error.png",
        fullPage: true,
      })
      .catch(() => {});

    // Should show the error message
    const errorText = page.getByText("already created a household");
    await expect(errorText).toBeVisible();
  });
});

test.describe("Header Dropdown Create Button (mocked)", () => {
  /** Set up full dashboard mocks with SuperJSON format */
  async function setupDashboardMocks(
    page: Page,
    canCreate: boolean,
    role: string
  ) {
    const mockMap: Record<string, unknown> = {
      "dashboard.myHouseholds": [
        {
          id: "hh-1",
          name: "Test Home",
          theme: {
            primaryColor: "#6366F1",
            secondaryColor: "#EC4899",
            avatar: null,
          },
          petCount: 1,
          memberCount: 2,
          role,
        },
        // Second household so dropdown opens (showDropdown = length > 1)
        {
          id: "hh-2",
          name: "Vacation Home",
          theme: {
            primaryColor: "#10B981",
            secondaryColor: "#F59E0B",
            avatar: null,
          },
          petCount: 0,
          memberCount: 1,
          role: "member",
        },
      ],
      "dashboard.canCreateHousehold": { canCreate },
      "dashboard.get": {
        household: {
          id: "hh-1",
          name: "Test Home",
          theme: {
            primaryColor: "#6366F1",
            secondaryColor: "#EC4899",
            avatar: null,
          },
          joinCode: "ABC-1234",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        members: [
          {
            id: "m-1",
            householdId: "hh-1",
            userId: "user_test",
            role,
            displayName: "Test User",
            avatarUrl: null,
            joinedAt: new Date().toISOString(),
          },
        ],
        pets: [],
        recentActivities: [],
        pendingInviteCount: 0,
        pendingRequestCount: 0,
      },
    };

    await page.route("**/trpc/**", async (route: Route) => {
      const url = route.request().url();
      const trpcPath = url.split("/trpc/")[1]?.split("?")[0] ?? "";
      const procedures = trpcPath.split(",");

      const batchResponse = procedures.map((proc) => {
        const data = mockMap[proc];
        if (data !== undefined) {
          return sjResult(data);
        }
        return sjResult(null);
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(batchResponse),
      });
    });
  }

  test("header shows Create button when user can create", async ({ page }) => {
    await setupDashboardMocks(page, true, "member");

    // Set localStorage so dashboard knows which household is active
    await page.goto("/dashboard");
    await page.evaluate(() =>
      localStorage.setItem("petforce_household_id", "hh-1")
    );
    await page.goto("/dashboard");
    await page.waitForTimeout(3000);

    await page
      .screenshot({
        path: "test-results/screenshots/onboard-scenario-06-header-can-create.png",
        fullPage: true,
      })
      .catch(() => {});

    // Open the dropdown (click the household name button)
    const switcherButton = page.locator("header button").first();
    await expect(switcherButton).toBeVisible({ timeout: 10000 });
    await switcherButton.click();
    await page.waitForTimeout(500);

    await page
      .screenshot({
        path: "test-results/screenshots/onboard-scenario-07-dropdown-can-create.png",
        fullPage: true,
      })
      .catch(() => {});

    // Both options should be visible
    await expect(page.getByText("+ Create New Household")).toBeVisible();
    await expect(page.getByText("Join a Household")).toBeVisible();
  });

  test("header hides Create button when user cannot create", async ({
    page,
  }) => {
    await setupDashboardMocks(page, false, "owner");

    await page.goto("/dashboard");
    await page.evaluate(() =>
      localStorage.setItem("petforce_household_id", "hh-1")
    );
    await page.goto("/dashboard");
    await page.waitForTimeout(3000);

    await page
      .screenshot({
        path: "test-results/screenshots/onboard-scenario-08-header-no-create.png",
        fullPage: true,
      })
      .catch(() => {});

    // Open the dropdown
    const switcherButton = page.locator("header button").first();
    await expect(switcherButton).toBeVisible({ timeout: 10000 });
    await switcherButton.click();
    await page.waitForTimeout(500);

    await page
      .screenshot({
        path: "test-results/screenshots/onboard-scenario-09-dropdown-no-create.png",
        fullPage: true,
      })
      .catch(() => {});

    // "Join" should be visible
    await expect(page.getByText("Join a Household")).toBeVisible();

    // "Create" should NOT be visible
    await expect(
      page.getByText("+ Create New Household")
    ).not.toBeVisible();
  });
});
