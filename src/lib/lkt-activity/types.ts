/**
 * LKT Activity Log — STATUS LIVE ACTIVITY V1. Fundação versionada (Git,
 * sem Supabase/SQL) para o histórico de movimentações do projeto,
 * separada deliberadamente do DeploymentInfo (live, um snapshot do
 * deployment atual) e do `AreaReadiness`/`PlatformModuleMaturity`
 * (estado por módulo) — este arquivo é sobre EVENTOS no tempo.
 *
 * Nunca armazenar secret, token, senha, cookie ou PII desnecessária num
 * evento -- só fatos técnicos sobre o que mudou.
 */

/** Tipo do movimento. Pequeno de propósito -- nunca uma dezena de kinds sem necessidade real. */
export const LKT_EVENT_KINDS = [
  "FEATURE",
  "FIX",
  "QA",
  "RELEASE",
  "ARCHITECTURE",
  "BLOCKER",
  "STATUS_CHANGE",
  "MIGRATION",
  "INTEGRATION",
] as const;
export type LktEventKind = (typeof LKT_EVENT_KINDS)[number];

/**
 * Status honesto do que o evento entrega -- mesma taxonomia usada nas
 * auditorias reais desta sessão (REAL/PARTIAL/DEMO/...), deliberadamente
 * diferente de AreaReadiness (release/QA) e PlatformModuleMaturity
 * (arquitetura de módulo): este campo é "o que este EVENTO específico
 * comunica", não o estado do módulo inteiro. Regra dura (missão, item 17):
 * DEMO nunca aparece como REAL, COMING_SOON nunca aparece como disponível,
 * BLOCKED precisa de motivo, teste não executado nunca é PASS.
 */
export const LKT_EVENT_STATUSES = [
  "REAL",
  "PARTIAL",
  "DEMO",
  "COMING_SOON",
  "NOT_IMPLEMENTED",
  "LEGACY",
  "BLOCKED",
] as const;
export type LktEventStatus = (typeof LKT_EVENT_STATUSES)[number];

export type LktEnvironment = "local" | "preview" | "production";

/** Resultado de testes, quando aplicável -- nunca "PASS" sem número real. */
export interface LktTestResult {
  suite: string;
  passed: number;
  failed: number;
}

export interface LktActivityEvent {
  /** Gerado pelo script (lkt-record) -- nunca digitado à mão. */
  id: string;
  /** ISO 8601 -- gerado pelo script. */
  timestamp: string;
  module: string;
  title: string;
  description?: string;
  kind: LktEventKind;
  status?: LktEventStatus;
  environment?: LktEnvironment;
  /** Branch detectada automaticamente por lkt-record no momento do registro -- nunca digitada à mão. */
  branch?: string;
  tests?: LktTestResult[];
  build?: "PASS" | "FAIL" | "NOT_RUN";
  /** Referência de deployment (dpl_...) -- OPCIONAL, nunca inventado quando desconhecido (item 9 da missão). */
  deployment?: string;
  devUrl?: string;
  /** Presente somente quando há um bloqueio real, sempre com o motivo. */
  blocker?: string;
  nextAction?: string;
  /** SHA de commit e/ou links -- opcional, nunca pré-requisito para o evento existir. */
  references?: { commit?: string; url?: string; label?: string }[];
}

/** Payload aceito por lkt-record antes de ganhar id/timestamp. */
export type LktActivityEventInput = Omit<LktActivityEvent, "id" | "timestamp"> & {
  id?: string;
  timestamp?: string;
};

export interface LktValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validação pura -- sem I/O, testável isoladamente. `lkt-record` e os
 * testes unitários chamam exatamente esta função, nunca uma cópia da
 * regra em outro lugar.
 */
export function validateLktActivityEvent(input: Partial<LktActivityEventInput>): LktValidationResult {
  const errors: string[] = [];

  if (!input.module || !input.module.trim()) errors.push("module é obrigatório");
  if (!input.title || !input.title.trim()) errors.push("title é obrigatório");
  if (!input.kind || !LKT_EVENT_KINDS.includes(input.kind)) {
    errors.push(`kind é obrigatório e deve ser um de: ${LKT_EVENT_KINDS.join(", ")}`);
  }
  if (input.status && !LKT_EVENT_STATUSES.includes(input.status)) {
    errors.push(`status inválido: deve ser um de ${LKT_EVENT_STATUSES.join(", ")} (ou omitido)`);
  }
  if (input.environment && !["local", "preview", "production"].includes(input.environment)) {
    errors.push("environment inválido: deve ser local, preview ou production (ou omitido)");
  }
  if (input.build && !["PASS", "FAIL", "NOT_RUN"].includes(input.build)) {
    errors.push("build inválido: deve ser PASS, FAIL ou NOT_RUN (ou omitido)");
  }
  if (input.kind === "BLOCKER" && !input.blocker) {
    errors.push("eventos do tipo BLOCKER exigem o campo blocker preenchido (item 17: bloqueio precisa dizer o motivo)");
  }
  if (input.tests) {
    for (const t of input.tests) {
      if (!t.suite || !t.suite.trim()) errors.push("tests[].suite é obrigatório quando tests é informado");
      if (typeof t.passed !== "number" || t.passed < 0) errors.push("tests[].passed deve ser um número >= 0");
      if (typeof t.failed !== "number" || t.failed < 0) errors.push("tests[].failed deve ser um número >= 0");
    }
  }
  // Nunca aceitar campos que pareçam segredo -- defesa simples contra erro humano.
  const forbidden = ["secret", "token", "password", "senha", "cookie", "apiKey", "api_key"];
  const asRecord = input as unknown as Record<string, unknown>;
  for (const key of forbidden) {
    if (key in asRecord) errors.push(`campo '${key}' não é permitido em um evento LKT`);
  }

  return { valid: errors.length === 0, errors };
}

/** Ordena por timestamp decrescente (mais recente primeiro) -- nunca depende da ordem de inserção no arquivo. */
export function sortLktActivityDesc(events: LktActivityEvent[]): LktActivityEvent[] {
  return [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getLatestLktMovement(events: LktActivityEvent[]): LktActivityEvent | null {
  const sorted = sortLktActivityDesc(events);
  return sorted[0] ?? null;
}
