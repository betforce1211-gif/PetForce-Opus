import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared environment variable schemas
//
// These Zod schemas define the environment variables used across the monorepo.
// Each app/package picks the subset it needs. The API server validates ALL
// required vars on startup and fails fast with a comprehensive error listing.
// ---------------------------------------------------------------------------

/** Database-related env vars (used by @petforce/db and @petforce/api). */
export const dbEnvSchema = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required" })
    .min(1, "DATABASE_URL must not be empty")
    .startsWith("postgres", "DATABASE_URL must be a PostgreSQL connection string"),

  /** Optional — defaults to 20 in production, 5 in development. */
  DATABASE_POOL_SIZE: z.coerce.number().int().positive().optional(),

  /** Optional — defaults to 30 000 ms. */
  DB_STATEMENT_TIMEOUT: z.coerce.number().int().positive().optional(),
});

/** Clerk authentication env vars. */
export const clerkEnvSchema = z
  .object({
    CLERK_SECRET_KEY: z.string().min(1).optional(),
    CLERK_JWT_KEY: z.string().min(1).optional(),
  })
  .refine((data) => data.CLERK_SECRET_KEY || data.CLERK_JWT_KEY, {
    message:
      "At least one of CLERK_SECRET_KEY or CLERK_JWT_KEY must be set for authentication",
  });

/** Supabase storage env vars (optional — storage features degrade gracefully without them). */
export const supabaseEnvSchema = z.object({
  SUPABASE_URL: z.url({ error: "SUPABASE_URL must be a valid URL" }).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY must not be empty")
    .optional(),
});

/** Server / networking env vars. */
export const serverEnvSchema = z.object({
  /** Optional — defaults to API_PORT or 3001. */
  PORT: z.coerce.number().int().positive().optional(),
  /** Optional — defaults to 3001. */
  API_PORT: z.coerce.number().int().positive().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
});

/** CORS / frontend URL env vars. */
export const corsEnvSchema = z.object({
  /**
   * Required in production to prevent the CORS origin from silently falling
   * back to localhost. Optional in development (defaults to http://localhost:3000).
   */
  NEXT_PUBLIC_WEB_URL: z.url({ error: "NEXT_PUBLIC_WEB_URL must be a valid URL" }).optional(),
});

/** Rate-limiting env vars (optional — falls back to in-memory limiter). */
export const rateLimitEnvSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

/** Background job queue env vars (optional — BullMQ requires a standard Redis connection). */
export const queueEnvSchema = z.object({
  /** Standard Redis URL for BullMQ (e.g. redis://localhost:6379 or Upstash Redis endpoint). */
  REDIS_URL: z.string().min(1).optional(),
});

// ---------------------------------------------------------------------------
// Composite schema for the API server (validates everything at once)
// ---------------------------------------------------------------------------

export const apiEnvSchema = dbEnvSchema
  .extend({
    ...supabaseEnvSchema.shape,
    ...serverEnvSchema.shape,
    ...corsEnvSchema.shape,
    ...rateLimitEnvSchema.shape,
    ...queueEnvSchema.shape,
    // Clerk fields need special handling because of the refine()
    CLERK_SECRET_KEY: z.string().min(1).optional(),
    CLERK_JWT_KEY: z.string().min(1).optional(),
  })
  .refine((data) => data.CLERK_SECRET_KEY || data.CLERK_JWT_KEY, {
    message:
      "At least one of CLERK_SECRET_KEY or CLERK_JWT_KEY must be set for authentication",
  })
  .refine(
    (data) => {
      // In production, NEXT_PUBLIC_WEB_URL must be explicitly set
      if (data.NODE_ENV === "production" && !data.NEXT_PUBLIC_WEB_URL) {
        return false;
      }
      return true;
    },
    {
      message:
        "NEXT_PUBLIC_WEB_URL is required in production to configure CORS (do not rely on the localhost fallback)",
    }
  );

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type DbEnv = z.infer<typeof dbEnvSchema>;

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

/**
 * Parse and validate env vars against a Zod schema. On failure, prints every
 * validation error (not just the first) and terminates the process.
 */
export function validateEnv<T>(
  schema: z.ZodType<T>,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): T {
  const result = schema.safeParse(env);
  if (!result.success) {
    const header = "Environment variable validation failed:";
    const details = result.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
        return `  - ${path}: ${issue.message}`;
      })
      .join("\n");
    const message = `\n${header}\n${details}\n`;

    // Use stderr so it shows up even if stdout is piped
    console.error(message);
    process.exit(1);
  }
  return result.data as T;
}
