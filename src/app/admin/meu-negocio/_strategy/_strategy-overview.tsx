"use client";

import { STRATEGY_DNA_FIELD_ORDER, type BusinessDnaProfile, type StrategyDataSource } from "@/lib/business-strategy";
import { dashboardTokens } from "../_dashboard-design-tokens";

const SOURCE_LABEL: Record<StrategyDataSource, string> = {
  diagnostico: "Diagnóstico", manual: "Manual", imported: "Importado",
  existing_profile: "Já existia", calculated: "Calculado", estimated: "Estimado", missing: "Ausente",
};

/** Visão do Negócio (Fase 2/3): resumo + completude, nunca inventa um campo desconhecido. */
export function StrategyOverviewPanel({
  dna, onDnaChange, managerMode, onRequestManagerMode,
}: {
  dna: BusinessDnaProfile;
  onDnaChange: (dna: BusinessDnaProfile) => void;
  managerMode: boolean;
  onRequestManagerMode: () => void;
}) {
  const fields = STRATEGY_DNA_FIELD_ORDER.map(({ key, label }) => ({ key, label, field: dna[key] }));
  const confirmedCount = fields.filter((f) => f.field.confirmed).length;
  const missingCount = fields.filter((f) => f.field.source === "missing").length;
  const completenessPct = Math.round((confirmedCount / fields.length) * 100);

  function updateValue(key: keyof typeof dna, value: string) {
    onDnaChange({ ...dna, [key]: { ...dna[key], value, confirmed: value.trim() !== "" } } as BusinessDnaProfile);
  }

  return (
    <div className="space-y-4">
      <div className={`${dashboardTokens.panel} ${dashboardTokens.radius} p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-[#f6f7fb]">{dna.companyName.value || "Empresa sem nome definido"}</p>
            <p className="text-[10px] text-[#8993a8]">Segmento: {dna.segment.value}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase text-[#8993a8]">Completude</p>
            <p className="text-lg font-black text-violet-300">{completenessPct}%</p>
            <p className="text-[10px] text-[#8993a8]">{confirmedCount} confirmados · {missingCount} ausentes</p>
          </div>
        </div>
        {!managerMode && (
          <button type="button" onClick={onRequestManagerMode} className="mt-3 text-[11px] font-bold text-violet-300 hover:underline">
            Abrir Modo Gestor para ver origem, evidência e confiança de cada campo
          </button>
        )}
      </div>

      <div className={`${dashboardTokens.panel} ${dashboardTokens.radius} p-4`}>
        <p className="mb-3 text-xs font-bold text-[#f6f7fb]">Campos do negócio</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(({ key, label, field }) => (
            <label key={key} className="block">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#bcc4d4]">{label}</span>
                {managerMode && (
                  <span className="text-[9px] font-bold text-[#8993a8]">{SOURCE_LABEL[field.source]}</span>
                )}
              </div>
              <input
                type="text"
                value={field.value}
                placeholder="Não informado"
                data-testid={key === "companyName" ? "strategy-dna-company-name" : undefined}
                onChange={(e) => updateValue(key, e.target.value)}
                className={`${dashboardTokens.focus} w-full rounded-md border border-[#3a4354] bg-[#171b26] px-3 py-2 text-sm text-[#f6f7fb] outline-none`}
              />
              {managerMode && field.evidence && <p className="mt-1 text-[10px] text-[#8993a8]">Evidência: {field.evidence}</p>}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
