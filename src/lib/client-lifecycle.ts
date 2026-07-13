// Serviço de domínio para automações de ciclo de vida do cliente local.
// Regras de transição de status — separadas do ciclo de assinatura SaaS.

export type ClientStatus =
  | "aguardando_validacao" // prospect
  | "onboarding"
  | "ativo"
  | "active"              // alias normalizado do app layer
  | "pausado"
  | "inadimplente"
  | "encerrado";

export type ClientLifecycleEvent =
  | "contract_signed"
  | "onboarding_started"
  | "onboarding_checklist_completed"
  | "client_activated"
  | "service_payment_overdue"
  | "service_paused"
  | "service_ended";

export interface OnboardingChecklist {
  contract_signed: boolean;
  briefing_received: boolean;
  initial_diagnostic: boolean;
  responsible_defined: boolean;
  invite_sent_or_waived: boolean;
  applicable_modules_chosen: boolean;
}

export function isOnboardingChecklistComplete(checklist: OnboardingChecklist): boolean {
  return (
    checklist.contract_signed &&
    checklist.briefing_received &&
    checklist.initial_diagnostic &&
    checklist.responsible_defined &&
    checklist.invite_sent_or_waived &&
    checklist.applicable_modules_chosen
  );
}

// Transições de status válidas — usadas para validar mudanças manuais e automáticas.
const VALID_TRANSITIONS: Record<ClientStatus, ClientStatus[]> = {
  aguardando_validacao: ["onboarding", "encerrado"],
  onboarding:          ["ativo", "active", "pausado", "encerrado"],
  ativo:               ["pausado", "inadimplente", "encerrado"],
  active:              ["pausado", "inadimplente", "encerrado"],
  pausado:             ["ativo", "active", "inadimplente", "encerrado"],
  inadimplente:        ["ativo", "active", "pausado", "encerrado"],
  encerrado:           [],
};

export function isValidStatusTransition(from: ClientStatus, to: ClientStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// Regras de evento para mudança de status.
// Nota: contract_signed NÃO muda status diretamente — apenas habilita "Iniciar onboarding".
// Nenhum upload muda status automaticamente.
export function getStatusFromEvent(
  event: ClientLifecycleEvent,
  currentStatus: ClientStatus
): ClientStatus | null {
  switch (event) {
    case "onboarding_started":
      return currentStatus === "aguardando_validacao" ? "onboarding" : null;
    case "client_activated":
      return currentStatus === "onboarding" ? "ativo" : null;
    case "service_payment_overdue":
      return currentStatus === "ativo" || currentStatus === "active" ? "inadimplente" : null;
    case "service_paused":
      return currentStatus === "ativo" || currentStatus === "active" ? "pausado" : null;
    case "service_ended":
      return "encerrado";
    // contract_signed e onboarding_checklist_completed não alteram status diretamente
    default:
      return null;
  }
}

export const CLIENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  aguardando_validacao: { label: "Prospect",     color: "text-violet-700 bg-violet-50 border-violet-100" },
  onboarding:           { label: "Onboarding",   color: "text-blue-700 bg-blue-50 border-blue-100" },
  ativo:                { label: "Ativo",         color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
  active:               { label: "Ativo",         color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
  pausado:              { label: "Pausado",       color: "text-amber-700 bg-amber-50 border-amber-100" },
  inadimplente:         { label: "Inadimplente",  color: "text-red-700 bg-red-50 border-red-100" },
  encerrado:            { label: "Encerrado",     color: "text-gray-500 bg-gray-50 border-gray-100" },
};
