// Preload script to load .env.local before any modules
// Used via: tsx --require ./env.cjs watch src/index.ts
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const idx = line.indexOf("=");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (key && !key.startsWith("#") && !process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}
