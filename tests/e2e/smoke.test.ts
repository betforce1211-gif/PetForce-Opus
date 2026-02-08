import { test, expect } from "@playwright/test";

test.describe("PetForce Smoke Tests (Unauthenticated)", () => {
  test("landing page loads with branding and auth options", async ({ page }) => {
    await page.goto("/");

    // Header should have PetForce branding
    await expect(page.locator("header")).toContainText("PetForce");

    // Should show auth panel with "Get started" text
    await expect(page.getByText("Get started")).toBeVisible();

    // Screenshot the landing page
    await page.screenshot({
      path: "test-results/screenshots/01-landing-page.png",
      fullPage: true,
    });
  });

  test("dashboard route redirects unauthenticated user to sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Clerk middleware should redirect to sign-in
    await page.waitForURL(/sign-in/, { timeout: 10000 });

    await page.screenshot({
      path: "test-results/screenshots/02-auth-redirect.png",
      fullPage: true,
    });

    // Should be on a sign-in page
    expect(page.url()).toContain("sign-in");
  });

  test("onboard route redirects unauthenticated user to sign-in", async ({
    page,
  }) => {
    await page.goto("/onboard");

    await page.waitForURL(/sign-in/, { timeout: 10000 });
    expect(page.url()).toContain("sign-in");
  });

  test("API health endpoint responds", async ({ request }) => {
    const response = await request.get("http://localhost:3001/health");
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toEqual({ status: "ok" });
  });

  test("API rejects unauthenticated tRPC calls", async ({ request }) => {
    const response = await request.post(
      "http://localhost:3001/trpc/dashboard.myHouseholds",
      {
        headers: { "content-type": "application/json" },
      }
    );
    // tRPC returns 401 or error for unauthenticated requests
    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});
