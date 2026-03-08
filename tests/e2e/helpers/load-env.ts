import path from "path";
import fs from "fs";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length && !key.startsWith("#")) {
      process.env[key.trim()] = rest.join("=").trim();
    }
  }
}

// Load root .env.local first (shared secrets), then tests/.env (test-only overrides)
loadEnvFile(path.resolve(__dirname, "../../../.env.local"));
loadEnvFile(path.resolve(__dirname, "../../.env"));
