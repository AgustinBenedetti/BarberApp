"use client";

import { usePathname } from "next/navigation";
import { Check } from "lucide-react";

const STEPS = [
  { n: 1, label: "Barbería", path: "/onboarding/step-1" },
  { n: 2, label: "Servicios", path: "/onboarding/step-2" },
  { n: 3, label: "Equipo", path: "/onboarding/step-3" },
];

export function ProgressBar() {
  const pathname = usePathname();
  const currentStep = STEPS.find((s) => s.path === pathname)?.n ?? 1;

  return (
    <div className="space-y-1">
      {/* Tab-style step indicator — patrón Stitch */}
      <div className="flex border-b border-border">
        {STEPS.map((step) => {
          const isCompleted = step.n < currentStep;
          const isCurrent = step.n === currentStep;

          return (
            <div
              key={step.n}
              className={`flex flex-1 flex-col items-center gap-1.5 pb-3 transition-colors ${
                isCurrent
                  ? "border-b-2 border-primary"
                  : isCompleted
                    ? "border-b-2 border-primary/30"
                    : "border-b-2 border-transparent"
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                      ? "bg-primary/15 text-primary ring-2 ring-primary/30"
                      : "bg-secondary text-muted-foreground/40"
                }`}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : step.n}
              </div>
              <span
                className={`text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                  isCurrent
                    ? "text-foreground"
                    : isCompleted
                      ? "text-muted-foreground"
                      : "text-muted-foreground/40"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step counter */}
      <p className="text-center text-[10px] text-muted-foreground/60">
        Paso {currentStep} de {STEPS.length}
      </p>
    </div>
  );
}
