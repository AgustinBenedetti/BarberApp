"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  tenants,
  profiles,
  services,
  barbers,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  DAYS,
} from "@/lib/validations/onboarding";
import type { ActionState } from "@/actions/auth";

export async function saveStep1(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Already completed step 1
  if (user.app_metadata?.tenant_id) {
    redirect("/onboarding/step-2");
  }

  // Parse opening hours from individual form fields
  const openingHours: Record<
    string,
    { closed: boolean; open?: string; close?: string }
  > = {};

  for (const day of DAYS) {
    const closed = formData.get(`openingHours.${day}.closed`) === "true";
    openingHours[day] = {
      closed,
      open: (formData.get(`openingHours.${day}.open`) as string) || "09:00",
      close: (formData.get(`openingHours.${day}.close`) as string) || "19:00",
    };
  }

  const raw = {
    name: formData.get("name") as string,
    slug: formData.get("slug") as string,
    address: (formData.get("address") as string) || undefined,
    openingHours,
  };

  const result = step1Schema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { name, slug, address } = result.data;

  // Validate slug uniqueness
  const existing = await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug),
    columns: { id: true },
  });

  if (existing) {
    return { error: { slug: ["Este slug ya está en uso. Elegí otro."] } };
  }

  // Handle logo upload
  let logoUrl: string | undefined;
  const logoFile = formData.get("logo") as File | null;
  if (logoFile && logoFile.size > 0) {
    if (logoFile.size > 5 * 1024 * 1024) {
      return { error: { logo: ["El logo no puede superar los 5MB"] } };
    }
    if (!logoFile.type.startsWith("image/")) {
      return { error: { logo: ["El archivo debe ser una imagen"] } };
    }
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("logos")
      .upload(`${slug}/${Date.now()}`, logoFile, { upsert: true });

    if (!uploadError && uploadData) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("logos").getPublicUrl(uploadData.path);
      logoUrl = publicUrl;
    }
  }

  // Create tenant
  const [tenant] = await db
    .insert(tenants)
    .values({
      name,
      slug,
      address: address || null,
      logoUrl: logoUrl || null,
      openingHours: result.data.openingHours,
    })
    .returning();

  // Update profile: assign tenant + role
  await db
    .update(profiles)
    .set({ tenantId: tenant.id, role: "owner" })
    .where(eq(profiles.id, user.id));

  // Update Supabase auth app_metadata (needed for JWT-based middleware check)
  const adminClient = await createAdminClient();
  await adminClient.auth.admin.updateUserById(user.id, {
    app_metadata: { tenant_id: tenant.id, role: "owner" },
  });

  // Refresh session so the new JWT (with tenant_id) is set in cookies
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    return { error: { _form: ["Error al actualizar la sesión. Intentá de nuevo."] } };
  }

  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/reservar`);
  redirect("/onboarding/step-2");
}

export async function saveStep2(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) redirect("/onboarding/step-1");

  const servicesJson = formData.get("servicesJson") as string;
  let parsed: unknown;
  try {
    parsed = JSON.parse(servicesJson);
  } catch {
    return { error: { _form: ["Error al procesar los servicios."] } };
  }

  const result = step2Schema.safeParse({ services: parsed });
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const validServices = result.data.services.filter(
    (s) => s.name.trim().length > 0,
  );

  await db.transaction(async (tx) => {
    await tx.delete(services).where(eq(services.tenantId, tenantId));
    if (validServices.length > 0) {
      await tx.insert(services).values(
        validServices.map((s) => ({
          tenantId,
          name: s.name.trim(),
          durationMinutes: s.durationMinutes,
          price: String(s.price),
        })),
      );
    }
  });

  const tenant2 = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { slug: true },
  });
  if (tenant2) {
    revalidatePath(`/${tenant2.slug}`);
    revalidatePath(`/${tenant2.slug}/reservar`);
  }

  redirect("/onboarding/step-3");
}

export async function saveStep3(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) redirect("/onboarding/step-1");

  const barbersJson = formData.get("barbersJson") as string;
  const ownerIsBarberRaw = formData.get("ownerIsBarber") === "true";

  let parsed: unknown;
  try {
    parsed = JSON.parse(barbersJson);
  } catch {
    return { error: { _form: ["Error al procesar los barberos."] } };
  }

  const result = step3Schema.safeParse({
    barbers: parsed,
    ownerIsBarber: ownerIsBarberRaw,
  });
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { barbers: barberList, ownerIsBarber } = result.data;

  const toInsert: {
    tenantId: string;
    profileId?: string | null;
    displayName: string;
  }[] = [];

  if (ownerIsBarber) {
    toInsert.push({
      tenantId,
      profileId: user.id,
      displayName:
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Propietario",
    });
  }

  const validBarbers = barberList.filter((b) => b.displayName.trim().length > 0);
  for (const b of validBarbers) {
    toInsert.push({
      tenantId,
      profileId: null,
      displayName: b.displayName.trim(),
    });
  }

  await db.transaction(async (tx) => {
    await tx.delete(barbers).where(eq(barbers.tenantId, tenantId));
    if (toInsert.length > 0) {
      await tx.insert(barbers).values(toInsert);
    }
  });

  const tenant3 = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { slug: true },
  });
  if (tenant3) {
    revalidatePath(`/${tenant3.slug}`);
    revalidatePath(`/${tenant3.slug}/reservar`);
  }

  redirect("/dashboard");
}
