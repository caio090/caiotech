/**
 * Sprint Gota Neural Foundation V1 (Fase 27-34) — Integration/Connection.
 * Distingue explicitamente (Fase 25) Capability (capabilities.ts),
 * Integration Definition (um adapter/provider possível), Connection
 * (uma Company conectada a uma Integration Definition) e Connection
 * Health -- nunca misturados. Nenhum adapter real, nenhum SDK
 * instalado, nenhum token (Fase 32/33).
 */
import type { Capability } from "./capabilities";

export type IntegrationCategory =
  | "ADVERTISING"
  | "SOCIAL"
  | "MESSAGING"
  | "ATTRIBUTION"
  | "COMMERCE"
  | "PAYMENTS"
  | "CRM"
  | "ANALYTICS"
  | "PRODUCTIVITY"
  | "LOCAL_PRESENCE"
  | "STORAGE"
  | "GENERIC_CONNECTOR";

/**
 * Fase 27 — representa um adapter/provider POSSÍVEL, nunca implementado
 * aqui. `futureAdapterKey` é só um identificador estável para quando um
 * adapter real existir (sprint futura) -- nunca importa o SDK do
 * provider.
 */
export interface IntegrationDefinition {
  id: string;
  name: string;
  category: IntegrationCategory;
  capabilities: Capability[];
  connectionMethod: "oauth" | "api_key" | "qr" | "manual" | "webhook" | "unspecified";
  status: "documented" | "planned" | "unavailable";
  healthSupport: boolean;
  futureAdapterKey?: string;
}

/** Fase 28 — uma Company/Workspace conectada (ou não) a uma Integration Definition. Sem token real. */
export interface Connection {
  connectionId: string;
  companyId: string;
  integrationId: string;
  status: "connected" | "disconnected" | "degraded" | "expired" | "configuration_required" | "unsupported";
}

/** Fase 29 — nunca bloqueia Company Activation (ver activation.ts). */
export type ActivationConnectionChoice = "CONNECT_NOW" | "ADD_MANUALLY" | "SKIP_FOR_LATER" | "NOT_RELEVANT";

/** Fase 33 — saúde de uma Connection já estabelecida. */
export interface ConnectionHealth {
  connectionId: string;
  status: "healthy" | "degraded" | "offline" | "auth_required" | "configuration_required" | "unknown";
  checkedAt: string;
  message?: string;
  missingRequirements: string[];
  source: string;
}

export type ConnectionAlertSignal =
  | "not_connected"
  | "unavailable"
  | "missing_attribution_source"
  | "webhook_unhealthy"
  | "disconnected"
  | "connector_degraded"
  | "no_conversion_source";

/** Fase 34 — categorias/sinais, nunca mensagens hardcoded no core (a UI futura decide o texto). */
export interface ConnectionAlert {
  connectionId: string;
  signal: ConnectionAlertSignal;
  relatedCapability?: Capability;
}

/**
 * Fase 30/31 — catálogo CONTRACT-ONLY. Nenhuma marca vira dependência
 * do core: cada entrada é documentação de compatibilidade futura, nunca
 * um adapter real (Fase 32, "No Provider Lock-In").
 */
export const INTEGRATION_CATALOG_FOUNDATION: readonly IntegrationDefinition[] = [
  { id: "meta_ads", name: "Meta Ads", category: "ADVERTISING", capabilities: ["advertising", "attribution"], connectionMethod: "oauth", status: "documented", healthSupport: true, futureAdapterKey: "meta_ads" },
  { id: "google_ads", name: "Google Ads", category: "ADVERTISING", capabilities: ["advertising", "attribution"], connectionMethod: "oauth", status: "documented", healthSupport: true, futureAdapterKey: "google_ads" },
  { id: "tiktok_ads", name: "TikTok Ads", category: "ADVERTISING", capabilities: ["advertising"], connectionMethod: "oauth", status: "documented", healthSupport: true, futureAdapterKey: "tiktok_ads" },
  { id: "kwai_ads", name: "Kwai Ads", category: "ADVERTISING", capabilities: ["advertising"], connectionMethod: "oauth", status: "documented", healthSupport: false, futureAdapterKey: "kwai_ads" },
  { id: "taboola", name: "Taboola", category: "ADVERTISING", capabilities: ["advertising"], connectionMethod: "api_key", status: "documented", healthSupport: false, futureAdapterKey: "taboola" },
  { id: "instagram", name: "Instagram", category: "SOCIAL", capabilities: ["social_content"], connectionMethod: "oauth", status: "documented", healthSupport: true, futureAdapterKey: "instagram" },
  { id: "facebook", name: "Facebook", category: "SOCIAL", capabilities: ["social_content"], connectionMethod: "oauth", status: "documented", healthSupport: true, futureAdapterKey: "facebook" },
  { id: "tiktok", name: "TikTok", category: "SOCIAL", capabilities: ["social_content"], connectionMethod: "oauth", status: "documented", healthSupport: false, futureAdapterKey: "tiktok" },
  { id: "youtube", name: "YouTube", category: "SOCIAL", capabilities: ["social_content"], connectionMethod: "oauth", status: "documented", healthSupport: false, futureAdapterKey: "youtube" },
  { id: "whatsapp", name: "WhatsApp", category: "MESSAGING", capabilities: ["messaging"], connectionMethod: "qr", status: "documented", healthSupport: true, futureAdapterKey: "whatsapp" },
  { id: "google_business", name: "Google Business", category: "LOCAL_PRESENCE", capabilities: ["local_presence"], connectionMethod: "oauth", status: "documented", healthSupport: false, futureAdapterKey: "google_business" },
  { id: "utms", name: "UTMs", category: "ATTRIBUTION", capabilities: ["attribution"], connectionMethod: "manual", status: "documented", healthSupport: false },
  { id: "pixels", name: "Pixels", category: "ATTRIBUTION", capabilities: ["attribution"], connectionMethod: "manual", status: "documented", healthSupport: true },
  { id: "conversion_apis", name: "Conversion APIs", category: "ATTRIBUTION", capabilities: ["attribution"], connectionMethod: "api_key", status: "documented", healthSupport: true },
  { id: "webhooks", name: "Webhooks", category: "GENERIC_CONNECTOR", capabilities: ["attribution", "commerce"], connectionMethod: "webhook", status: "documented", healthSupport: true },
  { id: "utmify", name: "Attribution provider (ex.: UTMify)", category: "ATTRIBUTION", capabilities: ["attribution"], connectionMethod: "api_key", status: "documented", healthSupport: true, futureAdapterKey: "attribution_provider_generic" },
  { id: "checkout_provider", name: "Checkout provider", category: "COMMERCE", capabilities: ["checkout", "commerce"], connectionMethod: "api_key", status: "documented", healthSupport: true },
  { id: "sales_platform", name: "Sales platform", category: "COMMERCE", capabilities: ["commerce"], connectionMethod: "api_key", status: "documented", healthSupport: false },
  { id: "google_calendar", name: "Google Calendar", category: "PRODUCTIVITY", capabilities: ["calendar"], connectionMethod: "oauth", status: "documented", healthSupport: false, futureAdapterKey: "google_calendar" },
  { id: "google_drive", name: "Google Drive", category: "STORAGE", capabilities: ["documents"], connectionMethod: "oauth", status: "documented", healthSupport: false, futureAdapterKey: "google_drive" },
  { id: "lokat_project_connector", name: "Lokat Project Connector", category: "GENERIC_CONNECTOR", capabilities: ["crm", "calendar", "documents", "analytics", "commerce"], connectionMethod: "api_key", status: "planned", healthSupport: true, futureAdapterKey: "lokat_project_connector" },
] as const;

export function findIntegrationDefinition(id: string): IntegrationDefinition | undefined {
  return INTEGRATION_CATALOG_FOUNDATION.find((def) => def.id === id);
}

export function integrationsForCapability(capability: Capability): readonly IntegrationDefinition[] {
  return INTEGRATION_CATALOG_FOUNDATION.filter((def) => def.capabilities.includes(capability));
}
