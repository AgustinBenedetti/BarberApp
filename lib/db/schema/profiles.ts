import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const roleEnum = pgEnum("role", ["owner", "barber", "client"]);

export const profiles = pgTable("profiles", {
  // Mismo UUID que auth.users de Supabase — se mantiene en sync via trigger
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  phone: text("phone"),
  fullName: text("full_name").notNull(),
  role: roleEnum("role").notNull().default("client"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Role = (typeof roleEnum.enumValues)[number];
