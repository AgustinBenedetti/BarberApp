"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { UserCog, Plus, Pencil, Check, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toggleBarberActive } from "@/actions/barbers-services";
import type { BarberRow } from "@/actions/barbers-services";

interface BarbersViewProps {
  initialBarbers: BarberRow[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function BarberAvatar({
  avatarUrl,
  displayName,
}: {
  avatarUrl: string | null;
  displayName: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className="h-12 w-12 rounded-full object-cover border border-border"
      />
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-bold text-muted-foreground">
      {getInitials(displayName)}
    </div>
  );
}

function ToggleButton({
  barberId,
  isActive,
  onToggle,
}: {
  barberId: string;
  isActive: boolean;
  onToggle: (id: string, next: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      await toggleBarberActive(barberId, !isActive);
      onToggle(barberId, !isActive);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={isActive ? "Desactivar barbero" : "Activar barbero"}
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

export function BarbersView({ initialBarbers }: BarbersViewProps) {
  const router = useRouter();
  const [barberList, setBarberList] = useState<BarberRow[]>(initialBarbers);

  const handleToggle = (id: string, next: boolean) => {
    setBarberList((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: next } : b)),
    );
    router.refresh();
  };

  if (barberList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <UserCog className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Sin barberos todavía</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Agregá tu primer barbero para empezar
        </p>
        <Link
          href="/dashboard/barberos/nuevo"
          className="mt-4 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Agregar barbero
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {barberList.map((barber) => (
        <div
          key={barber.id}
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors"
        >
          <BarberAvatar
            avatarUrl={barber.avatarUrl}
            displayName={barber.displayName}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold">
                {barber.displayName}
              </p>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  barber.isActive
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-border bg-muted/30 text-muted-foreground",
                )}
              >
                {barber.isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
            {barber.bio && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {barber.bio}
              </p>
            )}
            {barber.profileId ? (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground/60">
                <Check className="h-3 w-3 text-emerald-400" />
                Cuenta vinculada
              </p>
            ) : (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground/60">
                <X className="h-3 w-3" />
                Sin cuenta
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <ToggleButton
              barberId={barber.id}
              isActive={barber.isActive}
              onToggle={handleToggle}
            />
            <Link
              href={`/dashboard/barberos/${barber.id}`}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Pencil className="h-3 w-3" />
              <span className="hidden sm:inline">Editar</span>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
