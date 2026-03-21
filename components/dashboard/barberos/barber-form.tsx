"use client";

import { useActionState, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createBarber, updateBarber, deleteBarber } from "@/actions/barbers-services";
import type { BarberRow, BarberAvailability } from "@/actions/barbers-services";
import { Button } from "@/components/ui/button";
import { DAYS, DAY_LABELS, type Day } from "@/lib/validations/onboarding";

// ─── Constants ─────────────────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full rounded-xl border border-input bg-secondary/40 px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

const SELECT_CLS =
  "rounded-xl border border-input bg-secondary/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors";

const TIME_OPTIONS = Array.from({ length: 36 }, (_, i) => {
  const total = 6 * 60 + i * 30;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

type DaySchedule = { closed: boolean; open: string; close: string };

const DEFAULT_AVAILABILITY: BarberAvailability = {
  monday: { closed: false, open: "09:00", close: "19:00" },
  tuesday: { closed: false, open: "09:00", close: "19:00" },
  wednesday: { closed: false, open: "09:00", close: "19:00" },
  thursday: { closed: false, open: "09:00", close: "19:00" },
  friday: { closed: false, open: "09:00", close: "19:00" },
  saturday: { closed: false, open: "09:00", close: "17:00" },
  sunday: { closed: true, open: "09:00", close: "17:00" },
};

// ─── Component ─────────────────────────────────────────────────────────────────

interface BarberFormProps {
  barber?: BarberRow;
}

export function BarberForm({ barber }: BarberFormProps) {
  const router = useRouter();
  const isEditing = !!barber;

  const action = isEditing ? updateBarber : createBarber;
  const [state, formAction, isPending] = useActionState(action, null);

  // Redirect on successful creation
  useEffect(() => {
    if (state?.success && !isEditing) {
      router.push("/dashboard/barberos");
    }
  }, [state?.success, isEditing, router]);

  const [mode, setMode] = useState<"no_account" | "invite">("no_account");
  const [availability, setAvailability] = useState<BarberAvailability>(
    barber?.availability ?? DEFAULT_AVAILABILITY,
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    barber?.avatarUrl ?? null,
  );
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const toggleDay = (day: Day) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], closed: !prev[day].closed },
    }));
  };

  const updateTime = (day: Day, field: "open" | "close", value: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("El avatar no puede superar los 5 MB");
      e.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      setPhotoError("El archivo debe ser una imagen");
      e.target.value = "";
      return;
    }
    setPhotoError(null);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const handleDelete = () => {
    if (!barber) return;
    startDeleteTransition(async () => {
      const result = await deleteBarber(barber.id);
      if (result.error) {
        setDeleteError(result.error._form?.[0] ?? "Error al eliminar");
        setShowDeleteConfirm(false);
      } else {
        router.push("/dashboard/barberos");
      }
    });
  };

  const successMsg = state?.success
    ? isEditing
      ? "Cambios guardados"
      : "Barbero creado"
    : null;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-6">
        {/* Hidden id for edit */}
        {isEditing && (
          <input type="hidden" name="id" value={barber.id} />
        )}

        {/* Global errors */}
        {state?.error?._form && (
          <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.error._form[0]}
          </div>
        )}
        {successMsg && (
          <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            {successMsg}
          </div>
        )}

        {/* ── Avatar ── */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Foto</label>
          <div className="flex items-center gap-4">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="h-16 w-16 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-lg font-bold text-muted-foreground">
                {barber?.displayName ? barber.displayName[0].toUpperCase() : "?"}
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                name="photo"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
              />
              {photoError ? (
                <p className="mt-1 text-xs text-destructive">{photoError}</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  JPG, PNG, WEBP — máx. 5 MB
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Nombre ── */}
        <div className="space-y-1.5">
          <label htmlFor="displayName" className="text-sm font-medium">
            Nombre <span className="text-destructive">*</span>
          </label>
          <input
            id="displayName"
            name="displayName"
            placeholder="Juan García"
            defaultValue={barber?.displayName}
            className={INPUT_CLS}
            required
          />
          {state?.error?.displayName && (
            <p className="text-xs text-destructive">
              {state.error.displayName[0]}
            </p>
          )}
        </div>

        {/* ── Bio ── */}
        <div className="space-y-1.5">
          <label htmlFor="bio" className="text-sm font-medium">
            Bio{" "}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={2}
            placeholder="Especialista en degradé y barba..."
            defaultValue={barber?.bio ?? ""}
            className={cn(INPUT_CLS, "resize-none")}
          />
        </div>

        {/* ── Mode (solo en creación) ── */}
        {!isEditing && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Tipo de creación</p>
            <div className="grid grid-cols-2 gap-2">
              {(["no_account", "invite"] as const).map((m) => (
                <label
                  key={m}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-colors",
                    mode === m
                      ? "border-primary/60 bg-primary/5"
                      : "border-border hover:border-border/60 hover:bg-accent/30",
                  )}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={m}
                    checked={mode === m}
                    onChange={() => setMode(m)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">
                    {m === "no_account" ? "Sin cuenta" : "Invitar por email"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {m === "no_account"
                      ? "Solo registra el barbero, sin acceso al sistema"
                      : "Le enviás un email de invitación para que cree su cuenta"}
                  </span>
                </label>
              ))}
            </div>

            {mode === "invite" && (
              <div className="space-y-1.5 pt-1">
                <label htmlFor="email" className="text-sm font-medium">
                  Email del barbero <span className="text-destructive">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="juan@email.com"
                  className={INPUT_CLS}
                />
                {state?.error?.email && (
                  <p className="text-xs text-destructive">
                    {state.error.email[0]}
                  </p>
                )}
              </div>
            )}

            {mode === "no_account" && (
              <input type="hidden" name="mode" value="no_account" />
            )}
          </div>
        )}

        {/* ── Disponibilidad ── */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Horario disponible</p>
          <div className="divide-y rounded-xl border border-border">
            {DAYS.map((day) => {
              const sched: DaySchedule = availability[day];
              return (
                <div
                  key={day}
                  className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center justify-between sm:w-36">
                    <span className="text-sm font-medium">
                      {DAY_LABELS[day]}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleDay(day)}
                      aria-label={sched.closed ? "Abrir día" : "Cerrar día"}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                        sched.closed ? "bg-muted" : "bg-primary",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                          sched.closed ? "translate-x-0.5" : "translate-x-5",
                        )}
                      />
                    </button>
                  </div>

                  {/* Hidden inputs always submitted */}
                  <input
                    type="hidden"
                    name={`availability.${day}.closed`}
                    value={String(sched.closed)}
                  />

                  {!sched.closed ? (
                    <div className="flex items-center gap-2">
                      <select
                        name={`availability.${day}.open`}
                        value={sched.open}
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
                        name={`availability.${day}.close`}
                        value={sched.close}
                        onChange={(e) =>
                          updateTime(day, "close", e.target.value)
                        }
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
                      <span className="text-sm text-muted-foreground">
                        No disponible
                      </span>
                      <input
                        type="hidden"
                        name={`availability.${day}.open`}
                        value={sched.open}
                      />
                      <input
                        type="hidden"
                        name={`availability.${day}.close`}
                        value={sched.close}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending
            ? "Guardando..."
            : isEditing
              ? "Guardar cambios"
              : "Agregar barbero"}
        </Button>
      </form>

      {/* ── Acciones de edición ── */}
      {isEditing && (
        <div className="space-y-3 border-t border-border pt-6">
          {/* Delete error */}
          {deleteError && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar barbero
            </button>
          ) : (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="mb-3 text-sm font-medium">
                ¿Eliminar a {barber.displayName}?
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteError(null);
                  }}
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isDeleting ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
