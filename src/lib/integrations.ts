// ── Tipos de integração disponíveis na plataforma ─────────────────────────────

export const INTEGRATION_TYPES = [
  { key: "meta",         label: "Meta / Facebook"  },
  { key: "instagram",    label: "Instagram"        },
  { key: "whatsapp",     label: "WhatsApp"         },
  { key: "google_drive", label: "Google Drive"     },
  { key: "digital_menu", label: "Cardápio Digital" },
  { key: "delivery",     label: "PDV / Delivery"   },
  { key: "crm",          label: "CRM externo"      },
] as const;

export type IntegrationType = typeof INTEGRATION_TYPES[number]["key"];

// ── Status de uma integração ───────────────────────────────────────────────────

export const INTEGRATION_STATUS = {
  connected:     { label: "Conectado",           color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
  pending:       { label: "Pendente",            color: "text-blue-700 bg-blue-50 border-blue-100"          },
  not_connected: { label: "Não conectado",       color: "text-gray-500 bg-gray-50 border-gray-100"          },
  planned:       { label: "Planejado",           color: "text-amber-700 bg-amber-50 border-amber-100"       },
  needs_setup:   { label: "Requer configuração", color: "text-indigo-700 bg-indigo-50 border-indigo-100"    },
  error:         { label: "Erro de conexão",     color: "text-red-700 bg-red-50 border-red-100"             },
} as const;

export type IntegrationStatusKey = keyof typeof INTEGRATION_STATUS;

// ── Interface de integração por cliente ──────────────────────────────────────
// Representa o modelo futuro de client_integrations.
// Proposta de schema em: docs/architecture/CLIENT_INTEGRATIONS_PROPOSAL.md
// A tabela ainda não existe no banco — não executar SQL sem autorização.

export interface ClientIntegration {
  id: string;
  client_id: string;
  integration_type: IntegrationType;
  status: IntegrationStatusKey;
  external_id: string | null;
  metadata: Record<string, unknown>;
  connected_at: string | null;
  last_sync: string | null;
  created_at: string;
  updated_at: string;
}

// ── Integrações planejadas por tipo de conta ──────────────────────────────────
// Usado para mostrar o que está "planejado" para cada perfil de lead/conta.

export const INTEGRATIONS_BY_ACCOUNT_TYPE: Record<string, IntegrationType[]> = {
  agencia:          ["meta", "instagram", "whatsapp", "google_drive"],
  agencia_parceira: ["meta", "instagram", "whatsapp", "google_drive"],
  empresa:          ["meta", "instagram", "whatsapp", "digital_menu"],
  cliente_direto:   ["meta", "instagram", "whatsapp"],
  cliente_agencia:  ["meta", "instagram"],
  autonomo:         ["whatsapp", "meta"],
  interno_lokat:    ["meta", "instagram", "whatsapp", "google_drive", "delivery", "crm"],
  // Legacy keys
  business:         ["meta", "instagram", "whatsapp", "digital_menu"],
  local_business:   ["meta", "instagram", "whatsapp", "digital_menu"],
  invited_client:   ["meta", "instagram"],
  professional:     ["whatsapp", "meta"],
};

export function getPlannedIntegrations(accountType: string | null | undefined): IntegrationType[] {
  if (!accountType) return [];
  return INTEGRATIONS_BY_ACCOUNT_TYPE[accountType.toLowerCase()] ?? [];
}
