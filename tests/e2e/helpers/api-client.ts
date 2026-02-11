import { Page, APIRequestContext } from "@playwright/test";

const API_BASE = "http://localhost:3001";

/**
 * Detects if Clerk redirected to its hosted sign-in page (session expired) and
 * re-authenticates by breaking the redirect loop and signing in fresh.
 */
async function ensureAuthenticated(page: Page): Promise<boolean> {
  const url = page.url();
  if (!url.includes("accounts.dev/sign-in") && !url.includes("clerk.accounts.dev")) {
    return false;
  }

  console.log("Session expired — re-authenticating via Clerk test mode");

  // Break the Clerk redirect loop by navigating to a clean page first
  await page.goto("about:blank");
  await page.waitForTimeout(500);

  // Navigate to /sign-in — Clerk may restore session via handshake (no form needed)
  // or show the sign-in form if the session is truly gone
  await page.goto("/sign-in");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);

  // Check if Clerk already restored the session (redirected to dashboard/onboard)
  const currentUrl = page.url();
  if (currentUrl.includes("localhost:3000") && !currentUrl.includes("/sign-in")) {
    console.log("Session restored via Clerk handshake");
    return true;
  }

  // Session is truly expired — fill in the sign-in form
  const email = process.env.TEST_USER_EMAIL!;
  const password = process.env.TEST_USER_PASSWORD!;
  const testCode = process.env.CLERK_TEST_CODE ?? "424242";

  const emailInput = page.locator('input[name="identifier"]');
  await emailInput.waitFor({ state: "visible", timeout: 15_000 });
  await emailInput.fill(email);
  await page.click('button:has-text("Continue")');

  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ state: "visible", timeout: 10_000 });
  await passwordInput.fill(password);
  await page.click('button:has-text("Continue")');

  await page.waitForTimeout(2000);
  const otpInput = page.locator('input[autocomplete="one-time-code"]');
  const otpVisible = await otpInput.isVisible().catch(() => false);
  if (otpVisible || page.url().includes("factor")) {
    console.log("OTP verification detected — entering test code", testCode);
    await otpInput.waitFor({ state: "visible", timeout: 5000 });
    await otpInput.click();
    await otpInput.pressSequentially(testCode, { delay: 150 });
    await page.waitForTimeout(1500);
    if (page.url().includes("factor")) {
      const continueBtn = page.locator('button:has-text("Continue")');
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click();
      }
    }
  }

  await page.waitForURL(/\/(dashboard|onboard)/, { timeout: 15_000 });
  await page.waitForLoadState("domcontentloaded");
  return true;
}

/**
 * Navigates to a URL and re-authenticates if Clerk session has expired.
 * Handles the case where page.goto itself times out due to a Clerk redirect loop.
 */
export async function safeGoto(page: Page, url: string): Promise<void> {
  try {
    await page.goto(url);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
  } catch {
    // page.goto may timeout if Clerk redirect loop prevents the page from settling.
    // Fall through to ensureAuthenticated which will detect and recover.
  }
  const didReAuth = await ensureAuthenticated(page);
  if (didReAuth) {
    // After re-auth, navigate to the original target
    await page.goto(url);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
  }
}

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
  await safeGoto(page, "/dashboard/settings");
  await page.waitForTimeout(1000);

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
    await safeGoto(page, "/dashboard/settings");
  }

  // Wait for settings content
  await page
    .locator("text=/Members|Invites/")
    .first()
    .waitFor({ state: "visible", timeout: 15_000 });
}
