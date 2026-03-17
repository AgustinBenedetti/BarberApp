import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, MessageCircle, Calendar } from "lucide-react";
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-16">
      <div className="max-w-md mx-auto">
        {/* Success icon */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 border-4 border-amber-500 flex items-center justify-center">
            <Check className="w-10 h-10 text-amber-500" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-center text-zinc-100 mb-2">
          ¡Turno Confirmado!
        </h1>
        {client && (
          <p className="text-center text-zinc-400 mb-8">
            Te esperamos, {client}
          </p>
        )}

        {/* Summary card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6 space-y-3 text-sm">
          {shop && (
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500 flex-shrink-0">Barbería</span>
              <span className="text-zinc-200 font-medium text-right">{shop}</span>
            </div>
          )}
          {service && (
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500 flex-shrink-0">Servicio</span>
              <span className="text-zinc-200 font-medium text-right">
                {service}
              </span>
            </div>
          )}
          {barber && (
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500 flex-shrink-0">Barbero</span>
              <span className="text-zinc-200 font-medium text-right">
                {barber}
              </span>
            </div>
          )}
          {date && (
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500 flex-shrink-0">Fecha</span>
              <span className="text-zinc-200 font-medium text-right capitalize">
                {formatDisplayDate(date)}
              </span>
            </div>
          )}
          {time && (
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500 flex-shrink-0">Hora</span>
              <span className="text-amber-400 font-bold text-base">{time}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 px-6 rounded-xl transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Avisar por WhatsApp
          </a>
          {calendarUrl && (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold py-3.5 px-6 rounded-xl border border-zinc-700 transition-colors"
            >
              <Calendar className="w-5 h-5" />
              Agregar al calendario
            </a>
          )}
          <Link
            href={`/${slug}`}
            className="text-center text-zinc-500 hover:text-zinc-300 py-3 transition-colors text-sm"
          >
            Volver a la barbería
          </Link>
        </div>
      </div>
    </div>
  );
}
