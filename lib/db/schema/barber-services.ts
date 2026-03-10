import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { barbers } from "./barbers";
import { services } from "./services";

export const barberServices = pgTable(
  "barber_services",
  {
    barberId: uuid("barber_id")
      .notNull()
      .references(() => barbers.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.barberId, table.serviceId] })],
);

export type BarberService = typeof barberServices.$inferSelect;
