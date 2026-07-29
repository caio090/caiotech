"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { BUSINESS_PERIOD_PRESET_LABEL } from "@/lib/business-period/types";
import type { BusinessPeriodPreset, BusinessPeriodSelection } from "@/lib/business-period/types";
import { buildPeriodSelection, formatDateBR, toExclusiveEndDate, toInclusiveEndDate, validateCustomPeriodDraft } from "@/lib/business-period/calculations";
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

  // Fase 3: única função de validação real, também usada fora do componente
  // (src/lib/business-period/calculations.ts) -- o botão Aplicar e o handler
  // de submit usam exatamente este mesmo resultado, nunca uma checagem
  // aproximada re-derivada localmente.
  const validation = validateCustomPeriodDraft({ startDate: customStart, endDateInclusive: customEndInclusive });
  // Erro de ordem (início > fim) não pertence a um campo isoladamente --
  // ambas as datas em si são válidas, é a relação entre elas que está
  // errada -- por isso marca os dois campos como inválidos nesse caso.
  const isOrderError = validation.formError !== null && !validation.fieldErrors.startDate && !validation.fieldErrors.endDateInclusive;
  const startInvalid = Boolean(validation.fieldErrors.startDate) || isOrderError;
  const endInvalid = Boolean(validation.fieldErrors.endDateInclusive) || isOrderError;

  function applyPreset(preset: BusinessPeriodPreset) {
    if (preset === "CUSTOM") return; // custom precisa dos campos de data, tratado por applyCustom
    onChange(buildPeriodSelection(preset, timezone, operationalDayStart, new Date()));
    setOpen(false);
  }

  function applyCustom(event?: FormEvent) {
    event?.preventDefault(); // cobre Enter dentro do <form>, não só o clique no botão
    if (!validation.valid) return; // defensivo -- o botão já fica desabilitado neste caso
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
        <div
          ref={panelRef}
          tabIndex={-1}
          className="fixed inset-x-3 top-20 z-20 w-auto max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-md border border-[#3a4354] bg-[#171b26] p-3 shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80 sm:max-w-none sm:max-h-none sm:overflow-visible"
        >
          <div className="grid grid-cols-2 gap-1.5">
            {PRESET_ORDER.filter((preset) => preset !== "CUSTOM").map((preset) => (
              <button key={preset} onClick={() => applyPreset(preset)} aria-pressed={selection.preset === preset} className={cn("rounded px-2 py-1.5 text-left text-[11px] font-bold", selection.preset === preset ? "bg-violet-600 text-white" : "bg-[#11141c] text-[#bcc4d4] hover:bg-[#1d2230]")}>
                {BUSINESS_PERIOD_PRESET_LABEL[preset]}
              </button>
            ))}
          </div>

          <form className="mt-3 border-t border-[#272d3a] pt-3" onSubmit={applyCustom}>
            <p className="text-[10px] font-black uppercase text-[#697386]">Personalizado</p>
            <div className="mt-1.5 flex flex-col gap-1.5 sm:flex-row sm:items-center">
              <label htmlFor="period-custom-start" className="sr-only">Data inicial</label>
              <input id="period-custom-start" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} aria-invalid={startInvalid} aria-describedby={validation.formError ? "period-custom-error" : undefined} className="w-full min-w-0 rounded border border-[#3a4354] bg-[#11141c] px-2 py-1.5 text-[11px] text-[#f6f7fb]" />
              <span className="hidden shrink-0 text-[#697386] sm:inline">–</span>
              <label htmlFor="period-custom-end" className="sr-only">Data final</label>
              <input id="period-custom-end" type="date" value={customEndInclusive} onChange={(event) => setCustomEndInclusive(event.target.value)} aria-invalid={endInvalid} aria-describedby={validation.formError ? "period-custom-error" : undefined} className="w-full min-w-0 rounded border border-[#3a4354] bg-[#11141c] px-2 py-1.5 text-[11px] text-[#f6f7fb]" />
            </div>
            {validation.formError && <p id="period-custom-error" role="alert" className="mt-1 break-words text-[10px] font-bold text-rose-400">{validation.formError}</p>}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={restoreDefault} className={`${dashboardTokens.focus} text-[10px] font-bold text-[#8993a8] hover:text-[#bcc4d4]`}>Restaurar padrão</button>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setOpen(false)} className={`${dashboardTokens.focus} rounded border border-[#3a4354] px-2.5 py-1.5 text-[10px] font-bold text-[#bcc4d4]`}>Cancelar</button>
                <button type="submit" disabled={!validation.valid} aria-disabled={!validation.valid} className={cn(`${dashboardTokens.focus} rounded px-2.5 py-1.5 text-[10px] font-bold`, !validation.valid ? "cursor-not-allowed bg-[#272d3a] text-[#697386]" : "bg-violet-600 text-white")}>Aplicar</button>
              </div>
            </div>
          </form>

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
