"use client";

import { CalendarClock } from "lucide-react";
import { AppointmentBlock } from "./appointment-block";
import type { AppointmentRow } from "@/actions/appointments";

type OpeningHours = Record<
  string,
  { closed?: boolean; open?: string; close?: string }
>;

const WEEK_DAYS = [
  "sunday", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday",
] as const;

const PX_PER_MINUTE = 1.5;
const MIN_HOUR_HEIGHT = PX_PER_MINUTE * 60; // 90px

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function getDayBounds(
  dateStr: string,
  openingHours: OpeningHours | null,
): { openMin: number; closeMin: number } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const dayKey = WEEK_DAYS[d.getDay()];
  const dayHours = openingHours?.[dayKey];

  if (dayHours && !dayHours.closed && dayHours.open && dayHours.close) {
    return {
      openMin: timeToMinutes(dayHours.open),
      closeMin: timeToMinutes(dayHours.close),
    };
  }

  // Default: 08:00 – 20:00
  return { openMin: 8 * 60, closeMin: 20 * 60 };
}

function buildHourLabels(openMin: number, closeMin: number): string[] {
  const labels: string[] = [];
  const startHour = Math.floor(openMin / 60);
  const endHour = Math.ceil(closeMin / 60);
  for (let h = startHour; h <= endHour; h++) {
    labels.push(`${String(h).padStart(2, "0")}:00`);
  }
  return labels;
}

interface DayTimelineProps {
  date: string;
  appointments: AppointmentRow[];
  openingHours: OpeningHours | null;
  onAppointmentClick: (appointment: AppointmentRow) => void;
}

export function DayTimeline({
  date,
  appointments,
  openingHours,
  onAppointmentClick,
}: DayTimelineProps) {
  const { openMin, closeMin } = getDayBounds(date, openingHours);
  const totalMinutes = closeMin - openMin;
  const containerHeight = totalMinutes * PX_PER_MINUTE;
  const hourLabels = buildHourLabels(openMin, closeMin);

  if (appointments.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Empty timeline with hour lines */}
        <div className="relative flex gap-3">
          {/* Hour labels */}
          <div
            className="relative w-12 shrink-0 select-none"
            style={{ height: `${containerHeight}px` }}
          >
            {hourLabels.map((label, i) => (
              <span
                key={label}
                className="absolute right-0 text-[10px] tabular-nums text-muted-foreground/50 -translate-y-2"
                style={{ top: `${i * MIN_HOUR_HEIGHT}px` }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Grid area */}
          <div
            className="relative flex-1 rounded-xl border border-border/50"
            style={{ height: `${containerHeight}px` }}
          >
            {hourLabels.map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-border/30"
                style={{ top: `${i * MIN_HOUR_HEIGHT}px` }}
              />
            ))}

            {/* Empty state overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <CalendarClock className="h-8 w-8 text-muted-foreground/20" />
              <p className="mt-3 text-sm font-medium text-muted-foreground/50">
                Sin turnos para este día
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      <div className="relative flex gap-3">
        {/* Hour labels */}
        <div
          className="relative w-12 shrink-0 select-none"
          style={{ height: `${containerHeight}px` }}
        >
          {hourLabels.map((label, i) => (
            <span
              key={label}
              className="absolute right-0 text-[10px] tabular-nums text-muted-foreground/50 -translate-y-2"
              style={{ top: `${i * MIN_HOUR_HEIGHT}px` }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Timeline grid + appointments */}
        <div
          className="relative flex-1"
          style={{ height: `${containerHeight}px` }}
        >
          {/* Hour grid lines */}
          {hourLabels.map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-border/30"
              style={{ top: `${i * MIN_HOUR_HEIGHT}px` }}
            />
          ))}

          {/* Appointment blocks */}
          {appointments.map((appt) => {
            const apptStart = timeToMinutes(appt.startTime);
            const apptEnd = timeToMinutes(appt.endTime);
            const topPx = (apptStart - openMin) * PX_PER_MINUTE;
            const heightPx = (apptEnd - apptStart) * PX_PER_MINUTE;

            // Clamp to visible area
            if (apptStart >= closeMin || apptEnd <= openMin) return null;

            return (
              <AppointmentBlock
                key={appt.id}
                appointment={appt}
                onClick={onAppointmentClick}
                mode="timeline"
                topPx={Math.max(topPx, 0)}
                heightPx={heightPx}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
