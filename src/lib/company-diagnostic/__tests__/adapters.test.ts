/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/company-diagnostic/__tests__/adapters.test.ts
 * Sprint SQL 91 Security Hardening V2 — cobre os dois mundos reais que a
 * camada precisa suportar honestamente: schema 91 AINDA NÃO aplicado
 * (unavailable/schema_not_applied, nunca tratado como vazio) e schema
 * aplicado com/sem dado real (available, com [] ou com valor), além da
 * distinção Fase 38-40 entre schema_not_applied e internal_error. Usa um
 * fixture mínimo de SupabaseClient (permitido pelo brief: "tests with
 * test fixtures"), nunca um banco real.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getLatestCompanyDiagnostic, getDiagnosticChecklist, getCompanyFindings,
  getFindingRecommendations, getCompanyRoadmap,
} from "../adapters";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

/** Fixture mínimo: simula a cadeia .from().select().eq()...().{maybeSingle|then} real do supabase-js. */
function fakeSupabase(result: { data: unknown; error: unknown }): SupabaseClient {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "neq", "order", "limit"];
  for (const m of methods) chain[m] = () => chain;
  chain.maybeSingle = async () => result;
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result));
  return { from: () => chain } as unknown as SupabaseClient;
}

function fakeSupabaseThrows(): SupabaseClient {
  return {
    from: () => { throw new Error('relation "company_diagnostics" does not exist'); },
  } as unknown as SupabaseClient;
}

async function main() {
  console.log("[test] 1 — getLatestCompanyDiagnostic: unavailable/schema_not_applied quando a tabela não existe (schema 91 não aplicado)");
  {
    const r1 = await getLatestCompanyDiagnostic(fakeSupabaseThrows(), "company-A");
    assert(r1.status === "unavailable", "exceção na query vira unavailable, nunca vazio silencioso");
    assert(r1.status === "unavailable" && r1.reason === "schema_not_applied", "mensagem 'does not exist' classificada como schema_not_applied (Fase 38), nunca um chute genérico");

    const r2 = await getLatestCompanyDiagnostic(fakeSupabase({ data: null, error: { message: "relation does not exist" } }), "company-A");
    assert(r2.status === "unavailable" && r2.reason === "schema_not_applied", "erro reportado pelo Supabase com mensagem real de schema ausente classificado corretamente");

    const r3 = await getLatestCompanyDiagnostic(fakeSupabase({ data: null, error: { code: "42P01", message: "undefined_table" } }), "company-A");
    assert(r3.status === "unavailable" && r3.reason === "schema_not_applied", "código Postgres real 42P01 classificado como schema_not_applied");

    const r4 = await getLatestCompanyDiagnostic(fakeSupabase({ data: null, error: { code: "53300", message: "too many connections" } }), "company-A");
    assert(r4.status === "unavailable" && r4.reason === "internal_error", "falha real não relacionada a schema ausente vira internal_error, nunca confundida com schema_not_applied (Fase 38-40)");
  }

  console.log("[test] 2 — getLatestCompanyDiagnostic: available com null quando a Company não tem diagnóstico ainda (estado vazio honesto)");
  {
    const r = await getLatestCompanyDiagnostic(fakeSupabase({ data: null, error: null }), "company-A");
    assert(r.status === "available", "schema disponível, query rodou");
    assert(r.status === "available" && r.data === null, "nenhum diagnóstico real ainda -- null explícito, nunca fabricado");
  }

  console.log("[test] 3 — getLatestCompanyDiagnostic: available com dado real mapeado corretamente");
  {
    const row = {
      id: "diag-1", client_id: "company-A", status: "draft",
      niche_category: "Alimentação", niche_subcategory: "Sorveteria", operation_type: "b2c",
      location_city: "Teresina", location_state: "PI",
      created_at: "2026-08-01T00:00:00Z", updated_at: "2026-08-01T00:00:00Z", completed_at: null,
    };
    const r = await getLatestCompanyDiagnostic(fakeSupabase({ data: row, error: null }), "company-A");
    assert(r.status === "available" && r.data?.companyId === "company-A", "companyId mapeado do client_id real da linha");
    assert(r.status === "available" && r.data?.nicheCategory === "Alimentação", "nicho real preservado, nada inventado");
    assert(r.status === "available" && r.data?.status === "draft", "novo status mínimo 'draft' (Fase 14) mapeado sem alteração");
  }

  console.log("[test] 4 — getCompanyFindings: unavailable vs. lista vazia real, nunca confundidos; companyId vem do parâmetro, nunca de coluna redundante (P0.3)");
  {
    const rUnavail = await getCompanyFindings(fakeSupabaseThrows(), "company-A");
    assert(rUnavail.status === "unavailable" && rUnavail.reason === "schema_not_applied", "tabela ausente -- unavailable/schema_not_applied");

    const rEmpty = await getCompanyFindings(fakeSupabase({ data: [], error: null }), "company-A");
    assert(rEmpty.status === "available" && Array.isArray(rEmpty.data) && rEmpty.data.length === 0, "lista real vazia -- [] explícito, nunca omitido/undefined");

    const rows = [
      { id: "f-low", diagnostic_id: "diag-1", category: "presenca_digital", title: "Achado baixo", description: null, evidence_url: null, severity: "low", priority: "low", status: "open", source: "diagnostic", created_at: "2026-08-01T00:00:00Z" },
      { id: "f-high", diagnostic_id: "diag-1", category: "presenca_digital", title: "Achado alto", description: null, evidence_url: null, severity: "high", priority: "high", status: "open", source: "diagnostic", created_at: "2026-08-01T00:00:00Z" },
    ];
    const rData = await getCompanyFindings(fakeSupabase({ data: rows, error: null }), "company-A");
    assert(rData.status === "available" && rData.data[0]?.id === "f-high", "Fase 19 -- prioridade ordenada explicitamente (high antes de low), nunca alfabeticamente");
    assert(rData.status === "available" && rData.data.every((f) => f.companyId === "company-A"), "companyId preenchido a partir do parâmetro de filtro, já que diagnostic_findings não tem mais client_id próprio (P0.3)");
    assert(!("client_id" in rows[0]), "linha bruta simulada não tem client_id -- o adapter nunca depende dessa coluna redundante");
  }

  console.log("[test] 5 — getDiagnosticChecklist / getFindingRecommendations / getCompanyRoadmap seguem o mesmo contrato honesto");
  {
    const checklist = await getDiagnosticChecklist(fakeSupabaseThrows(), "diag-1");
    assert(checklist.status === "unavailable" && checklist.reason === "schema_not_applied", "checklist: unavailable/schema_not_applied propagado");

    const checklistRow = await getDiagnosticChecklist(
      fakeSupabase({ data: [{ id: "c1", diagnostic_id: "diag-1", item_key: "instagram_configurado", category: "presenca_digital", label: "Instagram configurado?", status: "yes", notes: null, evidence_url: null, updated_at: "2026-08-01T00:00:00Z" }], error: null }),
      "diag-1",
    );
    assert(checklistRow.status === "available" && checklistRow.data[0]?.itemKey === "instagram_configurado", "item_key (Fase 17) mapeado, nunca perdido");

    const recs = await getFindingRecommendations(
      fakeSupabase({ data: [{ id: "r1", finding_id: "f1", title: "Criar site", description: null, capability: "external_execution", status: "suggested" }], error: null }),
      "f1",
    );
    assert(recs.status === "available" && recs.data[0]?.capability === "external_execution", "recommendation mapeada com capability real, nunca inventada");
    assert(recs.status === "available" && recs.data[0]?.status === "suggested", "lifecycle da recommendation (Fase 22) mapeado -- suggested por padrão");

    const roadmap = await getCompanyRoadmap(fakeSupabase({ data: [], error: null }), "company-A");
    assert(roadmap.status === "available" && roadmap.data.length === 0, "roadmap real vazio é um estado válido, não um erro");

    const roadmapWithData = await getCompanyRoadmap(
      fakeSupabase({ data: [{ id: "ri1", client_id: "company-A", source_type: "manual", source_id: null, title: "Configurar Instagram", description: "Item manual", priority: "medium", status: "planned", destination_capability: null, due_date: null, project_id: null, created_at: "2026-08-01T00:00:00Z" }], error: null }),
      "company-A",
    );
    assert(roadmapWithData.status === "available" && roadmapWithData.data[0]?.status === "planned", "novo status mínimo do roadmap (Fase 25) mapeado -- sem in_project/in_campaign");
    assert(roadmapWithData.status === "available" && roadmapWithData.data[0]?.description === "Item manual", "description do roadmap (Fase 24) mapeada");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
