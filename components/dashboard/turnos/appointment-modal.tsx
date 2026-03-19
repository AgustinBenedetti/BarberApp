"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  X,
  Phone,
  Mail,
  Clock,
  Scissors,
  User,
  Music,
  Coffee,
  FileText,
  CalendarX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  updateAppointmentStatus,
  updateAppointmentNotes,
  rescheduleAppointment,
} from "@/actions/appointments";
import type { AppointmentRow } from "@/actions/appointments";
import type { AppointmentStatus } from "@/lib/db/schema/appointments";

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
  no_show: "No se presentó",
};

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  confirmed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  completed: "bg-muted/50 text-muted-foreground border-border",
  cancelled: "bg-red-500/10 text-red-400/70 border-red-500/20",
  no_show: "bg-red-500/15 text-red-400 border-red-500/30",
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

interface AppointmentModalProps {
  appointment: AppointmentRow | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function AppointmentModal({
  appointment,
  open,
  onClose,
  onRefresh,
}: AppointmentModalProps) {
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Sync notes when appointment changes
  useEffect(() => {
    setNotes(appointment?.notes ?? "");
    setError(null);
  }, [appointment]);

  // Close on backdrop click
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === backdropRef.current) onClose();
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock scroll
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open || !appointment) return null;

  const appt = appointment;
  const canAct = !["completed", "cancelled", "no_show"].includes(appt.status);

  function act(fn: () => Promise<{ success?: boolean; error?: Record<string, string[]> }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result?.error?._form?.[0]) {
        setError(result.error._form[0]);
      } else {
        onRefresh();
        onClose();
      }
    });
  }

  function handleSaveNotes() {
    act(() => updateAppointmentNotes(appt.id, notes));
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full max-h-[92dvh] overflow-y-auto rounded-t-2xl border border-border bg-card sm:max-w-md sm:rounded-2xl",
          "animate-in slide-in-from-bottom-4 duration-200 sm:zoom-in-95",
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-card px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Detalle del turno
            </p>
            <h2 className="text-lg font-bold tracking-tight">{appt.clientName}</h2>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  STATUS_BADGE[appt.status],
                )}
              >
                {STATUS_LABELS[appt.status]}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 px-5 py-4">
          {/* Date + time */}
          <div className="flex items-center gap-2.5 text-sm">
            <Clock className="h-4 w-4 shrink-0 text-primary" />
            <span>
              {formatDate(appt.date)} · {appt.startTime.slice(0, 5)}–{appt.endTime.slice(0, 5)}
            </span>
          </div>

          {/* Service */}
          <div className="flex items-center gap-2.5 text-sm">
            <Scissors className="h-4 w-4 shrink-0 text-primary" />
            <span>
              {appt.serviceName} · {appt.serviceDurationMinutes} min · ${appt.servicePrice}
            </span>
          </div>

          {/* Barber */}
          <div className="flex items-center gap-2.5 text-sm">
            <User className="h-4 w-4 shrink-0 text-primary" />
            <span>{appt.barberDisplayName}</span>
          </div>

          {/* Client contact */}
          {appt.clientPhone && (
            <div className="flex items-center gap-2.5 text-sm">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a
                href={`tel:${appt.clientPhone}`}
                className="text-primary hover:underline"
              >
                {appt.clientPhone}
              </a>
            </div>
          )}
          {appt.clientEmail && (
            <div className="flex items-center gap-2.5 text-sm">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-muted-foreground">{appt.clientEmail}</span>
            </div>
          )}

          {/* Preferences */}
          {appt.clientPreferences &&
            Object.keys(appt.clientPreferences).length > 0 && (
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Preferencias
                </p>
                {appt.clientPreferences.music && (
                  <div className="flex items-center gap-2 text-xs">
                    <Music className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>Música: {appt.clientPreferences.music}</span>
                  </div>
                )}
                {appt.clientPreferences.drink && (
                  <div className="flex items-center gap-2 text-xs">
                    <Coffee className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>Bebida: {appt.clientPreferences.drink}</span>
                  </div>
                )}
                {Object.entries(appt.clientPreferences)
                  .filter(([k]) => k !== "music" && k !== "drink")
                  .map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground capitalize">{k}:</span>
                      <span>{v}</span>
                    </div>
                  ))}
              </div>
            )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              <FileText className="h-3 w-3" />
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agregar notas internas…"
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveNotes}
              disabled={isPending || notes === (appt.notes ?? "")}
            >
              Guardar notas
            </Button>
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          {/* Actions */}
          {canAct && (
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Acciones
              </p>

              <div className="flex flex-wrap gap-2">
                {appt.status === "pending" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      act(() => updateAppointmentStatus(appt.id, "confirmed"))
                    }
                    disabled={isPending}
                  >
                    Confirmar
                  </Button>
                )}
                {appt.status === "confirmed" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      act(() => updateAppointmentStatus(appt.id, "completed"))
                    }
                    disabled={isPending}
                  >
                    Marcar completado
                  </Button>
                )}
                {(appt.status === "pending" || appt.status === "confirmed") && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      act(() => updateAppointmentStatus(appt.id, "cancelled"))
                    }
                    disabled={isPending}
                  >
                    Cancelar turno
                  </Button>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => act(() => rescheduleAppointment(appt.id))}
                disabled={isPending}
              >
                <CalendarX className="h-3.5 w-3.5" />
                Reprogramar (cancelar para que el cliente reserve de nuevo)
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
