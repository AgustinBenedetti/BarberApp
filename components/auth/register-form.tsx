"use client";

import { useActionState } from "react";
import { register } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Mail } from "lucide-react";

const INPUT_CLS =
  "w-full rounded-xl border border-input bg-secondary/40 px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

export function RegisterForm() {
  const [state, action, isPending] = useActionState(register, null);

  if (state?.success) {
    return (
      <div className="space-y-4 py-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 border border-primary/20">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Revisá tu email</h2>
          <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
        </div>
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-primary hover:underline"
        >
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state?.error?._form && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error._form[0]}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          className={INPUT_CLS}
          required
        />
        {state?.error?.email && (
          <p className="text-xs text-destructive">{state.error.email[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          className={INPUT_CLS}
          required
        />
        {state?.error?.password && (
          <p className="text-xs text-destructive">{state.error.password[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Confirmar contraseña
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repetir contraseña"
          className={INPUT_CLS}
          required
        />
        {state?.error?.confirmPassword && (
          <p className="text-xs text-destructive">
            {state.error.confirmPassword[0]}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="mt-2 w-full">
        {isPending ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
    </form>
  );
}
