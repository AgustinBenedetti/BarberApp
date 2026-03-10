import {
  date,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { barbers } from "./barbers";
import { clients } from "./clients";
import { services } from "./services";
import { tenants } from "./tenants";

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

export const appointmentSourceEnum = pgEnum("appointment_source", [
  "landing",
  "manual",
  "whatsapp",
]);

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  barberId: uuid("barber_id")
    .notNull()
    .references(() => barbers.id, { onDelete: "restrict" }),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "restrict" }),
  date: date("date", { mode: "string" }).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: appointmentStatusEnum("status").notNull().default("pending"),
  source: appointmentSourceEnum("source").notNull().default("manual"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type AppointmentStatus =
  (typeof appointmentStatusEnum.enumValues)[number];
export type AppointmentSource =
  (typeof appointmentSourceEnum.enumValues)[number];
