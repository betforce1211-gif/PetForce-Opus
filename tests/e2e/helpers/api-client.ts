import { Page, APIRequestContext } from "@playwright/test";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Module-level cache for the last successfully extracted auth token.
// extractAuthToken() stores it here so getHouseholdId() can reuse it
// without re-extracting from Clerk JS (which may not be available).
let _cachedAuthToken: string | null = null;

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
  try {
    await page.goto("about:blank");
  } catch {
    // Navigation can be interrupted by an ongoing Clerk redirect — retry
    await page.waitForTimeout(1000);
    await page.goto("about:blank").catch(() => {});
  }
  await page.waitForTimeout(500);

  // Navigate to /sign-in — Clerk may restore session via handshake (no form needed)
  // or show the sign-in form if the session is truly gone
  await page.goto("/sign-in");
  await page.waitForLoadState("domcontentloaded");
  // Wait for Clerk JS to initialize — use networkidle with 3s cap to avoid hanging
  await Promise.race([
    page.waitForLoadState("networkidle"),
    new Promise(resolve => setTimeout(resolve, 3000)),
  ]).catch(() => {});

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
  await emailInput.waitFor({ state: "visible", timeout: 30_000 });
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
    // After re-auth, navigate to the original target and reload to ensure
    // fresh tRPC calls fire (so extractAuthToken can capture the new JWT)
    await page.goto(url);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
  }
}

/**
 * Extracts the Clerk session token from the browser.
 *
 * Tries two approaches:
 * 1. Use Clerk's JS API (window.Clerk.session.getToken()) — most reliable
 * 2. Fall back to intercepting outbound tRPC requests
 *
 * Call this AFTER navigating to an authenticated page.
 */
export async function extractAuthToken(page: Page): Promise<string> {
  // Approach 1: Get token directly from Clerk's JS API
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      const token = await page.evaluate(async () => {
        const clerk = (window as any).Clerk;
        if (clerk?.session) {
          return await clerk.session.getToken();
        }
        return null;
      });
      if (token) {
        _cachedAuthToken = token;
        return token;
      }
    } catch {
      // Clerk not loaded yet
    }
    await page.waitForTimeout(2000);
  }

  // Approach 2: Fall back to intercepting a tRPC request
  console.log("Clerk JS API unavailable, falling back to request interception");
  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        reject(new Error(
          `Timed out waiting for auth token. Current URL: ${page.url()}`
        ));
      }
    }, 30_000);

    page.on("request", (request) => {
      if (resolved) return;
      const url = request.url();
      if (url.includes("/trpc/")) {
        const auth = request.headers()["authorization"];
        if (auth?.startsWith("Bearer ")) {
          resolved = true;
          clearTimeout(timeout);
          const t = auth.replace("Bearer ", "");
          _cachedAuthToken = t;
          resolve(t);
        }
      }
    });

    // Trigger a tRPC call by reloading
    page.reload().catch(() => {});
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
  const raw = await response.json();
  // tRPC may return single object or batch array
  const body = Array.isArray(raw) ? raw[0] : raw;
  if (body?.error) {
    const parsed =
      typeof body.error.json === "object"
        ? body.error.json
        : body.error;
    throw Object.assign(new Error(parsed.message ?? JSON.stringify(parsed)), {
      code: parsed.data?.code ?? parsed.code,
      httpStatus: parsed.data?.httpStatus ?? response.status(),
      raw,
    });
  }
  return body?.result?.data?.json ?? body?.result?.data ?? body?.result;
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
  const raw = await response.json();
  // tRPC may return single object or batch array
  const body = Array.isArray(raw) ? raw[0] : raw;
  if (body?.error) {
    const parsed =
      typeof body.error.json === "object"
        ? body.error.json
        : body.error;
    throw Object.assign(new Error(parsed.message ?? JSON.stringify(parsed)), {
      code: parsed.data?.code ?? parsed.code,
      httpStatus: parsed.data?.httpStatus ?? response.status(),
      raw,
    });
  }
  return body?.result?.data?.json ?? body?.result?.data ?? body?.result;
}

/**
 * Reads the active household ID from the browser's localStorage.
 * If not found, waits for the dashboard to set it (React useEffect).
 * As a last resort, extracts the Clerk token and queries the API directly
 * using Node.js fetch (bypasses browser CSP/CORS entirely).
 */
export async function getHouseholdId(page: Page): Promise<string> {
  // Try immediately
  let id = await page.evaluate(() => localStorage.getItem("petforce_household_id"));
  if (id) return id;

  // Wait for React to hydrate and set localStorage (up to 10s)
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(2000);
    id = await page.evaluate(() => localStorage.getItem("petforce_household_id"));
    if (id) return id;
  }

  // Fallback: query API directly via Node.js fetch with cached or fresh token
  console.log("getHouseholdId: localStorage empty after 10s, trying direct API query");
  const diag: string[] = [`url=${page.url()}`];

  // Try to get a fresh token from Clerk, fall back to cached token from extractAuthToken
  let token: string | null = null;
  try {
    token = await page.evaluate(async () => {
      const clerk = (window as any).Clerk;
      if (clerk?.session) return await clerk.session.getToken();
      return null;
    });
  } catch {
    // Clerk JS not available
  }
  if (!token && _cachedAuthToken) {
    token = _cachedAuthToken;
    diag.push("token=cached");
  } else if (token) {
    diag.push("token=fresh");
  } else {
    diag.push("token=none");
  }

  if (token) {
    // Retry up to 3 times with backoff (handles 429 rate limiting)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${API_BASE}/trpc/household.list`, {
          headers: { authorization: `Bearer ${token}` },
        });
        diag.push(`api=${res.status}`);
        if (res.status === 429) {
          diag.push(`retry=${attempt}`);
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        const body = await res.json();
        // tRPC may return single object or batch array
        const item = Array.isArray(body) ? body[0] : body;
        const households =
          item?.result?.data?.json ?? item?.result?.data ?? item?.result;
        if (Array.isArray(households)) {
          diag.push(`households=${households.length}`);
          if (households.length > 0) {
            id = households[0].id;
            await page.evaluate(
              (hid) => localStorage.setItem("petforce_household_id", hid),
              id
            );
            console.log("getHouseholdId: set via direct API query:", id);
            return id;
          }
        } else {
          diag.push(`body=${JSON.stringify(body).substring(0, 150)}`);
        }
        break; // Don't retry on non-429 responses
      } catch (err: any) {
        diag.push(`fetchErr=${err.message}`);
        break;
      }
    }
  }

  // Last resort: reload and wait
  await page.reload();
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(5000);
  id = await page.evaluate(() => localStorage.getItem("petforce_household_id"));
  if (id) return id;

  throw new Error(
    `No petforce_household_id found. Diag: ${diag.join(", ")}`
  );
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
