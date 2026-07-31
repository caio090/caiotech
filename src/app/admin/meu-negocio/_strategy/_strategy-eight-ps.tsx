"use client";

import { useState } from "react";
import { EIGHT_P_ORDER, EIGHT_PS_DESCRIPTION, type EightPs, type EightPKey } from "@/lib/business-strategy";
import { dashboardTokens } from "../_dashboard-design-tokens";

/**
 * 8Ps LOKAT (Fase 13): cards de resumo → painel de detalhe, nunca oito
 * formulários gigantes na mesma tela.
 */
export function StrategyEightPsPanel({ eightPs, onChange, managerMode }: { eightPs: EightPs; onChange: (next: EightPs) => void; managerMode: boolean }) {
  const [openKey, setOpenKey] = useState<EightPKey | null>(null);

  function updateSection(key: EightPKey, patch: Partial<EightPs[EightPKey]>) {
    onChange({ ...eightPs, [key]: { ...eightPs[key], ...patch } });
  }

  const openMeta = openKey ? EIGHT_P_ORDER.find((p) => p.key === openKey) : null;

  return (
    <div className="space-y-4">
      <div className={`${dashboardTokens.panel} ${dashboardTokens.radius} p-4`}>
        <p className="text-sm font-black text-[#f6f7fb]">8Ps LOKAT</p>
        <p className="mt-1 text-xs text-[#bcc4d4]">{EIGHT_PS_DESCRIPTION}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {EIGHT_P_ORDER.map(({ key, label, question }) => {
          const section = eightPs[key];
          const filled = section.text.trim() !== "";
          return (
            <button
              key={key}
              type="button"
              data-testid={`strategy-eight-p-${key}`}
              onClick={() => setOpenKey(key)}
              className={`${dashboardTokens.focus} ${dashboardTokens.motion} text-left rounded-md border border-[#272d3a] bg-[#11141c] p-3 hover:border-violet-400/40`}
            >
              <p className="text-[11px] font-bold text-[#f6f7fb]">{label}</p>
              <p className="mt-0.5 text-[10px] text-[#8993a8]">{question}</p>
              <p className="mt-2 line-clamp-2 text-[11px] text-[#bcc4d4]">{section.text || "Não preenchido."}</p>
              <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${filled ? "bg-emerald-500/10 text-emerald-300" : "bg-[#272d3a] text-[#8993a8]"}`}>
                {filled ? "Preenchido" : "Pendente"}
              </span>
            </button>
          );
        })}
      </div>

      {openMeta && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setOpenKey(null)}>
          <div
            className={`${dashboardTokens.elevated} w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[85vh] overflow-y-auto p-5`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={openMeta.label}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase text-violet-300">{openMeta.label}</p>
                <p className="text-sm font-black text-[#f6f7fb]">{openMeta.question}</p>
              </div>
              <button type="button" onClick={() => setOpenKey(null)} aria-label="Fechar detalhes do P" className={`${dashboardTokens.focus} rounded-md p-1.5 text-[#8993a8] hover:text-[#f6f7fb]`}>
                Fechar
              </button>
            </div>
            <p className="mb-3 text-xs text-[#8993a8]">{openMeta.description}</p>
            <label className="block mb-2">
              <span className="mb-1 block text-[11px] font-semibold text-[#bcc4d4]">Resumo</span>
              <textarea
                value={eightPs[openMeta.key].text}
                onChange={(e) => updateSection(openMeta.key, { text: e.target.value, source: "manual" })}
                rows={3}
                className={`${dashboardTokens.focus} w-full rounded-md border border-[#3a4354] bg-[#171b26] px-3 py-2 text-sm text-[#f6f7fb] outline-none`}
              />
            </label>
            {managerMode && (
              <>
                <label className="block mb-2">
                  <span className="mb-1 block text-[11px] font-semibold text-[#bcc4d4]">Evidência</span>
                  <input
                    value={eightPs[openMeta.key].evidence}
                    onChange={(e) => updateSection(openMeta.key, { evidence: e.target.value })}
                    className={`${dashboardTokens.focus} w-full rounded-md border border-[#3a4354] bg-[#171b26] px-3 py-2 text-xs text-[#f6f7fb] outline-none`}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-[#bcc4d4]">Observações</span>
                  <input
                    value={eightPs[openMeta.key].notes}
                    onChange={(e) => updateSection(openMeta.key, { notes: e.target.value })}
                    className={`${dashboardTokens.focus} w-full rounded-md border border-[#3a4354] bg-[#171b26] px-3 py-2 text-xs text-[#f6f7fb] outline-none`}
                  />
                </label>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
