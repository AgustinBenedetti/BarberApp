import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  profiles,
  tenants,
  services as servicesTable,
  barbers as barbersTable,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { logout } from "@/actions/auth";
import { ExternalLink, Scissors, Users, CalendarClock } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  if (!profile?.tenantId) redirect("/onboarding/step-1");

  // After the redirect guard, tenantId is guaranteed to be a non-null string
  const tenantId = profile.tenantId as string;

  const [tenant, tenantServices, tenantBarbers] = await Promise.all([
    db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) }),
    db.select().from(servicesTable).where(eq(servicesTable.tenantId, tenantId)),
    db.select().from(barbersTable).where(eq(barbersTable.tenantId, tenantId)),
  ]);

  const pendingSteps: { label: string; href: string }[] = [];
  if (tenantServices.length === 0)
    pendingSteps.push({
      label: "Agregar servicios",
      href: "/onboarding/step-2",
    });
  if (tenantBarbers.length === 0)
    pendingSteps.push({
      label: "Agregar barberos",
      href: "/onboarding/step-3",
    });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{tenant?.name}</h1>
            <p className="text-sm text-muted-foreground">
              Panel de administración
            </p>
          </div>
          <a
            href={`/${tenant?.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <ExternalLink className="h-4 w-4" />
            Ver mi landing
          </a>
        </div>

        {/* Pending steps banner */}
        {pendingSteps.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Tu barbería no está lista aún
            </p>
            <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300">
              Completá los siguientes pasos para que tus clientes puedan
              reservar:
            </p>
            <ul className="mt-2 space-y-1">
              {pendingSteps.map((step) => (
                <li key={step.href}>
                  <Link
                    href={step.href}
                    className="text-sm font-medium text-amber-800 underline underline-offset-2 hover:no-underline dark:text-amber-200"
                  >
                    → {step.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
            <Scissors className="h-5 w-5 text-muted-foreground" />
            <p className="text-2xl font-bold">{tenantServices.length}</p>
            <p className="text-sm text-muted-foreground">Servicios</p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <p className="text-2xl font-bold">{tenantBarbers.length}</p>
            <p className="text-sm text-muted-foreground">Barberos</p>
          </div>
          <div className="col-span-2 flex flex-col gap-1 rounded-xl border bg-card p-4 sm:col-span-1">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Turnos hoy</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/onboarding/step-2"
            className="rounded-xl border bg-card p-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            Gestionar servicios →
          </Link>
          <Link
            href="/onboarding/step-3"
            className="rounded-xl border bg-card p-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            Gestionar barberos →
          </Link>
        </div>

        {/* Footer */}
        <div className="border-t pt-4">
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
