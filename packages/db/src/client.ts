import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { dbEnvSchema, validateEnv } from "@petforce/core";
import * as schema from "./schema.js";

const dbEnv = validateEnv(dbEnvSchema);

const isProduction = process.env.NODE_ENV === "production";

const client = postgres(dbEnv.DATABASE_URL, {
  max: dbEnv.DATABASE_POOL_SIZE ?? (isProduction ? 20 : 5),
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
  ssl: isProduction ? "require" : undefined,
  connection: {
    application_name: "petforce-api",
    statement_timeout: dbEnv.DB_STATEMENT_TIMEOUT ?? 30000,
  },
  onnotice: () => {},
});

export const db = drizzle(client, { schema });

export type Database = typeof db;

/** The raw postgres client — exposed so consumers can attach a custom Drizzle
 *  logger (e.g. for OTel tracing) without duplicating the connection pool. */
export { client as pgClient };

/** Close the database connection pool. Call during graceful shutdown. */
export async function closeConnection() {
  await client.end({ timeout: 5 });
}
