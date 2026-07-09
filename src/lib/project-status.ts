export const PROJECT_DEADLINE_V1 = "2026-07-31";
export const V1_PROGRESS = 75;
export const V2_PROGRESS = 12;

export function getDaysRemainingV1(): number {
  const deadline = new Date("2026-07-31T23:59:59");
  return Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86_400_000));
}

export type MilestoneStatus = "done" | "partial" | "pending";

export interface Milestone {
  label: string;
  status: MilestoneStatus;
}

export const MILESTONES_V1: Milestone[] = [
  { label: "Landing pública e pré-acesso",           status: "done"    },
  { label: "Login e autenticação por role",          status: "done"    },
  { label: "Portal Admin base",                      status: "done"    },
  { label: "CRM básico — origem, intenção e badge",  status: "done"    },
  { label: "Waitlist e captura de leads",            status: "done"    },
  { label: "Meta Insights básico",                   status: "done"    },
  { label: "Meta Insights avançado",                 status: "partial" },
  { label: "REC OS base",                            status: "partial" },
  { label: "Operacional base",                       status: "partial" },
  { label: "Central de Contas — classificação real", status: "pending" },
  { label: "Billing / Financeiro MVP",               status: "partial" },
  { label: "QA final e polish para venda",           status: "pending" },
];

export const MILESTONES_V2: Milestone[] = [
  { label: "Créditos de IA por cliente",         status: "pending" },
  { label: "Google Drive para anexos e vídeos",  status: "pending" },
  { label: "Integração OláClick avançada",        status: "pending" },
  { label: "Meta Ads e campanhas avançadas",      status: "pending" },
  { label: "Automações WhatsApp / n8n",           status: "pending" },
  { label: "Relatórios inteligentes por cliente", status: "pending" },
];
