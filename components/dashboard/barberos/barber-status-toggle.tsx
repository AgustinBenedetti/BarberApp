"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toggleBarberActive } from "@/actions/barbers-services";

interface BarberStatusToggleProps {
  barberId: string;
  isActive: boolean;
}

export function BarberStatusToggle({
  barberId,
  isActive: initialIsActive,
}: BarberStatusToggleProps) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const next = !isActive;
      const result = await toggleBarberActive(barberId, next);
      if (!result.error) {
        setIsActive(next);
        router.refresh();
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
        isActive
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
          : "border-border bg-muted/30 text-muted-foreground hover:bg-accent",
      )}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          isActive ? "bg-emerald-400" : "bg-muted-foreground",
        )}
      />
      {isPending ? "Guardando..." : isActive ? "Activo" : "Inactivo"}
    </button>
  );
}
