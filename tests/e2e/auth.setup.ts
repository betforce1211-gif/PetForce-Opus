import { test as setup } from "@playwright/test";
import { clerkTestSignIn } from "./helpers/clerk-test-signin";
import path from "path";
import fs from "fs";

import "./helpers/load-env";

const authFile = path.join(__dirname, ".auth/session.json");

setup("sign in with Clerk test mode", async ({ page }) => {
  await clerkTestSignIn(page);

  // Ensure auth directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Save session state so authenticated tests can reuse it
  await page.context().storageState({ path: authFile });
  console.log("Auth session saved to", authFile);
});
