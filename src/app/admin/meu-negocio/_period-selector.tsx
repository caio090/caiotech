"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { BUSINESS_PERIOD_PRESET_LABEL } from "@/lib/business-period/types";
import type { BusinessPeriodPreset, BusinessPeriodSelection } from "@/lib/business-period/types";
import { buildPeriodSelection, formatDateBR, toExclusiveEndDate, toInclusiveEndDate } from "@/lib/business-period/calculations";
import { useFocusTrap } from "@/lib/a11y/use-focus-trap";
import { dashboardTokens } from "./_dashboard-design-tokens";

const PRESET_ORDER: BusinessPeriodPreset[] = ["TODAY", "YESTERDAY", "LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH", "PREVIOUS_MONTH", "THIS_QUARTER", "THIS_YEAR", "CUSTOM"];

/** Fase 10: um único seletor de período no shell do Meu Negócio -- não duplicado por setor. */
export function PeriodSelector({ selection, onChange, timezone, operationalDayStart, managerMode }: { selection: BusinessPeriodSelection; onChange: (next: BusinessPeriodSelection) => void; timezone: string; operationalDayStart: string; managerMode: boolean }) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(selection.startDate);
  const [customEndInclusive, setCustomEndInclusive] = useState(() => toInclusiveEndDate(selection.endDateExclusive));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  // Fase 3: o rascunho SEMPRE é resincronizado com o período aplicado no momento
  // em que o popover abre -- esta era a causa raiz do bug do QA visual: os
  // campos usavam useState(selection...) só na primeira montagem e nunca mais
  // refletiam o período central depois disso (ex.: 01/07-15/07 aplicado
  // reabria mostrando 01/07-31/07, sobra do valor inicial do mês corrente).
  // Ajustado durante a renderização (padrão recomendado pelo React para
  // "resetar estado quando uma prop muda"), não dentro de um useEffect --
  // evita um render extra desperdiçado a cada abertura do popover.
  const [syncedForSelection, setSyncedForSelection] = useState<{ open: boolean; selection: BusinessPeriodSelection } | null>(null);
  if (open && syncedForSelection?.selection !== selection) {
    setSyncedForSelection({ open, selection });
    setCustomStart(selection.startDate);
    setCustomEndInclusive(toInclusiveEndDate(selection.endDateExclusive));
  } else if (!open && syncedForSelection !== null) {
    setSyncedForSelection(null);
  }

  // ESC fecha sem aplicar; foco volta ao botão que abriu o seletor.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    addEventListener("keydown", onKeyDown);
    return () => { removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [open]);

  const validationError = !customStart || !customEndInclusive
    ? "Informe a data inicial e a data final."
    : customStart > customEndInclusive
    ? "A data inicial não pode ser posterior à data final."
    : null;

  function applyPreset(preset: BusinessPeriodPreset) {
    if (preset === "CUSTOM") return; // custom precisa dos campos de data, tratado por applyCustom
    onChange(buildPeriodSelection(preset, timezone, operationalDayStart, new Date()));
    setOpen(false);
  }

  function applyCustom() {
    if (validationError) return; // defensivo -- o botão já fica desabilitado neste caso
    const endExclusive = toExclusiveEndDate(customEndInclusive);
    onChange(buildPeriodSelection("CUSTOM", timezone, operationalDayStart, new Date(), { startDate: customStart, endDateExclusive: endExclusive }));
    setOpen(false);
  }

  function restoreDefault() {
    onChange(buildPeriodSelection("THIS_MONTH", timezone, operationalDayStart, new Date()));
    setOpen(false);
  }

  return (
    <div className="relative" data-testid="period-selector">
      <button ref={triggerRef} onClick={() => setOpen((current) => !current)} aria-expanded={open} className={`${dashboardTokens.focus} inline-flex items-center gap-1.5 rounded-md border border-[#3a4354] bg-[#1d2230] px-3 py-2 text-xs font-bold text-[#bcc4d4] hover:text-white`}>
        <Calendar className="h-3.5 w-3.5" />{selection.label}<ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div ref={panelRef} tabIndex={-1} className="absolute right-0 z-20 mt-2 w-80 rounded-md border border-[#3a4354] bg-[#171b26] p-3 shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
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
              <label htmlFor="period-custom-start" className="sr-only">Data inicial</label>
              <input id="period-custom-start" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} aria-invalid={validationError !== null} aria-describedby={validationError ? "period-custom-error" : undefined} className="w-full rounded border border-[#3a4354] bg-[#11141c] px-2 py-1.5 text-[11px] text-[#f6f7fb]" />
              <span className="text-[#697386]">–</span>
              <label htmlFor="period-custom-end" className="sr-only">Data final</label>
              <input id="period-custom-end" type="date" value={customEndInclusive} onChange={(event) => setCustomEndInclusive(event.target.value)} aria-invalid={validationError !== null} aria-describedby={validationError ? "period-custom-error" : undefined} className="w-full rounded border border-[#3a4354] bg-[#11141c] px-2 py-1.5 text-[11px] text-[#f6f7fb]" />
            </div>
            {validationError && <p id="period-custom-error" role="alert" className="mt-1 text-[10px] font-bold text-rose-400">{validationError}</p>}
            <div className="mt-2 flex items-center justify-between gap-2">
              <button onClick={restoreDefault} className={`${dashboardTokens.focus} text-[10px] font-bold text-[#8993a8] hover:text-[#bcc4d4]`}>Restaurar padrão</button>
              <div className="flex gap-1.5">
                <button onClick={() => setOpen(false)} className={`${dashboardTokens.focus} rounded border border-[#3a4354] px-2.5 py-1.5 text-[10px] font-bold text-[#bcc4d4]`}>Cancelar</button>
                <button onClick={applyCustom} disabled={validationError !== null} aria-disabled={validationError !== null} className={cn(`${dashboardTokens.focus} rounded px-2.5 py-1.5 text-[10px] font-bold`, validationError ? "cursor-not-allowed bg-[#272d3a] text-[#697386]" : "bg-violet-600 text-white")}>Aplicar</button>
              </div>
            </div>
          </div>

          <div className="mt-3 border-t border-[#272d3a] pt-2 text-[10px] text-[#8993a8]">
            <p>Comparando com: {selection.comparisonLabel}</p>
          </div>

          {managerMode && (
            <div className="mt-3 border-t border-[#272d3a] pt-2 text-[10px] text-[#8993a8]" data-testid="period-manager-details">
              <p className="text-[9px] font-black uppercase text-[#697386]">Configuração desta empresa</p>
              <p className="mt-1">Timezone: {timezone}</p>
              <p>Virada do dia operacional: {operationalDayStart}</p>
              <p className="mt-1 text-[#697386]">Pedidos realizados antes das {operationalDayStart} pertencem ao dia operacional anterior.</p>
              <p className="mt-2">Início operacional: {formatDateBR(selection.startDate)} às {operationalDayStart}</p>
              <p>Fim operacional: {formatDateBR(toInclusiveEndDate(selection.endDateExclusive))}, até às {operationalDayStart} do dia seguinte</p>
              <p className="mt-1 text-[#697386]">A data final mostrada na interface é inclusiva; internamente o período termina no início do dia seguinte (limite exclusivo), para nunca contar um pedido duas vezes.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
