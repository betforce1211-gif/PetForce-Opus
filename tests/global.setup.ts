import { clerkSetup } from "@clerk/testing/playwright";
import { FullConfig } from "@playwright/test";
import path from "path";
import fs from "fs";

// Load test env vars before clerkSetup reads them
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
  await clerkSetup();
}

export default globalSetup;
