import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles";
import { tenants } from "./tenants";

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  // null si el cliente no tiene cuenta (creado manualmente o via WhatsApp)
  profileId: uuid("profile_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  // Ejemplo: { music: "rock", drink: "café", allergies: "ninguna" }
  preferences: jsonb("preferences").$type<Record<string, string>>(),
  firstVisitAt: timestamp("first_visit_at", { withTimezone: true }),
  lastVisitAt: timestamp("last_visit_at", { withTimezone: true }),
  visitCount: integer("visit_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type ClientPreferences = Record<string, string>;
