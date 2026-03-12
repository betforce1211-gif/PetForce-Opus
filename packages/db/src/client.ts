import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const isProduction = process.env.NODE_ENV === "production";

const client = postgres(connectionString, {
  max: parseInt(process.env.DATABASE_POOL_SIZE || (isProduction ? "20" : "5")),
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
  connection: {
    application_name: "petforce-api",
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || "30000"),
  },
  onnotice: () => {},
});

export const db = drizzle(client, { schema });

export type Database = typeof db;

/** Close the database connection pool. Call during graceful shutdown. */
export async function closeConnection() {
  await client.end({ timeout: 5 });
}
