import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" }); // 👈

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL no está definida. Crea un archivo .env.local con la cadena de conexión de Supabase.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema/index.ts",
  out: "./lib/db/migrations",
  dbCredentials: {
    url: databaseUrl,
  },
  // Prefijo de tabla para evitar conflictos (opcional)
  tablesFilter: ["!supabase_*"],
  verbose: true,
  strict: true,
});
