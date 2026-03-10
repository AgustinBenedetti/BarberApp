import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  address: text("address"),
  phone: text("phone"),
  logoUrl: text("logo_url"),
  coverImageUrl: text("cover_image_url"),
  // Ejemplo: { monday: { open: "09:00", close: "19:00" }, ... }
  openingHours: jsonb("opening_hours"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
