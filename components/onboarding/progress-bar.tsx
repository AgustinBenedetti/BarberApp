"use client";

import { usePathname } from "next/navigation";

const STEPS = [
  { n: 1, label: "Barbería", path: "/onboarding/step-1" },
  { n: 2, label: "Servicios", path: "/onboarding/step-2" },
  { n: 3, label: "Barberos", path: "/onboarding/step-3" },
];

export function ProgressBar() {
  const pathname = usePathname();
  const currentStep = STEPS.find((s) => s.path === pathname)?.n ?? 1;

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => (
        <div key={step.n} className="flex flex-1 items-center">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              step.n < currentStep
                ? "bg-primary text-primary-foreground"
                : step.n === currentStep
                  ? "ring-primary bg-primary text-primary-foreground ring-2 ring-offset-2"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {step.n < currentStep ? "✓" : step.n}
          </div>
          <span
            className={`ml-1.5 hidden text-xs sm:block ${
              step.n === currentStep
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className={`mx-2 h-0.5 flex-1 transition-colors ${
                step.n < currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
