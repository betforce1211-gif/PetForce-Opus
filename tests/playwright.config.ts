import { defineConfig } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "e2e/.auth/session.json");

export default defineConfig({
  globalSetup: require.resolve("./global.setup"),
  testDir: "./e2e",
  outputDir: "./test-results",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "on",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    // Auth setup — runs first, saves session state
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
      use: { browserName: "chromium" },
    },
    // Unauthenticated tests — no session needed
    {
      name: "unauthenticated",
      testMatch: /smoke\.test\.ts/,
      use: { browserName: "chromium" },
    },
    // Authenticated tests — each test signs in via @clerk/testing helpers
    {
      name: "authenticated",
      testMatch: /authenticated\.test\.ts/,
      use: { browserName: "chromium" },
      timeout: 60000,
    },
    // Dashboard visual tests — no auth needed (uses mocks)
    {
      name: "dashboard-mocked",
      testMatch: /dashboard\.test\.ts/,
      use: { browserName: "chromium" },
    },
  ],
  reporter: [
    ["html", { outputFolder: "./playwright-report" }],
    ["list"],
  ],
});
