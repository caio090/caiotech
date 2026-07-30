"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockBalance, StockItem, StockMovement } from "@/lib/stock/types";
import { calculateInventoryCount, calculateReplenishmentPoint, isBelowReplenishmentPoint } from "@/lib/stock/calculations";
import { calculateActualConsumption, calculateActualCmvPercentage, calculateTheoreticalCmvPercentage, calculateCmvGap, calculateCmvGapPercentagePoints, CMV_GAP_EXPLANATION } from "@/lib/costing/calculations";
import { CMV_REPORT_FIXTURE, STOCK_ITEM_FIXTURES } from "@/lib/stock/fixtures";
import { TECHNICAL_SHEET_FIXTURES } from "@/lib/costing/fixtures";
import { StockGlossaryTerm } from "./_stock-glossary-term";

interface ReportCardProps {
  title: string;
  period: string;
  source: string;
  definition: string;
  interpretation: string;
  alert?: string;
  recommendedAction: string;
  missingData?: string;
  children: React.ReactNode;
}

function ReportCard({ title, period, source, definition, interpretation, alert, recommendedAction, missingData, children }: ReportCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5" data-testid={`report-${slugify(title)}`}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <span className="text-[10px] text-gray-400 shrink-0">{period}</span>
      </div>
      <p className="text-[10px] text-gray-400 mb-3">Fonte: {source}</p>

      <div className="mb-3">{children}</div>

      <p className="text-[11px] text-gray-500 mb-1"><strong className="text-gray-700">O que é:</strong> {definition}</p>
      <p className="text-[11px] text-gray-500 mb-1"><strong className="text-gray-700">Interpretação:</strong> {interpretation}</p>
      {alert && (
        <p className="flex items-start gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mt-2">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> {alert}
        </p>
      )}
      <p className="text-[11px] text-gray-500 mt-2"><strong className="text-gray-700">Ação recomendada:</strong> {recommendedAction}</p>
      {missingData && <p className="text-[10px] text-gray-300 italic mt-1">Dados ausentes: {missingData}</p>}
    </div>
  );
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function RestaurantReports({ items, balances, movements }: { items: StockItem[]; balances: StockBalance[]; movements: StockMovement[] }) {
  const actualConsumption = calculateActualConsumption(CMV_REPORT_FIXTURE);
  const actualCmv = calculateActualCmvPercentage({ actualConsumption, sales: CMV_REPORT_FIXTURE.sales }) ?? 0;
  const theoreticalCmv = calculateTheoreticalCmvPercentage({ theoreticalConsumption: CMV_REPORT_FIXTURE.theoreticalConsumption, sales: CMV_REPORT_FIXTURE.sales }) ?? 0;
  const gap = calculateCmvGap({ actualConsumption, theoreticalConsumption: CMV_REPORT_FIXTURE.theoreticalConsumption });
  const gapPp = calculateCmvGapPercentagePoints({ actualCmvPercentage: actualCmv, theoreticalCmvPercentage: theoreticalCmv });

  const belowReplenishment = STOCK_ITEM_FIXTURES.filter((item) => {
    const central = balances.find((b) => b.itemId === item.id && b.locationId === "central");
    return isBelowReplenishmentPoint(central?.theoreticalQuantity ?? 0, calculateReplenishmentPoint(item));
  });

  const lossesByReason = movements.filter((m) => ["waste", "expiration", "staff_meal", "courtesy", "correction"].includes(m.type));
  const stockValue = balances.reduce((sum, b) => sum + b.theoreticalQuantity * b.unitValue, 0);
  const transfers = movements.filter((m) => m.type === "transfer_in" || m.type === "transfer_out");
  const outdatedSheets = TECHNICAL_SHEET_FIXTURES.filter((s) => s.status === "outdated");

  const countedBalances = balances.filter((b) => b.physicalQuantity !== null);
  const byLocation: Record<string, number[]> = { central: [], kitchen: [] };
  for (const b of countedBalances) {
    const item = items.find((i) => i.id === b.itemId);
    const result = calculateInventoryCount({ theoreticalQuantity: b.theoreticalQuantity, countedQuantity: b.physicalQuantity as number, unitValue: b.unitValue, theoreticalUnit: item?.unit ?? "u", countedUnit: item?.unit ?? "u" });
    if (result.valid && result.precisionPercent !== null) byLocation[b.locationId].push(result.precisionPercent);
  }
  const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : null);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <ReportCard
        title="CMV real vs. teórico" period={CMV_REPORT_FIXTURE.periodLabel} source="Estoque + fichas técnicas (simulado)"
        definition="Compara o que realmente foi consumido com o que as fichas técnicas previam." interpretation={`CMV real de ${actualCmv}% contra CMV teórico de ${theoreticalCmv}%.`}
        alert={gap > 0 ? `Lacuna de ${formatCurrency(gap)} (${gapPp} pontos percentuais) não explicada.` : undefined}
        recommendedAction="Revisar fichas técnicas dos produtos com maior volume de venda antes de investigar desvio."
      >
        <BarPair labelA="Real" valueA={actualCmv} labelB="Teórico" valueB={theoreticalCmv} />
        <StockGlossaryTerm termId="cmv-real" className="block mt-2" />
      </ReportCard>

      <ReportCard
        title="Lacuna de CMV por período" period={CMV_REPORT_FIXTURE.periodLabel} source="Cálculo derivado do relatório de CMV"
        definition="A diferença em reais e em pontos percentuais entre consumo real e teórico." interpretation={CMV_GAP_EXPLANATION}
        recommendedAction="Acompanhar a lacuna mês a mês — uma lacuna recorrente pede investigação mais profunda que uma pontual."
      >
        <p className="text-2xl font-black text-gray-900">{formatCurrency(gap)}</p>
        <p className="text-xs text-gray-400">{gapPp} pontos percentuais</p>
      </ReportCard>

      <ReportCard
        title="Precisão por localização" period="Última contagem simulada" source="Inventário — estoque central e cozinha"
        definition="Quão perto o saldo físico contado ficou do saldo teórico esperado, por localização." interpretation="Cozinha tende a ter mais divergência por manuseio direto durante a produção."
        recommendedAction="Priorizar contagens mais frequentes na localização com menor precisão."
        missingData={countedBalances.length === 0 ? "Nenhuma contagem registrada ainda" : undefined}
      >
        <BarPair labelA="Central" valueA={avg(byLocation.central) ?? 0} labelB="Cozinha" valueB={avg(byLocation.kitchen) ?? 0} suffix="%" />
      </ReportCard>

      <ReportCard
        title="Perdas por motivo" period="Últimas movimentações simuladas" source="Movimentações de estoque"
        definition="Quantidade de registros de perda, vencimento, cortesia, refeição da equipe e correção." interpretation={`${lossesByReason.length} movimentação(ões) fora de venda/produção registrada(s) no período.`}
        recommendedAction="Padronizar o registro do motivo em toda perda para permitir comparação mês a mês."
      >
        <ul className="text-xs text-gray-600 space-y-1">
          {lossesByReason.map((m) => (
            <li key={m.id} className="flex justify-between"><span>{items.find((i) => i.id === m.itemId)?.name}</span><span className="font-bold">{m.type}</span></li>
          ))}
          {lossesByReason.length === 0 && <li className="text-gray-300 italic">Nenhuma perda registrada nesta simulação.</li>}
        </ul>
      </ReportCard>

      <ReportCard
        title="Itens abaixo do ponto de reposição" period="Agora" source="Estoque central + regras de reposição"
        definition="Insumos cujo saldo no estoque central já está abaixo do ponto de reposição calculado." interpretation={`${belowReplenishment.length} de ${STOCK_ITEM_FIXTURES.length} insumos precisam de atenção.`}
        alert={belowReplenishment.length > 0 ? `${belowReplenishment.map((i) => i.name).join(", ")}` : undefined}
        recommendedAction="Abrir a aba Compras para ver a quantidade sugerida de cada item."
      >
        <BarPair labelA="Abaixo" valueA={belowReplenishment.length} labelB="Total" valueB={STOCK_ITEM_FIXTURES.length} suffix="" />
      </ReportCard>

      <ReportCard
        title="Valor parado em estoque" period="Agora" source="Saldo teórico × custo médio, ambas as localizações"
        definition="Quanto dinheiro está imobilizado em insumos parados no estoque." interpretation="Valor alto parado por muito tempo pode indicar excesso de compra ou baixo giro."
        recommendedAction="Comparar com a cobertura em dias de cada item para identificar excesso real."
      >
        <p className="text-2xl font-black text-gray-900">{formatCurrency(stockValue)}</p>
      </ReportCard>

      <ReportCard
        title="Transferências central → cozinha" period="Últimas movimentações simuladas" source="Movimentações de estoque"
        definition="Quantidade de transferências registradas entre as duas localizações." interpretation={`${transfers.length} transferência(s) registrada(s) nesta simulação.`}
        recommendedAction="Transferir em lotes menores e mais frequentes reduz divergência de contagem."
      >
        <p className="text-2xl font-black text-gray-900">{transfers.length}</p>
      </ReportCard>

      <ReportCard
        title="Divergência de inventário" period="Última contagem simulada" source="Comparação saldo teórico × físico"
        definition="Itens cujo saldo contado diferiu do saldo teórico esperado." interpretation="Divergências pequenas e frequentes ao longo do tempo geralmente pesam mais que um outlier isolado."
        recommendedAction="Investigar primeiro os itens de maior valor unitário, não necessariamente maior quantidade."
      >
        <p className="text-2xl font-black text-gray-900">{countedBalances.filter((b) => b.physicalQuantity !== b.theoreticalQuantity).length}</p>
        <p className="text-xs text-gray-400">de {countedBalances.length} itens contados</p>
      </ReportCard>

      <ReportCard
        title="Produtos com maior impacto no CMV" period="Fichas técnicas atuais" source="Fichas técnicas"
        definition="Produtos cujo CMV está mais distante da meta simulada de 35%." interpretation="Poucos produtos costumam concentrar a maior parte do impacto no CMV geral."
        recommendedAction="Revisar preço ou ficha técnica dos produtos destacados antes de mudar o cardápio inteiro."
      >
        <ul className="text-xs text-gray-600">
          {TECHNICAL_SHEET_FIXTURES.map((s) => (
            <li key={s.id} className="flex justify-between py-0.5"><span>{s.product}</span></li>
          ))}
        </ul>
      </ReportCard>

      <ReportCard
        title="Fichas técnicas desatualizadas" period="Agora" source="Cadastro de fichas técnicas"
        definition="Fichas cuja versão não reflete o custo/insumo atual." interpretation={`${outdatedSheets.length} ficha(s) desatualizada(s) nesta simulação.`}
        recommendedAction="Atualizar fichas desatualizadas antes de confiar no CMV teórico calculado a partir delas."
        missingData={outdatedSheets.length === 0 ? "Nenhuma ficha marcada como desatualizada nesta simulação" : undefined}
      >
        <p className="text-2xl font-black text-gray-900">{outdatedSheets.length}</p>
      </ReportCard>
    </div>
  );
}

function BarPair({ labelA, valueA, labelB, valueB, suffix = "%" }: { labelA: string; valueA: number; labelB: string; valueB: number; suffix?: string }) {
  const max = Math.max(valueA, valueB, 1);
  return (
    <div className="space-y-2">
      {[{ label: labelA, value: valueA }, { label: labelB, value: valueB }].map((row) => (
        <div key={row.label}>
          <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
            <span>{row.label}</span><span className="font-bold text-gray-700">{row.value}{suffix}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full", row.label === labelA ? "bg-purple-500" : "bg-gray-400")} style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
