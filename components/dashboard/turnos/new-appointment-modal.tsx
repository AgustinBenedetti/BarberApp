"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  createManualAppointment,
  searchClients,
} from "@/actions/appointments";
import type { BarberOption, ClientSearchResult, ServiceOption } from "@/actions/appointments";
import { getAvailableSlots as getSlots } from "@/actions/booking";

interface NewAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  barbers: BarberOption[];
  services: ServiceOption[];
  userRole: "owner" | "barber";
  ownBarberId: string | null;
  tenantId: string;
}

type FieldErrors = Record<string, string[] | undefined>;

const inputClass =
  "w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50";

const labelClass =
  "block text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1";

export function NewAppointmentModal({
  open,
  onClose,
  onSuccess,
  barbers,
  services,
  userRole,
  ownBarberId,
  tenantId,
}: NewAppointmentModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Client search
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<ClientSearchResult[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [isSearching, startSearch] = useTransition();

  // Form fields
  const [selectedBarberId, setSelectedBarberId] = useState(
    userRole === "barber" ? (ownBarberId ?? "") : (barbers[0]?.id ?? ""),
  );
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [state, formAction, isPending] = useActionState(
    createManualAppointment,
    null,
  );

  const errors: FieldErrors = (state?.error as FieldErrors) ?? {};

  // Close on success
  useEffect(() => {
    if (state?.success) {
      onSuccess();
      onClose();
    }
  }, [state?.success, onSuccess, onClose]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setClientQuery("");
      setClientResults([]);
      setSelectedClient(null);
      setClientName("");
      setClientPhone("");
      setStartTime("");
      setAvailableSlots([]);
    }
  }, [open]);

  // Fetch available slots when barber/service/date changes
  useEffect(() => {
    if (!selectedBarberId || !selectedServiceId || !date) return;
    const service = services.find((s) => s.id === selectedServiceId);
    if (!service) return;

    setLoadingSlots(true);
    setStartTime("");
    getSlots(tenantId, selectedBarberId, date, service.durationMinutes)
      .then((slots) => {
        setAvailableSlots(slots);
        if (slots.length > 0) setStartTime(slots[0]);
      })
      .finally(() => setLoadingSlots(false));
  }, [selectedBarberId, selectedServiceId, date, tenantId, services]);

  // Client search debounce
  useEffect(() => {
    if (clientQuery.length < 2) {
      setClientResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      startSearch(async () => {
        const results = await searchClients(clientQuery);
        setClientResults(results);
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [clientQuery]);

  function handleSelectClient(client: ClientSearchResult) {
    setSelectedClient(client);
    setClientName(client.name);
    setClientPhone(client.phone ?? "");
    setClientQuery("");
    setClientResults([]);
  }

  function handleClearClient() {
    setSelectedClient(null);
    setClientName("");
    setClientPhone("");
  }

  // Close on backdrop
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

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className={cn(
          "relative z-10 w-full max-h-[92dvh] overflow-y-auto rounded-t-2xl border border-border bg-card sm:max-w-md sm:rounded-2xl",
          "animate-in slide-in-from-bottom-4 duration-200 sm:zoom-in-95",
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Turnos
            </p>
            <h2 className="text-lg font-bold tracking-tight">Nuevo turno</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form action={formAction} className="space-y-4 px-5 py-4">
          {/* Hidden fields */}
          <input type="hidden" name="clientId" value={selectedClient?.id ?? ""} />
          <input type="hidden" name="barberId" value={selectedBarberId} />
          <input type="hidden" name="serviceId" value={selectedServiceId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="startTime" value={startTime} />

          {/* Client search */}
          <div>
            <label className={labelClass}>Cliente</label>

            {selectedClient ? (
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{selectedClient.name}</p>
                  {selectedClient.phone && (
                    <p className="text-xs text-muted-foreground">{selectedClient.phone}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClearClient}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                    placeholder="Buscar por nombre o teléfono…"
                    className={cn(inputClass, "pl-8")}
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground/50" />
                  )}
                </div>

                {clientResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                    {clientResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectClient(c)}
                        className="w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted first:rounded-t-lg last:rounded-b-lg"
                      >
                        <p className="font-medium">{c.name}</p>
                        {c.phone && (
                          <p className="text-xs text-muted-foreground">{c.phone}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Client name (new client) */}
          {!selectedClient && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Nombre *</label>
                <input
                  type="text"
                  name="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nombre del cliente"
                  className={inputClass}
                  required
                />
                {errors.clientName && (
                  <p className="mt-1 text-xs text-destructive">{errors.clientName[0]}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input
                  type="tel"
                  name="clientPhone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+54 11…"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Hidden name/phone when client is selected */}
          {selectedClient && (
            <>
              <input type="hidden" name="clientName" value={selectedClient.name} />
              <input type="hidden" name="clientPhone" value={selectedClient.phone ?? ""} />
            </>
          )}

          {/* Barber */}
          {userRole === "owner" && (
            <div>
              <label className={labelClass}>Barbero *</label>
              <select
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
                className={inputClass}
              >
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.displayName}
                  </option>
                ))}
              </select>
              {errors.barberId && (
                <p className="mt-1 text-xs text-destructive">{errors.barberId[0]}</p>
              )}
            </div>
          )}

          {/* Service */}
          <div>
            <label className={labelClass}>Servicio *</label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className={inputClass}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.durationMinutes} min · ${s.price}
                </option>
              ))}
            </select>
            {errors.serviceId && (
              <p className="mt-1 text-xs text-destructive">{errors.serviceId[0]}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className={labelClass}>Fecha *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={todayISO()}
              className={inputClass}
            />
            {errors.date && (
              <p className="mt-1 text-xs text-destructive">{errors.date[0]}</p>
            )}
          </div>

          {/* Time slot */}
          <div>
            <label className={labelClass}>Horario *</label>
            {loadingSlots ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cargando horarios…</span>
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
                Sin horarios disponibles para este día
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setStartTime(slot)}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-xs font-medium tabular-nums transition-colors",
                      startTime === slot
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/50",
                    )}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
            {errors.startTime && (
              <p className="mt-1 text-xs text-destructive">{errors.startTime[0]}</p>
            )}
          </div>

          {/* Global error */}
          {errors._form && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errors._form[0]}
            </p>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                isPending ||
                !startTime ||
                (!selectedClient && !clientName.trim())
              }
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creando…
                </>
              ) : (
                "Crear turno"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
