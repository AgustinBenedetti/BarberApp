"use client";

import { useState, useRef } from "react";
import { Check, Loader2 } from "lucide-react";
import { updateClientNotes } from "@/actions/clients";

interface NotesEditorProps {
  clientId: string;
  initialNotes: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function NotesEditor({ clientId, initialNotes }: NotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBlur = async () => {
    setSaveState("saving");
    try {
      const result = await updateClientNotes(clientId, notes);
      setSaveState(result.success ? "saved" : "error");
    } catch {
      setSaveState("error");
    } finally {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSaveState("idle"), 2000);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Notas del barbero
        </h3>
        <SaveIndicator state={saveState} />
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleBlur}
        placeholder="Anotaciones internas sobre este cliente…"
        maxLength={2000}
        rows={4}
        className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary/40 focus:outline-none"
      />
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  if (state === "saving") {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Guardando…</span>
      </div>
    );
  }
  if (state === "saved") {
    return (
      <div className="flex items-center gap-1 text-xs text-emerald-400">
        <Check className="h-3 w-3" />
        <span>Guardado</span>
      </div>
    );
  }
  return <span className="text-xs text-destructive">Error al guardar</span>;
}
