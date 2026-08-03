import type { Page } from "@playwright/test";

/**
 * Sprint E2E CI 3.0.2.2 (Fase 24) — coleta pageerror/console.error/
 * requestfailed/HTTP 5xx sem nunca registrar payload, header, cookie ou
 * query sensível — só tipo + rota (pathname) + mensagem do próprio
 * navegador.
 */
export interface QualityIssue {
  type: "pageerror" | "console.error" | "requestfailed" | "http5xx";
  detail: string;
}

export function installQualityListeners(page: Page) {
  const issues: QualityIssue[] = [];

  page.on("pageerror", (err) => issues.push({ type: "pageerror", detail: err.message }));

  page.on("console", (msg) => {
    if (msg.type() === "error") issues.push({ type: "console.error", detail: msg.text() });
  });

  page.on("requestfailed", (req) => {
    let pathname = req.url();
    try { pathname = new URL(req.url()).pathname; } catch { /* keep raw */ }
    issues.push({ type: "requestfailed", detail: `${req.method()} ${pathname}` });
  });

  page.on("response", (res) => {
    if (res.status() >= 500) {
      let pathname = res.url();
      try { pathname = new URL(res.url()).pathname; } catch { /* keep raw */ }
      issues.push({ type: "http5xx", detail: `${res.status()} ${pathname}` });
    }
  });

  return {
    issues,
    /** Falha o teste se algo relevante foi capturado — `ignore` filtra ruído conhecido e inofensivo (ex.: favicon). */
    assertClean(ignore?: RegExp) {
      const relevant = ignore ? issues.filter((i) => !ignore.test(i.detail)) : issues;
      if (relevant.length > 0) {
        throw new Error(`Problemas de qualidade detectados:\n${relevant.map((i) => `  [${i.type}] ${i.detail}`).join("\n")}`);
      }
    },
  };
}

const FORBIDDEN_EXTERNAL_HOSTS = [
  /api\.openai\.com/i,
  /generativelanguage\.googleapis\.com/i,
  /api\.anthropic\.com/i,
  /www\.googleapis\.com\/calendar/i,
  /graph\.facebook\.com/i,
  /whatsapp\.com\/api|business\.whatsapp/i,
  /evolution-api/i,
];

/** Fase 24 — nenhuma chamada inesperada para provedores externos de IA/mensageria/ads durante o QA. */
export function installExternalCallGuard(page: Page) {
  const hits: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (FORBIDDEN_EXTERNAL_HOSTS.some((re) => re.test(url))) hits.push(url);
  });
  return {
    hits,
    assertNone() {
      if (hits.length > 0) {
        throw new Error(`Chamada externa inesperada detectada: ${hits.join(", ")}`);
      }
    },
  };
}
