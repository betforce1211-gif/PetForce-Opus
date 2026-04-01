/**
 * Idempotency key middleware for tRPC mutations.
 *
 * Clients send `X-Idempotency-Key: <uuid>` header on mutation requests.
 * On first request: execute the mutation, cache the result for 5 minutes.
 * On duplicate: return the cached result without re-executing.
 * No key: execute normally (backward-compatible).
 *
 * Uses the shared cache (Redis in production, in-memory in dev).
 */

import { cache } from "./cache.js";
import { logger } from "./logger.js";

const IDEMPOTENCY_TTL = 300; // 5 minutes
const KEY_PREFIX = "idempotency:";

interface CachedResult {
  ok: boolean;
  data: unknown;
}

/**
 * tRPC middleware that enforces idempotency on mutations.
 *
 * Attach via `t.procedure.use(idempotencyMiddleware)` on the base
 * instrumented procedure. Only activates for mutation type calls
 * when an idempotency key is present in context.
 */
export function idempotencyMiddleware(opts: {
  path: string;
  type: string;
  next: () => Promise<{ ok: boolean; [key: string]: unknown }>;
  ctx: Record<string, unknown>;
}) {
  const { path, type, next, ctx } = opts;

  // Only intercept mutations
  if (type !== "mutation") {
    return next();
  }

  const idempotencyKey = ctx._idempotencyKey as string | undefined;
  if (!idempotencyKey) {
    return next();
  }

  const cacheKeyStr = `${KEY_PREFIX}${idempotencyKey}`;

  return (async () => {
    // Check for cached result
    const cached = await cache.get<CachedResult>(cacheKeyStr);
    if (cached) {
      logger.info(
        { path, idempotencyKey },
        "Idempotency hit — returning cached result"
      );
      return cached;
    }

    // Execute the mutation
    const result = await next();

    // Cache the result (only successful mutations — errors should be retryable)
    if (result.ok) {
      await cache.set(cacheKeyStr, { ok: result.ok, data: (result as Record<string, unknown>).data }, IDEMPOTENCY_TTL);
    }

    return result;
  })();
}

/**
 * Extract idempotency key from request headers and add to tRPC context.
 * Call this in the Hono middleware layer before tRPC handles the request.
 */
export function extractIdempotencyKey(
  headers: { get(name: string): string | null | undefined }
): string | undefined {
  const key = headers.get("x-idempotency-key");
  if (!key) return undefined;

  // Validate format: must be a reasonable string (UUID-like, max 128 chars)
  if (key.length > 128 || key.length < 1) return undefined;

  return key;
}
