"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface ClientSearchProps {
  onSearch: (query: string) => void;
}

export function ClientSearch({ onSearch }: ClientSearchProps) {
  const [value, setValue] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(value);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, onSearch]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar por nombre o teléfono..."
        className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-primary/40 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
