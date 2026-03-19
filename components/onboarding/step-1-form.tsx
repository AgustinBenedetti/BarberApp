"use client";

import { useActionState, useState, useEffect } from "react";
import { saveStep1 } from "@/actions/onboarding";
import { Button } from "@/components/ui/button";
import { DAYS, DAY_LABELS, type Day } from "@/lib/validations/onboarding";

const INPUT_CLS =
  "w-full rounded-xl border border-input bg-secondary/40 px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

const SELECT_CLS =
  "rounded-xl border border-input bg-secondary/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors";

// 30-minute intervals from 06:00 to 23:30
const TIME_OPTIONS = Array.from({ length: 36 }, (_, i) => {
  const total = 6 * 60 + i * 30;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

type DaySchedule = { closed: boolean; open: string; close: string };
type OpeningHours = Record<Day, DaySchedule>;

const DEFAULT_HOURS: OpeningHours = {
  monday: { closed: false, open: "09:00", close: "19:00" },
  tuesday: { closed: false, open: "09:00", close: "19:00" },
  wednesday: { closed: false, open: "09:00", close: "19:00" },
  thursday: { closed: false, open: "09:00", close: "19:00" },
  friday: { closed: false, open: "09:00", close: "19:00" },
  saturday: { closed: false, open: "09:00", close: "17:00" },
  sunday: { closed: true, open: "09:00", close: "17:00" },
};

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}

export function Step1Form() {
  const [state, action, isPending] = useActionState(saveStep1, null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [hours, setHours] = useState<OpeningHours>(DEFAULT_HOURS);

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(name));
  }, [name, slugEdited]);

  const toggleDay = (day: Day) =>
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], closed: !prev[day].closed },
    }));

  const updateTime = (day: Day, field: "open" | "close", value: string) =>
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));

  return (
    <form action={action} className="space-y-5">
      {state?.error?._form && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {state.error._form[0]}
        </div>
      )}

      {/* Nombre */}
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Nombre de la barbería <span className="text-destructive">*</span>
        </label>
        <input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Barbería El Clásico"
          className={INPUT_CLS}
          required
        />
        {state?.error?.name && (
          <p className="text-xs text-destructive">{state.error.name[0]}</p>
        )}
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <label htmlFor="slug" className="text-sm font-medium">
          URL de tu barbería <span className="text-destructive">*</span>
        </label>
        <div className="flex items-center gap-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <span className="shrink-0 text-muted-foreground">app.com/</span>
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
            placeholder="barberia-el-clasico"
            className="min-w-0 flex-1 bg-transparent focus:outline-none"
            required
          />
        </div>
        {state?.error?.slug && (
          <p className="text-xs text-destructive">{state.error.slug[0]}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Solo minúsculas, números y guiones
        </p>
      </div>

      {/* Dirección */}
      <div className="space-y-1.5">
        <label htmlFor="address" className="text-sm font-medium">
          Dirección
        </label>
        <input
          id="address"
          name="address"
          placeholder="Av. Corrientes 1234, Buenos Aires"
          className={INPUT_CLS}
        />
      </div>

      {/* Logo */}
      <div className="space-y-1.5">
        <label htmlFor="logo" className="text-sm font-medium">
          Logo
        </label>
        <input
          id="logo"
          name="logo"
          type="file"
          accept="image/*"
          className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
        />
      </div>

      {/* Horarios */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Horarios de atención</p>
        <div className="divide-y rounded-lg border">
          {DAYS.map((day) => (
            <div
              key={day}
              className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center"
            >
              {/* Day label + toggle */}
              <div className="flex items-center justify-between sm:w-36">
                <span className="text-sm font-medium">{DAY_LABELS[day]}</span>
                <button
                  type="button"
                  onClick={() => toggleDay(day)}
                  aria-label={
                    hours[day].closed ? "Abrir día" : "Cerrar día"
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                    hours[day].closed ? "bg-muted" : "bg-primary"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      hours[day].closed ? "translate-x-0.5" : "translate-x-5"
                    }`}
                  />
                </button>
              </div>

              {/* Hidden input always submitted */}
              <input
                type="hidden"
                name={`openingHours.${day}.closed`}
                value={String(hours[day].closed)}
              />

              {/* Time selects or "Cerrado" label */}
              {!hours[day].closed ? (
                <div className="flex items-center gap-2">
                  <select
                    name={`openingHours.${day}.open`}
                    value={hours[day].open}
                    onChange={(e) => updateTime(day, "open", e.target.value)}
                    className={SELECT_CLS}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-muted-foreground">a</span>
                  <select
                    name={`openingHours.${day}.close`}
                    value={hours[day].close}
                    onChange={(e) => updateTime(day, "close", e.target.value)}
                    className={SELECT_CLS}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">Cerrado</span>
                  <input
                    type="hidden"
                    name={`openingHours.${day}.open`}
                    value={hours[day].open}
                  />
                  <input
                    type="hidden"
                    name={`openingHours.${day}.close`}
                    value={hours[day].close}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Guardando..." : "Continuar →"}
      </Button>
    </form>
  );
}
