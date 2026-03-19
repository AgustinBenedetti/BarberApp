"use client";

import { ChevronLeft, ChevronRight, CalendarDays, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DAYS_ES = [
  "domingo", "lunes", "martes", "miércoles",
  "jueves", "viernes", "sábado",
];
const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatDayLabel(dateStr: string, viewMode: "day" | "week"): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);

  if (viewMode === "day") {
    const dayName = DAYS_ES[d.getDay()];
    const monthName = MONTHS_ES[d.getMonth()];
    const todayStr = todayISO();
    if (dateStr === todayStr) return `Hoy · ${dayName} ${day} de ${monthName}`;
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${day} de ${monthName}`;
  }

  // Week: show Mon–Sun range
  const monday = getWeekStart(dateStr);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const m1 = MONTHS_ES[monday.getMonth()];
  const m2 = MONTHS_ES[sunday.getMonth()];
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}–${sunday.getDate()} de ${m1}`;
  }
  return `${monday.getDate()} de ${m1} – ${sunday.getDate()} de ${m2}`;
}

function getWeekStart(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

interface DateNavigatorProps {
  currentDate: string;
  viewMode: "day" | "week";
  onNavigate: (direction: -1 | 1) => void;
  onViewModeChange: (mode: "day" | "week") => void;
  onToday: () => void;
  onNewAppointment: () => void;
  isPending: boolean;
}

export function DateNavigator({
  currentDate,
  viewMode,
  onNavigate,
  onViewModeChange,
  onToday,
  onNewAppointment,
  isPending,
}: DateNavigatorProps) {
  const today = todayISO();
  const isToday = viewMode === "day" && currentDate === today;

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-[95px] z-30">
      <div className="mx-auto max-w-5xl px-4 py-3">
        {/* Row 1: Label + controls */}
        <div className="flex items-center justify-between gap-3">
          {/* Date label */}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {viewMode === "day" ? "Agenda del día" : "Vista semanal"}
            </p>
            <h2
              className={cn(
                "text-lg font-bold tracking-tight transition-opacity",
                isPending && "opacity-50",
              )}
            >
              {formatDayLabel(currentDate, viewMode)}
            </h2>
          </div>

          {/* Nav buttons */}
          <div className="flex items-center gap-1">
            {!isToday && (
              <Button
                variant="ghost"
                size="xs"
                onClick={onToday}
                className="hidden text-xs sm:flex"
              >
                Hoy
              </Button>
            )}
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => onNavigate(-1)}
              disabled={isPending}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => onNavigate(1)}
              disabled={isPending}
              aria-label="Siguiente"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Row 2: View toggle + New button */}
        <div className="mt-2 flex items-center justify-between gap-2">
          {/* Day/Week toggle */}
          <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
            <button
              onClick={() => onViewModeChange("day")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === "day"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Clock className="h-3 w-3" />
              Día
            </button>
            <button
              onClick={() => onViewModeChange("week")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === "week"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CalendarDays className="h-3 w-3" />
              Semana
            </button>
          </div>

          {/* New appointment */}
          <Button size="sm" onClick={onNewAppointment}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nuevo turno</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
