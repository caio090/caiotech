import type { DataHubEvent, DataHubEventType } from "./types";

/** Registro em memória, determinístico -- sem fila/broker real (Fase 7 é fundação, não infraestrutura de mensageria). */
export class InMemoryDataHubEventLog {
  private events: DataHubEvent[] = [];

  record(event: DataHubEvent): void {
    this.events.push(event);
  }

  all(): DataHubEvent[] {
    return [...this.events];
  }

  byType(type: DataHubEventType): DataHubEvent[] {
    return this.events.filter((event) => event.type === type);
  }

  bySource(sourceId: string): DataHubEvent[] {
    return this.events.filter((event) => event.sourceId === sourceId);
  }

  clear(): void {
    this.events = [];
  }
}
