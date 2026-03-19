import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  profiles,
  tenants,
  barbers as barbersTable,
  services as servicesTable,
} from "@/lib/db/schema";
import { getAppointmentsForDay } from "@/actions/appointments";
import { AgendaView } from "@/components/dashboard/turnos/agenda-view";
import type { BarberOption, ServiceOption } from "@/actions/appointments";

export const metadata = {
  title: "Turnos — BarberSaaS",
};

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default async function TurnosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
    columns: { tenantId: true, role: true },
  });

  if (!profile?.tenantId) redirect("/onboarding/step-1");

  const tenantId = profile.tenantId;
  const userRole = profile.role === "barber" ? "barber" : "owner";

  const today = todayISO();

  // Find the barber record for this user (barber role only)
  let ownBarberId: string | null = null;
  if (userRole === "barber") {
    const [barber] = await db
      .select({ id: barbersTable.id })
      .from(barbersTable)
      .where(
        and(
          eq(barbersTable.profileId, user.id),
          eq(barbersTable.tenantId, tenantId),
        ),
      )
      .limit(1);
    ownBarberId = barber?.id ?? null;
  }

  const [tenant, tenantBarbers, tenantServices, initialAppointments] =
    await Promise.all([
      db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
        columns: { openingHours: true },
      }),
      db
        .select({ id: barbersTable.id, displayName: barbersTable.displayName })
        .from(barbersTable)
        .where(
          and(
            eq(barbersTable.tenantId, tenantId),
            eq(barbersTable.isActive, true),
          ),
        )
        .orderBy(barbersTable.displayName),
      db
        .select({
          id: servicesTable.id,
          name: servicesTable.name,
          durationMinutes: servicesTable.durationMinutes,
          price: servicesTable.price,
        })
        .from(servicesTable)
        .where(
          and(
            eq(servicesTable.tenantId, tenantId),
            eq(servicesTable.isActive, true),
          ),
        )
        .orderBy(servicesTable.name),
      getAppointmentsForDay(today),
    ]);

  const barbers: BarberOption[] = tenantBarbers;
  const services: ServiceOption[] = tenantServices.map((s) => ({
    ...s,
    price: String(s.price),
  }));

  return (
    <div className="min-h-screen bg-background">
      <AgendaView
        initialDate={today}
        initialAppointments={initialAppointments}
        userRole={userRole}
        ownBarberId={ownBarberId}
        tenantId={tenantId}
        barbers={barbers}
        services={services}
        openingHours={
          tenant?.openingHours as Record<
            string,
            { closed?: boolean; open?: string; close?: string }
          > | null
        }
      />
    </div>
  );
}
