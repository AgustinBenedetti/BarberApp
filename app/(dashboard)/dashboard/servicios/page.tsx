import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getServices } from "@/actions/barbers-services";
import { ServicesView } from "@/components/dashboard/servicios/services-view";

export const metadata = {
  title: "Servicios — BarberSaaS",
};

export default async function ServiciosPage() {
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
  if (profile.role !== "owner") redirect("/dashboard");

  const serviceList = await getServices();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-10">
      {/* Page header — the Add button lives in ServicesView to control the drawer */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Catálogo
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Servicios</h1>
      </div>

      <ServicesView initialServices={serviceList} />
    </div>
  );
}
