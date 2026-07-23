import type { LabTestResultInput, LabDecision } from "./business-types";
import type { CampaignInput } from "./types";

/**
 * Deterministic, rule-based suggestion for what to do after a product test.
 * Never executed automatically — the UI always lets the user pick any of the
 * 7 valid decisions regardless of this suggestion.
 */
export function recommendLabDecision(
  test: CampaignInput,
  result: LabTestResultInput | null
): { decision: LabDecision; reason: string } {
  if (!result) {
    return { decision: "manter", reason: "Sem resultado registrado ainda — aguardando dados do teste." };
  }

  if (result.wastePct !== null && result.wastePct > 0.15) {
    return {
      decision: "reformular",
      reason: `Desperdício de ${(result.wastePct * 100).toFixed(0)}% no teste é alto — revisar receita/processo antes de escalar.`,
    };
  }

  if (test.projectedQuantity > 0 && result.quantitySold < test.projectedQuantity * 0.5) {
    return {
      decision: "retirar",
      reason: `Vendeu ${result.quantitySold} de ${test.projectedQuantity} pedidos projetados — demanda muito abaixo do esperado.`,
    };
  }

  const marginPerUnit = result.quantitySold > 0 ? (result.revenue - result.cmvOrCsv) / result.quantitySold : 0;

  if (marginPerUnit <= 0) {
    return { decision: "ajustar_preco", reason: "Margem por unidade no teste ficou zero ou negativa — preço ou custo direto precisam ser revistos." };
  }

  if (test.projectedQuantity > 0 && result.quantitySold >= test.projectedQuantity) {
    if (result.repeatPurchaseRate !== null && result.repeatPurchaseRate > 0.3) {
      return { decision: "expandir", reason: "Bateu a meta de quantidade com margem positiva e recompra relevante — bom candidato a expansão." };
    }
    return { decision: "manter", reason: "Bateu a meta de quantidade projetada com margem positiva." };
  }

  return { decision: "ajustar_preco", reason: "Resultado misto em relação à meta — considerar ajuste de preço antes de decidir manter ou retirar." };
}
