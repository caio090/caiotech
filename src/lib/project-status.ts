// Sprint Recalibração LOKAT OS 2026-08 (correção pós-auditoria
// independente) — este arquivo mantinha V1_PROGRESS/V2_PROGRESS
// hardcoded de forma independente de src/config/project-status.ts, que
// é o sistema detalhado (206 áreas, calcV1Readiness()) e passa a ser
// canônico. A divergência já estava materializada: esta tela mostrava
// 81% enquanto a recalibração registrava 65%. Fachada temporária:
// reexporta os dois valores do arquivo canônico em vez de manter um
// segundo número hardcoded. PROJECT_DEADLINE_V1/MILESTONES_V1/V2
// permanecem aqui -- fora do escopo desta divergência específica.
// Consolidação mais profunda dos dois arquivos fica para uma sprint
// futura (ver docs/recalibration/lokat-os-recalibration-2026-08.md).
export { V1_PROGRESS, V2_PROGRESS } from "@/config/project-status";

// Sprint Recalibração Corrections 2026-08.2 — classificação explícita
// (Fase 2), sem refactor: `src/config/project-status.ts` é a fonte
// CANÔNICA para tracked areas, readiness, QA, prioridades, riscos e
// progresso atual (V1_PROGRESS/V2_PROGRESS já vêm de lá, ver acima).
// PROJECT_DEADLINE_V1 e MILESTONES_V1/V2 abaixo são **legacy
// compatibility metadata** até uma consolidação futura -- NUNCA devem
// ser apresentados como uma segunda fonte canônica concorrente.
//
// Classificação (nenhuma das duas é duplicação real do canônico, logo
// nenhuma foi alterada nesta sprint):
// - PROJECT_DEADLINE_V1: não tem equivalente em project-status.ts (não
//   é duplicação) e já é uma data passada (2026-07-31, antes de hoje)
//   -- não é "informação operacional ainda válida", é um alvo histórico
//   que já venceu. Categoria (C): metadata histórica/legada.
// - MILESTONES_V1/V2: usam granularidade e rótulos narrativos próprios
//   (frases), sem correspondência 1:1 com os IDs de PROJECT_AREAS --
//   não há forma mecânica segura de derivar um do outro sem inventar um
//   mapeamento que não existe hoje. Categoria (C): metadata
//   histórica/legada, mesma classificação do deadline.
// Registrado como dívida não bloqueante em
// dual_project_status_tracking_debt (project-status.ts) para
// consolidação futura -- não mexido aqui.
export const PROJECT_DEADLINE_V1 = "2026-07-31";

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
  { label: "CRM básico — origem, intenção, badge e tipo", status: "done"    },
  { label: "Waitlist e captura de leads",                 status: "done"    },
  { label: "Início / Central IA — sidebar",               status: "done"    },
  { label: "Meta Insights básico",                        status: "done"    },
  { label: "SEO público e metadados",                              status: "done"    },
  { label: "Meta Insights avançado",                               status: "partial" },
  { label: "REC OS base",                                          status: "partial" },
  { label: "Operacional base",                                     status: "partial" },
  { label: "Agente IA no CRM — geração local",                     status: "partial" },
  { label: "Relatórios por cliente — estrutura base",              status: "partial" },
  { label: "Classificação de contas — persistência validada em produção",       status: "done"    },
  { label: "Classificação de leads — domínio separado de contas em correção",  status: "partial" },
  { label: "Conexões por cliente — seletor e contexto visual",     status: "partial" },
  { label: "Central de Contas — acesso e gestão de perfis",        status: "partial" },
  { label: "Billing / Financeiro MVP",                             status: "partial" },
  { label: "Integrações por cliente — contexto e estados",         status: "partial" },
  { label: "Rastreabilidade lead → cliente",                       status: "pending" },
  { label: "QA final e polish para venda",                         status: "pending" },
];

export const MILESTONES_V2: Milestone[] = [
  { label: "Créditos de IA por cliente",         status: "pending" },
  { label: "Google Drive para anexos e vídeos",  status: "pending" },
  { label: "Integração OláClick avançada",        status: "pending" },
  { label: "Meta Ads e campanhas avançadas",      status: "pending" },
  { label: "Automações WhatsApp / n8n",           status: "pending" },
  { label: "Relatórios inteligentes por cliente", status: "pending" },
];
