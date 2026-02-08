import { test, expect } from "@playwright/test";
import { clerkTestSignIn } from "./helpers/clerk-test-signin";

import "./helpers/load-env";

test("sign in via UI and verify redirect to dashboard", async ({ page }) => {
  await clerkTestSignIn(page);

  await page.waitForTimeout(2000);

  await page.screenshot({
    path: "test-results/screenshots/30-manual-signin-result.png",
    fullPage: true,
  });

  const finalUrl = page.url();
  console.log("Final URL:", finalUrl);

  expect(
    finalUrl.includes("/dashboard") || finalUrl.includes("/onboard")
  ).toBeTruthy();
});
