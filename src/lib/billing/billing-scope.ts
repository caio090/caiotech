// Conceito de escopo de cobrança — não requer coluna no banco na V1.
// Pode ser derivado de metadata existente ou armazenado em profiles.metadata.

export type BillingScope =
  | "platform_subscription" // paga pelo uso da plataforma
  | "lokal_service"          // cliente de serviços da LOKAT sem assinatura SaaS
  | "hybrid"                 // paga serviços E tem assinatura
  | "internal"               // conta da equipe / administração
  | "test"                   // QA, demonstração, desenvolvimento
  | "none";                  // sem cobrança configurada

export const BILLING_SCOPE_LABELS: Record<BillingScope, { label: string; description: string }> = {
  platform_subscription: {
    label: "Assinante da plataforma",
    description: "Usuário paga mensalmente pelo uso do LOKAT OS.",
  },
  lokal_service: {
    label: "Cliente local LOKAT",
    description: "Empresa atendida pela LOKAT como serviço. Sem assinatura SaaS automática.",
  },
  hybrid: {
    label: "Híbrido",
    description: "Paga serviços da LOKAT e também possui assinatura da plataforma.",
  },
  internal: {
    label: "Conta interna",
    description: "Equipe ou administração. Sem cobrança.",
  },
  test: {
    label: "Conta de teste",
    description: "QA, demonstração ou desenvolvimento.",
  },
  none: {
    label: "Sem cobrança",
    description: "Nenhuma cobrança configurada.",
  },
};

export function deriveBillingScopeFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): BillingScope {
  const raw = metadata?.billing_scope;
  if (typeof raw === "string" && raw in BILLING_SCOPE_LABELS) {
    return raw as BillingScope;
  }
  return "none";
}
