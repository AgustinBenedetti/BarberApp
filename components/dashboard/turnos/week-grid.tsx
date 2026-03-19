"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppointmentBlock } from "./appointment-block";
import type { AppointmentRow } from "@/actions/appointments";

const DAY_NAMES_ES = [
  "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom",
];

const MONTHS_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function getWeekDays(currentDate: string): string[] {
  const [year, month, day] = currentDate.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
}

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDayHeader(dateStr: string): { short: string; num: number; month: string } {
  const [, month, day] = dateStr.split("-").map(Number);
  const [year, m, d] = dateStr.split("-").map(Number);
  const date = new Date(year, m - 1, d);
  const dow = date.getDay();
  const idx = dow === 0 ? 6 : dow - 1; // Monday=0, Sunday=6
  return {
    short: DAY_NAMES_ES[idx],
    num: day,
    month: MONTHS_ES[month - 1],
  };
}

// Mobile: collapsible day row
function MobileDayRow({
  dateStr,
  appointments,
  onAppointmentClick,
  isToday,
}: {
  dateStr: string;
  appointments: AppointmentRow[];
  onAppointmentClick: (a: AppointmentRow) => void;
  isToday: boolean;
}) {
  const [open, setOpen] = useState(isToday);
  const { short, num, month } = formatDayHeader(dateStr);

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
        onClick={() => setOpen((v) => !v)}
      >
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg text-center",
            isToday ? "bg-primary text-primary-foreground" : "bg-muted/40",
          )}
        >
          <span className="text-[9px] font-semibold uppercase leading-none tracking-wide">
            {short}
          </span>
          <span className="text-sm font-bold leading-tight tabular-nums">
            {num}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {short} {num} de {month}
            {isToday && (
              <span className="ml-1.5 text-[10px] font-semibold text-primary">
                hoy
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {appointments.length === 0
              ? "Sin turnos"
              : `${appointments.length} ${appointments.length === 1 ? "turno" : "turnos"}`}
          </p>
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="space-y-1.5 px-4 pb-3">
          {appointments.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground/60">
              No hay turnos para este día
            </p>
          ) : (
            appointments.map((appt) => (
              <AppointmentBlock
                key={appt.id}
                appointment={appt}
                onClick={onAppointmentClick}
                mode="list"
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface WeekGridProps {
  currentDate: string;
  appointments: AppointmentRow[];
  onAppointmentClick: (appointment: AppointmentRow) => void;
}

export function WeekGrid({
  currentDate,
  appointments,
  onAppointmentClick,
}: WeekGridProps) {
  const weekDays = getWeekDays(currentDate);
  const today = todayISO();

  const byDay: Record<string, AppointmentRow[]> = {};
  for (const day of weekDays) byDay[day] = [];
  for (const appt of appointments) {
    if (byDay[appt.date]) byDay[appt.date].push(appt);
  }

  return (
    <>
      {/* Mobile: collapsible list */}
      <div className="md:hidden">
        {weekDays.map((dateStr) => (
          <MobileDayRow
            key={dateStr}
            dateStr={dateStr}
            appointments={byDay[dateStr]}
            onAppointmentClick={onAppointmentClick}
            isToday={dateStr === today}
          />
        ))}
      </div>

      {/* Desktop: 7-column grid */}
      <div className="mx-auto hidden max-w-5xl px-4 py-4 md:block">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((dateStr) => {
            const { short, num, month } = formatDayHeader(dateStr);
            const isToday = dateStr === today;
            return (
              <div key={dateStr} className="text-center">
                <div
                  className={cn(
                    "mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-lg",
                    isToday ? "bg-primary text-primary-foreground" : "",
                  )}
                >
                  <span
                    className={cn(
                      "text-[9px] font-semibold uppercase leading-none tracking-wide",
                      isToday ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {short}
                  </span>
                  <span className="text-sm font-bold tabular-nums leading-tight">
                    {num}
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-0.5 text-[9px]",
                    isToday ? "text-primary font-semibold" : "text-muted-foreground/50",
                  )}
                >
                  {month}
                </p>
              </div>
            );
          })}
        </div>

        {/* Appointment columns */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((dateStr) => {
            const dayAppts = byDay[dateStr];
            const isToday = dateStr === today;
            return (
              <div
                key={dateStr}
                className={cn(
                  "min-h-[120px] rounded-xl border p-1.5 space-y-1",
                  isToday ? "border-primary/20 bg-primary/3" : "border-border/50 bg-card/30",
                )}
              >
                {dayAppts.length === 0 ? (
                  <p className="py-2 text-center text-[10px] text-muted-foreground/30">
                    —
                  </p>
                ) : (
                  dayAppts.map((appt) => (
                    <button
                      key={appt.id}
                      onClick={() => onAppointmentClick(appt)}
                      className={cn(
                        "w-full rounded-lg border px-1.5 py-1 text-left text-[10px] leading-tight transition-colors",
                        appt.status === "pending" && "border-amber-500/20 bg-amber-500/8 hover:bg-amber-500/12",
                        appt.status === "confirmed" && "border-emerald-500/20 bg-emerald-500/8 hover:bg-emerald-500/12",
                        appt.status === "completed" && "border-border bg-muted/30 hover:bg-muted/50",
                        (appt.status === "cancelled" || appt.status === "no_show") && "border-red-500/20 bg-red-500/8 hover:bg-red-500/12",
                      )}
                    >
                      <p className="truncate font-semibold">{appt.clientName}</p>
                      <p className="truncate text-muted-foreground">
                        {appt.startTime.slice(0, 5)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
