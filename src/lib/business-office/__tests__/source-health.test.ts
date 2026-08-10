/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/business-office/__tests__/source-health.test.ts
 * Sprint MVP Experience Completion V0.1 (Parte B2/B3/J) — degradação
 * progressiva do Meu Escritório e distinção zero vs indisponível.
 */
import { buildOfficeSourceStatuses, officeCalendarHealth } from "../source-health";
import { classifyBusinessOfficeItems, isBusinessOfficeItemOverdue, type BusinessOfficeFeedItem } from "../types";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function item(overrides: Partial<BusinessOfficeFeedItem> = {}): BusinessOfficeFeedItem {
  return {
    id: "a:1", workspaceId: "company-A", sourceModule: "aprovacoes", sourceEntityId: "1", type: "approval",
    title: "t", description: null, startsAt: null, dueAt: "2026-08-01T00:00:00Z", completedAt: null,
    status: "pending", priority: null, responsible: null, href: "/x", period: "other", isDemo: false,
    dataAvailability: "available", ...overrides,
  };
}

console.log("[test] 1 — source parcial falha e Office continua (Promise.allSettled já isola por fonte)");
{
  // getBusinessOfficeFeed já retorna sourceErrors por fonte -- este teste
  // confirma que o modelo de status NUNCA trata uma falha parcial como
  // "tudo indisponível".
  const statuses = buildOfficeSourceStatuses(["approvals"]);
  const contentStatus = statuses.find((s) => s.id === "content_items");
  const taskStatus = statuses.find((s) => s.id === "operational_tasks");
  const approvalStatus = statuses.find((s) => s.id === "approvals");
  assert(contentStatus?.status === "connected", "content_items continua connected mesmo com approvals falhando");
  assert(taskStatus?.status === "connected", "operational_tasks continua connected mesmo com approvals falhando");
  assert(approvalStatus?.status === "unavailable", "approvals marcado unavailable, refletindo o erro real");
}

console.log("[test] 2 — zero real != fonte indisponível");
{
  const allOk = buildOfficeSourceStatuses([]);
  assert(allOk.every((s) => s.id.startsWith("meeting") || s.id === "finance" || s.id === "campaign" || s.id === "decision" || s.id === "goal" || s.id === "document" ? s.status === "not_connected" : true), "módulos ainda não integrados nunca aparecem como connected/unavailable");
  const calendarOkButZeroItems = officeCalendarHealth([]);
  assert(calendarOkButZeroItems === "connected", "0 falhas -> calendário connected (zero itens reais é uma resposta válida, não indisponibilidade)");
}

console.log("[test] 3 — calendário degradado quando algumas (não todas) as fontes falham");
{
  assert(officeCalendarHealth(["approvals"]) === "degraded", "1 de 3 fontes falhando -> degraded");
  assert(officeCalendarHealth(["approvals", "operational_tasks"]) === "degraded", "2 de 3 fontes falhando -> degraded");
  assert(officeCalendarHealth(["approvals", "operational_tasks", "content_items"]) === "unavailable", "3 de 3 fontes falhando -> unavailable");
}

console.log("[test] 4 — attention ordering: item atrasado é identificado corretamente por isBusinessOfficeItemOverdue");
{
  const overdue = item({ dueAt: "2020-01-01T00:00:00Z" });
  const future = item({ id: "a:2", dueAt: "2099-01-01T00:00:00Z" });
  const now = "2026-08-10T00:00:00Z";
  assert(isBusinessOfficeItemOverdue(overdue, now) === true, "item com prazo no passado e sem completedAt é overdue");
  assert(isBusinessOfficeItemOverdue(future, now) === false, "item com prazo no futuro não é overdue");
}

console.log("[test] 5 — item concluído nunca é tratado como atrasado, mesmo com prazo no passado");
{
  const doneLate = item({ dueAt: "2020-01-01T00:00:00Z", completedAt: "2020-01-02T00:00:00Z" });
  assert(isBusinessOfficeItemOverdue(doneLate, "2026-08-10T00:00:00Z") === false, "completedAt presente => nunca overdue");
}

console.log("[test] 6 — classifyBusinessOfficeItems continua funcionando com fontes parciais (array pode vir parcialmente vazio)");
{
  const items = [item({ dueAt: "2026-08-10T10:00:00Z" })];
  const { today } = classifyBusinessOfficeItems(items, "2026-08-10", "America/Fortaleza");
  assert(today.length === 1, "item do dia aparece em 'today' mesmo que outras fontes tenham falhado (array de entrada simplesmente tem menos itens)");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
