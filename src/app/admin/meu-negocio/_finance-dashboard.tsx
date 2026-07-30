"use client";

import { Wallet, TrendingUp, TrendingDown, ShieldCheck, Timer, ArrowRightLeft, Package, ShoppingCart, ClipboardList, Tags, FileBarChart } from "lucide-react";
import { formatCents } from "@/lib/motor-lokat/money";
import { StockGlossaryTerm } from "./_stock-glossary-term";
import {
  ChartCard, CashBalanceLineChart, ProjectionLineChart, PlannedVsActualBarChart, ExpenseDonutChart, TopOutflowsBarChart, ReserveProgressBar,
} from "./_finance-charts";
import type { BusinessViewMode } from "@/lib/finance/types";
import type { FinanceDashboardData } from "@/lib/finance/dashboard-builder";
import type { BusinessModuleKey } from "@/lib/business-archetypes/types";

function formatDateBR(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function KpiCard({ icon: Icon, label, value, tone, sub }: { icon: React.ElementType; label: string; value: string; tone: "neutral" | "good" | "bad"; sub?: string }) {
  const toneClass = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "text-gray-900";
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-purple-500" />
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-lg font-black ${toneClass}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const INTEGRATION_LINKS: Array<{ label: string; description: string; section: BusinessModuleKey; icon: React.ElementType }> = [
  { label: "Compras", description: "Fluxo de caixa → Compras: contas a pagar futuras nascem das compras programadas.", section: "purchasing", icon: ShoppingCart },
  { label: "Estoque", description: "Compras → Estoque: cada compra confirmada movimenta o estoque central.", section: "stock", icon: Package },
  { label: "Fichas técnicas", description: "Fichas técnicas → CMV teórico: o custo de insumo por produto vem daqui.", section: "technical_sheets", icon: ClipboardList },
  { label: "Produtos e preços", description: "Produtos e preços → margem de contribuição: o preço praticado define a margem por produto.", section: "products_pricing", icon: Tags },
  { label: "Relatórios (CMV)", description: "Estoque → CMV real: o consumo de estoque no período vira o CMV real nos relatórios.", section: "reports", icon: FileBarChart },
];

export function FinanceDashboard({
  data, viewMode, onNavigate,
}: {
  data: FinanceDashboardData;
  viewMode: BusinessViewMode;
  onNavigate: (section: BusinessModuleKey) => void;
}) {
  const isManager = viewMode === "manager";

  return (
    <div className="space-y-5">
      {/* 1–9: KPIs do dashboard (Fase 8) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Wallet} label="Saldo atual" value={formatCents(data.currentBalance)} tone={data.currentBalance >= 0 ? "neutral" : "bad"} />
        <KpiCard icon={data.netCashFlow >= 0 ? TrendingUp : TrendingDown} label="Fluxo líquido do período" value={formatCents(data.netCashFlow)} tone={data.netCashFlow >= 0 ? "good" : "bad"} />
        <KpiCard icon={TrendingUp} label="Entradas" value={formatCents(data.inflows)} tone="neutral" />
        <KpiCard icon={TrendingDown} label="Saídas" value={formatCents(data.outflows)} tone="neutral" />
        <KpiCard icon={ShieldCheck} label="Reserva atual" value={formatCents(data.reserve.currentReserve)} tone="neutral" />
        <KpiCard
          icon={Timer} label="Cobertura sem vendas"
          value={data.reserve.coverageMonths !== null ? `${data.reserve.coverageMonths.toFixed(1)} meses` : "—"}
          tone={data.reserve.alertLevel === "ok" ? "good" : data.reserve.alertLevel === "critico" ? "bad" : "neutral"}
        />
        <KpiCard icon={ArrowRightLeft} label="Contas a receber" value={formatCents(data.receivables)} tone="neutral" />
        <KpiCard icon={ArrowRightLeft} label="Contas a pagar" value={formatCents(data.payables)} tone="neutral" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Próximo risco de caixa</p>
        {data.nextRiskDate ? (
          <p className="text-sm text-gray-800">
            Sem novas entradas além do previsto, o saldo pode ficar negativo em <strong>{formatDateBR(data.nextRiskDate)}</strong>.
          </p>
        ) : (
          <p className="text-sm text-emerald-700">Nenhum risco de saldo negativo identificado nos próximos 90 dias, considerando apenas os lançamentos já cadastrados.</p>
        )}
      </div>

      {/* Gráficos obrigatórios (Fase 8) */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard
          title="Evolução do saldo" period={data.periodLabel} source="Lançamentos de fluxo de caixa (realizado)"
          interpretation={isManager ? "Saldo final acumulado, mês a mês, considerando apenas entradas/saídas efetivamente realizadas." : "Como o dinheiro em caixa mudou mês a mês."}
          testId="chart-cash-balance-line" empty={data.monthlyPoints.length === 0}
        >
          <CashBalanceLineChart points={data.monthlyPoints} />
        </ChartCard>

        <ChartCard
          title="Projeção de saldo — 30/60/90 dias" period="A partir de hoje" source="Lançamentos planejados e vencimentos futuros"
          interpretation={isManager ? "Saldo projetado somando lançamentos ativos com vencimento até cada horizonte; pontos com dado planejado são estimativas." : "Para onde o saldo tende a ir se nada mudar."}
          action={data.projection.firstNegativeDate ? `Atenção: risco de saldo negativo em ${formatDateBR(data.projection.firstNegativeDate)}.` : undefined}
          testId="chart-projection-line" empty={data.projection.points.length === 0}
        >
          <ProjectionLineChart points={data.projection.points} />
        </ChartCard>

        <ChartCard
          title="Receita — planejado versus realizado" period={data.periodLabel} source="Lançamentos de vendas do período"
          interpretation={data.revenueVariance.explanation}
          testId="chart-revenue-variance" empty={data.revenueVariance.status === "inconclusive"}
        >
          <PlannedVsActualBarChart variance={data.revenueVariance} label="Vendas" />
        </ChartCard>

        <ChartCard
          title="Despesas essenciais — planejado versus realizado" period={data.periodLabel} source="Lançamentos de despesa essencial do período"
          interpretation={data.expenseVariance.explanation}
          testId="chart-expense-variance" empty={data.expenseVariance.status === "inconclusive"}
        >
          <PlannedVsActualBarChart variance={data.expenseVariance} label="Despesas" />
        </ChartCard>

        <ChartCard
          title="Despesas por categoria" period={data.periodLabel} source="Saídas realizadas e planejadas do período"
          interpretation={isManager ? "Categorias pequenas são agrupadas em \"Outros\" para manter o gráfico legível." : "Onde o dinheiro está saindo."}
          testId="chart-expense-donut" empty={data.expenseComposition.length === 0}
        >
          <ExpenseDonutChart slices={data.expenseComposition} />
        </ChartCard>

        <ChartCard
          title="Maiores saídas do período" period={data.periodLabel} source="Lançamentos de saída do período, ordenados por valor"
          testId="chart-top-outflows" empty={data.topOutflows.length === 0}
        >
          <TopOutflowsBarChart outflows={data.topOutflows} />
        </ChartCard>
      </div>

      <ChartCard
        title="Reserva atual versus recomendada" period={`Meta: ${data.reserve.desiredCoverageMonths} meses de proteção`}
        source="Reserva configurada e gastos essenciais do período"
        interpretation={data.reserve.recommendation}
        testId="chart-reserve-progress"
      >
        <ReserveProgressBar
          percent={data.reserve.goalPercent ?? 0}
          currentLabel={formatCents(data.reserve.currentReserve)}
          recommendedLabel={formatCents(data.reserve.recommendedReserve)}
        />
      </ChartCard>

      {isManager && (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fórmulas usadas nesta tela (Modo Gestor)</p>
          <ul className="text-[11px] text-gray-600 space-y-1 font-mono">
            <li>fluxo líquido = entradas efetivas − saídas efetivas</li>
            <li>saldo final = saldo inicial + entradas efetivas − saídas efetivas</li>
            <li>reserva recomendada = gastos essenciais mensais × meses de proteção</li>
            <li>cobertura sem vendas = reserva disponível ÷ gastos essenciais mensais</li>
          </ul>
        </div>
      )}

      {/* Integração entre setores (Fase 16) — conexões visuais, sem duplicar fonte de dados */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Conectado com outros setores</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {INTEGRATION_LINKS.map(({ label, description, section, icon: Icon }) => (
            <button
              key={section}
              onClick={() => onNavigate(section)}
              data-testid={`finance-integration-${section}`}
              className="text-left flex items-start gap-2 p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/40 transition-colors"
            >
              <Icon className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-gray-800">{label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{description}</p>
              </div>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-3 italic">
          Diagnóstico → valores sugeridos: planejado para uma sprint futura — ainda não há um módulo de diagnóstico conectado a este workspace.
        </p>
      </div>

      <div className="text-[11px] text-gray-500">
        <StockGlossaryTerm termId="fluxo-caixa" />
      </div>
    </div>
  );
}
