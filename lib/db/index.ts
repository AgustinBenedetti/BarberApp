import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

// En producción (Vercel/Supabase) usamos connection pooling via Supavisor
// DATABASE_URL debe incluir ?pgbouncer=true para transacciones
const client = postgres(env.DATABASE_URL, {
  // En producción con pgbouncer: prepare: false
  prepare: env.NODE_ENV !== "production",
  max: env.NODE_ENV === "production" ? 1 : 10,
});

export const db = drizzle(client, { schema });

export type DB = typeof db;
