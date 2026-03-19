"use client";

import { cn } from "@/lib/utils";
import type { AppointmentRow } from "@/actions/appointments";

type AppointmentStatus = AppointmentRow["status"];

const STATUS_STYLES: Record<
  AppointmentStatus,
  { dot: string; bg: string; border: string; text: string; label: string }
> = {
  pending: {
    dot: "bg-amber-400",
    bg: "bg-amber-500/8 hover:bg-amber-500/12",
    border: "border-amber-500/25",
    text: "text-amber-300",
    label: "Pendiente",
  },
  confirmed: {
    dot: "bg-emerald-400",
    bg: "bg-emerald-500/8 hover:bg-emerald-500/12",
    border: "border-emerald-500/25",
    text: "text-emerald-300",
    label: "Confirmado",
  },
  completed: {
    dot: "bg-zinc-500",
    bg: "bg-muted/30 hover:bg-muted/50",
    border: "border-border",
    text: "text-muted-foreground",
    label: "Completado",
  },
  cancelled: {
    dot: "bg-red-500",
    bg: "bg-red-500/6 hover:bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-400/70",
    label: "Cancelado",
  },
  no_show: {
    dot: "bg-red-500",
    bg: "bg-red-500/10 hover:bg-red-500/15",
    border: "border-red-500/30",
    text: "text-red-400",
    label: "No se presentó",
  },
};

interface AppointmentBlockProps {
  appointment: AppointmentRow;
  onClick: (appointment: AppointmentRow) => void;
  /** For timeline: top offset in px */
  topPx?: number;
  /** For timeline: height in px */
  heightPx?: number;
  /** Whether rendering in timeline (absolute) or list (relative) */
  mode?: "timeline" | "list";
}

export function AppointmentBlock({
  appointment,
  onClick,
  topPx,
  heightPx,
  mode = "list",
}: AppointmentBlockProps) {
  const styles = STATUS_STYLES[appointment.status];
  const isCancelled = appointment.status === "cancelled";

  if (mode === "timeline") {
    return (
      <button
        onClick={() => onClick(appointment)}
        className={cn(
          "absolute left-0 right-1 overflow-hidden rounded-lg border px-2.5 py-1.5 text-left transition-colors",
          styles.bg,
          styles.border,
        )}
        style={{ top: `${topPx}px`, height: `${Math.max(heightPx ?? 40, 36)}px` }}
      >
        <div className="flex min-w-0 items-start gap-1.5">
          <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", styles.dot)} />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-xs font-semibold leading-tight",
                isCancelled && "line-through opacity-60",
              )}
            >
              {appointment.clientName}
            </p>
            <p
              className={cn(
                "truncate text-[10px] leading-tight",
                styles.text,
                (heightPx ?? 0) < 50 && "hidden",
              )}
            >
              {appointment.serviceName} · {appointment.startTime.slice(0, 5)}–{appointment.endTime.slice(0, 5)}
            </p>
          </div>
        </div>
      </button>
    );
  }

  // List mode
  return (
    <button
      onClick={() => onClick(appointment)}
      className={cn(
        "w-full rounded-xl border px-3 py-3 text-left transition-colors",
        styles.bg,
        styles.border,
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", styles.dot)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={cn(
                "truncate text-sm font-semibold",
                isCancelled && "line-through opacity-60",
              )}
            >
              {appointment.clientName}
            </p>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {appointment.startTime.slice(0, 5)}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {appointment.serviceName} · {appointment.barberDisplayName}
          </p>
        </div>
      </div>
    </button>
  );
}
