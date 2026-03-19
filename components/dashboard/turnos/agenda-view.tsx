"use client";

import { useCallback, useState, useTransition } from "react";
import {
  getAppointmentsForDay,
  getAppointmentsForWeek,
} from "@/actions/appointments";
import { DateNavigator } from "./date-navigator";
import { DayTimeline } from "./day-timeline";
import { WeekGrid } from "./week-grid";
import { AppointmentModal } from "./appointment-modal";
import { NewAppointmentModal } from "./new-appointment-modal";
import type {
  AppointmentRow,
  BarberOption,
  ServiceOption,
} from "@/actions/appointments";

type OpeningHours = Record<
  string,
  { closed?: boolean; open?: string; close?: string }
>;

// ─── Date helpers ─────────────────────────────────────────────────────────────

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getWeekBounds(dateStr: string): { start: string; end: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  return { start: fmt(monday), end: fmt(sunday) };
}

// ─── Barber filter (owner only) ───────────────────────────────────────────────

interface BarberFilterProps {
  barbers: BarberOption[];
  selectedId: string;
  onChange: (id: string) => void;
}

function BarberFilter({ barbers, selectedId, onChange }: BarberFilterProps) {
  if (barbers.length <= 1) return null;
  return (
    <div className="mx-auto max-w-5xl px-4 pb-2 pt-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Barbero
        </span>
        <button
          onClick={() => onChange("")}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            selectedId === ""
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >
          Todos
        </button>
        {barbers.map((b) => (
          <button
            key={b.id}
            onClick={() => onChange(b.id)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selectedId === b.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {b.displayName}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AgendaViewProps {
  initialDate: string;
  initialAppointments: AppointmentRow[];
  userRole: "owner" | "barber";
  ownBarberId: string | null;
  tenantId: string;
  barbers: BarberOption[];
  services: ServiceOption[];
  openingHours: OpeningHours | null;
}

export function AgendaView({
  initialDate,
  initialAppointments,
  userRole,
  ownBarberId,
  tenantId,
  barbers,
  services,
  openingHours,
}: AgendaViewProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [appointments, setAppointments] = useState<AppointmentRow[]>(initialAppointments);
  const [isPending, startTransition] = useTransition();

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<AppointmentRow | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  // Need tenantId for new appointment — get from barbers (owner has access to all)
  // We'll pass it from barbers context. For now, derive it from the appointments or
  // use a workaround: the tenantId is opaque to client, but createManualAppointment
  // reads it server-side from auth context. So we don't need to pass it.

  const refresh = useCallback(
    (date: string, barberId: string, mode: "day" | "week") => {
      startTransition(async () => {
        let data: AppointmentRow[];
        if (mode === "day") {
          data = await getAppointmentsForDay(
            date,
            barberId || undefined,
          );
        } else {
          const { start, end } = getWeekBounds(date);
          data = await getAppointmentsForWeek(
            start,
            end,
            barberId || undefined,
          );
        }
        setAppointments(data);
      });
    },
    [],
  );

  function navigate(direction: -1 | 1) {
    const delta = viewMode === "week" ? direction * 7 : direction;
    const newDate = shiftDate(currentDate, delta);
    setCurrentDate(newDate);
    refresh(newDate, selectedBarberId, viewMode);
  }

  function goToday() {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setCurrentDate(todayStr);
    refresh(todayStr, selectedBarberId, viewMode);
  }

  function changeViewMode(mode: "day" | "week") {
    setViewMode(mode);
    refresh(currentDate, selectedBarberId, mode);
  }

  function changeBarber(barberId: string) {
    setSelectedBarberId(barberId);
    refresh(currentDate, barberId, viewMode);
  }

  function openDetail(appt: AppointmentRow) {
    setSelectedAppt(appt);
    setDetailOpen(true);
  }

  function handleRefresh() {
    refresh(currentDate, selectedBarberId, viewMode);
  }

  return (
    <div className="pb-20">
      {/* Sticky sub-header */}
      <DateNavigator
        currentDate={currentDate}
        viewMode={viewMode}
        onNavigate={navigate}
        onViewModeChange={changeViewMode}
        onToday={goToday}
        onNewAppointment={() => setNewOpen(true)}
        isPending={isPending}
      />

      {/* Barber filter (owner only) */}
      {userRole === "owner" && (
        <BarberFilter
          barbers={barbers}
          selectedId={selectedBarberId}
          onChange={changeBarber}
        />
      )}

      {/* Loading overlay */}
      {isPending && (
        <div className="mx-auto max-w-5xl px-4 py-2">
          <div className="h-0.5 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-primary/60" />
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === "day" ? (
        <DayTimeline
          date={currentDate}
          appointments={appointments}
          openingHours={openingHours}
          onAppointmentClick={openDetail}
        />
      ) : (
        <WeekGrid
          currentDate={currentDate}
          appointments={appointments}
          onAppointmentClick={openDetail}
        />
      )}

      {/* Appointment detail modal */}
      <AppointmentModal
        appointment={selectedAppt}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onRefresh={handleRefresh}
      />

      {/* New appointment modal */}
      <NewAppointmentModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSuccess={handleRefresh}
        barbers={barbers}
        services={services}
        userRole={userRole}
        ownBarberId={ownBarberId}
        tenantId={tenantId}
      />
    </div>
  );
}
