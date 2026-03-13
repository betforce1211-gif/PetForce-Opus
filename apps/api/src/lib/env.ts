import { apiEnvSchema, validateEnv } from "@petforce/core";

/**
 * Validated environment variables for the API server.
 *
 * This runs at import time — if any required vars are missing or invalid the
 * process will exit immediately with a clear listing of every problem.
 */
export const env = validateEnv(apiEnvSchema);
