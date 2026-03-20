"use server";

import { eq, and, notInArray, gt, lt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  tenants,
  barbers,
  services,
  clients,
  appointments,
  blockedSlots,
} from "@/lib/db/schema";
import { bookingSchema } from "@/lib/validations/booking";
import type { ActionState } from "@/actions/auth";

type TimeInterval = { start: string; end: string };
type BarberAvailability = Record<string, TimeInterval[]>;
type OpeningHoursDay = { closed: boolean; open?: string; close?: string };
type OpeningHoursMap = Record<string, OpeningHoursDay>;

const WEEK_DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function generateSlots(start: string, end: string, duration: number): string[] {
  const slots: string[] = [];
  let cur = timeToMinutes(start);
  const endMins = timeToMinutes(end);
  while (cur + duration <= endMins) {
    slots.push(minutesToTime(cur));
    cur += duration;
  }
  return slots;
}

function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return (
    timeToMinutes(aStart) < timeToMinutes(bEnd) &&
    timeToMinutes(aEnd) > timeToMinutes(bStart)
  );
}

export async function lookupClient(
  tenantId: string,
  phone: string,
): Promise<{
  id: string;
  name: string;
  preferences: Record<string, string> | null;
} | null> {
  if (!phone || phone.length < 6) return null;
  const found = await db.query.clients.findFirst({
    where: and(eq(clients.tenantId, tenantId), eq(clients.phone, phone)),
    columns: { id: true, name: true, preferences: true },
  });
  return found ?? null;
}

export async function getAvailableSlots(
  tenantId: string,
  barberId: string | null,
  date: string,
  durationMinutes: number,
): Promise<string[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

  const dateObj = new Date(`${date}T00:00:00`);
  const dayKey = WEEK_DAYS[dateObj.getDay()];

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { openingHours: true },
  });
  if (!tenant) return [];

  const openingHours = tenant.openingHours as OpeningHoursMap | null;
  let baseSlots: string[] = [];

  // For "sin preferencia" (barberId null), resolve to the first active barber
  // so availability and conflict checks always operate on a real barber.
  let effectiveBarberId: string;
  if (barberId) {
    effectiveBarberId = barberId;
  } else {
    const [firstBarber] = await db
      .select({ id: barbers.id })
      .from(barbers)
      .where(and(eq(barbers.tenantId, tenantId), eq(barbers.isActive, true)))
      .limit(1);
    if (!firstBarber) return [];
    effectiveBarberId = firstBarber.id;
  }

  const barber = await db.query.barbers.findFirst({
    where: and(
      eq(barbers.id, effectiveBarberId),
      eq(barbers.tenantId, tenantId),
      eq(barbers.isActive, true),
    ),
    columns: { availability: true },
  });

  const availability = barber?.availability as
    | BarberAvailability
    | null
    | undefined;

  if (availability?.[dayKey]) {
    for (const interval of availability[dayKey]) {
      baseSlots.push(
        ...generateSlots(interval.start, interval.end, durationMinutes),
      );
    }
  } else {
    const day = openingHours?.[dayKey];
    if (day && !day.closed && day.open && day.close) {
      baseSlots = generateSlots(day.open, day.close, durationMinutes);
    }
  }

  if (baseSlots.length === 0) return [];

  // Filter out past times for today (with 30-min buffer)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const cutoffMinutes =
    date === todayStr ? now.getHours() * 60 + now.getMinutes() + 30 : 0;

  const [existingAppts, blocked] = await Promise.all([
    db
      .select({
        startTime: appointments.startTime,
        endTime: appointments.endTime,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          eq(appointments.barberId, effectiveBarberId),
          eq(appointments.date, date),
          notInArray(appointments.status, ["cancelled", "no_show"]),
        ),
      ),
    db
      .select({
        startTime: blockedSlots.startTime,
        endTime: blockedSlots.endTime,
      })
      .from(blockedSlots)
      .where(
        and(
          eq(blockedSlots.tenantId, tenantId),
          eq(blockedSlots.barberId, effectiveBarberId),
          eq(blockedSlots.date, date),
        ),
      ),
  ]);

  return baseSlots.filter((slot) => {
    if (timeToMinutes(slot) <= cutoffMinutes) return false;
    const slotEnd = minutesToTime(timeToMinutes(slot) + durationMinutes);
    for (const appt of existingAppts) {
      if (overlaps(slot, slotEnd, appt.startTime, appt.endTime)) return false;
    }
    for (const block of blocked) {
      if (overlaps(slot, slotEnd, block.startTime, block.endTime)) return false;
    }
    return true;
  });
}

export async function createAppointment(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const rawBarberId = formData.get("barberId") as string;

  const raw = {
    tenantId: formData.get("tenantId") as string,
    serviceId: formData.get("serviceId") as string,
    barberId:
      rawBarberId === "no-preference" ? null : rawBarberId || null,
    date: formData.get("date") as string,
    startTime: formData.get("startTime") as string,
    name: ((formData.get("name") as string) ?? "").trim(),
    phone: ((formData.get("phone") as string) ?? "").trim(),
    drink: (formData.get("drink") as string) || undefined,
    music: (formData.get("music") as string) || undefined,
  };

  const result = bookingSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const {
    tenantId,
    serviceId,
    barberId,
    date,
    startTime,
    name,
    phone,
    drink,
    music,
  } = result.data;

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { id: true, name: true, slug: true, phone: true },
  });
  if (!tenant) return { error: { _form: ["La barbería no existe."] } };

  const service = await db.query.services.findFirst({
    where: and(
      eq(services.id, serviceId),
      eq(services.tenantId, tenantId),
      eq(services.isActive, true),
    ),
    columns: { id: true, name: true, durationMinutes: true },
  });
  if (!service) return { error: { _form: ["El servicio no existe."] } };

  let resolvedBarberId: string;
  let barberName: string;

  if (barberId) {
    const [barber] = await db
      .select({ id: barbers.id, displayName: barbers.displayName })
      .from(barbers)
      .where(
        and(
          eq(barbers.id, barberId),
          eq(barbers.tenantId, tenantId),
          eq(barbers.isActive, true),
        ),
      )
      .limit(1);
    if (!barber) return { error: { _form: ["El barbero no existe."] } };
    resolvedBarberId = barber.id;
    barberName = barber.displayName;
  } else {
    const [firstBarber] = await db
      .select({ id: barbers.id, displayName: barbers.displayName })
      .from(barbers)
      .where(and(eq(barbers.tenantId, tenantId), eq(barbers.isActive, true)))
      .limit(1);
    if (!firstBarber)
      return { error: { _form: ["No hay barberos disponibles."] } };
    resolvedBarberId = firstBarber.id;
    barberName = firstBarber.displayName;
  }

  const endTime = minutesToTime(
    timeToMinutes(startTime) + service.durationMinutes,
  );

  const [conflict] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.barberId, resolvedBarberId),
        eq(appointments.date, date),
        gt(appointments.endTime, startTime),
        lt(appointments.startTime, endTime),
        notInArray(appointments.status, ["cancelled", "no_show"]),
      ),
    )
    .limit(1);

  if (conflict) {
    return {
      error: { _form: ["El horario ya no está disponible. Elegí otro."] },
    };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    const existingClient = await tx.query.clients.findFirst({
      where: and(eq(clients.tenantId, tenantId), eq(clients.phone, phone)),
    });

    let clientId: string;

    if (existingClient) {
      const updatedPreferences: Record<string, string> = {
        ...existingClient.preferences,
        ...(drink ? { drink } : {}),
        ...(music ? { music } : {}),
      };
      await tx
        .update(clients)
        .set({
          name,
          preferences: updatedPreferences,
          lastVisitAt: now,
          visitCount: existingClient.visitCount + 1,
        })
        .where(eq(clients.id, existingClient.id));
      clientId = existingClient.id;
    } else {
      const preferences: Record<string, string> = {};
      if (drink) preferences.drink = drink;
      if (music) preferences.music = music;

      const [newClient] = await tx
        .insert(clients)
        .values({
          tenantId,
          name,
          phone,
          preferences:
            Object.keys(preferences).length > 0 ? preferences : null,
          firstVisitAt: now,
          lastVisitAt: now,
          visitCount: 1,
        })
        .returning({ id: clients.id });
      clientId = newClient.id;
    }

    await tx.insert(appointments).values({
      tenantId,
      clientId,
      barberId: resolvedBarberId,
      serviceId,
      date,
      startTime,
      endTime,
      status: "pending",
      source: "landing",
    });
  });

  const params = new URLSearchParams({
    shop: tenant.name,
    shopPhone: tenant.phone ?? "",
    service: service.name,
    barber: barberName,
    date,
    time: startTime,
    duration: String(service.durationMinutes),
    client: name,
  });

  redirect(`/${tenant.slug}/reservar/confirmacion?${params.toString()}`);
}
