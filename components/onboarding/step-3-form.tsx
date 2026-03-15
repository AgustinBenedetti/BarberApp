"use client";

import { useActionState, useState } from "react";
import { saveStep3 } from "@/actions/onboarding";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import Link from "next/link";

const INPUT_CLS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const SKIP_LINK_CLS =
  "flex-1 inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors";

type BarberRow = { displayName: string };

const EMPTY: BarberRow = { displayName: "" };

export function Step3Form() {
  const [state, action, isPending] = useActionState(saveStep3, null);
  const [rows, setRows] = useState<BarberRow[]>([{ ...EMPTY }]);
  const [ownerIsBarber, setOwnerIsBarber] = useState(false);

  const add = () => setRows((prev) => [...prev, { ...EMPTY }]);
  const remove = (i: number) =>
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof BarberRow, value: string) =>
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)),
    );

  return (
    <form action={action} className="space-y-5">
      {state?.error?._form && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {state.error._form[0]}
        </div>
      )}

      {/* Hidden fields for server action */}
      <input type="hidden" name="barbersJson" value={JSON.stringify(rows)} />
      <input
        type="hidden"
        name="ownerIsBarber"
        value={String(ownerIsBarber)}
      />

      {/* Owner-is-barber toggle */}
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
        <input
          type="checkbox"
          checked={ownerIsBarber}
          onChange={(e) => setOwnerIsBarber(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
        />
        <div>
          <p className="text-sm font-medium">Yo también soy barbero</p>
          <p className="text-xs text-muted-foreground">
            Voy a atender clientes en esta barbería
          </p>
        </div>
      </label>

      {/* Other barbers */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Otros barberos del equipo</p>

        {rows.map((row, i) => (
          <div key={i} className="relative rounded-lg border p-4 space-y-3">
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-destructive"
                aria-label="Eliminar barbero"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre</label>
              <input
                value={row.displayName}
                onChange={(e) => update(i, "displayName", e.target.value)}
                placeholder="Juan García"
                className={INPUT_CLS}
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <PlusCircle className="h-4 w-4" />
          Agregar otro barbero
        </button>
      </div>

      <div className="flex gap-3">
        <Link href="/dashboard" className={SKIP_LINK_CLS}>
          Saltar
        </Link>
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? "Guardando..." : "Finalizar"}
        </Button>
      </div>
    </form>
  );
}
