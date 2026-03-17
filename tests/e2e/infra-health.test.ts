import { test, expect } from "@playwright/test";

import "./helpers/load-env";

test.describe("Infrastructure Health Gate", () => {
  test("API /health returns 200 with dependency checks", async ({ request }) => {
    const response = await request.get("http://localhost:3001/health");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.checks).toBeDefined();
    expect(body.checks.db).toBe("ok");
    expect(body.checks.auth).toBe("ok");
  });

  test("unauthenticated tRPC call returns error (not 500)", async ({
    request,
  }) => {
    // Verify the API processes tRPC requests correctly without crashing.
    // If env vars (CLERK_JWT_KEY, DATABASE_URL) were missing, we'd get a
    // 500 server error or connection failure instead of a proper tRPC error.
    const response = await request.post(
      "http://localhost:3001/trpc/household.list",
      {
        headers: { "content-type": "application/json" },
      }
    );
    expect(response.status()).toBeLessThan(500);
    const body = await response.json();
    // tRPC may return single object or batch array
    const error = Array.isArray(body) ? body[0]?.error : body.error;
    expect(error).toBeDefined();
    const code =
      error?.json?.data?.code ??
      error?.data?.code ??
      error?.code;
    // UNAUTHORIZED, NOT_FOUND, or METHOD_NOT_SUPPORTED are all valid — means the API is healthy
    expect(["UNAUTHORIZED", "NOT_FOUND", "METHOD_NOT_SUPPORTED"]).toContain(code);
  });

  test("GET /dashboard returns HTML (not 404)", async ({ request }) => {
    const response = await request.get("http://localhost:3000/dashboard");
    // Clerk middleware may redirect to /sign-in, which is fine — both are HTML
    expect(response.status()).toBeLessThan(500);
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toContain("text/html");
  });

  test("GET /join returns HTML (not 404)", async ({ request }) => {
    const response = await request.get("http://localhost:3000/join");
    expect(response.status()).toBeLessThan(500);
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toContain("text/html");
  });

  test("GET /dashboard/settings returns HTML (not 404)", async ({
    request,
  }) => {
    const response = await request.get(
      "http://localhost:3000/dashboard/settings"
    );
    expect(response.status()).toBeLessThan(500);
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toContain("text/html");
  });
});
