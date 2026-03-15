import { env } from "./lib/env.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router.js";
import { verifyClerkToken } from "./lib/clerk-auth.js";
import { rateLimitMiddleware } from "./lib/rate-limit.js";
import uploadApp from "./routes/upload.js";
import { logger } from "./lib/logger.js";
import type { Context } from "./trpc.js";

const isProd = process.env.NODE_ENV === "production";

const app = new Hono();

// --- Global error handler ---
app.onError((err, c) => {
  // Hono HTTPExceptions are intentional — preserve their status and message
  if (err instanceof HTTPException) {
    logger.warn(
      { status: err.status, message: err.message, path: c.req.path },
      "HTTP exception"
    );
    return c.json({ error: err.message }, err.status);
  }

  // Log the full error internally
  logger.error(
    { err, method: c.req.method, path: c.req.path },
    "Unhandled error"
  );

  // Never leak stack traces or internal details to clients
  return c.json(
    { error: isProd ? "Internal server error" : err.message },
    500
  );
});

// --- 404 handler ---
app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

// --- Request logging ---
app.use("/*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info(
    { method: c.req.method, path: c.req.path, status: c.res.status, responseTime: ms },
    "request"
  );
});

// In production, NEXT_PUBLIC_WEB_URL is required by the env schema — no
// silent fallback to localhost. In development it defaults to localhost:3000.
const corsOrigin = env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

app.use(
  "/*",
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

// Rate limiting
app.use("/trpc/*", rateLimitMiddleware);
app.use("/upload/*", rateLimitMiddleware);

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

app.get("/health", async (c) => {
  const checks: Record<string, "ok" | "error"> = {};

  // Database connectivity check
  try {
    const { db, households } = await import("@petforce/db");
    const { count } = await import("drizzle-orm");
    await db.select({ n: count() }).from(households).limit(1);
    checks.db = "ok";
  } catch {
    checks.db = "error";
  }

  // Clerk auth reachability check
  try {
    if (env.CLERK_SECRET_KEY) {
      const res = await fetch("https://api.clerk.com/v1/clients", {
        headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}` },
        signal: AbortSignal.timeout(5000),
      });
      checks.auth = res.ok ? "ok" : "error";
    } else {
      // JWT key mode — verify Clerk API is reachable via public JWKS endpoint
      const res = await fetch("https://api.clerk.com/.well-known/jwks.json", {
        signal: AbortSignal.timeout(5000),
      });
      checks.auth = res.status < 500 ? "ok" : "error";
    }
  } catch {
    checks.auth = "error";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");
  const anyError = Object.values(checks).some((v) => v === "error");
  const status = allOk ? "ok" : anyError ? "degraded" : "ok";

  return c.json({ status, checks }, allOk ? 200 : 503);
});

const port = env.PORT ?? env.API_PORT ?? 3001;

logger.info({ port }, "PetForce API running");

const server = serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });

// --- Graceful shutdown ---
async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down gracefully...");

  server.close(() => {
    logger.info("HTTP server closed, no longer accepting connections.");
  });

  try {
    const { closeConnection } = await import("@petforce/db");
    await closeConnection();
    logger.info("Database connection pool closed.");
  } catch (err) {
    logger.error({ err }, "Error closing database connection");
  }

  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// --- Unhandled rejection / exception safety net ---
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — shutting down");
  shutdown("uncaughtException");
});
