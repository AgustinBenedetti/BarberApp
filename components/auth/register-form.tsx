"use client";

import { useActionState } from "react";
import { register } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const INPUT_CLS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function RegisterForm() {
  const [state, action, isPending] = useActionState(register, null);

  if (state?.success) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-5xl">📧</div>
        <div>
          <h2 className="text-lg font-semibold">Revisá tu email</h2>
          <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium text-primary hover:underline"
        >
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state?.error?._form && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {state.error._form[0]}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
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
        <label htmlFor="password" className="text-sm font-medium">
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
        <label htmlFor="confirmPassword" className="text-sm font-medium">
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

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creando cuenta..." : "Crear cuenta"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Iniciá sesión
        </Link>
      </p>
    </form>
  );
}
