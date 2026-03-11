import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router.js";
import { verifyClerkToken } from "./lib/clerk-auth.js";
import uploadApp from "./routes/upload.js";
import type { Context } from "./trpc.js";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
    credentials: true,
  })
);

// --- In-memory rate limiter ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100;

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap) {
    if (now > value.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000).unref();

app.use("/trpc/*", async (c, next) => {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    entry.count++;
    if (entry.count > RATE_LIMIT_MAX) {
      return c.json({ error: "Too many requests" }, 429);
    }
  }

  await next();
});

// --- File upload routes (before tRPC) ---
app.route("/upload", uploadApp);

app.use("/trpc/*", async (c) => {
  const userId = await verifyClerkToken(c.req.header("authorization"));

  const response = await fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: (): Context => ({ userId }),
  });
  return response;
});

app.get("/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.API_PORT) || 3001;

console.info(`🐾 PetForce API running on http://localhost:${port}`);

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
