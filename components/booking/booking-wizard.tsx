"use client";

import { useState, useTransition, useActionState } from "react";
import Image from "next/image";
import {
  Check,
  ChevronLeft,
  Clock,
  User,
  Loader2,
  Coffee,
  Music,
  Plus,
} from "lucide-react";
import {
  createAppointment,
  getAvailableSlots,
  lookupClient,
} from "@/actions/booking";
import type { ActionState } from "@/actions/auth";

interface ServiceItem {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
}

interface BarberItem {
  id: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
}

interface OpeningHoursDay {
  closed: boolean;
  open?: string;
  close?: string;
}

interface BookingWizardProps {
  tenantId: string;
  slug: string;
  shopName: string;
  services: ServiceItem[];
  barbers: BarberItem[];
  openingHours: Record<string, OpeningHoursDay> | null;
}

const WEEK_DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];
const NO_PREFERENCE_ID = "no-preference";

const STEP_LABELS = ["Servicio", "Barbero", "Fecha", "Info"];

function formatPrice(price: string): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(price));
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}

function get14Days(openingHours: Record<string, OpeningHoursDay> | null) {
  const days = [];
  const base = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const dayKey = WEEK_DAYS[d.getDay()];
    const dayData = dayKey ? openingHours?.[dayKey] : undefined;
    const isOpen = !openingHours || (!!dayData && !dayData.closed);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    days.push({
      dateStr: `${yyyy}-${mm}-${dd}`,
      dayLabel: DAY_SHORT[d.getDay()] ?? "",
      dayNum: d.getDate(),
      monthLabel: MONTH_SHORT[d.getMonth()] ?? "",
      isOpen,
    });
  }
  return days;
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
  });
}

const INPUT_CLS =
  "w-full rounded-xl border border-input bg-secondary/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-colors";

export default function BookingWizard({
  tenantId,
  slug,
  shopName,
  services,
  barbers,
  openingHours,
}: BookingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, startSlotTransition] = useTransition();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [drink, setDrink] = useState("");
  const [music, setMusic] = useState("");
  const [existingClient, setExistingClient] = useState<{
    id: string;
    name: string;
    preferences: Record<string, string> | null;
  } | null>(null);
  const [clientLoading, startClientTransition] = useTransition();
  const [state, formAction, isPending] = useActionState<
    ActionState | null,
    FormData
  >(createAppointment, null);

  const dates = get14Days(openingHours);

  function fetchSlots(date: string, barberId: string | null, duration: number) {
    setSelectedTime(null);
    setSlots([]);
    startSlotTransition(async () => {
      const effectiveBarberId = barberId === NO_PREFERENCE_ID ? null : barberId;
      const available = await getAvailableSlots(tenantId, effectiveBarberId, date, duration);
      setSlots(available);
    });
  }

  function handleDateSelect(dateStr: string) {
    setSelectedDate(dateStr);
    if (selectedService) {
      fetchSlots(dateStr, selectedBarberId, selectedService.durationMinutes);
    }
  }

  function handlePhoneBlur() {
    if (phone.length >= 6) {
      startClientTransition(async () => {
        const found = await lookupClient(tenantId, phone);
        if (found) {
          setExistingClient(found);
          if (!name) setName(found.name);
          if (!drink && found.preferences?.drink) setDrink(found.preferences.drink);
          if (!music && found.preferences?.music) setMusic(found.preferences.music);
        }
      });
    }
  }

  const selectedBarberName =
    selectedBarberId === NO_PREFERENCE_ID
      ? "Sin preferencia"
      : (barbers.find((b) => b.id === selectedBarberId)?.displayName ?? "");

  // Step 1 — service selection (patrón Stitch: lista con precio a la derecha)
  function renderStep1() {
    return (
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Paso 1
        </p>
        <h2 className="mb-1 text-2xl font-bold tracking-tight">
          Seleccioná tu{" "}
          <span className="text-primary italic">experiencia</span>
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Elegí el servicio que querés reservar
        </p>

        {services.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">
            No hay servicios disponibles
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {services.map((service, index) => {
              const isSelected = selectedService?.id === service.id;
              return (
                <div key={service.id}>
                  {index > 0 && <div className="mx-4 h-px bg-border/50" />}
                  <button
                    onClick={() => {
                      setSelectedService(service);
                      setSelectedDate(null);
                      setSelectedTime(null);
                      setSlots([]);
                    }}
                    className={`flex w-full items-center justify-between px-5 py-4 text-left transition-colors ${
                      isSelected ? "bg-primary/8" : "hover:bg-accent"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{service.name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDuration(service.durationMinutes)}
                      </p>
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-3">
                      <span className="text-base font-bold text-primary">
                        {formatPrice(service.price)}
                      </span>
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-border"
                        }`}
                      >
                        {isSelected ? (
                          <Check className="h-3.5 w-3.5 text-primary-foreground" />
                        ) : (
                          <Plus className="h-3.5 w-3.5 text-muted-foreground/50" />
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <button
            disabled={!selectedService}
            onClick={() => setStep(2)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Continuar →
          </button>
        </div>
      </div>
    );
  }

  // Step 2 — barber selection
  function renderStep2() {
    return (
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Paso 2
        </p>
        <h2 className="mb-1 text-2xl font-bold tracking-tight">Tu barbero</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          O continuá sin preferencia
        </p>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {/* Sin preferencia */}
          <button
            onClick={() => setSelectedBarberId(NO_PREFERENCE_ID)}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all ${
              selectedBarberId === NO_PREFERENCE_ID
                ? "border-primary bg-primary/8"
                : "border-border bg-card hover:border-primary/30 hover:bg-accent"
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-[11px] font-medium leading-tight text-muted-foreground">
              Sin preferencia
            </span>
            {selectedBarberId === NO_PREFERENCE_ID && (
              <Check className="h-3.5 w-3.5 text-primary" />
            )}
          </button>

          {barbers.map((barber) => (
            <button
              key={barber.id}
              onClick={() => setSelectedBarberId(barber.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all ${
                selectedBarberId === barber.id
                  ? "border-primary bg-primary/8"
                  : "border-border bg-card hover:border-primary/30 hover:bg-accent"
              }`}
            >
              {barber.avatarUrl ? (
                <div className="relative h-12 w-12 overflow-hidden rounded-full ring-2 ring-border">
                  <Image src={barber.avatarUrl} alt={barber.displayName} fill sizes="48px" className="object-cover" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">
                  {getInitials(barber.displayName)}
                </div>
              )}
              <span className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground">
                {barber.displayName}
              </span>
              {barber.bio && (
                <span className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">
                  {barber.bio}
                </span>
              )}
              {selectedBarberId === barber.id && (
                <Check className="h-3.5 w-3.5 text-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Atrás
          </button>
          <button
            disabled={!selectedBarberId}
            onClick={() => {
              setSelectedDate(null);
              setSelectedTime(null);
              setSlots([]);
              setStep(3);
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Continuar →
          </button>
        </div>
      </div>
    );
  }

  // Step 3 — date + time
  function renderStep3() {
    if (!selectedService) return null;
    return (
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Paso 3
        </p>
        <h2 className="mb-1 text-2xl font-bold tracking-tight">Fecha y horario</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Elegí cuándo querés tu turno
        </p>

        {/* Date strip */}
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ marginInline: "-1rem", paddingInline: "1rem" }}>
          {dates.map(({ dateStr, dayLabel, dayNum, monthLabel, isOpen }) => (
            <button
              key={dateStr}
              disabled={!isOpen}
              onClick={() => handleDateSelect(dateStr)}
              className={`flex w-16 shrink-0 flex-col items-center rounded-xl border py-3 transition-all ${
                !isOpen
                  ? "cursor-not-allowed border-border opacity-30"
                  : selectedDate === dateStr
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {dayLabel}
              </span>
              <span
                className={`mt-0.5 text-lg font-bold ${
                  selectedDate === dateStr ? "text-primary" : "text-foreground"
                }`}
              >
                {dayNum}
              </span>
              <span className="text-[10px] text-muted-foreground">{monthLabel}</span>
            </button>
          ))}
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              Disponibles —{" "}
              <span className="capitalize text-foreground">
                {formatDisplayDate(selectedDate)}
              </span>
            </p>
            {slotsLoading ? (
              <div className="flex items-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Cargando horarios...</span>
              </div>
            ) : slots.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                No hay horarios disponibles para este día
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedTime(slot)}
                    className={`rounded-xl border py-3 text-sm font-semibold transition-all ${
                      selectedTime === slot
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:border-primary/40"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setStep(2)}
            className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Atrás
          </button>
          <button
            disabled={!selectedDate || !selectedTime}
            onClick={() => setStep(4)}
            className="flex flex-1 items-center justify-center rounded-xl bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Continuar →
          </button>
        </div>
      </div>
    );
  }

  // Step 4 — contact info + submit
  function renderStep4() {
    const existingDrink = existingClient?.preferences?.drink;
    const existingMusic = existingClient?.preferences?.music;

    return (
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Paso 4
        </p>
        <h2 className="mb-1 text-2xl font-bold tracking-tight">Tus datos</h2>
        <p className="mb-6 text-sm text-muted-foreground">Para confirmar tu turno</p>

        {/* Booking summary */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
          {[
            { label: "Servicio", value: selectedService?.name },
            { label: "Barbero", value: selectedBarberName },
            {
              label: "Fecha",
              value: selectedDate ? formatDisplayDate(selectedDate) : "",
              capitalize: true,
            },
            { label: "Hora", value: selectedTime, accent: true },
          ].map(({ label, value, capitalize, accent }, i) => (
            <div key={label}>
              {i > 0 && <div className="mx-4 h-px bg-border/50" />}
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {label}
                </span>
                <span
                  className={`text-sm font-medium ${capitalize ? "capitalize" : ""} ${
                    accent ? "text-primary font-bold" : "text-foreground"
                  }`}
                >
                  {value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Client recognition */}
        {existingClient && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary/8 p-4">
            <p className="text-sm font-medium text-primary">
              ¡Hola {existingClient.name}!{" "}
              {existingDrink
                ? `¿Querés el mismo corte de siempre con tu ${existingDrink}?`
                : "¡Bienvenido de vuelta!"}
            </p>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="tenantId" value={tenantId} />
          <input type="hidden" name="serviceId" value={selectedService?.id ?? ""} />
          <input type="hidden" name="barberId" value={selectedBarberId ?? NO_PREFERENCE_ID} />
          <input type="hidden" name="date" value={selectedDate ?? ""} />
          <input type="hidden" name="startTime" value={selectedTime ?? ""} />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Nombre <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Tu nombre"
              className={INPUT_CLS}
            />
            {state?.error?.name && (
              <p className="text-xs text-destructive">{state.error.name[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Teléfono <span className="text-primary">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={handlePhoneBlur}
              required
              placeholder="Tu teléfono"
              className={INPUT_CLS}
            />
            {clientLoading && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Buscando tu perfil...
              </p>
            )}
            {state?.error?.phone && (
              <p className="text-xs text-destructive">{state.error.phone[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <Coffee className="h-3.5 w-3.5" />
              Bebida{" "}
              <span className="font-normal normal-case tracking-normal text-muted-foreground/50">
                (opcional)
              </span>
            </label>
            <input
              type="text"
              name="drink"
              value={drink}
              onChange={(e) => setDrink(e.target.value)}
              placeholder={existingDrink ?? "Café, mate, agua..."}
              className={INPUT_CLS}
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <Music className="h-3.5 w-3.5" />
              Música{" "}
              <span className="font-normal normal-case tracking-normal text-muted-foreground/50">
                (opcional)
              </span>
            </label>
            <input
              type="text"
              name="music"
              value={music}
              onChange={(e) => setMusic(e.target.value)}
              placeholder={existingMusic ?? "Rock, reggaeton, jazz..."}
              className={INPUT_CLS}
            />
          </div>

          {state?.error?._form && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{state.error._form[0]}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Atrás
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim() || !phone.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                "Confirmar turno →"
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <a
            href={`/${slug}`}
            className="flex shrink-0 items-center justify-center rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </a>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground truncate">
              {shopName}
            </p>
            <p className="text-sm font-bold tracking-tight">Reservar turno</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 pb-16">
        {/* Step indicator — patrón Stitch: tabs con underline */}
        <div className="mb-8 flex border-b border-border">
          {STEP_LABELS.map((label, index) => {
            const stepNum = (index + 1) as 1 | 2 | 3 | 4;
            const isCompleted = step > stepNum;
            const isCurrent = step === stepNum;
            return (
              <div
                key={stepNum}
                className={`flex flex-1 flex-col items-center gap-1.5 pb-3 transition-colors ${
                  isCurrent
                    ? "border-b-2 border-primary"
                    : isCompleted
                      ? "border-b-2 border-primary/30"
                      : "border-b-2 border-transparent"
                }`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                        ? "bg-primary/15 text-primary ring-2 ring-primary/20"
                        : "bg-secondary text-muted-foreground/40"
                  }`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : stepNum}
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-[0.1em] whitespace-nowrap ${
                    isCurrent
                      ? "text-foreground"
                      : isCompleted
                        ? "text-muted-foreground"
                        : "text-muted-foreground/40"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </main>
    </div>
  );
}
