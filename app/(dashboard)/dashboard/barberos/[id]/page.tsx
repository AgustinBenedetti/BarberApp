import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getBarberById, toggleBarberActive } from "@/actions/barbers-services";
import { BarberForm } from "@/components/dashboard/barberos/barber-form";
import { BarberStatusToggle } from "@/components/dashboard/barberos/barber-status-toggle";

export const metadata = {
  title: "Editar barbero — BarberSaaS",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarBarberoPage({ params }: Props) {
  const { id } = await params;

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

  const barber = await getBarberById(id);
  if (!barber) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-10">
      <div className="mb-6">
        <Link
          href="/dashboard/barberos"
          className="mb-4 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Barberos
        </Link>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Equipo
        </p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {barber.displayName}
          </h1>
          <BarberStatusToggle barberId={barber.id} isActive={barber.isActive} />
        </div>
      </div>

      <BarberForm barber={barber} />
    </div>
  );
}
