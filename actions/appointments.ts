"use server";

import { and, eq, gt, gte, ilike, lt, lte, notInArray, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  appointments,
  barbers,
  clients,
  profiles,
  services,
} from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/lib/db/schema/appointments";
import type { ActionState } from "@/actions/auth";

// ─── Public types ─────────────────────────────────────────────────────────────

export type AppointmentRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string | null;
  barberId: string;
  barberDisplayName: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  clientPreferences: Record<string, string> | null;
  serviceId: string;
  serviceName: string;
  serviceDurationMinutes: number;
  servicePrice: string;
};

export type BarberOption = { id: string; displayName: string };

export type ServiceOption = {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
};

export type ClientSearchResult = {
  id: string;
  name: string;
  phone: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export type AuthContext = {
  userId: string;
  tenantId: string;
  role: "owner" | "barber";
  ownBarberId: string | null;
};

async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
    columns: { tenantId: true, role: true },
  });
  if (!profile?.tenantId) return null;

  const tenantId = profile.tenantId;
  const role = profile.role === "barber" ? "barber" : "owner";

  let ownBarberId: string | null = null;
  if (role === "barber") {
    const [barber] = await db
      .select({ id: barbers.id })
      .from(barbers)
      .where(
        and(eq(barbers.profileId, user.id), eq(barbers.tenantId, tenantId)),
      )
      .limit(1);
    ownBarberId = barber?.id ?? null;
  }

  return { userId: user.id, tenantId, role, ownBarberId };
}

async function fetchRows(
  tenantId: string,
  dateFilter: ReturnType<typeof eq> | ReturnType<typeof and>,
  barberId?: string,
): Promise<AppointmentRow[]> {
  const rows = await db
    .select({
      id: appointments.id,
      date: appointments.date,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      notes: appointments.notes,
      barberId: barbers.id,
      barberDisplayName: barbers.displayName,
      clientId: clients.id,
      clientName: clients.name,
      clientPhone: clients.phone,
      clientEmail: clients.email,
      clientPreferences: clients.preferences,
      serviceId: services.id,
      serviceName: services.name,
      serviceDurationMinutes: services.durationMinutes,
      servicePrice: services.price,
    })
    .from(appointments)
    .innerJoin(barbers, eq(appointments.barberId, barbers.id))
    .innerJoin(clients, eq(appointments.clientId, clients.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        dateFilter,
        ...(barberId ? [eq(appointments.barberId, barberId)] : []),
      ),
    )
    .orderBy(appointments.startTime);

  return rows.map((r) => ({
    ...r,
    servicePrice: String(r.servicePrice),
    clientPreferences: r.clientPreferences as Record<string, string> | null,
  }));
}

// ─── Fetch server actions ─────────────────────────────────────────────────────

export async function getAppointmentsForDay(
  date: string,
  filterBarberId?: string,
  preloadedCtx?: AuthContext,
): Promise<AppointmentRow[]> {
  const ctx = preloadedCtx ?? (await getAuthContext());
  if (!ctx) return [];

  const { tenantId, role, ownBarberId } = ctx;
  const effectiveBarberId =
    role === "barber" ? (ownBarberId ?? undefined) : filterBarberId;

  return fetchRows(tenantId, eq(appointments.date, date), effectiveBarberId);
}

export async function getAppointmentsForWeek(
  weekStart: string,
  weekEnd: string,
  filterBarberId?: string,
): Promise<AppointmentRow[]> {
  const ctx = await getAuthContext();
  if (!ctx) return [];

  const { tenantId, role, ownBarberId } = ctx;
  const effectiveBarberId =
    role === "barber" ? (ownBarberId ?? undefined) : filterBarberId;

  return fetchRows(
    tenantId,
    and(gte(appointments.date, weekStart), lte(appointments.date, weekEnd))!,
    effectiveBarberId,
  );
}

export async function searchClients(
  query: string,
): Promise<ClientSearchResult[]> {
  const ctx = await getAuthContext();
  if (!ctx) return [];

  const { tenantId } = ctx;
  const term = `%${query.trim()}%`;

  const rows = await db
    .select({ id: clients.id, name: clients.name, phone: clients.phone })
    .from(clients)
    .where(
      and(
        eq(clients.tenantId, tenantId),
        or(ilike(clients.name, term), ilike(clients.phone, term)),
      ),
    )
    .limit(10);

  return rows;
}

// ─── Mutation server actions ──────────────────────────────────────────────────

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
): Promise<ActionState> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: { _form: ["No autorizado"] } };

  const { tenantId, role, ownBarberId } = ctx;

  const [appt] = await db
    .select({
      id: appointments.id,
      barberId: appointments.barberId,
      status: appointments.status,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!appt) return { error: { _form: ["Turno no encontrado"] } };

  if (role === "barber" && !ownBarberId) {
    return { error: { _form: ["No autorizado"] } };
  }
  if (role === "barber" && ownBarberId && appt.barberId !== ownBarberId) {
    return { error: { _form: ["No autorizado"] } };
  }

  const allowed: Record<AppointmentStatus, AppointmentStatus[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
    no_show: [],
  };

  if (!allowed[appt.status].includes(status)) {
    return { error: { _form: ["Transición de estado no permitida"] } };
  }

  await db
    .update(appointments)
    .set({ status })
    .where(eq(appointments.id, appointmentId));

  return { success: true };
}

export async function updateAppointmentNotes(
  appointmentId: string,
  notes: string,
): Promise<ActionState> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: { _form: ["No autorizado"] } };

  const { tenantId, role, ownBarberId } = ctx;

  const [appt] = await db
    .select({ id: appointments.id, barberId: appointments.barberId })
    .from(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!appt) return { error: { _form: ["Turno no encontrado"] } };

  if (role === "barber" && !ownBarberId) {
    return { error: { _form: ["No autorizado"] } };
  }
  if (role === "barber" && ownBarberId && appt.barberId !== ownBarberId) {
    return { error: { _form: ["No autorizado"] } };
  }

  await db
    .update(appointments)
    .set({ notes: notes.trim() || null })
    .where(eq(appointments.id, appointmentId));

  return { success: true };
}

export async function rescheduleAppointment(
  appointmentId: string,
): Promise<ActionState> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: { _form: ["No autorizado"] } };

  const { tenantId, role, ownBarberId } = ctx;

  const [appt] = await db
    .select({
      id: appointments.id,
      barberId: appointments.barberId,
      status: appointments.status,
      notes: appointments.notes,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!appt) return { error: { _form: ["Turno no encontrado"] } };

  if (role === "barber" && !ownBarberId) {
    return { error: { _form: ["No autorizado"] } };
  }
  if (role === "barber" && ownBarberId && appt.barberId !== ownBarberId) {
    return { error: { _form: ["No autorizado"] } };
  }

  if (appt.status === "completed" || appt.status === "cancelled" || appt.status === "no_show") {
    return { error: { _form: ["No se puede reprogramar este turno"] } };
  }

  const rescheduleNote = "Reprogramado — cliente debe reservar de nuevo";
  const mergedNotes = appt.notes
    ? `${rescheduleNote}\n\n${appt.notes}`
    : rescheduleNote;

  await db
    .update(appointments)
    .set({
      status: "cancelled",
      notes: mergedNotes,
    })
    .where(eq(appointments.id, appointmentId));

  return { success: true };
}

// ─── Create manual appointment ────────────────────────────────────────────────

const manualAppointmentSchema = z.object({
  clientId: z.string().uuid().optional(),
  clientName: z.string().min(1, "Nombre requerido").max(100),
  clientPhone: z.string().optional(),
  barberId: z.string().uuid("Barbero requerido"),
  serviceId: z.string().uuid("Servicio requerido"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
});

export async function createManualAppointment(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: { _form: ["No autorizado"] } };

  const { tenantId, role, ownBarberId } = ctx;

  const raw = {
    clientId: (formData.get("clientId") as string) || undefined,
    clientName: ((formData.get("clientName") as string) ?? "").trim(),
    clientPhone:
      ((formData.get("clientPhone") as string) ?? "").trim() || undefined,
    barberId: formData.get("barberId") as string,
    serviceId: formData.get("serviceId") as string,
    date: formData.get("date") as string,
    startTime: formData.get("startTime") as string,
  };

  const result = manualAppointmentSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const data = result.data;

  if (role === "barber" && !ownBarberId) {
    return { error: { _form: ["No autorizado"] } };
  }
  if (role === "barber" && ownBarberId && data.barberId !== ownBarberId) {
    return { error: { _form: ["No podés crear turnos para otro barbero"] } };
  }

  if (data.clientId) {
    const [clientCheck] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(eq(clients.id, data.clientId), eq(clients.tenantId, tenantId)),
      )
      .limit(1);
    if (!clientCheck) return { error: { _form: ["Cliente no válido"] } };
  }

  const [barber] = await db
    .select({ id: barbers.id })
    .from(barbers)
    .where(
      and(
        eq(barbers.id, data.barberId),
        eq(barbers.tenantId, tenantId),
        eq(barbers.isActive, true),
      ),
    )
    .limit(1);
  if (!barber) return { error: { _form: ["Barbero no válido"] } };

  const [service] = await db
    .select({ id: services.id, durationMinutes: services.durationMinutes })
    .from(services)
    .where(
      and(
        eq(services.id, data.serviceId),
        eq(services.tenantId, tenantId),
        eq(services.isActive, true),
      ),
    )
    .limit(1);
  if (!service) return { error: { _form: ["Servicio no válido"] } };

  const endTime = minutesToTime(
    timeToMinutes(data.startTime) + service.durationMinutes,
  );

  const [conflict] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.barberId, data.barberId),
        eq(appointments.date, data.date),
        gt(appointments.endTime, data.startTime),
        lt(appointments.startTime, endTime),
        notInArray(appointments.status, ["cancelled", "no_show"]),
      ),
    )
    .limit(1);

  if (conflict) {
    return { error: { _form: ["El horario ya está ocupado. Elegí otro."] } };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    let clientId = data.clientId;

    if (!clientId) {
      if (data.clientPhone) {
        const existing = await tx.query.clients.findFirst({
          where: and(
            eq(clients.tenantId, tenantId),
            eq(clients.phone, data.clientPhone),
          ),
        });
        if (existing) {
          await tx
            .update(clients)
            .set({
              name: data.clientName,
              lastVisitAt: now,
              visitCount: existing.visitCount + 1,
            })
            .where(eq(clients.id, existing.id));
          clientId = existing.id;
        }
      }

      if (!clientId) {
        const [newClient] = await tx
          .insert(clients)
          .values({
            tenantId,
            name: data.clientName,
            phone: data.clientPhone ?? null,
            firstVisitAt: now,
            lastVisitAt: now,
            visitCount: 1,
          })
          .returning({ id: clients.id });
        clientId = newClient.id;
      }
    }

    await tx.insert(appointments).values({
      tenantId,
      clientId: clientId!,
      barberId: data.barberId,
      serviceId: data.serviceId,
      date: data.date,
      startTime: data.startTime,
      endTime,
      status: "pending",
      source: "manual",
    });
  });

  return { success: true };
}
