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
import {
  Scissors,
  Users,
  CalendarClock,
  ExternalLink,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
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

  const tenantId = profile.tenantId as string;

  const [tenant, tenantServices, tenantBarbers] = await Promise.all([
    db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) }),
    db.select().from(servicesTable).where(eq(servicesTable.tenantId, tenantId)),
    db.select().from(barbersTable).where(eq(barbersTable.tenantId, tenantId)),
  ]);

  const pendingSteps: { label: string; href: string }[] = [];
  if (tenantServices.length === 0)
    pendingSteps.push({ label: "Agregar servicios", href: "/onboarding/step-2" });
  if (tenantBarbers.length === 0)
    pendingSteps.push({ label: "Agregar barberos", href: "/onboarding/step-3" });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-10">

      {/* Pending steps banner */}
      {pendingSteps.length > 0 && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="space-y-2">
              <p className="text-sm font-semibold">Tu barbería no está lista aún</p>
              <p className="text-sm text-muted-foreground">
                Completá los siguientes pasos para que tus clientes puedan reservar:
              </p>
              <ul className="space-y-1">
                {pendingSteps.map((step) => (
                  <li key={step.href}>
                    <Link
                      href={step.href}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
                    >
                      <ArrowRight className="h-3 w-3" />
                      {step.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Page header — 2 niveles editorial (patrón Stitch) */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Panel de Admin
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{tenant?.name}</h1>
      </div>

      {/* Hero revenue stat (patrón Stitch: número grande + label micro) */}
      <div className="mb-4 rounded-2xl border border-border bg-card p-5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Ingresos del día
        </p>
        <p className="text-4xl font-extrabold tabular-nums tracking-tight">
          $0
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Daily Revenue</span>
        </div>
      </div>

      {/* Stats grid — 2 cards lado a lado */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <CalendarClock className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">0</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Turnos hoy
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{tenantBarbers.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Barberos
            </p>
          </div>
        </div>
      </div>

      {/* CTA — Ver landing pública */}
      {tenant?.slug && (
        <div className="mb-6">
          <a
            href={`/${tenant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            Ver mi landing pública
          </a>
        </div>
      )}

      {/* Próximos Turnos — patrón Stitch: header 2 niveles + lista */}
      <div className="mb-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Agenda
            </p>
            <h2 className="text-xl font-bold tracking-tight">Próximos Turnos</h2>
          </div>
          <Link
            href="/dashboard/turnos"
            className="text-xs font-semibold uppercase tracking-[0.1em] text-primary hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {/* Empty state */}
        <div className="rounded-xl border border-border bg-card/50 px-4 py-10 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            No hay turnos para hoy
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Los turnos de tus clientes aparecerán acá
          </p>
        </div>
      </div>

      {/* Gestión rápida — patrón Stitch: lista con chevron */}
      <div>
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Configuración
          </p>
          <h2 className="text-xl font-bold tracking-tight">Gestión</h2>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Link
            href="/dashboard/servicios"
            className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Scissors className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Servicios</p>
              <p className="text-xs text-muted-foreground">
                {tenantServices.length} {tenantServices.length === 1 ? "servicio configurado" : "servicios configurados"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <div className="h-px bg-border/50 mx-4" />

          <Link
            href="/dashboard/barberos"
            className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Equipo</p>
              <p className="text-xs text-muted-foreground">
                {tenantBarbers.length} {tenantBarbers.length === 1 ? "barbero activo" : "barberos activos"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
