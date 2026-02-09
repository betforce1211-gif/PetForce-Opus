import { defineConfig } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "e2e/.auth/session.json");

export default defineConfig({
  globalSetup: require.resolve("./global.setup"),
  testDir: "./e2e",
  outputDir: "./test-results",
  timeout: 30000,
  retries: 0,
  workers: 2,
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "on",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    // Infrastructure gate — catches API/web server issues before all other tests
    {
      name: "infra-health",
      testMatch: /infra-health\.test\.ts/,
      use: { browserName: "chromium" },
    },
    // Auth setup — signs in via Clerk test mode, saves session state
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
      dependencies: ["infra-health"],
      use: { browserName: "chromium" },
      timeout: 60000,
    },
    // Unauthenticated tests — no session needed
    {
      name: "unauthenticated",
      testMatch: /smoke\.test\.ts/,
      dependencies: ["infra-health"],
      use: { browserName: "chromium" },
    },
    // Authenticated tests — reuse session from auth-setup
    {
      name: "authenticated",
      testMatch: /authenticated|settings|invite-admin|invite-join-page|access-request/,
      dependencies: ["auth-setup"],
      use: {
        browserName: "chromium",
        storageState: authFile,
      },
      timeout: 60000,
    },
    // Dashboard visual tests — no auth needed (uses mocks)
    {
      name: "dashboard-mocked",
      testMatch: /dashboard\.test\.ts/,
      dependencies: ["infra-health"],
      use: { browserName: "chromium" },
    },
    // Manual sign-in flow test (verifies the sign-in UI works end-to-end)
    {
      name: "manual-signin",
      testMatch: /manual-signin\.test\.ts/,
      dependencies: ["infra-health"],
      use: { browserName: "chromium" },
      timeout: 60000,
    },
  ],
  reporter: [
    ["html", { outputFolder: "./playwright-report" }],
    ["list"],
  ],
});
