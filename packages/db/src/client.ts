import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  max: parseInt(process.env.DATABASE_POOL_SIZE || "25"),
});

export const db = drizzle(client, { schema });

export type Database = typeof db;

/** Close the database connection pool. Call during graceful shutdown. */
export async function closeConnection() {
  await client.end();
}
