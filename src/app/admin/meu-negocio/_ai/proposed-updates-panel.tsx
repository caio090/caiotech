"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProposedUpdate } from "@/lib/motor-lokat/ai/types";

const ORIGIN_LABEL: Record<ProposedUpdate["source"], string> = {
  real: "Real", manual: "Manual", estimated: "Estimado", missing: "Ausente", example: "Exemplo",
};
const CONFIDENCE_LABEL: Record<ProposedUpdate["confidence"], string> = {
  alta: "Confiança alta", media: "Confiança média", baixa: "Confiança baixa", insuficiente: "Dados insuficientes",
};

interface Props {
  updates: ProposedUpdate[];
  /** Applies only to in-memory shell state — never persisted. */
  onApply: (applied: ProposedUpdate[]) => void;
  onCancel: () => void;
}

/** Fase 12 — "Informações encontradas". Nothing is ever applied silently. */
export function ProposedUpdatesPanel({ updates, onApply, onCancel }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(updates.map((u) => u.path)));
  const [appliedPaths, setAppliedPaths] = useState<Set<string>>(new Set());

  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }

  function applySelected() {
    const chosen = updates.filter((u) => selected.has(u.path));
    if (chosen.length === 0) return;
    onApply(chosen);
    setAppliedPaths(new Set(chosen.map((u) => u.path)));
  }

  if (updates.length === 0) {
    return <p className="text-xs" style={{ color: "var(--business-muted)" }}>Nenhuma informação identificada para propor.</p>;
  }

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ background: "var(--business-surface)", borderColor: "var(--business-border)" }}>
      <p className="text-xs font-bold" style={{ color: "var(--business-text)" }}>Informações encontradas</p>
      <div className="space-y-2">
        {updates.map((update) => {
          const isApplied = appliedPaths.has(update.path);
          return (
            <label
              key={update.path}
              className={cn("flex items-start gap-2.5 rounded-xl p-2.5 cursor-pointer border", isApplied && "lokat-business-confirm-pulse")}
              style={{ borderColor: "var(--business-border)" }}
            >
              <input type="checkbox" checked={selected.has(update.path)} onChange={() => toggle(update.path)} className="mt-1" disabled={isApplied} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs font-bold" style={{ color: "var(--business-text)" }}>{update.label}</p>
                  {isApplied && <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5"><Check className="w-3 h-3" /> Aplicado nesta sessão</span>}
                </div>
                <p className="text-[11px]" style={{ color: "var(--business-muted)" }}>
                  Atual: <strong>{update.oldValue ?? "—"}</strong> → Proposto: <strong>{update.proposedValue}</strong>
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--business-muted)" }}>{update.reason}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border" style={{ borderColor: "var(--business-border)", color: "var(--business-muted)" }}>{ORIGIN_LABEL[update.source]}</span>
                  <span className="text-[9px]" style={{ color: "var(--business-muted)" }}>{CONFIDENCE_LABEL[update.confidence]}</span>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <p className="text-[10px] italic" style={{ color: "var(--business-muted)" }}>
        As alterações permanecem somente nesta sessão de demonstração.
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={applySelected} disabled={selected.size === 0} className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40" style={{ background: "var(--business-accent)" }}>
          Aplicar selecionados
        </button>
        <button onClick={() => setSelected(new Set())} className="text-[11px] font-bold px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--business-border)", color: "var(--business-muted)" }}>
          Revisar
        </button>
        <button onClick={() => { setSelected(new Set()); onCancel(); }} className="text-[11px] font-bold px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--business-border)", color: "var(--business-muted)" }}>
          Ignorar
        </button>
        <button onClick={onCancel} className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg border ml-auto" style={{ borderColor: "var(--business-border)", color: "var(--business-muted)" }}>
          <X className="w-3 h-3" /> Cancelar
        </button>
      </div>
    </div>
  );
}
