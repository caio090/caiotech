/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/__tests__/rec-os-roadmap.test.ts
 * Cobre Fase 30 (testes Roadmap) itens 13-30 do brief da Sprint REC OS 3.0.1.1.
 */
import {
  mapContentRowToRoadmapItem, filterRoadmapItems, EMPTY_ROADMAP_FILTERS, isRoadmapItemOverdue,
  groupRoadmapItemsByKanbanColumn, kanbanColumnForStatus, KANBAN_COLUMNS, bucketRoadmapItemsForTimeline, roadmapItemsForMonth,
  nextActionForStatus, type RecOsRoadmapItem, type ContentItemRow,
} from "../rec-os-roadmap";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function row(overrides: Partial<ContentItemRow> & { id: string }): ContentItemRow {
  return {
    client_id: "client-1", title: "Conteúdo", type: "reel", channel: "instagram",
    status: "briefing", scheduled_date: null, responsible_id: null, created_at: "2026-08-01T10:00:00Z",
    ...overrides,
  };
}

console.log("[test] 13/17 — mapContentRowToRoadmapItem nunca inventa campanha/prioridade");
const item1 = mapContentRowToRoadmapItem(row({ id: "a" }), null, null);
assert(item1.campaignId === null, "campaignId sempre null (não é coluna real)");
assert(item1.priority === null, "priority sempre null (não é coluna real)");
assert(item1.workspaceId === "client-1" && item1.clientId === "client-1", "workspaceId/clientId derivados de client_id");

console.log("[test] nextActionForStatus — nunca inventa, deriva do status real");
assert(nextActionForStatus("ideia", false) === "Completar briefing", "ideia -> completar briefing");
assert(nextActionForStatus("publicado", false) === "Registrar resultados", "publicado -> registrar resultados");
assert(nextActionForStatus("alteracao_solicitada", true).includes("alteração"), "bloqueado -> menciona alteração");

console.log("[test] bloqueio derivado do status canônico, nunca um campo novo");
const blockedItem = mapContentRowToRoadmapItem(row({ id: "b", status: "reprovado" }), null, null);
assert(blockedItem.blocked === true && !!blockedItem.blockReason, "reprovado é bloqueado com motivo");
const okItem = mapContentRowToRoadmapItem(row({ id: "c", status: "aprovado" }), null, null);
assert(okItem.blocked === false && okItem.blockReason === null, "aprovado não é bloqueado");

const items: RecOsRoadmapItem[] = [
  mapContentRowToRoadmapItem(row({ id: "1", status: "ideia", client_id: "cA" }), null, null),
  mapContentRowToRoadmapItem(row({ id: "2", status: "producao", client_id: "cA", responsible_id: "u1" }), { content_item_id: "2", assigned_to: "u1", due_date: "2026-08-05" }, null),
  mapContentRowToRoadmapItem(row({ id: "3", status: "enviado_aprovacao", client_id: "cB" }), null, { content_id: "3", status: "aguardando", created_at: "2026-08-01T00:00:00Z" }),
  mapContentRowToRoadmapItem(row({ id: "4", status: "publicado", client_id: "cB", scheduled_date: "2026-07-01" }), null, null),
  mapContentRowToRoadmapItem(row({ id: "5", status: "alteracao_solicitada", client_id: "cA" }), null, null),
];

console.log("[test] 18/19/20 — mesma fonte, mesmos IDs, mesma contagem entre visualizações (Fase 5)");
const filtered = filterRoadmapItems(items, EMPTY_ROADMAP_FILTERS, "2026-08-01T12:00:00Z");
assert(filtered.length === items.length, "sem filtros, filterRoadmapItems retorna tudo");

const grouped = groupRoadmapItemsByKanbanColumn(filtered);
const groupedTotal = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
assert(groupedTotal === filtered.length, "Quadro: soma das colunas === contagem filtrada (mesma fonte)");
const groupedIds = new Set(Object.values(grouped).flat().map((i) => i.id));
assert(filtered.every((i) => groupedIds.has(i.id)), "Quadro: todos os IDs filtrados aparecem em alguma coluna ou ficam fora só se sem status mapeado");

const buckets = bucketRoadmapItemsForTimeline(filtered, "mes");
const bucketTotal = buckets.reduce((sum, b) => sum + b.items.length, 0);
assert(bucketTotal === filtered.length, "Linha do tempo: soma dos buckets === contagem filtrada (mesma fonte)");

const monthItems = roadmapItemsForMonth(filtered, "2026-08");
assert(monthItems.every((i) => filtered.some((f) => f.id === i.id)), "Calendário: todo item do mês está no array filtrado (mesma fonte)");
assert(monthItems.length === 1 && monthItems[0].id === "2", "Calendário: só item com dueAt em agosto/2026 aparece");

console.log("[test] 21-25 — filtros por cliente/mês/campanha/responsável/status");
const byStatus = filterRoadmapItems(items, { ...EMPTY_ROADMAP_FILTERS, status: ["publicado"] }, "2026-08-01T12:00:00Z");
assert(byStatus.length === 1 && byStatus[0].id === "4", "filtro por status isola o item certo");
const byResp = filterRoadmapItems(items, { ...EMPTY_ROADMAP_FILTERS, responsibleId: ["u1"] }, "2026-08-01T12:00:00Z");
assert(byResp.length === 1 && byResp[0].id === "2", "filtro por responsável isola o item certo");
const byMonth = filterRoadmapItems(items, { ...EMPTY_ROADMAP_FILTERS, month: "2026-08" }, "2026-08-01T12:00:00Z");
assert(byMonth.length === 1 && byMonth[0].id === "2", "filtro por mês isola o item certo (dueAt de operational_tasks)");
assert(items.every((i) => i.campaignId === null), "campanha nunca é um campo real — nenhum filtro falso testado para ela");

console.log("[test] Atraso (overdue) — nunca considera publicado como atrasado");
const overdueItem = mapContentRowToRoadmapItem(row({ id: "6", status: "briefing", scheduled_date: "2020-01-01" }), null, null);
assert(isRoadmapItemOverdue(overdueItem, "2026-08-01T00:00:00Z"), "item com prazo no passado e não publicado está atrasado");
const publishedOld = mapContentRowToRoadmapItem(row({ id: "7", status: "publicado", scheduled_date: "2020-01-01" }), null, null);
assert(!isRoadmapItemOverdue(publishedOld, "2026-08-01T00:00:00Z"), "publicado nunca é considerado atrasado, mesmo com data antiga");

console.log("[test] Sem data definida (Fase 8)");
const noDateItem = mapContentRowToRoadmapItem(row({ id: "8", status: "ideia" }), null, null);
assert(noDateItem.dueAt === null, "item sem scheduled_date/due_date tem dueAt null");
const bucketsWithNoDate = bucketRoadmapItemsForTimeline([noDateItem], "dia");
assert(bucketsWithNoDate.some((b) => b.label === "Sem data definida"), "bucket 'Sem data definida' existe para itens sem prazo");

console.log("[test] Colunas do Quadro são agrupamentos visuais — nenhum status canônico alterado");
assert(KANBAN_COLUMNS.length === 8, "8 colunas: Radar/Criar/Produzir/Revisar/Aprovar/Visual Final/Agendar/Publicado");
assert(KANBAN_COLUMNS.every((c) => c.statuses.every((s) => typeof s === "string")), "colunas referenciam apenas strings de status já existentes");
assert(KANBAN_COLUMNS.find((c) => c.id === "publicado")!.statuses.includes("publicado"), "coluna Publicado mapeia o status real 'publicado'");

console.log("[test] Sprint QA Fix 3.0.2.5 (CI-PRODUCT-ROADMAP-KANBAN-001) — status alias 'ajuste' não é dropado do Quadro");
assert(kanbanColumnForStatus("ajuste") === "aprovar", "'ajuste' resolve para a mesma coluna de 'alteracao_solicitada' (REC_OS_STATUS_ALIASES)");
const ajusteItem = mapContentRowToRoadmapItem(row({ id: "9", status: "ajuste", client_id: "cA" }), null, null);
const itemsWithAlias = [...items, ajusteItem];
const filteredWithAlias = filterRoadmapItems(itemsWithAlias, EMPTY_ROADMAP_FILTERS, "2026-08-01T12:00:00Z");
const groupedWithAlias = groupRoadmapItemsByKanbanColumn(filteredWithAlias);
const groupedWithAliasTotal = Object.values(groupedWithAlias).reduce((sum, arr) => sum + arr.length, 0);
assert(groupedWithAliasTotal === filteredWithAlias.length, "Quadro: item com status 'ajuste' não é silenciosamente omitido (antes: contagem divergia de Lista/Linha do tempo/Calendário)");
assert(groupedWithAlias.aprovar.some((i) => i.id === "9"), "item 'ajuste' aparece na coluna Aprovar, junto de alteracao_solicitada/reprovado");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
