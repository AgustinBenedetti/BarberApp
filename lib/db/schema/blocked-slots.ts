import { date, pgTable, text, time, timestamp, uuid } from "drizzle-orm/pg-core";
import { barbers } from "./barbers";
import { tenants } from "./tenants";

export const blockedSlots = pgTable("blocked_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  barberId: uuid("barber_id")
    .notNull()
    .references(() => barbers.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BlockedSlot = typeof blockedSlots.$inferSelect;
export type NewBlockedSlot = typeof blockedSlots.$inferInsert;
