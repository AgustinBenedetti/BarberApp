import { Scissors } from "lucide-react";
import { ProgressBar } from "@/components/onboarding/progress-bar";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background px-4 py-10 overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 50% 30% at 50% 0%, oklch(0.769 0.188 73 / 0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-2xl space-y-8">
        {/* Brand header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <Scissors className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              BarberSaaS
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground/60">
              Configurá tu barbería en minutos
            </p>
          </div>
        </div>

        {/* Progress */}
        <ProgressBar />

        {/* Step content */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
