import dotenv from "dotenv";
dotenv.config();

import { drizzle } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import Database from "better-sqlite3";
import postgres from "postgres";
import * as schema from "@shared/schema";

const isProduction = process.env.NODE_ENV === "production";
const databaseUrl = process.env.DATABASE_URL || "./app.db";

let db: any;

if (isProduction || databaseUrl.startsWith("postgres")) {
  // Use PostgreSQL in production
  const client = postgres(databaseUrl);
  db = drizzlePostgres(client, { schema });
  console.log("[DB] Connected to PostgreSQL");
} else {
  // Use SQLite locally
  const sqlite = new Database(databaseUrl);
  db = drizzle(sqlite, { schema });
  console.log("[DB] Connected to SQLite at", databaseUrl);
}

export { db };

