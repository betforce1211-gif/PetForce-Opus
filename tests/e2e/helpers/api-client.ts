import { Page, APIRequestContext } from "@playwright/test";

const API_BASE = "http://localhost:3001";

/**
 * Intercepts outbound tRPC requests from the browser to capture the real
 * Clerk JWT token. Call this BEFORE navigating to a page that makes API calls.
 */
export async function extractAuthToken(page: Page): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for auth token from browser requests"));
    }, 30_000);

    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/trpc/")) {
        const auth = request.headers()["authorization"];
        if (auth?.startsWith("Bearer ")) {
          clearTimeout(timeout);
          resolve(auth.replace("Bearer ", ""));
        }
      }
    });
  });
}

/**
 * Makes a tRPC mutation (POST) directly against the API.
 */
export async function trpcMutation(
  request: APIRequestContext,
  token: string,
  procedure: string,
  input: unknown
) {
  const response = await request.post(`${API_BASE}/trpc/${procedure}`, {
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    data: { json: input },
  });
  const body = await response.json();
  if (body.error) {
    const parsed =
      typeof body.error.json === "object"
        ? body.error.json
        : body.error;
    throw Object.assign(new Error(parsed.message ?? JSON.stringify(parsed)), {
      code: parsed.data?.code ?? parsed.code,
      httpStatus: parsed.data?.httpStatus ?? response.status(),
      raw: body,
    });
  }
  return body.result?.data?.json ?? body.result?.data ?? body.result;
}

/**
 * Makes a tRPC query (GET) directly against the API.
 */
export async function trpcQuery(
  request: APIRequestContext,
  token: string,
  procedure: string,
  input?: unknown
) {
  const url = input
    ? `${API_BASE}/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
    : `${API_BASE}/trpc/${procedure}`;

  const response = await request.get(url, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  const body = await response.json();
  if (body.error) {
    const parsed =
      typeof body.error.json === "object"
        ? body.error.json
        : body.error;
    throw Object.assign(new Error(parsed.message ?? JSON.stringify(parsed)), {
      code: parsed.data?.code ?? parsed.code,
      httpStatus: parsed.data?.httpStatus ?? response.status(),
      raw: body,
    });
  }
  return body.result?.data?.json ?? body.result?.data ?? body.result;
}

/**
 * Reads the active household ID from the browser's localStorage.
 */
export async function getHouseholdId(page: Page): Promise<string> {
  const id = await page.evaluate(() => localStorage.getItem("petforce_household_id"));
  if (!id) throw new Error("No petforce_household_id found in localStorage");
  return id;
}

/**
 * Navigates to /dashboard/settings. The auth session storageState includes
 * localStorage (with petforce_household_id) so we can navigate directly.
 * Falls back to loading dashboard first if needed.
 */
export async function goToSettings(page: Page): Promise<void> {
  await page.goto("/dashboard/settings");
  await page.waitForTimeout(3000);

  // If "No household selected" is shown, load dashboard to set localStorage
  const noHousehold = page.getByText("No household selected.");
  if (await noHousehold.isVisible().catch(() => false)) {
    const goBtn = page.getByRole("button", { name: "Go to Dashboard" }).or(
      page.getByText("Go to Dashboard")
    );
    await goBtn.first().click();
    await page
      .locator("text=/Pets|No pets yet|Members/")
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });
    await page.goto("/dashboard/settings");
    await page.waitForTimeout(2000);
  }

  // Wait for settings content
  await page
    .locator("text=/Members|Invites/")
    .first()
    .waitFor({ state: "visible", timeout: 15_000 });
}
