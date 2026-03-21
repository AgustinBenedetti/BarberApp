import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { BarberForm } from "@/components/dashboard/barberos/barber-form";

export const metadata = {
  title: "Agregar barbero — BarberSaaS",
};

export default async function NuevoBarberoPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Agregar barbero</h1>
      </div>

      <BarberForm />
    </div>
  );
}
