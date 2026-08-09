/**
 * Sprint Gota Neural Foundation V1 (Fase 13/14) — toda informação que a
 * Gota Neural manipula precisa declarar de onde veio e o quanto se
 * confia nela. Confidence reaproveita a escala já existente do Data Hub
 * (`DataConfidence`, Sprint Core 2.1) em vez de inventar uma segunda
 * escala ou um score percentual arbitrário — mesmo padrão já seguido por
 * `src/lib/business-strategy/*` e `src/lib/domain-events/bridges.ts`.
 */
import type { DataConfidence } from "@/lib/data-hub/types";

/** Alias explícito: nenhuma escala nova, só um nome mais claro no domínio neural. */
export type NeuralConfidence = DataConfidence;

export type ProvenanceSourceType =
  | "user_input"
  | "company_profile"
  | "business_dna"
  | "project"
  | "module"
  | "domain_event"
  | "document"
  | "external_ai_import"
  | "connector"
  | "system"
  | "derived";

export interface Provenance {
  sourceType: ProvenanceSourceType;
  sourceId?: string;
  sourceLabel?: string;
  observedAt?: string;
  verified: boolean;
  confidence?: NeuralConfidence;
  staleAt?: string;
  /** Metadata livre, mas nunca um lugar para secrets/credentials/tokens. */
  metadata?: Readonly<Record<string, string | number | boolean>>;
}

/** true quando a provenance já passou do `staleAt` declarado (nunca assume atual sem checar). */
export function isProvenanceStale(provenance: Provenance, nowIso: string): boolean {
  if (!provenance.staleAt) return false;
  return new Date(provenance.staleAt).getTime() < new Date(nowIso).getTime();
}
