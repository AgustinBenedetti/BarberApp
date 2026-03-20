"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Calendar,
  Clock,
  Scissors,
  User,
  MessageCircle,
  CalendarPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientDetail } from "@/actions/clients";
import { parseDateSafe, getCategory, getInitials, CATEGORY_STYLES } from "./client-utils";
import { PreferencesEditor } from "./preferences-editor";
import { NotesEditor } from "./notes-editor";

interface ClientDetailViewProps {
  client: ClientDetail;
  tenantSlug: string;
}

function formatDate(isoString: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString("es-AR", opts ?? {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  return `${h}:${m}`;
}

export function ClientDetailView({ client, tenantSlug }: ClientDetailViewProps) {
  const category = getCategory(client.visitCount);

  const whatsappUrl = client.phone
    ? `https://wa.me/${client.phone.replace(/\D/g, "")}`
    : null;

  const newBookingUrl = tenantSlug && client.phone
    ? `/${tenantSlug}/reservar?phone=${encodeURIComponent(client.phone)}`
    : tenantSlug
      ? `/${tenantSlug}/reservar`
      : null;

  return (
    <div>
      {/* Back navigation */}
      <Link
        href="/dashboard/clientes"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a clientes
      </Link>

      {/* Header card */}
      <div className="mb-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-base font-bold text-muted-foreground">
            {getInitials(client.name)}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{client.name}</h1>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  CATEGORY_STYLES[category],
                )}
              >
                {category}
              </span>
            </div>

            {/* Phone */}
            {client.phone && (
              <div className="mt-1.5 flex items-center gap-2">
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {client.phone}
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {client.phone}
                  </span>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
              <div>
                <p className="text-xl font-bold tabular-nums">{client.visitCount}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {client.visitCount === 1 ? "Visita" : "Visitas"}
                </p>
              </div>
              {client.lastVisitAt && (
                <div>
                  <p className="text-sm font-semibold">{formatDate(client.lastVisitAt, { day: "numeric", month: "short", year: "numeric" })}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Última visita
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* New appointment CTA */}
        {newBookingUrl && (
          <div className="mt-4 border-t border-border pt-4">
            <a
              href={newBookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <CalendarPlus className="h-4 w-4" />
              Nuevo turno para este cliente
            </a>
          </div>
        )}
      </div>

      {/* Preferences */}
      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <PreferencesEditor
          clientId={client.id}
          initialPreferences={client.preferences}
        />
      </div>

      {/* Notes */}
      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <NotesEditor clientId={client.id} initialNotes={client.notes} />
      </div>

      {/* Visit history */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Historial
          </h3>
          <p className="text-base font-bold tracking-tight">Visitas completadas</p>
        </div>

        {client.history.length === 0 ? (
          <div className="py-8 text-center">
            <Calendar className="mx-auto h-6 w-6 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">
              Sin visitas completadas aún
            </p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-border">
            {client.history.map((visit) => (
              <VisitRow key={visit.id} visit={visit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VisitRow({ visit }: { visit: ClientDetail["history"][number] }) {
  // visit.date is YYYY-MM-DD — use parseDateSafe to avoid UTC midnight off-by-one in UTC-3
  const d = parseDateSafe(visit.date);
  const dateStr = d.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
        <Calendar className="h-4 w-4 text-primary/70" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="text-sm font-medium capitalize">{dateStr}</p>
          <span className="text-xs text-muted-foreground/60">·</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {visit.startTime.slice(0, 5)}
          </div>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Scissors className="h-3 w-3" />
            {visit.serviceName}
          </div>
          <span className="text-xs text-muted-foreground/40">·</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {visit.barberName}
          </div>
          <span className="text-xs text-muted-foreground/40">·</span>
          <p className="text-xs text-muted-foreground">{visit.durationMinutes} min</p>
        </div>
      </div>
    </div>
  );
}
