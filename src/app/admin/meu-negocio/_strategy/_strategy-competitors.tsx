"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  COMPETITOR_TYPE_LABEL, COMPETITOR_RESEARCH_PROVIDER,
  type CompetitorProfile, type CompetitorType,
} from "@/lib/business-strategy";
import { CURRENT_INTELLIGENCE_AVAILABILITY, isIntelligenceAvailable, INTELLIGENCE_UNAVAILABLE_MESSAGE } from "@/lib/intelligence/availability";
import { dashboardTokens } from "../_dashboard-design-tokens";

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const TYPES: CompetitorType[] = ["direct", "indirect", "substitute", "benchmark", "emerging"];

function emptyCompetitor(): CompetitorProfile {
  return {
    id: generateId("competitor"), name: "", type: "direct", segment: "", city: "", state: "", serviceArea: "",
    website: "", socialProfiles: [], products: "", services: "", audience: "", positioning: "",
    valueProposition: "", priceRange: "", channels: "", strengths: "", weaknesses: "",
    customerExperience: "", digitalPresence: "", salesModel: "", deliveryModel: "", reputationSummary: "",
    evidence: "", source: "manual", confidence: "unknown", lastCheckedAt: null,
    status: "draft", notes: "", isExample: false,
  };
}

/** Concorrência (Fase 18-25): cadastro só em memória, nunca real; pesquisa automática permanece indisponível. */
export function StrategyCompetitorsPanel({ competitors, onChange }: { competitors: CompetitorProfile[]; onChange: (list: CompetitorProfile[]) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  function addCompetitor() {
    const next = emptyCompetitor();
    onChange([...competitors, next]);
    setEditingId(next.id);
  }
  function updateCompetitor(id: string, patch: Partial<CompetitorProfile>) {
    onChange(competitors.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function removeCompetitor(id: string) {
    onChange(competitors.filter((c) => c.id !== id));
    if (editingId === id) setEditingId(null);
  }
  function confirmCompetitor(id: string) {
    const competitor = competitors.find((c) => c.id === id);
    if (!competitor) return;
    if (!competitor.name.trim() || (!competitor.evidence.trim() && competitor.source === "manual") || !competitor.lastCheckedAt) return;
    updateCompetitor(id, { status: "confirmed" });
  }

  const editing = editingId ? competitors.find((c) => c.id === editingId) : null;

  return (
    <div className="space-y-4">
      <div className={`${dashboardTokens.panel} ${dashboardTokens.radius} p-3 flex items-center justify-between gap-3`}>
        <div>
          <p className="text-xs font-bold text-[#f6f7fb]">Concorrentes</p>
          <p className="text-[10px] text-[#8993a8]">{competitors.filter((c) => c.isExample).length} de exemplo · {competitors.filter((c) => !c.isExample).length} cadastrados</p>
        </div>
        <button type="button" onClick={addCompetitor} className={`${dashboardTokens.focus} flex items-center gap-1 rounded-md bg-violet-600 px-3 py-1.5 text-[11px] font-bold text-white`}>
          <Plus className="h-3 w-3" /> Adicionar concorrente
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {competitors.map((c) => (
          <div key={c.id} className={`${dashboardTokens.panel} ${dashboardTokens.radius} p-3`} data-testid={`strategy-competitor-${c.id}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-[#f6f7fb]">{c.name || "Sem nome"}</p>
                <p className="text-[10px] text-[#8993a8]">{COMPETITOR_TYPE_LABEL[c.type]} · {c.status === "confirmed" ? "Confirmado" : c.status === "outdated" ? "Desatualizado" : "Rascunho"}</p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => setEditingId(c.id)} className="text-[10px] font-bold text-violet-300 hover:underline">Editar</button>
                <button type="button" onClick={() => removeCompetitor(c.id)} aria-label={`Remover ${c.name || "concorrente"}`} className="p-1 text-[#8993a8] hover:text-rose-400">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
            {c.isExample && <p className="mt-1 text-[9px] italic text-amber-300">Exemplo demonstrativo — confirme, edite ou remova antes de usar na estratégia.</p>}
          </div>
        ))}
        {competitors.length === 0 && <p className="text-xs text-[#697386]">Nenhum concorrente cadastrado.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setEditingId(null)}>
          <div className={`${dashboardTokens.elevated} w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[85vh] overflow-y-auto p-5 space-y-2`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Editar concorrente">
            <p className="text-sm font-black text-[#f6f7fb]">Editar concorrente</p>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-[#bcc4d4]">Nome</span>
              <input value={editing.name} onChange={(e) => updateCompetitor(editing.id, { name: e.target.value })} className={`${dashboardTokens.focus} w-full rounded-md border border-[#3a4354] bg-[#171b26] px-3 py-2 text-sm text-[#f6f7fb]`} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-[#bcc4d4]">Tipo</span>
              <select value={editing.type} onChange={(e) => updateCompetitor(editing.id, { type: e.target.value as CompetitorType })} className={`${dashboardTokens.focus} w-full rounded-md border border-[#3a4354] bg-[#171b26] px-3 py-2 text-sm text-[#f6f7fb]`}>
                {TYPES.map((t) => <option key={t} value={t}>{COMPETITOR_TYPE_LABEL[t]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-[#bcc4d4]">Evidência (link, observação, print)</span>
              <input value={editing.evidence} onChange={(e) => updateCompetitor(editing.id, { evidence: e.target.value })} className={`${dashboardTokens.focus} w-full rounded-md border border-[#3a4354] bg-[#171b26] px-3 py-2 text-sm text-[#f6f7fb]`} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-[#bcc4d4]">Data da observação</span>
              <input type="date" value={editing.lastCheckedAt ?? ""} onChange={(e) => updateCompetitor(editing.id, { lastCheckedAt: e.target.value || null })} className={`${dashboardTokens.focus} w-full rounded-md border border-[#3a4354] bg-[#171b26] px-3 py-2 text-sm text-[#f6f7fb]`} />
            </label>
            <button
              type="button"
              onClick={() => confirmCompetitor(editing.id)}
              disabled={!editing.name.trim() || !editing.evidence.trim() || !editing.lastCheckedAt}
              className={`${dashboardTokens.focus} mt-2 w-full rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40`}
            >
              Confirmar concorrente
            </button>
            <p className="text-[10px] text-[#8993a8]">Exige nome, uma evidência e a data da observação antes de confirmar.</p>
          </div>
        </div>
      )}

      <div className={`${dashboardTokens.panel} ${dashboardTokens.radius} p-3`}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[#f6f7fb]">Pesquisar concorrentes</p>
          <button type="button" disabled title={COMPETITOR_RESEARCH_PROVIDER.unavailableReason} className="cursor-not-allowed rounded-md bg-[#272d3a] px-3 py-1.5 text-[11px] font-bold text-[#697386]">
            Pesquisar concorrentes
          </button>
        </div>
        <p className="mt-1 text-[10px] text-[#8993a8]">{COMPETITOR_RESEARCH_PROVIDER.unavailableReason}</p>
        {!isIntelligenceAvailable(CURRENT_INTELLIGENCE_AVAILABILITY) && <p className="mt-1 text-[10px] text-[#8993a8]">{INTELLIGENCE_UNAVAILABLE_MESSAGE}</p>}
      </div>
    </div>
  );
}
