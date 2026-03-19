import { RegisterForm } from "@/components/auth/register-form";
import { Scissors } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 40% at 70% 0%, oklch(0.769 0.188 73 / 0.10) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <Scissors className="h-5 w-5 text-primary-foreground" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            BarberSaaS
          </p>
        </div>

        {/* Title */}
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Creá tu cuenta</h1>
          <p className="text-sm text-muted-foreground">
            Empezá a gestionar tu barbería gratis
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <RegisterForm />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
