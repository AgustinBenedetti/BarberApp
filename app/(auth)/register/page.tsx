import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Crear cuenta</h1>
          <p className="text-sm text-muted-foreground">
            Comenzá a usar BarberSaaS gratis
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
