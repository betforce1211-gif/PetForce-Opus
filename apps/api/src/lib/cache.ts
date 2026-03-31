import { Redis } from "@upstash/redis";
import { env } from "./env.js";
import { logger } from "./logger.js";

// ---------------------------------------------------------------------------
// Cache interface — same pattern as rate-limit.ts: Upstash REST when
// configured, in-memory Map fallback for local dev / CI.
// ---------------------------------------------------------------------------

export interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  del(...keys: string[]): Promise<void>;
  /** Delete all keys matching a prefix (e.g. "household:abc123:*"). */
  delByPrefix(prefix: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Upstash REST cache
// ---------------------------------------------------------------------------

function createRedisCache(): CacheClient {
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL!,
    token: env.UPSTASH_REDIS_REST_TOKEN!,
  });

  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        const value = await redis.get<T>(key);
        return value ?? null;
      } catch (err) {
        logger.warn({ err, key }, "Cache get failed — falling through to DB");
        return null;
      }
    },

    async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
      try {
        await redis.set(key, value, { ex: ttlSeconds });
      } catch (err) {
        logger.warn({ err, key }, "Cache set failed — continuing without cache");
      }
    },

    async del(...keys: string[]): Promise<void> {
      if (keys.length === 0) return;
      try {
        await redis.del(...keys);
      } catch (err) {
        logger.warn({ err, keys }, "Cache del failed");
      }
    },

    async delByPrefix(prefix: string): Promise<void> {
      try {
        let cursor = 0;
        do {
          const [nextCursor, keys] = await redis.scan(cursor, {
            match: `${prefix}*`,
            count: 100,
          });
          cursor = Number(nextCursor);
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        } while (cursor !== 0);
      } catch (err) {
        logger.warn({ err, prefix }, "Cache delByPrefix failed");
      }
    },
  };
}

// ---------------------------------------------------------------------------
// In-memory cache (dev / CI fallback)
// ---------------------------------------------------------------------------

function createInMemoryCache(): CacheClient {
  const store = new Map<string, { value: unknown; expiresAt: number }>();

  // Evict expired entries every 60s
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.expiresAt) store.delete(key);
    }
  }, 60_000).unref();

  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value as T;
    },

    async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
      store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },

    async del(...keys: string[]): Promise<void> {
      for (const key of keys) store.delete(key);
    },

    async delByPrefix(prefix: string): Promise<void> {
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) store.delete(key);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const cache: CacheClient =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? createRedisCache()
    : createInMemoryCache();

// ---------------------------------------------------------------------------
// Cache key builders — centralized to avoid key collisions.
// ---------------------------------------------------------------------------

/** TTL defaults in seconds */
export const CACHE_TTL = {
  /** Household membership check — checked on every request via householdProcedure */
  membership: 300, // 5 min
  /** Dashboard household list */
  myHouseholds: 120, // 2 min
  /** Full household dashboard */
  householdDashboard: 60, // 1 min (changes frequently)
  /** Pet list for a household */
  petList: 300, // 5 min
  /** Gamification stats */
  gamificationStats: 300, // 5 min
  /** Reporting summary */
  reportingSummary: 600, // 10 min (expensive query, data changes less often)
} as const;

export const cacheKey = {
  /** Membership lookup: does userId belong to householdId? */
  membership: (householdId: string, userId: string) =>
    `membership:${householdId}:${userId}`,

  /** User's household summaries list */
  myHouseholds: (userId: string) => `my-households:${userId}`,

  /** Full household dashboard */
  householdDashboard: (householdId: string) => `dashboard:${householdId}`,

  /** Pet list for a household */
  petList: (householdId: string) => `pets:${householdId}`,

  /** Gamification stats for a household */
  gamificationStats: (householdId: string) => `gamification:${householdId}`,

  /** Reporting summary — keyed by household + date range */
  reportingSummary: (householdId: string, from: string, to: string) =>
    `reporting:${householdId}:${from}:${to}`,
} as const;

// ---------------------------------------------------------------------------
// Invalidation helpers — call these from write paths.
// ---------------------------------------------------------------------------

/** Bust all caches that depend on household membership or structure. */
export async function invalidateHousehold(householdId: string): Promise<void> {
  await Promise.all([
    cache.del(cacheKey.householdDashboard(householdId)),
    cache.del(cacheKey.petList(householdId)),
    cache.del(cacheKey.gamificationStats(householdId)),
    cache.delByPrefix(`membership:${householdId}:`),
    cache.delByPrefix(`my-households:`), // user summaries may reference this household
    cache.delByPrefix(`reporting:${householdId}:`),
  ]);
}

/** Bust caches affected by pet changes. */
export async function invalidatePets(householdId: string): Promise<void> {
  await Promise.all([
    cache.del(cacheKey.petList(householdId)),
    cache.del(cacheKey.householdDashboard(householdId)),
    cache.del(cacheKey.gamificationStats(householdId)),
  ]);
}

/** Bust caches affected by activity / feeding / medication completions. */
export async function invalidateActivities(householdId: string): Promise<void> {
  await Promise.all([
    cache.del(cacheKey.householdDashboard(householdId)),
    cache.del(cacheKey.gamificationStats(householdId)),
    cache.delByPrefix(`reporting:${householdId}:`),
  ]);
}

/** Bust caches affected by member changes (join, leave, role change). */
export async function invalidateMembers(householdId: string): Promise<void> {
  await Promise.all([
    cache.del(cacheKey.householdDashboard(householdId)),
    cache.delByPrefix(`membership:${householdId}:`),
    cache.delByPrefix(`my-households:`),
  ]);
}
