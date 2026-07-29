"use client";

import { useMemo, useState } from "react";
import { useBusinessViewMode, ViewModeToggle } from "./_view-mode";
import { DataSourceBadge } from "./_data-source-badge";
import { FinanceDashboard } from "./_finance-dashboard";
import { FinanceReservePanel } from "./_finance-reserve";
import { FinanceWorkingCapitalPanel } from "./_finance-working-capital";
import { FinanceImportPanel } from "./_finance-import";
import { RevenueFullPanel } from "./_revenue-panels";
import { ComingSoonPanel } from "./_coming-soon-panel";
import { buildFinanceDashboardData, calculateWorkingCapitalCalendar, essentialCategoryLabels, excludedCategoryLabels } from "@/lib/finance/dashboard-builder";
import { calculateEssentialMonthlyOutflow } from "@/lib/finance/calculations";
import { buildSimulatedProvenance } from "@/lib/finance/data-source";
import {
  CASH_FLOW_ENTRIES_FIXTURES, CASH_FLOW_OPENING_BALANCE, CASH_RESERVE_CONFIG_FIXTURE,
  DEMO_DATA_LABEL, DEMO_TODAY_ISO, GOOGLE_SHEET_CONNECTION_FIXTURE, IMPORT_HISTORY_FIXTURES,
} from "@/lib/finance/fixtures";
import type { CashFlowEntry, CashReserveConfig, SpreadsheetImportBatch } from "@/lib/finance/types";
import type { BusinessModuleKey } from "@/lib/business-archetypes/types";

const OPENING_BALANCE_DATE = "2026-06-01";
const PERIOD_START = "2026-07-01";
const PERIOD_END = "2026-07-31";
const PERIOD_LABEL = "Julho/2026 (mês corrente)";

/** Subáreas do Financeiro ainda sem painel próprio nesta sprint (Fase 9/22 -- honesto em vez de fingir). */
const COMING_SOON_SUBSECTIONS = ["Planejado versus realizado", "Contas a pagar", "Contas a receber", "Projeções"];

export function FinanceTab({ companyName, onNavigate, activeSubsection }: { companyName: string; onNavigate: (section: BusinessModuleKey, detail?: string) => void; activeSubsection: string }) {
  const [viewMode, setViewMode] = useBusinessViewMode();

  // Estado central único desta demonstração (Fase 16) — todo o resto deste
  // arquivo apenas deriva dele via funções puras, nunca duplica valores.
  const [entries] = useState<CashFlowEntry[]>(CASH_FLOW_ENTRIES_FIXTURES);
  const [reserveConfig, setReserveConfig] = useState<CashReserveConfig>(CASH_RESERVE_CONFIG_FIXTURE);
  const [importHistory, setImportHistory] = useState<SpreadsheetImportBatch[]>(IMPORT_HISTORY_FIXTURES);

  const dashboardData = useMemo(
    () => buildFinanceDashboardData(entries, reserveConfig, CASH_FLOW_OPENING_BALANCE, OPENING_BALANCE_DATE, DEMO_TODAY_ISO, PERIOD_START, PERIOD_END, PERIOD_LABEL),
    [entries, reserveConfig]
  );
  const essentialMonthlyOutflow = useMemo(() => calculateEssentialMonthlyOutflow(entries, PERIOD_START, PERIOD_END), [entries]);
  const workingCapital = useMemo(() => calculateWorkingCapitalCalendar(dashboardData.currentBalance, entries, DEMO_TODAY_ISO, 60), [dashboardData.currentBalance, entries]);
  const provenance = useMemo(() => buildSimulatedProvenance({ periodStart: PERIOD_START, periodEnd: PERIOD_END, lastUpdatedAt: DEMO_TODAY_ISO }), []);

  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
        <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-0.5">{DEMO_DATA_LABEL}</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          Fluxo de caixa, reserva e planilhas desta tela usam dados de exemplo em memória — nada é salvo e nada representa a
          situação financeira real de {companyName} ou de nenhum outro cliente.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DataSourceBadge provenance={provenance} testId="finance-tab-data-source-badge" />
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {activeSubsection === "Resumo" && (
        <FinanceDashboard data={dashboardData} viewMode={viewMode} onNavigate={onNavigate} />
      )}

      {activeSubsection === "Faturamento" && <RevenueFullPanel managerMode={viewMode === "manager"} />}

      {activeSubsection === "Reserva" && (
        <FinanceReservePanel
          summary={dashboardData.reserve}
          config={reserveConfig}
          onConfigChange={setReserveConfig}
          availableBalance={dashboardData.currentBalance}
          essentialMonthlyOutflow={essentialMonthlyOutflow}
          viewMode={viewMode}
          essentialCategoryLabels={essentialCategoryLabels(reserveConfig)}
          excludedCategoryLabels={excludedCategoryLabels(reserveConfig)}
        />
      )}

      {activeSubsection === "Fluxo de caixa" && <FinanceWorkingCapitalPanel summary={workingCapital} />}

      {activeSubsection === "Dados e relatórios" && (
        <FinanceImportPanel
          companyName={companyName}
          viewMode={viewMode}
          history={importHistory}
          onHistoryChange={setImportHistory}
          googleConnection={GOOGLE_SHEET_CONNECTION_FIXTURE}
        />
      )}

      {COMING_SOON_SUBSECTIONS.includes(activeSubsection) && (
        <ComingSoonPanel title={activeSubsection} description="Esta subárea do Financeiro ainda não tem um painel próprio nesta sprint. Preferimos deixar isso claro a fingir uma tela pronta." />
      )}
    </div>
  );
}
