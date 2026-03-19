import { LoginForm } from "@/components/auth/login-form";
import { Scissors } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Ambient glow — warm amber en top-right, sutil */}
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
          <h1 className="text-2xl font-bold tracking-tight">Bienvenido de vuelta</h1>
          <p className="text-sm text-muted-foreground">
            Accedé a tu panel de administración
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <LoginForm />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Creá una gratis
          </Link>
        </p>
      </div>
    </main>
  );
}
