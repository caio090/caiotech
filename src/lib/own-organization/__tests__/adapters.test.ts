/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/own-organization/__tests__/adapters.test.ts
 * Sprint Final Closure (Parte D) — cobre a raiz única (account_type) com
 * duas apresentações (Fase 23): agência vê identidade + carteira real via
 * agency_workspaces/agency_clients; empresa direta deriva a própria
 * Company via profiles.client_id; nenhum dado fabricado quando a fonte
 * está vazia ou indisponível.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOwnOrganizationSummary, resolveOwnOrganizationKind } from "../adapters";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function fakeDb(byTable: Record<string, { data: unknown; error: unknown }>): SupabaseClient {
  return {
    from: (table: string) => {
      const result = byTable[table] ?? { data: null, error: null };
      const chain: Record<string, unknown> = {};
      const methods = ["select", "eq", "order", "in"];
      for (const m of methods) chain[m] = () => chain;
      chain.maybeSingle = async () => result;
      chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result));
      return chain;
    },
  } as unknown as SupabaseClient;
}

function throwingDb(): SupabaseClient {
  return { from: () => { throw new Error("relation does not exist"); } } as unknown as SupabaseClient;
}

async function main() {
  console.log("[test] 1 — resolveOwnOrganizationKind: raiz única, duas apresentações (Fase 23)");
  {
    assert(resolveOwnOrganizationKind("agencia") === "agency", "account_type='agencia' -> agency");
    assert(resolveOwnOrganizationKind("empresa") === "business", "account_type='empresa' -> business");
    assert(resolveOwnOrganizationKind("invited_client") === "not_applicable", "outros account_type -> not_applicable, nunca adivinhado");
    assert(resolveOwnOrganizationKind(null) === "not_applicable", "account_type nulo -> not_applicable");
  }

  console.log("[test] 2 — agência: identidade + carteira reais, nunca métrica fabricada (Fase 25/26)");
  {
    const db = fakeDb({
      agency_workspaces: { data: { id: "aw1", name: "Agência X", status: "active", plan_slug: "pro", max_clients: 10 }, error: null },
      agency_clients: {
        data: [
          { client_id: "c1", status: "active", clients: { id: "c1", company_name: "Duh Lanches" } },
          { client_id: "c2", status: "active", clients: { id: "c2", company_name: "O Pedreirão" } },
        ],
        error: null,
      },
    });
    const r = await getOwnOrganizationSummary(db, "u1", "agencia", null);
    assert(r.status === "available", "schema disponível");
    assert(r.status === "available" && r.data.kind === "agency", "kind agency");
    assert(r.status === "available" && r.data.kind === "agency" && r.data.identity?.name === "Agência X", "identidade real do workspace, não inventada");
    assert(r.status === "available" && r.data.kind === "agency" && r.data.portfolio?.length === 2, "carteira real com 2 clientes ativos");
  }

  console.log("[test] 3 — agência sem workspace ainda: estado vazio honesto, nunca erro nem número fake");
  {
    const db = fakeDb({ agency_workspaces: { data: null, error: null } });
    const r = await getOwnOrganizationSummary(db, "u1", "agencia", null);
    assert(r.status === "available" && r.data.kind === "agency" && r.data.identity === null, "identity null explícito -- nenhum workspace fake");
    assert(r.status === "available" && r.data.kind === "agency" && r.data.portfolio === null, "portfolio null quando não há workspace para consultar clientes");
  }

  console.log("[test] 4 — empresa direta: deriva a própria Company via profiles.client_id (Fase 27)");
  {
    const db = fakeDb({ clients: { data: { id: "c9", company_name: "Minha Empresa", status: "active" }, error: null } });
    const r = await getOwnOrganizationSummary(db, "u2", "empresa", "c9");
    assert(r.status === "available" && r.data.kind === "business" && r.data.companyId === "c9", "companyId real derivado de profiles.client_id");
    assert(r.status === "available" && r.data.kind === "business" && r.data.companyName === "Minha Empresa", "companyName real, não inventado");
  }

  console.log("[test] 5 — empresa direta sem client_id: estado vazio honesto, nunca pede seleção de cliente externo (Fase 27)");
  {
    const db = fakeDb({});
    const r = await getOwnOrganizationSummary(db, "u3", "empresa", null);
    assert(r.status === "available" && r.data.kind === "business" && r.data.companyId === null, "companyId null explícito -- conta ainda não vinculada, nunca um picker de Company externa");
  }

  console.log("[test] 6 — falha de schema/consulta vira unavailable, nunca vazio silencioso (Fase 26)");
  {
    const r1 = await getOwnOrganizationSummary(throwingDb(), "u1", "agencia", null);
    assert(r1.status === "unavailable", "exceção real vira unavailable");
    const r2 = await getOwnOrganizationSummary(throwingDb(), "u1", "empresa", "c1");
    assert(r2.status === "unavailable", "idem para business");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
