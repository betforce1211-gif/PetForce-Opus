// Initialize OpenTelemetry before any other imports that might be instrumented.
import { initTelemetry, shutdownTelemetry } from "./lib/telemetry.js";
initTelemetry();

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

// --- Request logging + HTTP-level tracing ---
import { tracer } from "./lib/telemetry.js";
import { SpanStatusCode } from "@opentelemetry/api";

app.use("/*", async (c, next) => {
  const start = Date.now();

  await tracer.startActiveSpan(`HTTP ${c.req.method} ${c.req.path}`, async (span) => {
    span.setAttribute("http.method", c.req.method);
    span.setAttribute("http.target", c.req.path);

    try {
      await next();
    } finally {
      const ms = Date.now() - start;

      span.setAttribute("http.status_code", c.res.status);
      span.setAttribute("http.response_time_ms", ms);

      if (c.res.status >= 500) {
        span.setStatus({ code: SpanStatusCode.ERROR });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      span.end();

      logger.info(
        { method: c.req.method, path: c.req.path, status: c.res.status, responseTime: ms },
        "request"
      );
    }
  });
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
  const checks: Record<string, "ok" | "error" | "not_configured"> = {};

  // Database connectivity check
  try {
    const { db, households } = await import("@petforce/db");
    const { count } = await import("drizzle-orm");
    await db.select({ n: count() }).from(households).limit(1);
    checks.db = "ok";
  } catch {
    checks.db = "error";
  }

  // Clerk auth reachability check (public JWKS endpoint — no auth needed)
  try {
    const res = await fetch("https://api.clerk.com/.well-known/jwks.json", {
      signal: AbortSignal.timeout(5000),
    });
    checks.auth = res.status < 500 ? "ok" : "error";
  } catch {
    checks.auth = "error";
  }

  // Redis cache check (optional — only if configured)
  try {
    const { cache } = await import("./lib/cache.js");
    await cache.set("health:ping", "pong", 10);
    const val = await cache.get<string>("health:ping");
    checks.cache = val === "pong" ? "ok" : "error";
  } catch {
    checks.cache = "error";
  }

  // Job queue check (optional — only if REDIS_URL configured)
  try {
    const { isQueueAvailable } = await import("./lib/queue.js");
    checks.queue = isQueueAvailable() ? "ok" : "not_configured";
  } catch {
    checks.queue = "error";
  }

  const allOk = Object.values(checks).every((v) => v === "ok" || v === "not_configured");
  const status = allOk ? "ok" : "degraded";

  // Always return 200 — this is a liveness endpoint used by CI and load
  // balancers. The `status` field in the body communicates dependency health.
  return c.json({ status, checks });
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

  try {
    const { closeQueues } = await import("./lib/queue.js");
    await closeQueues();
    logger.info("Job queues closed.");
  } catch (err) {
    logger.error({ err }, "Error closing job queues");
  }

  try {
    await shutdownTelemetry();
    logger.info("Telemetry shut down — pending spans/metrics flushed.");
  } catch (err) {
    logger.error({ err }, "Error shutting down telemetry");
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
