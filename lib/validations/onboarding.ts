import { z } from "zod";

const RESERVED_SLUGS = [
  "api",
  "login",
  "register",
  "dashboard",
  "onboarding",
  "reservar",
  "not-found",
  "404",
  "admin",
  "static",
  "_next",
];

const daySchedule = z
  .object({
    closed: z.boolean(),
    open: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    close: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
  })
  .refine(
    (day) => {
      if (day.closed || !day.open || !day.close) return true;
      return day.open < day.close;
    },
    { message: "El horario de apertura debe ser anterior al de cierre" }
  );

export const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Day = (typeof DAYS)[number];

export const DAY_LABELS: Record<Day, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

export const step1Schema = z.object({
  name: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres"),
  slug: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(50, "Máximo 50 caracteres")
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones")
    .refine((val) => !RESERVED_SLUGS.includes(val), "Este nombre no está disponible"),
  address: z.string().max(200).optional(),
  openingHours: z.object({
    monday: daySchedule,
    tuesday: daySchedule,
    wednesday: daySchedule,
    thursday: daySchedule,
    friday: daySchedule,
    saturday: daySchedule,
    sunday: daySchedule,
  }),
});

export const serviceSchema = z.object({
  name: z.string().min(1, "Requerido"),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(5, "Mínimo 5 minutos")
    .max(480, "Máximo 8 horas"),
  price: z.coerce.number().min(0, "No puede ser negativo"),
});

export const step2Schema = z.object({
  services: z.array(serviceSchema),
});

export const barberSchema = z.object({
  displayName: z.string().min(1, "Requerido"),
});

export const step3Schema = z.object({
  barbers: z.array(barberSchema),
  ownerIsBarber: z.boolean(),
});

export type Step1Input = z.infer<typeof step1Schema>;
export type Step2Input = z.infer<typeof step2Schema>;
export type Step3Input = z.infer<typeof step3Schema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type BarberInput = z.infer<typeof barberSchema>;
