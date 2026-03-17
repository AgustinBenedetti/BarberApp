"use client";

import { useState, useTransition, useActionState } from "react";
import Image from "next/image";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Clock,
  User,
  Loader2,
  Coffee,
  Music,
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
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
const NO_PREFERENCE_ID = "no-preference";

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

const STEP_LABELS = ["Servicio", "Barbero", "Horario", "Datos"];

export default function BookingWizard({
  tenantId,
  slug,
  shopName,
  services,
  barbers,
  openingHours,
}: BookingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(
    null,
  );
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
      const effectiveBarberId =
        barberId === NO_PREFERENCE_ID ? null : barberId;
      const available = await getAvailableSlots(
        tenantId,
        effectiveBarberId,
        date,
        duration,
      );
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
          if (!drink && found.preferences?.drink)
            setDrink(found.preferences.drink);
          if (!music && found.preferences?.music)
            setMusic(found.preferences.music);
        }
      });
    }
  }

  const selectedBarberName =
    selectedBarberId === NO_PREFERENCE_ID
      ? "Sin preferencia"
      : (barbers.find((b) => b.id === selectedBarberId)?.displayName ?? "");

  // Step 1 — service selection
  function renderStep1() {
    return (
      <div>
        <h2 className="text-xl font-bold text-zinc-100 mb-1">
          Elegí tu servicio
        </h2>
        <p className="text-zinc-500 text-sm mb-6">
          Seleccioná el servicio que querés
        </p>
        {services.length === 0 ? (
          <p className="text-zinc-400 text-center py-10">
            No hay servicios disponibles
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => {
                  setSelectedService(service);
                  setSelectedDate(null);
                  setSelectedTime(null);
                  setSlots([]);
                }}
                className={`text-left p-4 rounded-xl border transition-all ${
                  selectedService?.id === service.id
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-zinc-100">
                    {service.name}
                  </span>
                  {selectedService?.id === service.id && (
                    <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-zinc-500 text-sm flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(service.durationMinutes)}
                  </span>
                  <span className="text-amber-400 font-bold">
                    {formatPrice(service.price)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <button
            disabled={!selectedService}
            onClick={() => setStep(2)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Continuar
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Step 2 — barber selection
  function renderStep2() {
    return (
      <div>
        <h2 className="text-xl font-bold text-zinc-100 mb-1">
          Elegí tu barbero
        </h2>
        <p className="text-zinc-500 text-sm mb-6">
          O continuá sin preferencia
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setSelectedBarberId(NO_PREFERENCE_ID)}
            className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
              selectedBarberId === NO_PREFERENCE_ID
                ? "border-amber-500 bg-amber-500/10"
                : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center mb-2">
              <User className="w-6 h-6 text-zinc-400" />
            </div>
            <span className="text-xs font-medium text-zinc-400 leading-tight">
              Sin preferencia
            </span>
            {selectedBarberId === NO_PREFERENCE_ID && (
              <Check className="w-4 h-4 text-amber-500 mt-1" />
            )}
          </button>

          {barbers.map((barber) => (
            <button
              key={barber.id}
              onClick={() => setSelectedBarberId(barber.id)}
              className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                selectedBarberId === barber.id
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
              }`}
            >
              {barber.avatarUrl ? (
                <div className="relative w-14 h-14 rounded-full overflow-hidden mb-2 ring-2 ring-zinc-700">
                  <Image
                    src={barber.avatarUrl}
                    alt={barber.displayName}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center mb-2 font-bold text-amber-400">
                  {getInitials(barber.displayName)}
                </div>
              )}
              <span className="text-xs font-medium text-zinc-300 leading-tight line-clamp-2">
                {barber.displayName}
              </span>
              {selectedBarberId === barber.id && (
                <Check className="w-4 h-4 text-amber-500 mt-1" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 py-3 px-4 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
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
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Continuar
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Step 3 — date + time selection
  function renderStep3() {
    if (!selectedService) return null;
    return (
      <div>
        <h2 className="text-xl font-bold text-zinc-100 mb-1">
          Fecha y horario
        </h2>
        <p className="text-zinc-500 text-sm mb-6">
          Elegí cuándo querés tu turno
        </p>

        {/* Date strip */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {dates.map(({ dateStr, dayLabel, dayNum, monthLabel, isOpen }) => (
            <button
              key={dateStr}
              disabled={!isOpen}
              onClick={() => handleDateSelect(dateStr)}
              className={`flex-shrink-0 flex flex-col items-center py-3 px-2 rounded-xl border w-[4.25rem] transition-all ${
                !isOpen
                  ? "border-zinc-800 bg-zinc-900/50 opacity-40 cursor-not-allowed"
                  : selectedDate === dateStr
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
              }`}
            >
              <span className="text-xs text-zinc-500 uppercase">{dayLabel}</span>
              <span
                className={`text-lg font-bold mt-0.5 ${
                  selectedDate === dateStr ? "text-amber-400" : "text-zinc-100"
                }`}
              >
                {dayNum}
              </span>
              <span className="text-xs text-zinc-500">{monthLabel}</span>
            </button>
          ))}
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div className="mt-6">
            <p className="text-sm font-medium text-zinc-400 mb-3">
              Horarios disponibles —{" "}
              <span className="capitalize">
                {formatDisplayDate(selectedDate)}
              </span>
            </p>
            {slotsLoading ? (
              <div className="flex items-center gap-2 text-zinc-500 py-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Cargando horarios...</span>
              </div>
            ) : slots.length === 0 ? (
              <p className="text-zinc-500 text-sm py-6">
                No hay horarios disponibles para este día
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedTime(slot)}
                    className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${
                      selectedTime === slot
                        ? "border-amber-500 bg-amber-500/10 text-amber-400"
                        : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setStep(2)}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 py-3 px-4 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Atrás
          </button>
          <button
            disabled={!selectedDate || !selectedTime}
            onClick={() => setStep(4)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Continuar
            <ChevronRight className="w-4 h-4" />
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
        <h2 className="text-xl font-bold text-zinc-100 mb-1">Tus datos</h2>
        <p className="text-zinc-500 text-sm mb-6">Para confirmar tu turno</p>

        {/* Booking summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 space-y-2.5 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-zinc-500 flex-shrink-0">Servicio</span>
            <span className="text-zinc-200 font-medium text-right">
              {selectedService?.name}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-zinc-500 flex-shrink-0">Barbero</span>
            <span className="text-zinc-200 font-medium text-right">
              {selectedBarberName}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-zinc-500 flex-shrink-0">Fecha</span>
            <span className="text-zinc-200 font-medium text-right capitalize">
              {selectedDate ? formatDisplayDate(selectedDate) : ""}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-zinc-500 flex-shrink-0">Hora</span>
            <span className="text-amber-400 font-bold">{selectedTime}</span>
          </div>
        </div>

        {existingClient && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
            <p className="text-amber-300 text-sm font-medium">
              ¡Hola {existingClient.name}!{" "}
              {existingDrink
                ? `¿Querés el mismo corte de siempre con tu ${existingDrink}?`
                : "¡Bienvenido de vuelta!"}
            </p>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="tenantId" value={tenantId} />
          <input
            type="hidden"
            name="serviceId"
            value={selectedService?.id ?? ""}
          />
          <input
            type="hidden"
            name="barberId"
            value={selectedBarberId ?? NO_PREFERENCE_ID}
          />
          <input type="hidden" name="date" value={selectedDate ?? ""} />
          <input type="hidden" name="startTime" value={selectedTime ?? ""} />

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Nombre <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Tu nombre"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
            {state?.error?.name && (
              <p className="mt-1 text-xs text-red-400">{state.error.name[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Teléfono <span className="text-amber-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={handlePhoneBlur}
              required
              placeholder="Tu teléfono"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
            {clientLoading && (
              <p className="mt-1 text-xs text-zinc-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Buscando tu perfil...
              </p>
            )}
            {state?.error?.phone && (
              <p className="mt-1 text-xs text-red-400">
                {state.error.phone[0]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Coffee className="w-4 h-4 text-zinc-500" />
                Bebida preferida{" "}
                <span className="text-zinc-600 font-normal">(opcional)</span>
              </span>
            </label>
            <input
              type="text"
              name="drink"
              value={drink}
              onChange={(e) => setDrink(e.target.value)}
              placeholder={existingDrink ?? "Café, mate, agua..."}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Music className="w-4 h-4 text-zinc-500" />
                Música preferida{" "}
                <span className="text-zinc-600 font-normal">(opcional)</span>
              </span>
            </label>
            <input
              type="text"
              name="music"
              value={music}
              onChange={(e) => setMusic(e.target.value)}
              placeholder={existingMusic ?? "Rock, reggaeton, jazz..."}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>

          {state?.error?._form && (
            <div className="rounded-xl bg-red-950/50 border border-red-800 p-4">
              <p className="text-sm text-red-400">{state.error._form[0]}</p>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 py-3 px-4 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Atrás
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim() || !phone.trim()}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold py-3 px-6 rounded-xl transition-colors"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                "Confirmar turno"
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <a
            href={`/${slug}`}
            className="text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </a>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 truncate">{shopName}</p>
            <p className="font-bold text-zinc-100">Reservar turno</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
        {/* Step indicator */}
        <div className="flex items-start mb-8">
          {STEP_LABELS.map((label, index) => {
            const stepNum = (index + 1) as 1 | 2 | 3 | 4;
            const isCompleted = step > stepNum;
            const isCurrent = step === stepNum;
            return (
              <div
                key={stepNum}
                className={`flex items-start ${index < 3 ? "flex-1" : ""}`}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      isCompleted
                        ? "bg-amber-500 text-zinc-950"
                        : isCurrent
                          ? "bg-transparent border-2 border-amber-500 text-amber-400"
                          : "bg-zinc-800 border-2 border-zinc-700 text-zinc-600"
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                  </div>
                  <span
                    className={`text-xs mt-1.5 whitespace-nowrap ${
                      isCurrent
                        ? "text-amber-400"
                        : isCompleted
                          ? "text-zinc-400"
                          : "text-zinc-600"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {index < 3 && (
                  <div
                    className={`flex-1 h-px mt-4 mx-1 ${
                      step > stepNum ? "bg-amber-500" : "bg-zinc-800"
                    }`}
                  />
                )}
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
