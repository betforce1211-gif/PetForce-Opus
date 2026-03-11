import { test as setup } from "@playwright/test";
import { clerkTestSignIn } from "./helpers/clerk-test-signin";
import path from "path";
import fs from "fs";

import "./helpers/load-env";

const authFile = path.join(__dirname, ".auth/session.json");
const API_BASE = "http://localhost:3001";

setup("sign in with Clerk test mode", async ({ page }) => {
  await clerkTestSignIn(page);

  // Wait for the dashboard to fully load so localStorage gets the household ID.
  // This is critical — without it, settings pages show "No household selected."
  try {
    await page
      .locator("text=/Pets|No pets yet|Members|Redirecting|Create your household/")
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });
    await page.waitForTimeout(2000);
  } catch {
    // Dashboard may not fully load if user needs onboarding — that's OK
  }

  // Poll localStorage for petforce_household_id (React useEffect may be slow on CI)
  let householdId = await page.evaluate(() =>
    localStorage.getItem("petforce_household_id")
  );

  if (!householdId) {
    console.log("auth.setup: household ID not in localStorage yet, polling...");
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      householdId = await page.evaluate(() =>
        localStorage.getItem("petforce_household_id")
      );
      if (householdId) break;
    }
  }

  // Fallback: extract Clerk token and query the API directly
  if (!householdId) {
    console.log("auth.setup: polling failed, querying API directly");
    try {
      const token = await page.evaluate(async () => {
        const clerk = (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string> } } }).Clerk;
        if (clerk?.session) return await clerk.session.getToken();
        return null;
      });
      if (token) {
        const res = await fetch(`${API_BASE}/trpc/household.list`, {
          headers: { authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        const households =
          body.result?.data?.json ?? body.result?.data ?? body.result;
        if (Array.isArray(households) && households.length > 0) {
          householdId = households[0].id;
          await page.evaluate(
            (hid: string) => localStorage.setItem("petforce_household_id", hid),
            householdId
          );
          console.log("auth.setup: set household ID via API:", householdId);
        } else {
          console.log("auth.setup: user has no households (new user?)");
        }
      }
    } catch (err: unknown) {
      console.log("auth.setup: API fallback failed:", (err as Error).message);
    }
  } else {
    console.log("auth.setup: household ID found:", householdId);
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
