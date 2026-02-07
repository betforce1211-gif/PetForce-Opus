import { test as setup } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import path from "path";
import fs from "fs";

// Load test env vars
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length && !key.startsWith("#")) {
      process.env[key.trim()] = rest.join("=").trim();
    }
  }
}

const authFile = path.join(__dirname, ".auth/session.json");

setup("sign in with Clerk", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL!;

  if (!email) {
    throw new Error("TEST_USER_EMAIL must be set in tests/.env");
  }

  // Navigate to a page that loads Clerk (required before clerk.signIn)
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Use Clerk testing helper — signs in via backend API token (bypasses 2FA/email verification)
  await clerk.signIn({
    page,
    emailAddress: email,
  });

  // Navigate to a protected page to confirm auth works
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Ensure auth dir exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Save the signed-in session state
  await page.context().storageState({ path: authFile });
});
