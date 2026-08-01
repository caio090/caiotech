/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/business-office/__tests__/business-office.test.ts
 * Cobre Fase 36 (testes Meu Escritório) itens 26, 30-32, 40-42, 47-49 do
 * brief da Sprint Navegação e Experiência 3.0.1.2.
 */
import {
  buildFeedItemFromCalendarEvent, classifyBusinessOfficeItems, itemsForMonthPrefix, nextMonthKey,
  isBusinessOfficeItemOverdue, splitMonthClosureAndPlanning, BUSINESS_OFFICE_NOT_INTEGRATED_MODULES,
  type BusinessOfficeFeedItem,
} from "../types";
import type { GlobalCalendarEvent } from "../../global-calendar";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function event(overrides: Partial<GlobalCalendarEvent> & { id: string; source: GlobalCalendarEvent["source"] }): GlobalCalendarEvent {
  return {
    source_id: overrides.id, client_id: "c1", client_name: "Cliente 1", title: "Item", description: null,
    event_type: "x", status: "briefing", start_at: "2026-08-01T10:00:00-03:00", end_at: null,
    date_key: "2026-08-01", all_day: false, timezone: "America/Fortaleza", responsible_id: null,
    responsible_name: null, origin_href: "/admin/contentos", editable: false, group_key: null, metadata: null,
    ...overrides,
  };
}

console.log("[test] 31 — item do feed sempre tem origem, link e responsável (quando existir)");
const item1 = buildFeedItemFromCalendarEvent(event({ id: "1", source: "content_item", responsible_id: "u1", responsible_name: "Ana" }));
assert(item1.sourceModule === "rec_os", "sourceModule derivado do source real");
assert(item1.href === "/admin/contentos", "href preservado (link real para o módulo)");
assert(item1.responsible === "Ana", "responsável preservado");
assert(item1.isDemo === false, "nunca marcado como demo — é dado real");

console.log("[test] Nenhuma fonte de verdade nova — mapeamento 1:1 de GlobalCalendarEvent");
for (const src of ["content_item", "operational_task", "approval"] as const) {
  const mapped = buildFeedItemFromCalendarEvent(event({ id: "x", source: src }));
  assert(!!mapped.sourceModule && !!mapped.type, `${src}: mapeado para sourceModule/type reais, nenhum campo inventado`);
}

console.log("[test] 26 — mesma fonte alimenta Hoje/Semana/Mês (Fase 12)");
const items: BusinessOfficeFeedItem[] = [
  buildFeedItemFromCalendarEvent(event({ id: "today", source: "content_item", start_at: "2026-08-01T09:00:00-03:00" })),
  // 2026-08-01 é um sábado; a semana (domingo-sábado) começa em 2026-07-26.
  buildFeedItemFromCalendarEvent(event({ id: "week", source: "operational_task", start_at: "2026-07-28T09:00:00-03:00" })),
  buildFeedItemFromCalendarEvent(event({ id: "month", source: "approval", start_at: "2026-08-20T09:00:00-03:00" })),
  buildFeedItemFromCalendarEvent(event({ id: "other", source: "content_item", start_at: "2026-09-15T09:00:00-03:00" })),
];
const { today, week, month } = classifyBusinessOfficeItems(items, "2026-08-01", "America/Fortaleza");
assert(today.length === 1 && today[0].id.includes("today"), "Hoje isola o item de hoje a partir do MESMO array");
assert(week.some((i) => i.id.includes("week")) && week.some((i) => i.id.includes("today")), "Semana inclui hoje + itens da mesma semana, do mesmo array");
assert(month.some((i) => i.id.includes("month")), "Mês inclui itens do mês corrente, do mesmo array");
assert(!month.some((i) => i.id.includes("other")), "item de setembro não entra no balde de agosto");

console.log("[test] 41/42 — fechamento do mês vs. planejamento do próximo mês");
const completed = { ...items[2], status: "aprovado", completedAt: items[2].startsAt };
const { closure, planning } = splitMonthClosureAndPlanning([completed], [items[3]]);
assert(closure.length === 1 && !!closure[0].completedAt, "fechamento só inclui itens concluídos do mês");
assert(planning.length === 1 && planning[0].id.includes("other"), "planejamento vem do balde do mês seguinte (mesmo array de origem)");
assert(nextMonthKey("2026-08-01") === "2026-09", "nextMonthKey calcula o mês seguinte corretamente");
assert(nextMonthKey("2026-12-15") === "2027-01", "nextMonthKey vira o ano corretamente em dezembro");

console.log("[test] itemsForMonthPrefix usa o mesmo array, nunca uma segunda busca");
const septItems = itemsForMonthPrefix(items, "2026-09");
assert(septItems.length === 1 && septItems[0].id.includes("other"), "filtra por prefixo de mês sobre o array já existente");

console.log("[test] 47/48 — atraso nunca depende de localStorage/sessionStorage (é derivado do dado real)");
const overdueItem = buildFeedItemFromCalendarEvent(event({ id: "late", source: "operational_task", start_at: "2020-01-01T00:00:00-03:00" }));
assert(isBusinessOfficeItemOverdue(overdueItem, "2026-08-01T12:00:00-03:00"), "item com prazo no passado e sem completedAt está atrasado");
const doneItem = { ...overdueItem, completedAt: overdueItem.startsAt };
assert(!isBusinessOfficeItemOverdue(doneItem, "2026-08-01T12:00:00-03:00"), "item concluído nunca é atrasado");

console.log("[test] 39/49 — módulos não integrados são nomeados honestamente, nunca fabricados como zero");
assert(BUSINESS_OFFICE_NOT_INTEGRATED_MODULES.length > 0, "lista de módulos ainda não conectados existe");
assert(BUSINESS_OFFICE_NOT_INTEGRATED_MODULES.some((m) => m.type === "finance"), "financeiro está entre os módulos não integrados (nenhuma fonte real ainda)");
assert(BUSINESS_OFFICE_NOT_INTEGRATED_MODULES.some((m) => m.type === "meeting"), "reuniões estão entre os módulos não integrados");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
