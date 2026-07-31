/** Fase 27: eventos internos entre módulos -- registro em memória, determinístico, sem fila/broker real. */
export type DomainEventType =
  | "ProductOpportunityDetected"
  | "CommercialCampaignCreated"
  | "CommercialCampaignApproved"
  | "CommercialCampaignSentToRecOS"
  | "ContentBriefCreated"
  | "ContentScheduled"
  | "ContentPublished"
  | "CalendarEventCreated"
  | "ReportDataImported"
  | "FinancialDifferenceDetected"
  | "InventoryRiskDetected"
  | "ProductCostChanged"
  | "BusinessPainPointCaptured";

export type DomainEventSource = string;
export type DomainEventTarget = string;
export type DomainEventPayload = Record<string, unknown>;

export interface DomainEvent {
  id: string;
  type: DomainEventType;
  source: DomainEventSource;
  target?: DomainEventTarget;
  payload: DomainEventPayload;
  occurredAt: string;
}

export type DomainEventHandler = (event: DomainEvent) => void;
