import type { CmvCoverageSummary, CmvGapSummary, CmvInterpretationResult, CmvPolicy } from "./types";

const check = (id: string, label: string) => ({ id, label, completed: false });

export function interpretCmv(gap: CmvGapSummary, coverage: CmvCoverageSummary, theoreticalRate: number | null, actualRate: number | null, policy: CmvPolicy): CmvInterpretationResult {
  if (coverage.confidence === "insufficient" || gap.classification === "inconclusive") {
    return {
      situation: "Dados insuficientes para uma conclusão confiável",
      explanation: `Este resultado cobre ${(coverage.salesCoverage * 100).toFixed(0)}% das vendas analisadas. Ainda não há informação suficiente para concluir a causa da diferença.`,
      action: "Complete fichas, inventários, compras e alinhe o período antes de investigar a operação.",
      confidence: "insufficient",
      investigation: { diagnosis: "A qualidade dos dados precisa melhorar antes de interpretar o CMV.", hypotheses: [] },
    };
  }

  const hypotheses = [];
  if (gap.classification === "attention" || gap.classification === "critical") {
    hypotheses.push({
      id: "portion-or-sheet", title: "Porcionamento ou ficha técnica", rationale: "Os dados sugerem verificar se o consumo padrão representa a execução atual.",
      evidence: gap.amount === null ? [] : [`Lacuna calculável de R$ ${(gap.amount / 100).toFixed(2).replace(".", ",")}`],
      missingEvidence: ["Pesagem por turno", "Versão vigente das fichas"],
      checks: [check("weigh", "Pesar 10 porções em três turnos"), check("compare", "Comparar média real com a ficha"), check("version", "Versionar a ficha somente após confirmação")],
      priority: gap.classification === "critical" ? "high" as const : "medium" as const, owner: "Operação" as const, estimatedImpact: gap.amount,
    });
    hypotheses.push({
      id: "inventory", title: "Inventário, perdas ou consumo interno", rationale: "Uma possível causa é haver movimentação ainda não classificada; isso não prova desperdício, desvio ou erro da equipe.",
      evidence: [], missingEvidence: ["Recontagem dos itens de maior impacto", "Registros de perdas, cortesias e consumo interno"],
      checks: [check("opening", "Revisar estoque inicial e final"), check("transfers", "Conferir transferências e unidades"), check("losses", "Conferir perdas, cortesias e consumo interno")],
      priority: "high" as const, owner: "Gestão" as const, estimatedImpact: null,
    });
  } else if (gap.classification === "below") {
    hypotheses.push({
      id: "below-theoretical", title: "Real abaixo do teórico precisa de conferência", rationale: "O resultado pode refletir inventário final superestimado, compras ausentes, período desalinhado ou ficha superestimada.",
      evidence: [], missingEvidence: ["Conferência independente do inventário"],
      checks: [check("inventory", "Recontar itens de maior impacto"), check("purchases", "Conferir compras do período"), check("period", "Alinhar período de vendas e estoque")],
      priority: "medium" as const, owner: "Financeiro" as const, estimatedImpact: null,
    });
  }

  if (theoreticalRate !== null && theoreticalRate >= policy.warningCmvPercentage) {
    hypotheses.push({
      id: "structural-margin", title: "Estrutura de custo e preço", rationale: "O CMV teórico já está acima da meta configurada; uma possível causa é preço, ingrediente, embalagem, rendimento ou desconto.",
      evidence: [`CMV teórico ${(theoreticalRate * 100).toFixed(1)}%`], missingEvidence: ["Taxas variáveis por canal"],
      checks: [check("cost", "Conferir último custo dos ingredientes"), check("yield", "Conferir rendimento e embalagem"), check("price", "Revisar preço e descontos")],
      priority: actualRate !== null && actualRate >= policy.criticalCmvPercentage ? "high" as const : "medium" as const, owner: "Financeiro" as const, estimatedImpact: null,
    });
  }

  const points = gap.percentagePoints === null ? "—" : `${(gap.percentagePoints * 100).toFixed(1)} pontos percentuais`;
  return {
    situation: gap.classification === "aligned" ? "CMV real e teórico estão alinhados no período" : `Existe uma lacuna de ${points}`,
    explanation: "A diferença é um sinal para investigação, não uma acusação. Ela pode combinar cadastro, inventário, compras, ficha, período e execução.",
    action: hypotheses[0]?.checks[0]?.label ?? "Manter a conferência periódica dos dados.",
    confidence: coverage.confidence,
    investigation: { diagnosis: "Os dados sugerem verificar as hipóteses abaixo antes de alterar processos ou fichas.", hypotheses },
  };
}
