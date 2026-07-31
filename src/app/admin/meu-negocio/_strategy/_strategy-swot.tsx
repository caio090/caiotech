"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { SwotItem, SwotCategory } from "@/lib/motor-lokat/business-types";
import { buildSwotCrossSuggestions } from "@/lib/business-strategy";
import { dashboardTokens } from "../_dashboard-design-tokens";

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const SWOT_CATEGORIES: Array<{ key: SwotCategory; label: string }> = [
  { key: "forca", label: "Forças" }, { key: "fraqueza", label: "Fraquezas" },
  { key: "oportunidade", label: "Oportunidades" }, { key: "ameaca", label: "Ameaças" },
];
const SWOT_ENVIRONMENTS: Array<{ label: string; explanation: string; categories: SwotCategory[] }> = [
  { label: "Ambiente interno", explanation: "Fatores mais próximos do controle da empresa.", categories: ["forca", "fraqueza"] },
  { label: "Ambiente externo", explanation: "Fatores do mercado e do contexto que afetam o negócio.", categories: ["oportunidade", "ameaca"] },
];

/** SWOT/FOFA (Fase 14-17): matriz 2x2 por ambiente + cruzamentos determinísticos, nunca aplicados automaticamente. */
export function StrategySwotPanel({ items, onChange }: { items: SwotItem[]; onChange: (items: SwotItem[]) => void }) {
  const [filterConfirmedOnly, setFilterConfirmedOnly] = useState(false);
  const crossSuggestions = useMemo(() => buildSwotCrossSuggestions(items), [items]);

  function addItem(category: SwotCategory) {
    onChange([...items, { id: generateId("swot"), category, text: "", source: "manual", evidence: "", impact: "medio", priority: "media", confirmed: false, status: "draft" }]);
  }
  function updateItem(id: string, patch: Partial<SwotItem>) {
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  const visibleItems = (category: SwotCategory) => items.filter((i) => i.category === category && (!filterConfirmedOnly || i.confirmed));

  return (
    <div className="space-y-5">
      <label className="flex items-center gap-2 text-[11px] font-bold text-[#bcc4d4]">
        <input type="checkbox" checked={filterConfirmedOnly} onChange={(e) => setFilterConfirmedOnly(e.target.checked)} />
        Mostrar só itens confirmados
      </label>

      {SWOT_ENVIRONMENTS.map((env) => (
        <div key={env.label}>
          <p className="text-xs font-black text-[#f6f7fb]">{env.label}</p>
          <p className="mb-2 text-[10px] text-[#8993a8]">{env.explanation}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SWOT_CATEGORIES.filter((c) => env.categories.includes(c.key)).map(({ key, label }) => (
              <div key={key} className={`${dashboardTokens.panel} ${dashboardTokens.radius} p-3`} data-testid={`strategy-swot-${key}`}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-[#f6f7fb]">{label}</p>
                  <button type="button" onClick={() => addItem(key)} aria-label={`Adicionar ${label}`} className={`${dashboardTokens.focus} rounded-md p-1 text-[#8993a8] hover:text-violet-300`}>
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {visibleItems(key).map((item, index) => (
                    <div key={item.id} className="rounded-md border border-[#272d3a] bg-[#171b26] p-2 space-y-1.5">
                      <div className="flex items-start gap-1.5">
                        <input
                          value={item.text}
                          onChange={(e) => updateItem(item.id, { text: e.target.value })}
                          placeholder={item.isExample ? "Exemplo — edite ou confirme" : "Descreva o item"}
                          aria-label={`${label} — item ${index + 1}`}
                          className={`${dashboardTokens.focus} flex-1 rounded border border-[#3a4354] bg-[#11141c] px-2 py-1 text-xs text-[#f6f7fb] outline-none`}
                        />
                        <button type="button" onClick={() => removeItem(item.id)} aria-label={`Remover item ${index + 1} de ${label}`} className="p-1 text-[#8993a8] hover:text-rose-400">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <label className="flex items-center gap-1.5 text-[9px] font-bold text-[#bcc4d4]">
                        <input type="checkbox" checked={item.confirmed} onChange={(e) => updateItem(item.id, { confirmed: e.target.checked, status: e.target.checked ? "confirmed" : "reviewing" })} />
                        Confirmado
                      </label>
                      {item.isExample && !item.confirmed && (
                        <p className="text-[9px] italic text-[#8993a8]">Exemplo de segmento — não confirmado como fato do negócio.</p>
                      )}
                    </div>
                  ))}
                  {visibleItems(key).length === 0 && <p className="py-2 text-center text-[10px] text-[#697386]">Nenhum item.</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className={`${dashboardTokens.panel} ${dashboardTokens.radius} p-3`}>
        <p className="mb-2 text-xs font-bold text-[#f6f7fb]">Cruzamentos sugeridos</p>
        {crossSuggestions.length === 0 ? (
          <p className="text-[10px] text-[#8993a8]">Confirme pelo menos uma força/fraqueza e uma oportunidade/ameaça para ver sugestões de cruzamento.</p>
        ) : (
          <ul className="space-y-1">
            {crossSuggestions.slice(0, 8).map((s, idx) => (
              <li key={idx} className="text-[11px] text-[#bcc4d4]">
                <strong className="text-violet-300">{s.label}:</strong> {s.reason}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[10px] italic text-[#8993a8]">Sugestões para revisão — nenhuma decisão é aplicada automaticamente.</p>
      </div>
    </div>
  );
}
