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


export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
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
    ...(serviceList.length > 0
      ? [{ href: "#servicios", label: "Servicios" }]
      : []),
    ...(barberList.length > 0
      ? [{ href: "#barberos", label: "Barberos" }]
      : []),
    ...(tenant.address ? [{ href: "#ubicacion", label: "Ubicación" }] : []),
    ...(hours ? [{ href: "#horarios", label: "Horarios" }] : []),
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <>
      {/* Mobile floating CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden p-4 bg-zinc-950/95 backdrop-blur-sm border-t border-zinc-800">
        <Link
          href={reserveUrl}
          className="block w-full text-center bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-3 px-6 rounded-xl transition-colors"
        >
          Reservar turno
        </Link>
      </div>

      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {tenant.logoUrl ? (
                <Image
                  src={tenant.logoUrl}
                  alt={`Logo de ${tenant.name}`}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-zinc-950 font-bold text-sm flex-shrink-0">
                  {getInitials(tenant.name)}
                </div>
              )}
              <span className="font-bold text-lg">{tenant.name}</span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href={reserveUrl}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-2 px-4 rounded-lg text-sm transition-colors"
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
            className="relative py-24 px-4 text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 to-transparent pointer-events-none" />
            <div className="relative max-w-3xl mx-auto">
              {tenant.logoUrl && (
                <div className="flex justify-center mb-6">
                  <Image
                    src={tenant.logoUrl}
                    alt={`Logo de ${tenant.name}`}
                    width={100}
                    height={100}
                    className="rounded-full object-cover border-4 border-amber-500/30"
                  />
                </div>
              )}
              <h1 className="text-5xl md:text-6xl font-extrabold mb-4 tracking-tight">
                {tenant.name}
              </h1>
              {tenant.address && (
                <p className="inline-flex items-center gap-2 text-zinc-400 mb-8">
                  <MapPin className="w-4 h-4" />
                  {tenant.address}
                </p>
              )}
              <div className="hidden md:flex justify-center mt-2">
                <Link
                  href={reserveUrl}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-3 px-8 rounded-xl text-lg transition-colors"
                >
                  Reservar turno
                </Link>
              </div>
            </div>
          </section>

          {/* Servicios */}
          {serviceList.length > 0 && (
            <section id="servicios" className="py-16 px-4">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl font-bold text-amber-400 mb-8">
                  Servicios
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {serviceList.map((service) => (
                    <div
                      key={service.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors"
                    >
                      <h3 className="font-semibold text-zinc-100 text-lg">
                        {service.name}
                      </h3>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-zinc-500 text-sm flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {formatDuration(service.durationMinutes)}
                        </span>
                        <span className="text-amber-400 font-bold text-lg">
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
            <section id="barberos" className="py-16 px-4 bg-zinc-900/50">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl font-bold text-amber-400 mb-8">
                  Nuestros Barberos
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {barberList.map((barber) => (
                    <div
                      key={barber.id}
                      className="flex flex-col items-center text-center"
                    >
                      {barber.avatarUrl ? (
                        <div className="relative w-20 h-20 rounded-full overflow-hidden mb-3 ring-2 ring-zinc-700">
                          <Image
                            src={barber.avatarUrl}
                            alt={barber.displayName}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center mb-3 text-xl font-bold text-amber-400">
                          {getInitials(barber.displayName)}
                        </div>
                      )}
                      <span className="font-medium text-zinc-100">
                        {barber.displayName}
                      </span>
                      {barber.bio && (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
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
            <section id="ubicacion" className="py-16 px-4">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl font-bold text-amber-400 mb-8">
                  Ubicación
                </h2>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-zinc-300 text-lg">{tenant.address}</p>
                </div>
              </div>
            </section>
          )}

          {/* Horarios */}
          {hours && (
            <section id="horarios" className="py-16 px-4 bg-zinc-900/50">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl font-bold text-amber-400 mb-8">
                  Horarios
                </h2>
                <div className="max-w-xs">
                  {DAYS.map(({ key, label }) => {
                    const day = hours[key];
                    return (
                      <div
                        key={key}
                        className="flex justify-between py-3 border-b border-zinc-800 last:border-0"
                      >
                        <span className="text-zinc-300 font-medium">
                          {label}
                        </span>
                        <span
                          className={day ? "text-zinc-100" : "text-zinc-600"}
                        >
                          {day ? `${day.open} – ${day.close}` : "Cerrado"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* FAQ */}
          <section id="faq" className="py-16 px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-amber-400 mb-8">
                Preguntas frecuentes
              </h2>
              <FaqAccordion />
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-800 py-10 px-4">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div>
              <p className="font-bold text-zinc-100">{tenant.name}</p>
              {tenant.address && (
                <p className="text-zinc-500 text-sm mt-1">{tenant.address}</p>
              )}
            </div>
            <p className="text-zinc-600 text-sm">
              Powered by{" "}
              <span className="text-amber-500 font-medium">BarberSaaS</span>
            </p>
          </div>
        </footer>

        {/* Spacer so mobile floating button doesn't cover content */}
        <div className="h-24 md:hidden" />
      </div>
    </>
  );
}
