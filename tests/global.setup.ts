import { FullConfig } from "@playwright/test";
import path from "path";
import fs from "fs";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length && !key.startsWith("#")) {
      const k = key.trim();
      // Don't overwrite env vars already set (e.g. from CI secrets)
      if (!process.env[k]) {
        process.env[k] = rest.join("=").trim();
      }
    }
  }
}

// Load root .env.local first (shared secrets), then tests/.env (test-only overrides)
loadEnvFile(path.resolve(__dirname, "../.env.local"));
loadEnvFile(path.resolve(__dirname, ".env"));

async function globalSetup(_config: FullConfig) {
  // Ensure screenshot output directory exists
  const screenshotDir = path.resolve(__dirname, "test-results/screenshots");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log("Global setup: env loaded, using Clerk test mode (code 424242)");
}

export default globalSetup;
