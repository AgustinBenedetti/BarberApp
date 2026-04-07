"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { appointments, barbers, profiles, services, tenants } from "@/lib/db/schema";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { ActionState } from "@/actions/auth";
import { DAYS, type Day } from "@/lib/validations/onboarding";

// ─── Public types ──────────────────────────────────────────────────────────────

export type DaySchedule = { closed: boolean; open: string; close: string };
export type BarberAvailability = Record<Day, DaySchedule>;

export type BarberRow = {
  id: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  profileId: string | null;
  availability: BarberAvailability | null;
};

export type ServiceRow = {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
  isActive: boolean;
};

export type ServiceActionState = ActionState & { service?: ServiceRow };

// ─── Auth helper (owner-only) ──────────────────────────────────────────────────

type OwnerCtx = { userId: string; tenantId: string; tenantSlug: string };

async function getOwnerAuth(): Promise<OwnerCtx | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
    columns: { tenantId: true, role: true },
  });

  if (!profile?.tenantId || profile.role !== "owner") return null;

  const [tenant] = await db
    .select({ slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.id, profile.tenantId))
    .limit(1);

  if (!tenant) return null;

  return { userId: user.id, tenantId: profile.tenantId, tenantSlug: tenant.slug };
}

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// ─── Avatar upload ─────────────────────────────────────────────────────────────

async function uploadAvatar(
  tenantId: string,
  barberId: string,
  file: File,
): Promise<string | null> {
  try {
    const adminClient = await createAdminClient();
    const filePath = `${tenantId}/${barberId}`;
    const buffer = await file.arrayBuffer();

    const { error } = await adminClient.storage
      .from("avatars")
      .upload(filePath, buffer, { contentType: file.type, upsert: true });

    if (error) return null;

    const { data } = adminClient.storage.from("avatars").getPublicUrl(filePath);
    return data.publicUrl;
  } catch {
    return null;
  }
}

// ─── Availability parsing ──────────────────────────────────────────────────────

const dayScheduleSchema = z.object({
  closed: z.boolean(),
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
});

const availabilitySchema = z.object({
  monday: dayScheduleSchema,
  tuesday: dayScheduleSchema,
  wednesday: dayScheduleSchema,
  thursday: dayScheduleSchema,
  friday: dayScheduleSchema,
  saturday: dayScheduleSchema,
  sunday: dayScheduleSchema,
});

function parseAvailability(formData: FormData): BarberAvailability {
  const obj: Record<string, DaySchedule> = {};
  for (const day of DAYS) {
    obj[day] = {
      closed: formData.get(`availability.${day}.closed`) === "true",
      open: (formData.get(`availability.${day}.open`) as string) ?? "09:00",
      close: (formData.get(`availability.${day}.close`) as string) ?? "19:00",
    };
  }
  return obj as BarberAvailability;
}

// ─── Fetch barbers ─────────────────────────────────────────────────────────────

export async function getBarbers(): Promise<BarberRow[]> {
  const ctx = await getOwnerAuth();
  if (!ctx) return [];

  const rows = await db
    .select({
      id: barbers.id,
      displayName: barbers.displayName,
      bio: barbers.bio,
      avatarUrl: barbers.avatarUrl,
      isActive: barbers.isActive,
      profileId: barbers.profileId,
      availability: barbers.availability,
    })
    .from(barbers)
    .where(eq(barbers.tenantId, ctx.tenantId))
    .orderBy(barbers.createdAt);

  return rows.map((r) => ({
    ...r,
    availability: r.availability as BarberAvailability | null,
  }));
}

export async function getBarberById(
  barberId: string,
): Promise<BarberRow | null> {
  const ctx = await getOwnerAuth();
  if (!ctx) return null;

  const [row] = await db
    .select({
      id: barbers.id,
      displayName: barbers.displayName,
      bio: barbers.bio,
      avatarUrl: barbers.avatarUrl,
      isActive: barbers.isActive,
      profileId: barbers.profileId,
      availability: barbers.availability,
    })
    .from(barbers)
    .where(and(eq(barbers.id, barberId), eq(barbers.tenantId, ctx.tenantId)))
    .limit(1);

  if (!row) return null;

  return { ...row, availability: row.availability as BarberAvailability | null };
}

// ─── Create barber ─────────────────────────────────────────────────────────────

const createBarberSchema = z.object({
  displayName: z.string().min(1, "Nombre requerido").max(100),
  bio: z.string().max(500).optional(),
  mode: z.enum(["no_account", "invite"]),
  email: z.string().email("Email inválido").optional(),
});

export async function createBarber(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getOwnerAuth();
  if (!ctx) return { error: { _form: ["No autorizado"] } };

  const raw = {
    displayName: ((formData.get("displayName") as string) ?? "").trim(),
    bio: ((formData.get("bio") as string) ?? "").trim() || undefined,
    mode: formData.get("mode") as string,
    email: ((formData.get("email") as string) ?? "").trim() || undefined,
  };

  const result = createBarberSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { displayName, bio, mode, email } = result.data;

  if (mode === "invite" && !email) {
    return { error: { email: ["Email requerido para invitar"] } };
  }

  const availability = parseAvailability(formData);
  const availResult = availabilitySchema.safeParse(availability);
  if (!availResult.success) {
    return { error: { _form: ["Horario inválido"] } };
  }

  const barberId = crypto.randomUUID();

  let avatarUrl: string | null = null;
  const photoFile = formData.get("photo") as File | null;
  if (photoFile && photoFile.size > 0) {
    if (photoFile.size > 5 * 1024 * 1024) {
      return { error: { _form: ["El avatar no puede superar los 5MB"] } };
    }
    if (!photoFile.type.startsWith("image/")) {
      return { error: { _form: ["El archivo debe ser una imagen"] } };
    }
    avatarUrl = await uploadAvatar(ctx.tenantId, barberId, photoFile);
  }

  if (mode === "no_account") {
    await db.insert(barbers).values({
      id: barberId,
      tenantId: ctx.tenantId,
      profileId: null,
      displayName,
      bio: bio ?? null,
      avatarUrl,
      availability,
      isActive: true,
    });
    revalidatePath(`/${ctx.tenantSlug}`);
    revalidatePath(`/${ctx.tenantSlug}/reservar`);
    return { success: true };
  }

  // mode === "invite"
  const adminClient = await createAdminClient();
  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(email!, {
      data: { role: "barber", tenant_id: ctx.tenantId },
    });

  if (inviteError || !inviteData.user) {
    const msg =
      inviteError?.message?.toLowerCase().includes("already")
        ? "Este email ya fue invitado o está registrado"
        : "Error al enviar la invitación. Intentá de nuevo.";
    return { error: { _form: [msg] } };
  }

  const invitedUserId = inviteData.user.id;

  await db
    .insert(profiles)
    .values({
      id: invitedUserId,
      email: email!,
      fullName: displayName,
      tenantId: ctx.tenantId,
      role: "barber",
      avatarUrl,
    })
    .onConflictDoNothing();

  await db.insert(barbers).values({
    id: barberId,
    tenantId: ctx.tenantId,
    profileId: invitedUserId,
    displayName,
    bio: bio ?? null,
    avatarUrl,
    availability,
    isActive: true,
  });

  revalidatePath(`/${ctx.tenantSlug}`);
  revalidatePath(`/${ctx.tenantSlug}/reservar`);
  return { success: true };
}

// ─── Update barber ─────────────────────────────────────────────────────────────

const updateBarberSchema = z.object({
  id: z.string().uuid("ID inválido"),
  displayName: z.string().min(1, "Nombre requerido").max(100),
  bio: z.string().max(500).optional(),
});

export async function updateBarber(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getOwnerAuth();
  if (!ctx) return { error: { _form: ["No autorizado"] } };

  const raw = {
    id: formData.get("id") as string,
    displayName: ((formData.get("displayName") as string) ?? "").trim(),
    bio: ((formData.get("bio") as string) ?? "").trim() || undefined,
  };

  const result = updateBarberSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { id, displayName, bio } = result.data;

  const [existing] = await db
    .select({ id: barbers.id, avatarUrl: barbers.avatarUrl })
    .from(barbers)
    .where(and(eq(barbers.id, id), eq(barbers.tenantId, ctx.tenantId)))
    .limit(1);

  if (!existing) return { error: { _form: ["Barbero no encontrado"] } };

  const availability = parseAvailability(formData);
  const availResult = availabilitySchema.safeParse(availability);
  if (!availResult.success) {
    return { error: { _form: ["Horario inválido"] } };
  }

  let avatarUrl = existing.avatarUrl;
  const photoFile = formData.get("photo") as File | null;
  if (photoFile && photoFile.size > 0) {
    if (photoFile.size > 5 * 1024 * 1024) {
      return { error: { _form: ["El avatar no puede superar los 5MB"] } };
    }
    if (!photoFile.type.startsWith("image/")) {
      return { error: { _form: ["El archivo debe ser una imagen"] } };
    }
    const uploaded = await uploadAvatar(ctx.tenantId, id, photoFile);
    if (uploaded) avatarUrl = uploaded;
  }

  await db
    .update(barbers)
    .set({ displayName, bio: bio ?? null, avatarUrl, availability })
    .where(and(eq(barbers.id, id), eq(barbers.tenantId, ctx.tenantId)));

  revalidatePath(`/${ctx.tenantSlug}`);
  revalidatePath(`/${ctx.tenantSlug}/reservar`);
  return { success: true };
}

// ─── Delete barber ─────────────────────────────────────────────────────────────

export async function deleteBarber(barberId: string): Promise<ActionState> {
  const ctx = await getOwnerAuth();
  if (!ctx) return { error: { _form: ["No autorizado"] } };

  const [barber] = await db
    .select({ id: barbers.id })
    .from(barbers)
    .where(and(eq(barbers.id, barberId), eq(barbers.tenantId, ctx.tenantId)))
    .limit(1);

  if (!barber) return { error: { _form: ["Barbero no encontrado"] } };

  const today = todayISO();
  const [futureAppt] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.barberId, barberId),
        eq(appointments.tenantId, ctx.tenantId),
        gte(appointments.date, today),
        inArray(appointments.status, ["pending", "confirmed"]),
      ),
    )
    .limit(1);

  if (futureAppt) {
    return {
      error: {
        _form: [
          "Este barbero tiene turnos activos. Cancelalos antes de eliminarlo.",
        ],
      },
    };
  }

  // Check for historical appointments (FK restrict)
  const [anyAppt] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.barberId, barberId),
        eq(appointments.tenantId, ctx.tenantId),
      ),
    )
    .limit(1);

  if (anyAppt) {
    return {
      error: {
        _form: [
          "Este barbero tiene historial de turnos y no puede eliminarse. Podés desactivarlo en su lugar.",
        ],
      },
    };
  }

  await db
    .delete(barbers)
    .where(and(eq(barbers.id, barberId), eq(barbers.tenantId, ctx.tenantId)));

  revalidatePath(`/${ctx.tenantSlug}`);
  revalidatePath(`/${ctx.tenantSlug}/reservar`);
  return { success: true };
}

// ─── Toggle barber active ──────────────────────────────────────────────────────

export async function toggleBarberActive(
  barberId: string,
  isActive: boolean,
): Promise<ActionState> {
  const ctx = await getOwnerAuth();
  if (!ctx) return { error: { _form: ["No autorizado"] } };

  const [barber] = await db
    .select({ id: barbers.id })
    .from(barbers)
    .where(and(eq(barbers.id, barberId), eq(barbers.tenantId, ctx.tenantId)))
    .limit(1);

  if (!barber) return { error: { _form: ["Barbero no encontrado"] } };

  await db
    .update(barbers)
    .set({ isActive })
    .where(and(eq(barbers.id, barberId), eq(barbers.tenantId, ctx.tenantId)));

  revalidatePath(`/${ctx.tenantSlug}`);
  revalidatePath(`/${ctx.tenantSlug}/reservar`);
  return { success: true };
}

// ─── Fetch services ────────────────────────────────────────────────────────────

export async function getServices(): Promise<ServiceRow[]> {
  const ctx = await getOwnerAuth();
  if (!ctx) return [];

  const rows = await db
    .select({
      id: services.id,
      name: services.name,
      durationMinutes: services.durationMinutes,
      price: services.price,
      isActive: services.isActive,
    })
    .from(services)
    .where(eq(services.tenantId, ctx.tenantId))
    .orderBy(services.createdAt);

  return rows.map((r) => ({ ...r, price: String(r.price) }));
}

// ─── Create service ────────────────────────────────────────────────────────────

const serviceFormSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(5, "Mínimo 5 minutos")
    .max(480, "Máximo 8 horas"),
  price: z.coerce.number().min(0, "No puede ser negativo"),
  isActive: z.boolean().default(true),
});

export async function createService(
  _prev: ServiceActionState | null,
  formData: FormData,
): Promise<ServiceActionState> {
  const ctx = await getOwnerAuth();
  if (!ctx) return { error: { _form: ["No autorizado"] } };

  const raw = {
    name: ((formData.get("name") as string) ?? "").trim(),
    durationMinutes: formData.get("durationMinutes") as string,
    price: formData.get("price") as string,
    isActive: formData.get("isActive") !== "false",
  };

  const result = serviceFormSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const [newService] = await db
    .insert(services)
    .values({
      tenantId: ctx.tenantId,
      name: result.data.name,
      durationMinutes: result.data.durationMinutes,
      price: String(result.data.price),
      currency: "ARS",
      isActive: result.data.isActive,
    })
    .returning({
      id: services.id,
      name: services.name,
      durationMinutes: services.durationMinutes,
      price: services.price,
      isActive: services.isActive,
    });

  if (!newService) return { error: { _form: ["Error al crear el servicio"] } };

  revalidatePath(`/${ctx.tenantSlug}`);
  revalidatePath(`/${ctx.tenantSlug}/reservar`);
  return {
    success: true,
    service: { ...newService, price: String(newService.price) },
  };
}

// ─── Update service ────────────────────────────────────────────────────────────

const updateServiceSchema = serviceFormSchema.extend({
  id: z.string().uuid("ID inválido"),
});

export async function updateService(
  _prev: ServiceActionState | null,
  formData: FormData,
): Promise<ServiceActionState> {
  const ctx = await getOwnerAuth();
  if (!ctx) return { error: { _form: ["No autorizado"] } };

  const raw = {
    id: formData.get("id") as string,
    name: ((formData.get("name") as string) ?? "").trim(),
    durationMinutes: formData.get("durationMinutes") as string,
    price: formData.get("price") as string,
    isActive: formData.get("isActive") !== "false",
  };

  const result = updateServiceSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { id, name, durationMinutes, price, isActive } = result.data;

  const [existing] = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.id, id), eq(services.tenantId, ctx.tenantId)))
    .limit(1);

  if (!existing) return { error: { _form: ["Servicio no encontrado"] } };

  const [updated] = await db
    .update(services)
    .set({ name, durationMinutes, price: String(price), isActive })
    .where(and(eq(services.id, id), eq(services.tenantId, ctx.tenantId)))
    .returning({
      id: services.id,
      name: services.name,
      durationMinutes: services.durationMinutes,
      price: services.price,
      isActive: services.isActive,
    });

  if (!updated) return { error: { _form: ["Error al actualizar el servicio"] } };

  revalidatePath(`/${ctx.tenantSlug}`);
  revalidatePath(`/${ctx.tenantSlug}/reservar`);
  return {
    success: true,
    service: { ...updated, price: String(updated.price) },
  };
}

// ─── Delete service ────────────────────────────────────────────────────────────

export async function deleteService(serviceId: string): Promise<ActionState> {
  const ctx = await getOwnerAuth();
  if (!ctx) return { error: { _form: ["No autorizado"] } };

  const [service] = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.tenantId, ctx.tenantId)))
    .limit(1);

  if (!service) return { error: { _form: ["Servicio no encontrado"] } };

  const today = todayISO();
  const [futureAppt] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.serviceId, serviceId),
        eq(appointments.tenantId, ctx.tenantId),
        gte(appointments.date, today),
        inArray(appointments.status, ["pending", "confirmed"]),
      ),
    )
    .limit(1);

  if (futureAppt) {
    return {
      error: {
        _form: [
          "Este servicio tiene turnos activos. Cancelalos antes de eliminarlo.",
        ],
      },
    };
  }

  const [anyAppt] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.serviceId, serviceId),
        eq(appointments.tenantId, ctx.tenantId),
      ),
    )
    .limit(1);

  if (anyAppt) {
    return {
      error: {
        _form: [
          "Este servicio tiene historial de turnos y no puede eliminarse. Podés desactivarlo en su lugar.",
        ],
      },
    };
  }

  await db
    .delete(services)
    .where(
      and(eq(services.id, serviceId), eq(services.tenantId, ctx.tenantId)),
    );

  revalidatePath(`/${ctx.tenantSlug}`);
  revalidatePath(`/${ctx.tenantSlug}/reservar`);
  return { success: true };
}

// ─── Toggle service active ─────────────────────────────────────────────────────

export async function toggleServiceActive(
  serviceId: string,
  isActive: boolean,
): Promise<ActionState> {
  const ctx = await getOwnerAuth();
  if (!ctx) return { error: { _form: ["No autorizado"] } };

  const [service] = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.tenantId, ctx.tenantId)))
    .limit(1);

  if (!service) return { error: { _form: ["Servicio no encontrado"] } };

  await db
    .update(services)
    .set({ isActive })
    .where(and(eq(services.id, serviceId), eq(services.tenantId, ctx.tenantId)));

  revalidatePath(`/${ctx.tenantSlug}`);
  revalidatePath(`/${ctx.tenantSlug}/reservar`);
  return { success: true };
}
