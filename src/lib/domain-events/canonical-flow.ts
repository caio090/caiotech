import type { DomainEventType } from "./types";

/** Fase 30: representação do fluxo canônico Produto -> Oportunidade -> Campanha -> REC OS -> Conteúdo -> Calendário -> Publicação -> Relatório -> Resultado -> Produto. */
export interface CanonicalFlowStep {
  id: string;
  label: string;
  entity: string;
  moduleId: string;
  event?: DomainEventType;
  requiredData: string[];
  status: "modeled" | "partially_implemented" | "implemented";
  nextStepId: string | null;
}

export const CANONICAL_FLOW_STEPS: CanonicalFlowStep[] = [
  { id: "product", label: "Produto", entity: "Product", moduleId: "meu_negocio", requiredData: ["margin", "stock", "salesVelocity"], status: "partially_implemented", nextStepId: "opportunity" },
  { id: "opportunity", label: "Oportunidade identificada", entity: "ProductCampaignOpportunity", moduleId: "meu_negocio", event: "ProductOpportunityDetected", requiredData: ["reason", "evidence"], status: "modeled", nextStepId: "campaign" },
  { id: "campaign", label: "Campanha comercial", entity: "CommercialCampaignBrief", moduleId: "meu_negocio", event: "CommercialCampaignCreated", requiredData: ["offer", "budget", "periodStart", "periodEnd"], status: "modeled", nextStepId: "rec_os_brief" },
  { id: "rec_os_brief", label: "Brief enviado ao REC OS", entity: "GuidedCreativeBrief", moduleId: "rec_os", event: "CommercialCampaignSentToRecOS", requiredData: ["whatToCommunicate", "audience"], status: "modeled", nextStepId: "content" },
  { id: "content", label: "Conteúdo, design e vídeo", entity: "ContentItem", moduleId: "rec_os", event: "ContentBriefCreated", requiredData: ["format", "channels"], status: "implemented", nextStepId: "calendar" },
  { id: "calendar", label: "Calendário Global", entity: "GlobalCalendarEvent", moduleId: "calendario_global", event: "CalendarEventCreated", requiredData: ["scheduledDate"], status: "implemented", nextStepId: "publication" },
  { id: "publication", label: "Publicação", entity: "ContentItem", moduleId: "rec_os", event: "ContentPublished", requiredData: ["publishedAt"], status: "implemented", nextStepId: "report" },
  { id: "report", label: "Relatório", entity: "ReportSourceData", moduleId: "relatorios", event: "ReportDataImported", requiredData: ["channels", "topProducts"], status: "modeled", nextStepId: "result" },
  { id: "result", label: "Resultado comercial", entity: "ReportSourceData", moduleId: "relatorios", requiredData: ["revenue", "conversions"], status: "modeled", nextStepId: "product" },
];
