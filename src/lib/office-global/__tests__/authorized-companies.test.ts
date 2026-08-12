/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/office-global/__tests__/authorized-companies.test.ts
 * Sprint Final Closure (Parte E, Fase 30) — mesmo contrato canônico de
 * fetchAdminCompanyAuthorization() (src/lib/company-context/resolve.ts),
 * agora devolvendo a LISTA de Companies autorizadas em vez de validar uma
 * única. super_admin vê todas; demais só via profiles.client_id /
 * client_user_access / agency_workspaces+agency_clients -- nunca role-only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { listAuthorizedCompanies } from "../authorized-companies";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function fakeDb(byTable: Record<string, unknown[]>): SupabaseClient {
  return {
    from: (table: string) => {
      const rows = byTable[table] ?? [];
      const chain: Record<string, unknown> = {};
      const methods = ["select", "eq", "in", "order", "is"];
      for (const m of methods) chain[m] = () => chain;
      chain.maybeSingle = async () => ({ data: rows[0] ?? null, error: null });
      chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolve({ data: rows, error: null }));
      return chain;
    },
  } as unknown as SupabaseClient;
}

async function main() {
  console.log("[test] 1 — super_admin vê todas as Companies visíveis (Fase 30)");
  {
    const db = fakeDb({ clients: [{ id: "c1", company_name: "A" }, { id: "c2", company_name: "B" }] });
    const list = await listAuthorizedCompanies(db, "u-super", "super_admin");
    assert(list.length === 2, "super_admin recebe todas as Companies visíveis");
  }

  console.log("[test] 2 — client user: só a própria Company via profiles.client_id (não role-only)");
  {
    const db = fakeDb({
      profiles: [{ client_id: "c1" }],
      client_user_access: [],
      agency_workspaces: [],
      clients: [{ id: "c1", company_name: "Minha Empresa" }],
    });
    const list = await listAuthorizedCompanies(db, "u-client", "cliente");
    assert(list.length === 1 && list[0].id === "c1", "apenas a Company do próprio profiles.client_id");
  }

  console.log("[test] 3 — agência: Companies vinculadas via agency_workspaces + agency_clients ativos");
  {
    const db = fakeDb({
      profiles: [{ client_id: null }],
      client_user_access: [],
      agency_workspaces: [{ id: "aw1" }],
      agency_clients: [{ client_id: "c5" }, { client_id: "c6" }],
      clients: [{ id: "c5", company_name: "Cliente 5" }, { id: "c6", company_name: "Cliente 6" }],
    });
    const list = await listAuthorizedCompanies(db, "u-agency", "admin");
    assert(list.length === 2, "admin de agência recebe as Companies vinculadas ao próprio workspace, nunca todas");
  }

  console.log("[test] 4 — sem nenhum vínculo real: lista vazia, nunca todas as Companies por padrão (fail closed)");
  {
    const db = fakeDb({ profiles: [{ client_id: null }], client_user_access: [], agency_workspaces: [] });
    const list = await listAuthorizedCompanies(db, "u-none", "admin");
    assert(list.length === 0, "admin sem client_id, sem client_user_access e sem agency_workspaces não recebe Company nenhuma");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
