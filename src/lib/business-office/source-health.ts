/**
 * Sprint MVP Experience Completion V0.1 (Parte B3) — Source Health.
 * Runtime/read model apenas -- nenhuma persistência, nenhuma tabela nova.
 * `getBusinessOfficeFeed()` já usa Promise.allSettled() e já retorna
 * `sourceErrors: string[]` por fonte (Fase B2 já estava implementada na
 * camada de dados); este módulo só traduz isso em um status visual
 * honesto por fonte, para alimentar o painel "Fontes do Escritório".
 */
import { BUSINESS_OFFICE_NOT_INTEGRATED_MODULES } from "./types";

export type SourceHealthStatus = "connected" | "degraded" | "unavailable" | "not_connected";

export interface OfficeSourceStatus {
  id: string;
  label: string;
  status: SourceHealthStatus;
}

const CONNECTED_SOURCES: { id: string; label: string }[] = [
  { id: "content_items", label: "Conteúdo (REC OS)" },
  { id: "operational_tasks", label: "Tarefas" },
  { id: "approvals", label: "Aprovações" },
];

/** Fase B3/B11 — separa fontes conectadas (com ou sem erro nesta busca) das ainda não integradas. */
export function buildOfficeSourceStatuses(sourceErrors: string[]): OfficeSourceStatus[] {
  const connected: OfficeSourceStatus[] = CONNECTED_SOURCES.map((source) => ({
    ...source,
    status: sourceErrors.includes(source.id) ? "unavailable" : "connected",
  }));
  const notConnected: OfficeSourceStatus[] = BUSINESS_OFFICE_NOT_INTEGRATED_MODULES.map((m) => ({
    id: m.type,
    label: m.label,
    status: "not_connected",
  }));
  return [...connected, ...notConnected];
}

/**
 * Fase B8 — Agenda deriva de 3 fontes (content/tasks/approvals). Se
 * NENHUMA falhou: connected. Se ALGUMAS falharam: degraded (mostra o que
 * deu certo, avisa sobre o resto). Se TODAS falharam: unavailable.
 */
export function officeCalendarHealth(sourceErrors: string[]): SourceHealthStatus {
  const relevantFailures = sourceErrors.filter((s) => CONNECTED_SOURCES.some((c) => c.id === s));
  if (relevantFailures.length === 0) return "connected";
  if (relevantFailures.length < CONNECTED_SOURCES.length) return "degraded";
  return "unavailable";
}
