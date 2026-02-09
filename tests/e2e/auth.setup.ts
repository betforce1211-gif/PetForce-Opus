import { test as setup } from "@playwright/test";
import { clerkTestSignIn } from "./helpers/clerk-test-signin";
import path from "path";
import fs from "fs";

import "./helpers/load-env";

const authFile = path.join(__dirname, ".auth/session.json");

setup("sign in with Clerk test mode", async ({ page }) => {
  await clerkTestSignIn(page);

  // Wait for the dashboard to fully load so localStorage gets the household ID.
  // This is critical — without it, settings pages show "No household selected."
  try {
    await page
      .locator("text=/Pets|No pets yet|Members|Redirecting|Create your household/")
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
    await page.waitForTimeout(2000);
  } catch {
    // Dashboard may not fully load if user needs onboarding — that's OK
  }

  // Ensure auth directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Save session state (cookies + localStorage) so authenticated tests can reuse it
  await page.context().storageState({ path: authFile });
  console.log("Auth session saved to", authFile);
});
