import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Context as HonoContext } from "hono";
import { env } from "./env.js";

function getClientIp(c: HonoContext): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown"
  );
}

// Determine if path is an auth, upload, or standard route for granular limits
function getRouteCategory(path: string): "auth" | "upload" | "standard" {
  if (path.includes("upload")) return "upload";
  // Auth-related tRPC procedures
  if (path.includes("household.join") || path.includes("household.create")) return "auth";
  return "standard";
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

type RateLimiterFn = (identifier: string, category: "auth" | "upload" | "standard") => Promise<RateLimitResult>;

function createRedisLimiter(): RateLimiterFn {
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL!,
    token: env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const limiters = {
    auth: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "15 m"),
      prefix: "ratelimit:auth",
    }),
    upload: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "15 m"),
      prefix: "ratelimit:upload",
    }),
    standard: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "15 m"),
      prefix: "ratelimit:standard",
    }),
  };

  return async (identifier, category) => {
    const result = await limiters[category].limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  };
}

function createInMemoryLimiter(): RateLimiterFn {
  const isCI = process.env.CI === "true";
  const limits = isCI
    ? { auth: 10_000, upload: 10_000, standard: 10_000 }
    : { auth: 20, upload: 30, standard: 100 };
  const windowMs = 15 * 60 * 1000;
  const store = new Map<string, { count: number; resetAt: number }>();

  // Clean up stale entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of store) {
      if (now > value.resetAt) store.delete(key);
    }
  }, 5 * 60 * 1000).unref();

  return async (identifier, category) => {
    const key = `${category}:${identifier}`;
    const now = Date.now();
    const max = limits[category];
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return { success: true, limit: max, remaining: max - 1, reset: now + windowMs };
    }

    entry.count++;
    const remaining = Math.max(0, max - entry.count);
    return {
      success: entry.count <= max,
      limit: max,
      remaining,
      reset: entry.resetAt,
    };
  };
}

const rateLimiter: RateLimiterFn =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? createRedisLimiter()
    : createInMemoryLimiter();

export async function rateLimitMiddleware(c: HonoContext, next: () => Promise<void>) {
  const ip = getClientIp(c);
  const category = getRouteCategory(c.req.path);
  const result = await rateLimiter(ip, category);

  // Set rate limit headers
  c.header("X-RateLimit-Limit", String(result.limit));
  c.header("X-RateLimit-Remaining", String(result.remaining));
  c.header("X-RateLimit-Reset", String(result.reset));

  if (!result.success) {
    return c.json({ error: "Too many requests" }, 429);
  }

  await next();
}
