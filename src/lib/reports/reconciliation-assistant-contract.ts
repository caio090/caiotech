/**
 * Conceptual contract for the future LOKAT Assistant's role in payment
 * reconciliation. Same pattern as src/lib/motor-lokat/ai-pede-contract.ts:
 * this is NOT an integration — no API call, no LLM, no inference performed
 * here. It exists so the UI has a stable shape to render against once a
 * real, approved Assistant exists, without a second contract being invented
 * later.
 */

export type ReconciliationAssistantState = "documentacao_pendente" | "planejado";
export const RECONCILIATION_ASSISTANT_STATE: ReconciliationAssistantState = "planejado";

/** What the future Assistant IS allowed to do, once real and approved. */
export const RECONCILIATION_ASSISTANT_ALLOWED = [
  "Perguntar por dados financeiros faltantes",
  "Identificar uma possível instituição/adquirente a partir de padrões conhecidos",
  "Sugerir uma classificação (fee/split/commission/retention/tax/discount/refund) para revisão humana",
  "Explicar em linguagem simples por que existe uma divergência",
  "Consultar documentação oficial de taxas quando disponível",
  "Resumir o impacto de uma divergência ou taxa não confirmada",
] as const;

/** What the future Assistant is NEVER allowed to do, even once real. */
export const RECONCILIATION_ASSISTANT_FORBIDDEN = [
  "Alterar um valor confirmed sem autorização explícita do usuário",
  "Aplicar uma taxa encontrada online automaticamente, sem confirmação",
  "Afirmar a instituição/adquirente sem indicar o nível de confiança",
  "Inventar uma cláusula contratual ou regra de split não informada",
  "Substituir reconcile() (src/lib/reports/reconciliation-types.ts) por um cálculo próprio",
] as const;

/** Mandatory sequence before ANY researched fee value can be applied — even after the Assistant is real. */
export const RESEARCHED_FEE_CONFIRMATION_FLOW = [
  "Identificar a possível instituição/adquirente",
  "Informar o nível de confiança dessa identificação",
  "Consultar a fonte oficial vigente da taxa",
  "Exibir a data e a origem da informação consultada",
  "Perguntar e confirmar o plano/contrato realmente contratado pelo cliente",
  "Aplicar o valor somente após confirmação explícita do usuário",
] as const;

export const RECONCILIATION_ASSISTANT_NOTE =
  "O Assistente LOKAT para conciliação financeira está planejado, não implementado. Nenhuma IA é chamada nesta tela — toda validação e pergunta aqui é determinística.";
