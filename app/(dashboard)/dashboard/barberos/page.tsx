import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getBarbers } from "@/actions/barbers-services";
import { BarbersView } from "@/components/dashboard/barberos/barbers-view";

export const metadata = {
  title: "Barberos — BarberSaaS",
};

export default async function BarberosPage() {
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

  const barberList = await getBarbers();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Equipo
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Barberos</h1>
        </div>
        <Link
          href="/dashboard/barberos/nuevo"
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Agregar barbero</span>
          <span className="sm:hidden">Agregar</span>
        </Link>
      </div>

      <BarbersView initialBarbers={barberList} />
    </div>
  );
}
