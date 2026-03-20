/**
 * Parsea una fecha YYYY-MM-DD sin interpretar como UTC midnight.
 * new Date("2024-03-15") en UTC-3 daría "14 mar" — incorrecto.
 * Añadir "T12:00:00" fuerza el mediodía local y evita el off-by-one.
 */
export function parseDateSafe(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`);
}

export type Category = "Nuevo" | "Regular" | "VIP";

export function getCategory(visitCount: number): Category {
  if (visitCount <= 1) return "Nuevo";
  if (visitCount < 6) return "Regular";
  return "VIP";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export const CATEGORY_STYLES: Record<Category, string> = {
  Nuevo: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  Regular: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  VIP: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};
