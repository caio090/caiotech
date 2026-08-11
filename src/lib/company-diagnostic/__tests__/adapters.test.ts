/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/company-diagnostic/__tests__/adapters.test.ts
 * Sprint MVP Core Closure V2 (Fase 65) — cobre os dois mundos reais que a
 * camada precisa suportar honestamente: schema 91 AINDA NÃO aplicado
 * (unavailable, nunca tratado como vazio) e schema aplicado com/sem dado
 * real (available, com [] ou com valor). Usa um fixture mínimo de
 * SupabaseClient (permitido pelo brief: "tests with test fixtures"),
 * nunca um banco real.
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
  console.log("[test] 1 — getLatestCompanyDiagnostic: unavailable quando a tabela não existe (schema 91 não aplicado)");
  {
    const r1 = await getLatestCompanyDiagnostic(fakeSupabaseThrows(), "company-A");
    assert(r1.status === "unavailable", "exceção na query vira unavailable, nunca vazio silencioso");

    const r2 = await getLatestCompanyDiagnostic(fakeSupabase({ data: null, error: { message: "relation does not exist" } }), "company-A");
    assert(r2.status === "unavailable", "erro reportado pelo Supabase vira unavailable");
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
      id: "diag-1", client_id: "company-A", status: "in_progress",
      niche_category: "Alimentação", niche_subcategory: "Sorveteria", operation_type: "b2c",
      location_city: "Teresina", location_state: "PI",
      created_at: "2026-08-01T00:00:00Z", updated_at: "2026-08-01T00:00:00Z", completed_at: null,
    };
    const r = await getLatestCompanyDiagnostic(fakeSupabase({ data: row, error: null }), "company-A");
    assert(r.status === "available" && r.data?.companyId === "company-A", "companyId mapeado do client_id real da linha");
    assert(r.status === "available" && r.data?.nicheCategory === "Alimentação", "nicho real preservado, nada inventado");
  }

  console.log("[test] 4 — getCompanyFindings: unavailable vs. lista vazia real, nunca confundidos");
  {
    const rUnavail = await getCompanyFindings(fakeSupabaseThrows(), "company-A");
    assert(rUnavail.status === "unavailable", "tabela ausente -- unavailable");

    const rEmpty = await getCompanyFindings(fakeSupabase({ data: [], error: null }), "company-A");
    assert(rEmpty.status === "available" && Array.isArray(rEmpty.data) && rEmpty.data.length === 0, "lista real vazia -- [] explícito, nunca omitido/undefined");
  }

  console.log("[test] 5 — getDiagnosticChecklist / getFindingRecommendations / getCompanyRoadmap seguem o mesmo contrato honesto");
  {
    const checklist = await getDiagnosticChecklist(fakeSupabaseThrows(), "diag-1");
    assert(checklist.status === "unavailable", "checklist: unavailable propagado");

    const recs = await getFindingRecommendations(
      fakeSupabase({ data: [{ id: "r1", finding_id: "f1", title: "Criar site", description: null, capability: "external_execution" }], error: null }),
      "f1",
    );
    assert(recs.status === "available" && recs.data[0]?.capability === "external_execution", "recommendation mapeada com capability real, nunca inventada");

    const roadmap = await getCompanyRoadmap(fakeSupabase({ data: [], error: null }), "company-A");
    assert(roadmap.status === "available" && roadmap.data.length === 0, "roadmap real vazio é um estado válido, não um erro");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
