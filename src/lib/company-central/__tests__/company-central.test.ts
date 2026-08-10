/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/company-central/__tests__/company-central.test.ts
 * Sprint MVP Dogfood Spine V0.1 (Fase 52) — Company Central builder.
 */
import { buildCompanyCentralView } from "../builder";
import type { ProjectProjection } from "@/lib/project-projection/types";
import type { WorkItemProjection } from "@/lib/work-item-projection/types";
import type { CompanyCentralIdentity } from "../types";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const identity: CompanyCentralIdentity = { companyId: "company-A", companyName: "Duh Lanches", surface: "direct_business" };

function project(overrides: Partial<ProjectProjection> = {}): ProjectProjection {
  return {
    id: "rec_projects:p1", companyId: "company-A", title: "Vídeo", description: null, status: "producao",
    planningLevel: null, startAt: null, dueAt: null, owner: null, sourceModule: "rec_projects",
    sourceEntityType: "rec_project", sourceEntityId: "p1", sourceUrl: "/admin/recos/p1",
    metrics: null, workSummary: null, updatedAt: "2026-08-01T00:00:00Z", ...overrides,
  };
}

function workItem(overrides: Partial<WorkItemProjection> = {}): WorkItemProjection {
  return {
    id: "business_office:1", workspaceId: "company-A", companyId: "company-A", projectId: null,
    module: "aprovacoes", type: "approval", title: "Aprovar post", status: "pending", priority: "alta",
    owner: "Maria", startAt: null, dueAt: "2026-08-05T00:00:00Z", completedAt: null, sourceModule: "aprovacoes",
    sourceEntityType: "approval", sourceEntityId: "a1", sourceUrl: "/admin/contentos/aprovacoes",
    approvalRef: "a1", dependencies: null, updatedAt: null, ...overrides,
  };
}

console.log("[test] 1 — builder produz view a partir de inputs reais, sem fetch escondido");
{
  const view = buildCompanyCentralView(identity, [project()], [workItem()], "2026-08-06T00:00:00Z");
  assert(view.identity.companyId === "company-A", "identity preservada");
  assert(view.activeProjects.length === 1, "projeto ativo incluído");
  assert(view.attention.length === 1, "work item incluído em attention");
}

console.log("[test] 2 — empty state honesto: sem projetos, sem work");
{
  const view = buildCompanyCentralView(identity, [], [], "2026-08-06T00:00:00Z");
  assert(view.hasProjects === false, "hasProjects false quando não há projetos reais");
  assert(view.hasWork === false, "hasWork false quando não há work items reais");
  assert(view.activeProjects.length === 0, "activeProjects vazio, nunca mockado");
}

console.log("[test] 3 — projeto com status terminal não aparece em activeProjects");
{
  const view = buildCompanyCentralView(identity, [project({ status: "concluido" })], [], "2026-08-06T00:00:00Z");
  assert(view.activeProjects.length === 0, "projeto concluído não é 'ativo'");
  assert(view.hasProjects === true, "hasProjects continua true -- o projeto existe, só não está ativo");
}

console.log("[test] 4 — overdue vem antes de não-atrasado em attention");
{
  const overdue = workItem({ id: "b:overdue", dueAt: "2026-08-01T00:00:00Z" });
  const future = workItem({ id: "b:future", dueAt: "2026-08-20T00:00:00Z" });
  const view = buildCompanyCentralView(identity, [], [future, overdue], "2026-08-06T00:00:00Z");
  assert(view.attention[0].id === "b:overdue", "item atrasado vem primeiro");
}

console.log("[test] 5 — work summary não inventa métrica: overdueCount reflete inputs reais");
{
  const overdue = workItem({ id: "b:overdue", dueAt: "2026-08-01T00:00:00Z" });
  const notOverdue = workItem({ id: "b:ok", dueAt: "2026-08-20T00:00:00Z" });
  const view = buildCompanyCentralView(identity, [], [overdue, notOverdue], "2026-08-06T00:00:00Z");
  assert(view.workSummary.overdueCount === 1, "overdueCount conta só o item realmente atrasado");
  assert(view.workSummary.pendingCount === 2, "pendingCount conta os dois itens não concluídos");
}

console.log("[test] 6 — item concluído nunca aparece em attention");
{
  const done = workItem({ id: "b:done", completedAt: "2026-08-02T00:00:00Z" });
  const view = buildCompanyCentralView(identity, [], [done], "2026-08-06T00:00:00Z");
  assert(view.attention.length === 0, "item concluído sai da lista de atenção");
}

console.log("[test] 7 — module shortcuts sempre carregam o companyId no link (nunca perdem o contexto)");
{
  const view = buildCompanyCentralView(identity, [], [], "2026-08-06T00:00:00Z");
  assert(view.moduleShortcuts.every((s) => s.href.includes("company-A")), "todo shortcut preserva o contexto de company");
  assert(view.moduleShortcuts.some((s) => s.label === "Meu Escritório"), "atalho para Meu Escritório presente");
  assert(view.moduleShortcuts.some((s) => s.label === "Calendário"), "atalho para Calendário presente");
  assert(view.moduleShortcuts.some((s) => s.label === "CRM"), "atalho para CRM presente");
  assert(view.moduleShortcuts.some((s) => s.label === "REC OS"), "atalho para REC OS presente");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
