"use client";

import { usePathname } from "next/navigation";
import { Scissors, LogOut, ExternalLink, LayoutDashboard, CalendarClock, Users } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth";

interface DashboardTopNavProps {
  userEmail?: string;
  tenantSlug?: string;
  tenantName?: string;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/dashboard/turnos", label: "Turnos", icon: CalendarClock },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
];

export function DashboardTopNav({
  userEmail,
  tenantSlug,
  tenantName,
}: DashboardTopNavProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      {/* Main row */}
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Brand + tenant */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Scissors className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground leading-none">
              BarberSaaS
            </p>
            {tenantName ? (
              <p className="text-sm font-bold leading-tight tracking-tight truncate max-w-[160px]">
                {tenantName}
              </p>
            ) : (
              <p className="text-sm font-bold leading-tight tracking-tight text-muted-foreground">
                Panel
              </p>
            )}
          </div>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {tenantSlug && (
            <a
              href={`/${tenantSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:flex"
            >
              <ExternalLink className="h-3 w-3" />
              Ver landing
            </a>
          )}

          {userEmail && (
            <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground md:block">
              {userEmail}
            </span>
          )}

          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </form>
        </div>
      </div>

      {/* Nav tabs row */}
      <div className="mx-auto flex max-w-5xl items-end gap-0 px-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
