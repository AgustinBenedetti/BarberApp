"use client";

import { useActionState, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Scissors, Trash2, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createService,
  updateService,
  deleteService,
  toggleServiceActive,
} from "@/actions/barbers-services";
import type { ServiceRow, ServiceActionState } from "@/actions/barbers-services";
import { Button } from "@/components/ui/button";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: string): string {
  const num = parseFloat(price);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const INPUT_CLS =
  "w-full rounded-xl border border-input bg-secondary/40 px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

// ─── Toggle ───────────────────────────────────────────────────────────────────

function ServiceToggle({
  serviceId,
  isActive,
  onToggle,
}: {
  serviceId: string;
  isActive: boolean;
  onToggle: (id: string, next: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      await toggleServiceActive(serviceId, !isActive);
      onToggle(serviceId, !isActive);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={isActive ? "Desactivar servicio" : "Activar servicio"}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50",
        isActive ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
          isActive ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

// ─── Service form (inside drawer) ─────────────────────────────────────────────

interface ServiceFormProps {
  service?: ServiceRow;
  onSuccess: (service?: ServiceRow) => void;
}

function ServiceForm({ service, onSuccess }: ServiceFormProps) {
  const isEditing = !!service;
  const action = isEditing ? updateService : createService;
  const [state, formAction, isPending] = useActionState<
    ServiceActionState | null,
    FormData
  >(action, null);
  const [isActive, setIsActive] = useState(service?.isActive ?? true);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      onSuccess(state.service);
    }
  }, [state?.success, state?.service, onSuccess]);

  const handleDelete = () => {
    if (!service) return;
    startDeleteTransition(async () => {
      const result = await deleteService(service.id);
      if (result.error) {
        setDeleteError(result.error._form?.[0] ?? "Error al eliminar");
        setShowDeleteConfirm(false);
      } else {
        router.refresh();
        onSuccess();
      }
    });
  };

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5">
        {isEditing && <input type="hidden" name="id" value={service.id} />}
        <input type="hidden" name="isActive" value={String(isActive)} />

        {state?.error?._form && (
          <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.error._form[0]}
          </div>
        )}

        {/* Nombre */}
        <div className="space-y-1.5">
          <label htmlFor="service-name" className="text-sm font-medium">
            Nombre <span className="text-destructive">*</span>
          </label>
          <input
            id="service-name"
            name="name"
            placeholder="Corte clásico"
            defaultValue={service?.name}
            className={INPUT_CLS}
            required
          />
          {state?.error?.name && (
            <p className="text-xs text-destructive">{state.error.name[0]}</p>
          )}
        </div>

        {/* Duración + Precio */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="service-duration"
              className="text-sm font-medium"
            >
              Duración (min) <span className="text-destructive">*</span>
            </label>
            <input
              id="service-duration"
              name="durationMinutes"
              type="number"
              min={5}
              max={480}
              step={5}
              placeholder="30"
              defaultValue={service?.durationMinutes}
              className={INPUT_CLS}
              required
            />
            {state?.error?.durationMinutes && (
              <p className="text-xs text-destructive">
                {state.error.durationMinutes[0]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="service-price" className="text-sm font-medium">
              Precio (ARS) <span className="text-destructive">*</span>
            </label>
            <input
              id="service-price"
              name="price"
              type="number"
              min={0}
              step={100}
              placeholder="5000"
              defaultValue={service ? parseFloat(service.price) : undefined}
              className={INPUT_CLS}
              required
            />
            {state?.error?.price && (
              <p className="text-xs text-destructive">
                {state.error.price[0]}
              </p>
            )}
          </div>
        </div>

        {/* Active toggle */}
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Activo</p>
            <p className="text-xs text-muted-foreground">
              Los clientes pueden reservar este servicio
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            aria-label={isActive ? "Desactivar" : "Activar"}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
              isActive ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                isActive ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </button>
        </label>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear servicio"}
        </Button>
      </form>

      {/* Delete section */}
      {isEditing && (
        <div className="space-y-3 border-t border-border pt-4">
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
              Eliminar servicio
            </button>
          ) : (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="mb-1 text-sm font-medium">
                ¿Eliminar {service.name}?
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

// ─── Drawer ────────────────────────────────────────────────────────────────────

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Lock scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-border/60 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </>
  );
}

// ─── Main view ─────────────────────────────────────────────────────────────────

interface ServicesViewProps {
  initialServices: ServiceRow[];
}

export function ServicesView({ initialServices }: ServicesViewProps) {
  const router = useRouter();
  const [serviceList, setServiceList] = useState<ServiceRow[]>(initialServices);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRow | undefined>(
    undefined,
  );

  const openCreate = () => {
    setEditingService(undefined);
    setDrawerOpen(true);
  };

  const openEdit = (service: ServiceRow) => {
    setEditingService(service);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingService(undefined);
  };

  const handleServiceSuccess = (updated?: ServiceRow) => {
    if (updated) {
      setServiceList((prev) => {
        const exists = prev.some((s) => s.id === updated.id);
        return exists
          ? prev.map((s) => (s.id === updated.id ? updated : s))
          : [...prev, updated];
      });
    }
    closeDrawer();
  };

  const handleToggle = (id: string, next: boolean) => {
    setServiceList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: next } : s)),
    );
    router.refresh();
  };

  const drawerTitle = editingService ? "Editar servicio" : "Nuevo servicio";

  return (
    <>
      {/* List */}
      {serviceList.length > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Agregar servicio</span>
            <span className="sm:hidden">Agregar</span>
          </button>
        </div>
      )}

      {serviceList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Scissors className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Sin servicios todavía</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Agregá tu primer servicio para que los clientes puedan reservar
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Agregar servicio
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {serviceList.map((service) => (
            <div
              key={service.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">
                    {service.name}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      service.isActive
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-border bg-muted/30 text-muted-foreground",
                    )}
                  >
                    {service.isActive ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDuration(service.durationMinutes)}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="font-medium text-foreground">
                    {formatPrice(service.price)}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <ServiceToggle
                  serviceId={service.id}
                  isActive={service.isActive}
                  onToggle={handleToggle}
                />
                <button
                  type="button"
                  onClick={() => openEdit(service)}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <Pencil className="h-3 w-3" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer */}
      <Drawer isOpen={drawerOpen} onClose={closeDrawer} title={drawerTitle}>
        <ServiceForm
          key={editingService?.id ?? "new"}
          service={editingService}
          onSuccess={handleServiceSuccess}
        />
      </Drawer>
    </>
  );
}
