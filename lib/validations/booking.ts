import { z } from "zod";

export const bookingSchema = z.object({
  tenantId: z.string().uuid(),
  serviceId: z.string().uuid(),
  barberId: z.string().uuid().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  name: z.string().min(1, "El nombre es requerido"),
  phone: z.string().min(6, "El teléfono es requerido"),
  drink: z.string().optional(),
  music: z.string().optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;
