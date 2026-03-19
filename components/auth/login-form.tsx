"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const INPUT_CLS =
  "w-full rounded-xl border border-input bg-secondary/40 px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

export function LoginForm() {
  const [state, action, isPending] = useActionState(login, null);

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
          autoComplete="current-password"
          placeholder="Tu contraseña"
          className={INPUT_CLS}
          required
        />
        {state?.error?.password && (
          <p className="text-xs text-destructive">{state.error.password[0]}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="mt-2 w-full">
        {isPending ? "Iniciando sesión..." : "Iniciar sesión"}
      </Button>
    </form>
  );
}
