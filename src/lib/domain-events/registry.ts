import type { DomainEvent, DomainEventHandler, DomainEventType } from "./types";

const KNOWN_EVENT_TYPES = new Set<DomainEventType>([
  "ProductOpportunityDetected", "CommercialCampaignCreated", "CommercialCampaignApproved", "CommercialCampaignSentToRecOS",
  "ContentBriefCreated", "ContentScheduled", "ContentPublished", "CalendarEventCreated", "ReportDataImported",
  "FinancialDifferenceDetected", "InventoryRiskDetected", "ProductCostChanged", "BusinessPainPointCaptured",
]);

export function isKnownDomainEventType(type: string): type is DomainEventType {
  return KNOWN_EVENT_TYPES.has(type as DomainEventType);
}

/** Registry in-memory determinístico (Fase 27) -- publish() rejeita tipo desconhecido em vez de aceitar silenciosamente. */
export class DomainEventRegistry {
  private handlers = new Map<DomainEventType, DomainEventHandler[]>();
  private log: DomainEvent[] = [];

  subscribe(type: DomainEventType, handler: DomainEventHandler): void {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), handler]);
  }

  publish(event: DomainEvent): void {
    if (!isKnownDomainEventType(event.type)) throw new Error(`Tipo de evento desconhecido: ${event.type}`);
    this.log.push(event);
    for (const handler of this.handlers.get(event.type) ?? []) handler(event);
  }

  history(): DomainEvent[] {
    return [...this.log];
  }

  clear(): void {
    this.log = [];
    this.handlers.clear();
  }
}
