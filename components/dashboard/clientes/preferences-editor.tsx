"use client";

import { useState, useRef } from "react";
import { Music, Coffee, Check, Loader2 } from "lucide-react";
import { updateClientPreferences } from "@/actions/clients";

interface PreferencesEditorProps {
  clientId: string;
  initialPreferences: Record<string, string> | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function PreferencesEditor({
  clientId,
  initialPreferences,
}: PreferencesEditorProps) {
  const [music, setMusic] = useState(initialPreferences?.music ?? "");
  const [drink, setDrink] = useState(initialPreferences?.drink ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = async (updated: Record<string, string>) => {
    setSaveState("saving");
    try {
      const result = await updateClientPreferences(clientId, updated);
      setSaveState(result.success ? "saved" : "error");
    } catch {
      setSaveState("error");
    } finally {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSaveState("idle"), 2000);
    }
  };

  const handleMusicBlur = () => {
    save({ music, drink });
  };

  const handleDrinkBlur = () => {
    save({ music, drink });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Preferencias
        </h3>
        <SaveIndicator state={saveState} />
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Music className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <input
            type="text"
            value={music}
            onChange={(e) => setMusic(e.target.value)}
            onBlur={handleMusicBlur}
            placeholder="Música preferida…"
            maxLength={100}
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary/40 focus:outline-none"
          />
        </div>

        <div className="relative">
          <Coffee className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <input
            type="text"
            value={drink}
            onChange={(e) => setDrink(e.target.value)}
            onBlur={handleDrinkBlur}
            placeholder="Bebida preferida…"
            maxLength={100}
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary/40 focus:outline-none"
          />
        </div>
      </div>
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
  return (
    <span className="text-xs text-destructive">Error al guardar</span>
  );
}
