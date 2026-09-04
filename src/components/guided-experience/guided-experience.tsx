"use client";

/**
 * Prompt 13 (REC OS Core Experience) — Fase 35/36/37: componentes
 * compartilhados de Guided Experience (FirstRunNote + EmptyStateGuide +
 * HelpLauncher), consumindo o registry declarativo
 * (lib/guided-experience/registry.ts) -- nunca um modal hardcoded por
 * feature.
 *
 * Acessibilidade (Fase 37): fecha por botão E por Escape, nunca captura
 * foco de forma incorreta (sem focus-trap), nunca depende só de hover.
 */
import { useEffect, useState } from "react";
import { X, HelpCircle } from "lucide-react";
import { FEATURE_GUIDE_REGISTRY, hasSeenFirstRun, markFirstRunSeen, resetFirstRun } from "@/lib/guided-experience/registry";

function useEscapeToClose(onClose: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onClose]);
}

/** Fase 35 -- nota curta de primeira visita, nunca um modal grande. Some sozinha depois de "visto", reaberta via HelpLauncher (Fase 36). */
export function FirstRunNote({ featureId }: { featureId: string }) {
  const entry = FEATURE_GUIDE_REGISTRY[featureId];
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(entry ? !hasSeenFirstRun(featureId) : false); }, [featureId, entry]);
  useEscapeToClose(() => setOpen(false), open);

  if (!entry || !open) return null;

  function close() { markFirstRunSeen(featureId); setOpen(false); }

  return (
    <div role="dialog" aria-label={entry.firstRun.title} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 relative">
      <button type="button" onClick={close} aria-label="Fechar" className="absolute top-3 right-3 text-indigo-400 hover:text-indigo-700">
        <X className="w-3.5 h-3.5" />
      </button>
      <p className="text-xs font-black text-indigo-900 mb-2 pr-6">{entry.firstRun.title}</p>
      <ul className="space-y-1">
        {entry.firstRun.points.map((point) => (
          <li key={point} className="text-xs text-indigo-700 flex gap-1.5">
            <span aria-hidden>•</span> <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Fase 36 -- reabre a nota de primeira visita a qualquer momento. */
export function HelpLauncher({ featureId }: { featureId: string }) {
  const entry = FEATURE_GUIDE_REGISTRY[featureId];
  if (!entry) return null;
  return (
    <button
      type="button"
      onClick={() => { resetFirstRun(featureId); window.location.reload(); }}
      className="text-[10px] font-bold text-gray-400 hover:text-indigo-600 flex items-center gap-1"
      aria-label="Reabrir ajuda"
    >
      <HelpCircle className="w-3 h-3" /> Ajuda
    </button>
  );
}

/** Fase 35 -- empty state declarativo (Instagram não conectado, Feed DNA indefinido, etc), nunca hardcoded por tela. */
export function EmptyStateGuide({ featureId, stateId, onAction }: { featureId: string; stateId: string; onAction?: () => void }) {
  const entry = FEATURE_GUIDE_REGISTRY[featureId];
  const state = entry?.emptyStates.find((s) => s.id === stateId);
  if (!state) return null;
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
      <p className="text-xs font-bold text-gray-700">{state.title}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{state.description}</p>
      {state.actionLabel && onAction && (
        <button type="button" onClick={onAction} className="mt-2 text-[10px] font-bold text-purple-600 hover:text-purple-800">
          {state.actionLabel}
        </button>
      )}
    </div>
  );
}
