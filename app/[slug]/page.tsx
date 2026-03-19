import { cache } from "react";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Clock } from "lucide-react";
import type { Metadata } from "next";
import { z } from "zod";

import { db } from "@/lib/db";
import { tenants, barbers, services, profiles } from "@/lib/db/schema";
import FaqAccordion from "@/components/landing/faq-accordion";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const fetchTenantPageData = unstable_cache(
  async (slug: string) => {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });
    if (!tenant) return null;

    const [barberList, serviceList] = await Promise.all([
      db
        .select({
          id: barbers.id,
          displayName: barbers.displayName,
          bio: barbers.bio,
          avatarUrl: profiles.avatarUrl,
        })
        .from(barbers)
        .leftJoin(profiles, eq(barbers.profileId, profiles.id))
        .where(and(eq(barbers.tenantId, tenant.id), eq(barbers.isActive, true))),
      db
        .select()
        .from(services)
        .where(
          and(eq(services.tenantId, tenant.id), eq(services.isActive, true))
        ),
    ]);

    return { tenant, barberList, serviceList };
  },
  ["tenant-landing"],
  { revalidate: 60 }
);

const getTenantPageData = cache(fetchTenantPageData);

const dayScheduleSchema = z.object({ open: z.string(), close: z.string() });
const openingHoursSchema = z.record(z.string(), dayScheduleSchema);
type DaySchedule = z.infer<typeof dayScheduleSchema>;
type OpeningHours = z.infer<typeof openingHoursSchema>;

const DAYS = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
] as const;

function formatPrice(price: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(price));
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getTenantPageData(slug);
  if (!data) return {};
  const { tenant } = data;
  return {
    title: `${tenant.name} | BarberSaaS`,
    description: tenant.address
      ? `Reservá tu turno en ${tenant.name}. ${tenant.address}`
      : `Reservá tu turno en ${tenant.name}`,
  };
}

export default async function TenantLandingPage({ params }: PageProps) {
  const { slug } = await params;

  const data = await getTenantPageData(slug);
  if (!data) notFound();

  const { tenant, barberList, serviceList } = data;

  const parsedHours = openingHoursSchema.safeParse(tenant.openingHours);
  const hours: OpeningHours | null = parsedHours.success ? parsedHours.data : null;
  const reserveUrl = `/${slug}/reservar`;

  const navLinks = [
    ...(serviceList.length > 0 ? [{ href: "#servicios", label: "Servicios" }] : []),
    ...(barberList.length > 0 ? [{ href: "#barberos", label: "Barberos" }] : []),
    ...(tenant.address ? [{ href: "#ubicacion", label: "Ubicación" }] : []),
    ...(hours ? [{ href: "#horarios", label: "Horarios" }] : []),
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <>
      {/* Mobile floating CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-background/95 backdrop-blur-sm p-4">
        <Link
          href={reserveUrl}
          className="block w-full rounded-xl bg-primary py-3 text-center font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Reservar turno
        </Link>
      </div>

      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              {tenant.logoUrl ? (
                <Image
                  src={tenant.logoUrl}
                  alt={`Logo de ${tenant.name}`}
                  width={36}
                  height={36}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {getInitials(tenant.name)}
                </div>
              )}
              <span className="font-bold text-base tracking-tight">{tenant.name}</span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href={reserveUrl}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Reservar turno
              </Link>
            </nav>
          </div>
        </header>

        <main>
          {/* Hero */}
          <section
            id="inicio"
            className="relative overflow-hidden px-4 py-24 text-center"
          >
            {/* Ambient glow */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.769 0.188 73 / 0.12) 0%, transparent 70%)",
              }}
            />
            <div className="relative mx-auto max-w-3xl">
              {tenant.logoUrl && (
                <div className="mb-6 flex justify-center">
                  <Image
                    src={tenant.logoUrl}
                    alt={`Logo de ${tenant.name}`}
                    width={96}
                    height={96}
                    className="rounded-full object-cover ring-4 ring-primary/20"
                  />
                </div>
              )}
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Barbería
              </p>
              <h1 className="mb-4 text-5xl font-extrabold tracking-tight md:text-6xl">
                {tenant.name}
              </h1>
              {tenant.address && (
                <p className="mb-8 inline-flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {tenant.address}
                </p>
              )}
              <div className="hidden justify-center md:flex">
                <Link
                  href={reserveUrl}
                  className="rounded-xl bg-primary px-8 py-3 text-lg font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Reservar turno →
                </Link>
              </div>
            </div>
          </section>

          {/* Servicios */}
          {serviceList.length > 0 && (
            <section id="servicios" className="px-4 py-16">
              <div className="mx-auto max-w-5xl">
                {/* 2-level section header — patrón Stitch */}
                <div className="mb-8">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Catálogo
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight">Servicios</h2>
                </div>

                {/* Lista de servicios — patrón Stitch */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  {serviceList.map((service, index) => (
                    <div key={service.id}>
                      {index > 0 && <div className="mx-4 h-px bg-border/50" />}
                      <div className="flex items-center justify-between px-5 py-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">
                            {service.name}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDuration(service.durationMinutes)}
                          </p>
                        </div>
                        <span className="ml-4 shrink-0 text-lg font-bold text-primary">
                          {formatPrice(service.price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Barberos */}
          {barberList.length > 0 && (
            <section id="barberos" className="px-4 py-16">
              <div className="mx-auto max-w-5xl">
                <div className="mb-8">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Equipo
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight">Nuestros Barberos</h2>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {barberList.map((barber) => (
                    <div
                      key={barber.id}
                      className="flex flex-col items-center rounded-2xl border border-border bg-card p-5 text-center"
                    >
                      {barber.avatarUrl ? (
                        <div className="relative mb-3 h-16 w-16 overflow-hidden rounded-full ring-2 ring-primary/20">
                          <Image
                            src={barber.avatarUrl}
                            alt={barber.displayName}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-lg font-bold text-primary">
                          {getInitials(barber.displayName)}
                        </div>
                      )}
                      <span className="text-sm font-semibold text-foreground">
                        {barber.displayName}
                      </span>
                      {barber.bio && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {barber.bio}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Ubicación */}
          {tenant.address && (
            <section id="ubicacion" className="px-4 py-16">
              <div className="mx-auto max-w-5xl">
                <div className="mb-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Dónde estamos
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight">Ubicación</h2>
                </div>
                <div className="inline-flex items-start gap-3 rounded-xl border border-border bg-card px-5 py-4">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{tenant.address}</p>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(tenant.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-xs text-primary hover:underline"
                    >
                      Ver en Google Maps →
                    </a>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Horarios */}
          {hours && (
            <section id="horarios" className="px-4 py-16">
              <div className="mx-auto max-w-5xl">
                <div className="mb-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Atención
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight">Horarios</h2>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  {DAYS.map(({ key, label }, index) => {
                    const day = hours[key];
                    return (
                      <div key={key}>
                        {index > 0 && <div className="mx-4 h-px bg-border/50" />}
                        <div className="flex items-center justify-between px-5 py-3.5">
                          <span className="text-sm font-medium text-foreground">
                            {label}
                          </span>
                          <span
                            className={`text-sm ${
                              day
                                ? "text-foreground"
                                : "text-muted-foreground/50"
                            }`}
                          >
                            {day ? `${day.open} – ${day.close}` : "Cerrado"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* FAQ */}
          <section id="faq" className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <div className="mb-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Dudas
                </p>
                <h2 className="text-2xl font-bold tracking-tight">
                  Preguntas frecuentes
                </h2>
              </div>
              <FaqAccordion />
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-border px-4 py-10">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 md:flex-row">
            <div className="text-center md:text-left">
              <p className="font-bold text-foreground">{tenant.name}</p>
              {tenant.address && (
                <p className="mt-1 text-sm text-muted-foreground">{tenant.address}</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground/60">
              Powered by{" "}
              <span className="font-semibold text-primary">BarberSaaS</span>
            </p>
          </div>
        </footer>

        {/* Spacer mobile */}
        <div className="h-24 md:hidden" />
      </div>
    </>
  );
}
