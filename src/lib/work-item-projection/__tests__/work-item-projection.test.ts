/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/work-item-projection/__tests__/work-item-projection.test.ts
 * Sprint MVP Dogfood Spine V0.1 (Fase 51) — Work Item projection adapters.
 */
import { workItemFromBusinessOfficeItem, workItemFromCommercialLeadFollowUp } from "../adapters";
import type { BusinessOfficeFeedItem } from "@/lib/business-office/types";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function baseItem(overrides: Partial<BusinessOfficeFeedItem> = {}): BusinessOfficeFeedItem {
  return {
    id: "approval:appr-1", workspaceId: "company-A", sourceModule: "aprovacoes", sourceEntityId: "appr-1",
    type: "approval", title: "Aprovação do post", description: null, startsAt: null, dueAt: "2026-08-10T12:00:00Z",
    completedAt: null, status: "pending", priority: "alta", responsible: "Maria", href: "/admin/contentos/aprovacoes",
    period: "other", isDemo: false, dataAvailability: "available",
    ...overrides,
  };
}

console.log("[test] 1 — approval -> WorkItemProjection");
{
  const w = workItemFromBusinessOfficeItem(baseItem());
  assert(w.type === "approval", "type mapeado corretamente");
  assert(w.approvalRef === "appr-1", "approvalRef preenchido para itens de aprovação");
  assert(w.companyId === "company-A", "companyId vem do workspaceId real");
  assert(w.sourceUrl === "/admin/contentos/aprovacoes", "sourceUrl aponta para a source real (approval continua source-of-truth)");
}

console.log("[test] 2 — calendar activity (task) -> WorkItemProjection");
{
  const item = baseItem({ id: "operational_task:task-1", sourceModule: "operacional", sourceEntityId: "task-1", type: "task", href: "/operacional/tarefas" });
  const w = workItemFromBusinessOfficeItem(item);
  assert(w.type === "task", "type mapeado corretamente");
  assert(w.approvalRef === null, "approvalRef null para itens que não são aprovação");
}

console.log("[test] 3 — REC OS item (content) -> WorkItemProjection");
{
  const item = baseItem({ id: "content_item:content-1", sourceModule: "rec_os", sourceEntityId: "content-1", type: "content", href: "/admin/contentos" });
  const w = workItemFromBusinessOfficeItem(item);
  assert(w.type === "deliverable", "content é mapeado para deliverable");
  assert(w.sourceModule === "rec_os", "sourceModule preservado (REC OS continua source-of-truth)");
}

console.log("[test] 4 — CRM follow-up quando source suportar (commercial_leads)");
{
  const w = workItemFromCommercialLeadFollowUp({
    id: "lead-1", company_name: "Prospect Ltda", contact_name: "João", pipeline_stage: "negociacao",
    next_action: "Ligar para fechar proposta", next_action_at: "2026-08-11T15:00:00Z",
  });
  assert(w.type === "follow_up", "type correto");
  assert(w.title === "Ligar para fechar proposta", "title vem do next_action real");
  assert(w.sourceEntityId === "lead-1", "sourceEntityId aponta para o lead real");
  assert(w.companyId === "", "companyId vazio -- commercial_leads não tem vínculo real com uma Company (nunca inventado)");
}

console.log("[test] 5 — company-level item sem Project (nenhum projectId inventado)");
{
  const w = workItemFromBusinessOfficeItem(baseItem());
  assert(w.projectId === null, "projectId permanece null -- BusinessOfficeFeedItem não carrega relação com Project");
}

console.log("[test] 6 — source-of-truth reference preservada (sourceModule/sourceEntityType/sourceEntityId)");
{
  const item = baseItem({ sourceEntityId: "appr-99", type: "approval" });
  const w = workItemFromBusinessOfficeItem(item);
  assert(w.sourceEntityType === "approval", "sourceEntityType preserva o tipo original da source");
  assert(w.sourceEntityId === "appr-99", "sourceEntityId aponta exatamente para a linha de origem");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
