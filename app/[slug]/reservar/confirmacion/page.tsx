import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, MessageCircle, Calendar, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Turno confirmado",
};

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}

function formatDisplayDate(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildCalendarUrl(
  shop: string,
  service: string,
  barber: string,
  date: string,
  time: string,
  durationMinutes: number,
): string {
  const parts = date.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const timeParts = time.split(":").map(Number);
  const hours = timeParts[0] ?? 0;
  const minutes = timeParts[1] ?? 0;

  function pad(n: number) {
    return String(n).padStart(2, "0");
  }

  const startDt = `${year}${pad(month)}${pad(day)}T${pad(hours)}${pad(minutes)}00`;
  const endDate = new Date(year, month - 1, day, hours, minutes + durationMinutes);
  const endDt = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Turno en ${shop}`,
    dates: `${startDt}/${endDt}`,
    details: `Servicio: ${service} | Barbero: ${barber}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default async function ConfirmacionPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  if (!sp.date || !sp.service) {
    redirect(`/${slug}/reservar`);
  }

  const shop = sp.shop ?? "";
  const shopPhone = sp.shopPhone ?? "";
  const service = sp.service ?? "";
  const barber = sp.barber ?? "";
  const date = sp.date ?? "";
  const time = sp.time ?? "";
  const durationMinutes = Number(sp.duration ?? "60");
  const client = sp.client ?? "";

  const whatsappText = encodeURIComponent(
    `Hola ${shop}, reservé un turno para el ${date ? formatDisplayDate(date) : date} a las ${time} con ${barber} para ${service}. Mi nombre es ${client}.`,
  );
  const cleanPhone = shopPhone.replace(/\D/g, "");
  const whatsappUrl =
    cleanPhone.length > 0
      ? `https://wa.me/${cleanPhone}?text=${whatsappText}`
      : `https://wa.me/?text=${whatsappText}`;

  const calendarUrl =
    date && time
      ? buildCalendarUrl(shop, service, barber, date, time, durationMinutes)
      : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header mínimo */}
      <header className="border-b border-border px-4 py-4">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <Link
            href={`/${slug}`}
            className="flex items-center justify-center rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {shop}
            </p>
            <p className="text-sm font-bold">Reserva completada</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-12">
        {/* Success icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary bg-primary/15">
            <Check className="h-10 w-10 text-primary" strokeWidth={2.5} />
            {/* Pulse ring */}
            <div className="absolute inset-0 animate-ping rounded-full border-2 border-primary opacity-20" />
          </div>
        </div>

        {/* Title */}
        <div className="mb-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Confirmado
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">¡Turno reservado!</h1>
        </div>
        {client && (
          <p className="mb-8 text-center text-muted-foreground">
            Te esperamos, <span className="font-semibold text-foreground">{client}</span>
          </p>
        )}

        {/* Summary card */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
          {[
            shop && { label: "Barbería", value: shop },
            service && { label: "Servicio", value: service },
            barber && { label: "Barbero", value: barber },
            date && { label: "Fecha", value: formatDisplayDate(date), capitalize: true },
            time && { label: "Hora", value: time, accent: true },
          ]
            .filter(Boolean)
            .map((row, i) => {
              if (!row) return null;
              return (
                <div key={row.label}>
                  {i > 0 && <div className="mx-4 h-px bg-border/50" />}
                  <div className="flex items-center justify-between px-5 py-3.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {row.label}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        "capitalize" in row && row.capitalize ? "capitalize" : ""
                      } ${"accent" in row && row.accent ? "text-lg font-bold text-primary" : "text-foreground"}`}
                    >
                      {row.value}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 rounded-xl bg-[#25D366] py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-5 w-5" />
            Avisar por WhatsApp
          </a>

          {calendarUrl && (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 rounded-xl border border-border bg-card py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-accent"
            >
              <Calendar className="h-5 w-5" />
              Agregar al calendario
            </a>
          )}

          <Link
            href={`/${slug}`}
            className="py-3 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Volver a la barbería
          </Link>
        </div>
      </div>
    </div>
  );
}
