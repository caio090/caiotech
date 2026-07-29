"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { BUSINESS_PERIOD_PRESET_LABEL } from "@/lib/business-period/types";
import type { BusinessPeriodPreset, BusinessPeriodSelection } from "@/lib/business-period/types";
import { buildPeriodSelection } from "@/lib/business-period/calculations";
import { dashboardTokens } from "./_dashboard-design-tokens";

const PRESET_ORDER: BusinessPeriodPreset[] = ["TODAY", "YESTERDAY", "LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH", "PREVIOUS_MONTH", "THIS_QUARTER", "THIS_YEAR", "CUSTOM"];

/** Fase 10: um único seletor de período no shell do Meu Negócio -- não duplicado por setor. */
export function PeriodSelector({ selection, onChange, timezone, operationalDayStart, managerMode }: { selection: BusinessPeriodSelection; onChange: (next: BusinessPeriodSelection) => void; timezone: string; operationalDayStart: string; managerMode: boolean }) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(selection.startDate);
  const [customEndInclusive, setCustomEndInclusive] = useState(addOneDayInclusive(selection.endDateExclusive, -1));
  const [customError, setCustomError] = useState<string | null>(null);

  function applyPreset(preset: BusinessPeriodPreset) {
    if (preset === "CUSTOM") return; // custom precisa dos campos de data, tratado por applyCustom
    onChange(buildPeriodSelection(preset, timezone, operationalDayStart, new Date()));
    setOpen(false);
  }

  function applyCustom() {
    const endExclusive = addOneDayInclusive(customEndInclusive, 1);
    if (!customStart || !customEndInclusive || customStart > customEndInclusive) {
      setCustomError("Data inicial precisa ser anterior ou igual à data final.");
      return;
    }
    setCustomError(null);
    onChange(buildPeriodSelection("CUSTOM", timezone, operationalDayStart, new Date(), { startDate: customStart, endDateExclusive: endExclusive }));
    setOpen(false);
  }

  function restoreDefault() {
    onChange(buildPeriodSelection("THIS_MONTH", timezone, operationalDayStart, new Date()));
    setOpen(false);
  }

  return (
    <div className="relative" data-testid="period-selector">
      <button onClick={() => setOpen((current) => !current)} aria-expanded={open} className={`${dashboardTokens.focus} inline-flex items-center gap-1.5 rounded-md border border-[#3a4354] bg-[#1d2230] px-3 py-2 text-xs font-bold text-[#bcc4d4] hover:text-white`}>
        <Calendar className="h-3.5 w-3.5" />{selection.label}<ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-md border border-[#3a4354] bg-[#171b26] p-3 shadow-2xl">
          <div className="grid grid-cols-2 gap-1.5">
            {PRESET_ORDER.filter((preset) => preset !== "CUSTOM").map((preset) => (
              <button key={preset} onClick={() => applyPreset(preset)} aria-pressed={selection.preset === preset} className={cn("rounded px-2 py-1.5 text-left text-[11px] font-bold", selection.preset === preset ? "bg-violet-600 text-white" : "bg-[#11141c] text-[#bcc4d4] hover:bg-[#1d2230]")}>
                {BUSINESS_PERIOD_PRESET_LABEL[preset]}
              </button>
            ))}
          </div>

          <div className="mt-3 border-t border-[#272d3a] pt-3">
            <p className="text-[10px] font-black uppercase text-[#697386]">Personalizado</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="w-full rounded border border-[#3a4354] bg-[#11141c] px-2 py-1.5 text-[11px] text-[#f6f7fb]" aria-label="Data inicial" />
              <span className="text-[#697386]">–</span>
              <input type="date" value={customEndInclusive} onChange={(event) => setCustomEndInclusive(event.target.value)} className="w-full rounded border border-[#3a4354] bg-[#11141c] px-2 py-1.5 text-[11px] text-[#f6f7fb]" aria-label="Data final" />
            </div>
            {customError && <p className="mt-1 text-[10px] font-bold text-rose-400">{customError}</p>}
            <div className="mt-2 flex items-center justify-between gap-2">
              <button onClick={restoreDefault} className={`${dashboardTokens.focus} text-[10px] font-bold text-[#8993a8] hover:text-[#bcc4d4]`}>Restaurar padrão</button>
              <div className="flex gap-1.5">
                <button onClick={() => setOpen(false)} className={`${dashboardTokens.focus} rounded border border-[#3a4354] px-2.5 py-1.5 text-[10px] font-bold text-[#bcc4d4]`}>Cancelar</button>
                <button onClick={applyCustom} className={`${dashboardTokens.focus} rounded bg-violet-600 px-2.5 py-1.5 text-[10px] font-bold text-white`}>Aplicar</button>
              </div>
            </div>
          </div>

          <div className="mt-3 border-t border-[#272d3a] pt-2 text-[10px] text-[#8993a8]">
            <p>Comparando com: {selection.comparisonLabel}</p>
            {managerMode && <p className="mt-1">Timezone: {timezone} · Dia operacional inicia às {operationalDayStart}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function addOneDayInclusive(iso: string, deltaDays: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}
