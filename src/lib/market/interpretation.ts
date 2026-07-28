import type { MarketBenchmarkSummary, PricingScenario, ProductMarketPosition, SalesMixSummary } from "./types";

export interface MarketPricingInterpretation { situation: string; hypothesis: string; evidence: string[]; limitations: string[]; checks: string[]; scenarios: PricingScenario[]; autoApply: false }

export function interpretMarketPricing(position: ProductMarketPosition, popular: boolean, healthyMargin: boolean, highCmv: boolean, benchmark: MarketBenchmarkSummary, scenarios: PricingScenario[]): MarketPricingInterpretation {
  let situation = "Dados insuficientes para comparar preço e mercado.";
  let hypothesis = "Uma possível causa é a amostra ainda não representar produtos e canais equivalentes.";
  if (position === "above_market" && popular && healthyMargin) { situation = "O produto sustenta preço superior no período analisado."; hypothesis = "O posicionamento pode estar sendo percebido, mas isso precisa continuar sendo monitorado."; }
  else if (position === "below_market" && popular && !healthyMargin) { situation = "O produto vende bem, mas deixa pouco resultado."; hypothesis = "O preço, desconto, canal ou custo pode estar limitando a margem."; }
  else if (position === "above_market" && !popular && healthyMargin) { situation = "A margem é saudável, mas a saída é baixa."; hypothesis = "A diferença de preço ou a comunicação pode estar reduzindo a popularidade."; }
  else if (position === "aligned" && highCmv && !healthyMargin) { situation = "O preço está próximo ao mercado e o CMV está elevado."; hypothesis = "A principal oportunidade pode estar em custo, rendimento, composição ou canal."; }
  return { situation, hypothesis, evidence: [`${benchmark.sampleCount} amostra(s) comparável(is)`, `Confiança ${benchmark.confidence}`], limitations: benchmark.limitations, checks: ["Revisar comparabilidade e atualidade", "Conferir preço realizado e descontos", "Comparar custos e taxas por canal"], scenarios, autoApply: false };
}

export function interpretSalesMix(current: SalesMixSummary, change: number | null): string {
  if (current.consolidatedCmv === null || change === null) return "Ainda não há dados suficientes para interpretar o efeito do mix.";
  if (change > 0.005) return "O CMV consolidado aumentou principalmente porque produtos com maior custo relativo representaram uma parcela maior das vendas. Isso não indica, por si só, falha operacional.";
  if (change < -0.005) return "O mix do período concentrou mais vendas em produtos com menor CMV relativo; confirme se essa mudança é sustentável.";
  return "A mudança do mix teve pouco efeito no CMV consolidado neste período.";
}
