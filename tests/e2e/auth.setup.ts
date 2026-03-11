import { test as setup } from "@playwright/test";
import { clerkTestSignIn } from "./helpers/clerk-test-signin";
import path from "path";
import fs from "fs";

import "./helpers/load-env";

const authFile = path.join(__dirname, ".auth/session.json");
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

setup("sign in with Clerk test mode", async ({ page }) => {
  await clerkTestSignIn(page);

  console.log("Post sign-in URL:", page.url());

  // Navigate to dashboard to trigger React hydration + HouseholdProvider
  if (!page.url().includes("/dashboard")) {
    await page.goto("/dashboard");
  }
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);

  // Wait for dashboard content (React app fully loaded)
  try {
    await page
      .locator("text=/Pets|No pets yet|Members|Redirecting|Create your household/")
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });
    console.log("Dashboard content visible");
  } catch {
    console.log("Dashboard content not detected, URL:", page.url());
    // Take diagnostic screenshot
    await page.screenshot({ path: "test-results/screenshots/auth-setup-debug.png" }).catch(() => {});
  }

  // Check if React already set the household ID
  let householdId = await page.evaluate(() =>
    localStorage.getItem("petforce_household_id")
  );
  console.log("Household ID from React:", householdId ?? "not set");

  // Poll localStorage if not set yet (React useEffect may be slow on CI)
  if (!householdId) {
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      householdId = await page.evaluate(() =>
        localStorage.getItem("petforce_household_id")
      );
      if (householdId) {
        console.log("Household ID found after polling:", householdId);
        break;
      }
    }
  }

  // If not set, try direct API query using Clerk token + Node.js fetch
  if (!householdId) {
    console.log("auth.setup: polling failed, querying API directly");
    let token: string | null = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        token = await page.evaluate(async () => {
          const clerk = (window as any).Clerk;
          if (clerk?.session) return await clerk.session.getToken();
          return null;
        });
        if (token) break;
      } catch {
        // Clerk not loaded yet
      }
      await page.waitForTimeout(1000);
    }
    console.log("Auth token extracted:", token ? `yes (${token.substring(0, 20)}...)` : "no");

    if (token) {
      try {
        // Use Node.js fetch — bypasses browser CSP/CORS entirely
        const res = await fetch(`${API_BASE}/trpc/household.list`, {
          headers: { authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        console.log("API response status:", res.status, "body keys:", Object.keys(body));
        const households =
          body.result?.data?.json ?? body.result?.data ?? body.result;
        console.log(
          "API household.list:",
          Array.isArray(households)
            ? `${households.length} households${households.length > 0 ? ` (first: ${households[0].id})` : ""}`
            : JSON.stringify(households)?.substring(0, 200)
        );
        if (Array.isArray(households) && households.length > 0) {
          householdId = households[0].id;
        }
      } catch (err: any) {
        console.log("Node.js fetch to API failed:", err.message);
      }
    }

    // Inject into localStorage
    if (householdId) {
      await page.evaluate(
        (id) => localStorage.setItem("petforce_household_id", id),
        householdId
      );
      console.log("Household ID injected into localStorage:", householdId);
    }
  }

  console.log("Final household ID:", householdId ?? "NOT SET");

  // Ensure auth directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Save session state (cookies + localStorage) so authenticated tests can reuse it
  await page.context().storageState({ path: authFile });
  console.log("Auth session saved to", authFile);

  // Log storageState summary for debugging
  const stateRaw = fs.readFileSync(authFile, "utf-8");
  const state = JSON.parse(stateRaw);
  console.log(
    "StorageState summary:",
    `${state.cookies?.length ?? 0} cookies,`,
    `${state.origins?.length ?? 0} origins,`,
    `localStorage items: ${state.origins?.[0]?.localStorage?.map((e: any) => e.name).join(", ") ?? "none"}`
  );
});
