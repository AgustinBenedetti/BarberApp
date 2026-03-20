"use client";

import { cn } from "@/lib/utils";
import type { ClientFilter } from "@/actions/clients";

const FILTERS: { value: ClientFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "new", label: "Nuevo" },
  { value: "vip", label: "VIP" },
  { value: "dormant", label: "Sin turno 30+ días" },
  { value: "upcoming", label: "Turno próximo" },
];

interface ClientFiltersProps {
  active: ClientFilter;
  onChange: (filter: ClientFilter) => void;
}

export function ClientFilters({ active, onChange }: ClientFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {FILTERS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
            active === value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
