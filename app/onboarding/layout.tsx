import { ProgressBar } from "@/components/onboarding/progress-bar";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-lg space-y-8">
        {/* Brand header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">BarberSaaS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configurá tu barbería en minutos
          </p>
        </div>

        {/* Progress */}
        <ProgressBar />

        {/* Step content */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}
