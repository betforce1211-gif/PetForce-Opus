import { Page } from "@playwright/test";

/**
 * Signs in via the Clerk UI using Clerk's Test Mode.
 *
 * Requires:
 * - Clerk test mode enabled in the dashboard
 * - A +clerk_test email address (e.g., user+clerk_test@gmail.com)
 * - Test verification code: 424242
 *
 * This bypasses real email/SMS verification entirely.
 */
export async function clerkTestSignIn(
  page: Page,
  options?: {
    email?: string;
    password?: string;
    testCode?: string;
  }
) {
  const email = options?.email ?? process.env.TEST_USER_EMAIL!;
  const password = options?.password ?? process.env.TEST_USER_PASSWORD!;
  const testCode = options?.testCode ?? process.env.CLERK_TEST_CODE ?? "424242";

  if (!email) throw new Error("TEST_USER_EMAIL is required (set in tests/.env)");
  if (!password) throw new Error("TEST_USER_PASSWORD is required (set in tests/.env)");

  // Navigate to sign-in
  await page.goto("/sign-in");
  await page.waitForLoadState("domcontentloaded");

  // Step 1: Enter email
  const emailInput = page.locator('input[name="identifier"]');
  await emailInput.waitFor({ state: "visible", timeout: 10_000 });
  await emailInput.fill(email);
  await page.click('button:has-text("Continue")');

  // Step 2: Enter password
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ state: "visible", timeout: 10_000 });
  await passwordInput.fill(password);
  await page.click('button:has-text("Continue")');

  // Step 3: Handle OTP / device-trust verification if prompted
  // Clerk test mode: +clerk_test emails accept the code 424242
  await page.waitForTimeout(2000);

  const otpInput = page.locator('input[autocomplete="one-time-code"]');
  const otpVisible = await otpInput.isVisible().catch(() => false);

  if (otpVisible || page.url().includes("factor")) {
    console.log("OTP verification detected — entering test code", testCode);
    await otpInput.waitFor({ state: "visible", timeout: 5000 });
    await otpInput.click();
    await otpInput.pressSequentially(testCode, { delay: 150 });
    await page.waitForTimeout(1500);

    // OTP input usually auto-submits; click Continue as fallback
    if (page.url().includes("factor")) {
      const continueBtn = page.locator('button:has-text("Continue")');
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click();
      }
    }
  }

  // Wait for redirect to dashboard or onboard
  await page.waitForURL(/\/(dashboard|onboard)/, { timeout: 15_000 });
  await page.waitForLoadState("domcontentloaded");
}
