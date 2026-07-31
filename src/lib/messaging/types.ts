import type { ProviderStatus } from "@/lib/providers/shared/types";

/** Fase 33: contratos para futura integração de mensageria -- reaproveita o padrão genérico de src/lib/providers/shared/types.ts (BaseProvider/ProviderStatus). Nenhum número conectado, nenhum webhook, nenhuma instância Evolution nesta sprint. */
export type MessagingProviderKind = "meta_cloud_api" | "evolution_cloud_api" | "evolution_baileys";

export type MessagingCapability = "text" | "audio" | "image" | "document" | "webhook" | "templates" | "groups" | "media_download" | "delivery_status";

export interface MessagingProvider {
  id: string;
  kind: MessagingProviderKind;
  label: string;
  status: ProviderStatus;
  capabilities: MessagingCapability[];
  blocker?: string;
}

/** Nenhum provider aqui está "active" -- todos "not_configured" (Fase 33: só mapa). */
export const MESSAGING_PROVIDERS: MessagingProvider[] = [
  { id: "whatsapp_meta_cloud_api", kind: "meta_cloud_api", label: "WhatsApp Cloud API (Meta)", status: "not_configured", capabilities: ["text", "image", "document", "templates", "webhook", "delivery_status"] },
  { id: "whatsapp_evolution_cloud", kind: "evolution_cloud_api", label: "Evolution API (cloud)", status: "not_configured", capabilities: ["text", "audio", "image", "document", "webhook", "groups", "media_download"] },
  { id: "whatsapp_evolution_baileys", kind: "evolution_baileys", label: "Evolution API (Baileys)", status: "not_configured", capabilities: ["text", "audio", "image", "document", "webhook", "groups", "media_download"] },
];

export function findMessagingProvider(id: string): MessagingProvider | undefined {
  return MESSAGING_PROVIDERS.find((provider) => provider.id === id);
}
