/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/project-projection/__tests__/project-projection.test.ts
 * Sprint MVP Dogfood Spine V0.1 (Fase 50) — Project projection adapter.
 */
import { projectFromRecProject } from "../adapters";
import type { DbRecProject } from "@/lib/supabase/types";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function baseRow(overrides: Partial<DbRecProject> = {}): DbRecProject {
  return {
    id: "rp-1", client_id: "company-A", title: "Vídeo institucional", project_type: "video",
    objective: "Apresentar a marca", style: null, duration_estimate: null, location: null,
    status: "em_producao", team: null, recording_date: null, notes: null, created_by: null,
    created_at: "2026-08-01T00:00:00Z", updated_at: "2026-08-05T00:00:00Z", metadata: null,
    ...overrides,
  };
}

console.log("[test] 1 — real source -> projection");
{
  const p = projectFromRecProject(baseRow());
  assert(p.companyId === "company-A", "companyId vem de client_id");
  assert(p.title === "Vídeo institucional", "title preservado");
  assert(p.status === "em_producao", "status preservado");
  assert(p.sourceModule === "rec_projects", "sourceModule correto");
  assert(p.sourceEntityType === "rec_project", "sourceEntityType correto");
  assert(p.sourceEntityId === "rp-1", "sourceEntityId aponta para a linha real");
  assert(p.sourceUrl === "/admin/audiovisual/rp-1", "sourceUrl aponta para a rota real de detalhe");
}

console.log("[test] 2 — project without due date");
{
  const p = projectFromRecProject(baseRow({ recording_date: null }));
  assert(p.dueAt === null, "dueAt ausente não é inventado");
}

console.log("[test] 3 — project without work (team null) => owner null, nunca inventado");
{
  const p = projectFromRecProject(baseRow({ team: null }));
  assert(p.owner === null, "owner ausente permanece null");
}

console.log("[test] 4 — project source URL sempre aponta para a source real");
{
  const p = projectFromRecProject(baseRow({ id: "rp-42" }));
  assert(p.sourceUrl === "/admin/audiovisual/rp-42", "URL derivada do id real, nunca hardcoded");
}

console.log("[test] 5 — planningLevel nunca inventado quando a source não carrega essa informação");
{
  const p = projectFromRecProject(baseRow());
  assert(p.planningLevel === null, "planningLevel permanece null -- rec_projects não tem esse dado");
}

console.log("[test] 6 — company isolation: rec_project sem client_id não pertence a nenhuma company");
{
  const p = projectFromRecProject(baseRow({ client_id: null }));
  assert(p.companyId === "", "companyId vazio quando client_id é null -- getProjectProjections() filtra isso fora, nunca exibe como pertencente a uma company real");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
