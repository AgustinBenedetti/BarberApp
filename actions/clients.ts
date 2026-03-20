"use server";

import {
  and,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  appointments,
  barbers,
  clients,
  profiles,
  services,
  tenants,
} from "@/lib/db/schema";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ActionState } from "@/actions/auth";

// ─── Public types ─────────────────────────────────────────────────────────────

export type ClientFilter = "all" | "new" | "vip" | "dormant" | "upcoming";

export type ClientRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  visitCount: number;
  lastVisitAt: string | null;
  preferences: Record<string, string> | null;
  nextAppointment: { date: string; startTime: string; serviceName: string } | null;
};

export type ClientDetail = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  visitCount: number;
  firstVisitAt: string | null;
  lastVisitAt: string | null;
  preferences: Record<string, string> | null;
  history: VisitHistoryItem[];
};

export type VisitHistoryItem = {
  id: string;
  date: string;
  startTime: string;
  serviceName: string;
  barberName: string;
  durationMinutes: number;
};

// ─── Auth helper ──────────────────────────────────────────────────────────────

type AuthCtx = { userId: string; tenantId: string; slug: string };

async function getAuth(): Promise<AuthCtx | null> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
    columns: { tenantId: true, role: true },
  });
  if (!profile?.tenantId) return null;

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, profile.tenantId),
    columns: { slug: true },
  });
  if (!tenant) return null;

  return { userId: user.id, tenantId: profile.tenantId, slug: tenant.slug };
}

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function thirtyDaysAgoISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
}

// ─── List clients ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export async function getClients(
  query: string = "",
  filter: ClientFilter = "all",
  page: number = 1,
): Promise<{ clients: ClientRow[]; total: number; tenantSlug: string }> {
  const ctx = await getAuth();
  if (!ctx) return { clients: [], total: 0, tenantSlug: "" };

  const { tenantId, slug } = ctx;
  const safePage = Math.max(1, Math.floor(page));
  const offset = (safePage - 1) * PAGE_SIZE;
  const today = todayISO();
  const thirtyDaysAgo = thirtyDaysAgoISO();

  // Build base WHERE conditions
  const baseConditions = [eq(clients.tenantId, tenantId)];

  if (query.trim()) {
    const term = `%${query.trim()}%`;
    baseConditions.push(
      or(ilike(clients.name, term), ilike(clients.phone, term))!,
    );
  }

  // Filter-specific conditions
  if (filter === "new") {
    baseConditions.push(eq(clients.visitCount, 1));
  } else if (filter === "vip") {
    baseConditions.push(gte(clients.visitCount, 6));
  } else if (filter === "dormant") {
    baseConditions.push(lt(clients.lastVisitAt, new Date(thirtyDaysAgo)));
  } else if (filter === "upcoming") {
    // Clients who have an upcoming appointment
    const upcomingSubquery = db
      .select({ one: sql<number>`1` })
      .from(appointments)
      .where(
        and(
          eq(appointments.clientId, clients.id),
          eq(appointments.tenantId, tenantId),
          gte(appointments.date, today),
          inArray(appointments.status, ["pending", "confirmed"]),
        ),
      );
    baseConditions.push(exists(upcomingSubquery));
  }

  const whereClause = and(...baseConditions)!;

  // Count + rows in parallel
  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(clients)
      .where(whereClause),
    db
      .select({
        id: clients.id,
        name: clients.name,
        phone: clients.phone,
        email: clients.email,
        visitCount: clients.visitCount,
        lastVisitAt: clients.lastVisitAt,
        preferences: clients.preferences,
      })
      .from(clients)
      .where(whereClause)
      .orderBy(desc(clients.lastVisitAt))
      .limit(PAGE_SIZE)
      .offset(offset),
  ]);

  const count = countResult[0].count;

  if (rows.length === 0) {
    return { clients: [], total: count, tenantSlug: slug };
  }

  // Fetch next upcoming appointment for each client in this page
  const clientIds = rows.map((r) => r.id);
  const upcomingAppts = await db
    .select({
      clientId: appointments.clientId,
      date: appointments.date,
      startTime: appointments.startTime,
      serviceName: services.name,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .where(
      and(
        inArray(appointments.clientId, clientIds),
        eq(appointments.tenantId, tenantId),
        gte(appointments.date, today),
        inArray(appointments.status, ["pending", "confirmed"]),
      ),
    )
    .orderBy(appointments.date, appointments.startTime);

  // Map: first upcoming per client
  const nextApptMap = new Map<string, { date: string; startTime: string; serviceName: string }>();
  for (const appt of upcomingAppts) {
    if (!nextApptMap.has(appt.clientId)) {
      nextApptMap.set(appt.clientId, {
        date: appt.date,
        startTime: appt.startTime,
        serviceName: appt.serviceName,
      });
    }
  }

  const result: ClientRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    visitCount: r.visitCount,
    lastVisitAt: r.lastVisitAt ? r.lastVisitAt.toISOString() : null,
    preferences: r.preferences as Record<string, string> | null,
    nextAppointment: nextApptMap.get(r.id) ?? null,
  }));

  return { clients: result, total: count, tenantSlug: slug };
}

// ─── Client detail ────────────────────────────────────────────────────────────

export async function getClientDetail(
  clientId: string,
): Promise<ClientDetail | null> {
  const ctx = await getAuth();
  if (!ctx) return null;

  const { tenantId } = ctx;

  const [client] = await db
    .select({
      id: clients.id,
      name: clients.name,
      phone: clients.phone,
      email: clients.email,
      notes: clients.notes,
      visitCount: clients.visitCount,
      firstVisitAt: clients.firstVisitAt,
      lastVisitAt: clients.lastVisitAt,
      preferences: clients.preferences,
    })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId)))
    .limit(1);

  if (!client) return null;

  // Fetch completed appointment history
  const history = await db
    .select({
      id: appointments.id,
      date: appointments.date,
      startTime: appointments.startTime,
      serviceName: services.name,
      barberName: barbers.displayName,
      durationMinutes: services.durationMinutes,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(barbers, eq(appointments.barberId, barbers.id))
    .where(
      and(
        eq(appointments.clientId, clientId),
        eq(appointments.tenantId, tenantId),
        eq(appointments.status, "completed"),
      ),
    )
    .orderBy(desc(appointments.date), desc(appointments.startTime));

  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    email: client.email,
    notes: client.notes,
    visitCount: client.visitCount,
    firstVisitAt: client.firstVisitAt ? client.firstVisitAt.toISOString() : null,
    lastVisitAt: client.lastVisitAt ? client.lastVisitAt.toISOString() : null,
    preferences: client.preferences as Record<string, string> | null,
    history,
  };
}

// ─── Update client preferences ────────────────────────────────────────────────

const preferencesSchema = z.object({
  music: z.string().max(100).optional(),
  drink: z.string().max(100).optional(),
});

export async function updateClientPreferences(
  clientId: string,
  preferences: Record<string, string>,
): Promise<ActionState> {
  const ctx = await getAuth();
  if (!ctx) return { error: { _form: ["No autorizado"] } };

  const { tenantId } = ctx;

  const result = preferencesSchema.safeParse(preferences);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  // Single query: verify ownership + read existing preferences
  const [existing] = await db
    .select({ id: clients.id, preferences: clients.preferences })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId)))
    .limit(1);

  if (!existing) return { error: { _form: ["Cliente no encontrado"] } };

  const merged = { ...(existing.preferences ?? {}), ...preferences };

  await db
    .update(clients)
    .set({ preferences: merged })
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId)));

  return { success: true };
}

// ─── Update client notes ──────────────────────────────────────────────────────

const notesSchema = z.object({
  notes: z.string().max(2000),
});

export async function updateClientNotes(
  clientId: string,
  notes: string,
): Promise<ActionState> {
  const ctx = await getAuth();
  if (!ctx) return { error: { _form: ["No autorizado"] } };

  const { tenantId } = ctx;

  const result = notesSchema.safeParse({ notes });
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId)))
    .limit(1);

  if (!client) return { error: { _form: ["Cliente no encontrado"] } };

  await db
    .update(clients)
    .set({ notes: notes.trim() || null })
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId)));

  return { success: true };
}
