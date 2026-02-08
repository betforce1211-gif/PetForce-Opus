import { FullConfig } from "@playwright/test";
import path from "path";
import fs from "fs";

// Load test env vars
const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length && !key.startsWith("#")) {
      process.env[key.trim()] = rest.join("=").trim();
    }
  }
}

async function globalSetup(_config: FullConfig) {
  // Ensure screenshot output directory exists
  const screenshotDir = path.resolve(__dirname, "test-results/screenshots");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log("Global setup: env loaded, using Clerk test mode (code 424242)");
}

export default globalSetup;
