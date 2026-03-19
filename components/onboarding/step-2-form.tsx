"use client";

import { useActionState, useState } from "react";
import { saveStep2 } from "@/actions/onboarding";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import Link from "next/link";

const INPUT_CLS =
  "w-full rounded-xl border border-input bg-secondary/40 px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

const SKIP_LINK_CLS =
  "flex-1 inline-flex items-center justify-center rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors";

type ServiceRow = {
  name: string;
  durationMinutes: string;
  price: string;
};

const EMPTY: ServiceRow = { name: "", durationMinutes: "30", price: "0" };

export function Step2Form() {
  const [state, action, isPending] = useActionState(saveStep2, null);
  const [rows, setRows] = useState<ServiceRow[]>([{ ...EMPTY }]);

  const add = () => setRows((prev) => [...prev, { ...EMPTY }]);
  const remove = (i: number) =>
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof ServiceRow, value: string) =>
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

      {/* Serialized services for the server action */}
      <input type="hidden" name="servicesJson" value={JSON.stringify(rows)} />

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="relative rounded-lg border p-4 space-y-3">
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-destructive"
                aria-label="Eliminar servicio"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre</label>
              <input
                value={row.name}
                onChange={(e) => update(i, "name", e.target.value)}
                placeholder="Corte clásico"
                className={INPUT_CLS}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Duración (min)</label>
                <input
                  type="number"
                  min={5}
                  max={480}
                  value={row.durationMinutes}
                  onChange={(e) => update(i, "durationMinutes", e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Precio (ARS)</label>
                <input
                  type="number"
                  min={0}
                  value={row.price}
                  onChange={(e) => update(i, "price", e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <PlusCircle className="h-4 w-4" />
          Agregar otro servicio
        </button>
      </div>

      <div className="flex gap-3">
        <Link href="/onboarding/step-3" className={SKIP_LINK_CLS}>
          Saltar
        </Link>
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? "Guardando..." : "Continuar →"}
        </Button>
      </div>
    </form>
  );
}
