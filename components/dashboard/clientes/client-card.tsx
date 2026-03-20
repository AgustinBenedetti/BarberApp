"use client";

import Link from "next/link";
import { Music, Coffee, Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientRow } from "@/actions/clients";
import { parseDateSafe, getCategory, getInitials, CATEGORY_STYLES } from "./client-utils";

interface ClientCardProps {
  client: ClientRow;
}

function formatDate(isoString: string | null, isDateOnly = false): string {
  if (!isoString) return "—";
  // YYYY-MM-DD strings must use parseDateSafe to avoid UTC midnight off-by-one in UTC-3
  const d = isDateOnly ? parseDateSafe(isoString) : new Date(isoString);
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  return `${h}:${m}`;
}

export function ClientCard({ client }: ClientCardProps) {
  const category = getCategory(client.visitCount);
  const hasMusic = !!client.preferences?.music;
  const hasDrink = !!client.preferences?.drink;

  return (
    <Link
      href={`/dashboard/clientes/${client.id}`}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-primary/30 hover:bg-card/80"
    >
      {/* Avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-bold text-muted-foreground">
        {getInitials(client.name)}
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{client.name}</p>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              CATEGORY_STYLES[category],
            )}
          >
            {category}
          </span>
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {client.phone && (
            <p className="text-xs text-muted-foreground">{client.phone}</p>
          )}

          {/* Preference indicators */}
          {(hasMusic || hasDrink) && (
            <div className="flex items-center gap-1.5">
              {hasMusic && (
                <Music className="h-3 w-3 text-muted-foreground/60" />
              )}
              {hasDrink && (
                <Coffee className="h-3 w-3 text-muted-foreground/60" />
              )}
            </div>
          )}
        </div>

        {/* Next appointment or last visit */}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {client.nextAppointment ? (
            <div className="flex items-center gap-1 text-xs text-primary">
              <Calendar className="h-3 w-3" />
              <span>
                {formatDate(client.nextAppointment.date, true)} · {formatTime(client.nextAppointment.startTime)} · {client.nextAppointment.serviceName}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60">
              Última visita: {formatDate(client.lastVisitAt)}
            </p>
          )}
        </div>
      </div>

      {/* Visit count + chevron */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums">{client.visitCount}</p>
          <p className="text-[10px] text-muted-foreground/60">
            {client.visitCount === 1 ? "visita" : "visitas"}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
