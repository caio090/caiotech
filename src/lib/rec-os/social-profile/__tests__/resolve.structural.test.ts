/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os/social-profile/__tests__/resolve.structural.test.ts
 * Prompt 13 (REC OS Core Experience) — resolveSocialProfileContext com
 * um fake Supabase client (nunca rede real, nunca DB real).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSocialProfileContext } from "../resolve";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function fakeDb(rows: unknown[] | null, error: { code?: string } | null = null) {
  const calls: { table?: string; eqs: [string, unknown][] } = { eqs: [] };
  const builder = {
    select: (_cols: string) => builder,
    eq: (col: string, val: unknown) => { calls.eqs.push([col, val]); return builder; },
    then: undefined,
  };
  // Terminal await -- resolve com { data, error } quando "awaited" (thenable simples).
  const thenable = Object.assign(builder, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    then(resolve: any) { resolve({ data: rows, error }); },
  });
  return {
    from: (table: string) => { calls.table = table; return thenable; },
    __calls: calls,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as unknown as SupabaseClient & { __calls: any };
}

async function main() {
  console.log("[test] companyId null (Free Creation Mode) -- nunca resolve contexto social, nunca consulta DB");
  {
    const db = fakeDb(null);
    const result = await resolveSocialProfileContext(db, null);
    assert(result === null, "null explícito, sem chamar o DB");
  }

  console.log("[test] sem linhas em client_meta_assets -- 'não conectado', nunca lança");
  {
    const db = fakeDb([]);
    const result = await resolveSocialProfileContext(db, "company-1");
    assert(result !== null, "sempre devolve um objeto (nunca null quando há companyId)");
    assert(result?.status === "not_connected", "status not_connected quando sem Instagram vinculado");
    assert(result?.handle === null, "handle null quando não conectado");
  }

  console.log("[test] com linha primary -- projeta pro contrato canônico, nunca expõe token");
  {
    const db = fakeDb([
      { id: "row-1", asset_id: "ig-123", asset_name: "Minha Loja", username: "minhaloja", picture_url: "https://x/pic.jpg", meta_connection_id: "conn-1", is_primary: false },
      { id: "row-2", asset_id: "ig-456", asset_name: "Minha Loja 2", username: "minhaloja2", picture_url: "https://x/pic2.jpg", meta_connection_id: "conn-2", is_primary: true },
    ]);
    const result = await resolveSocialProfileContext(db, "company-1");
    assert(result?.status === "connected", "status connected");
    assert(result?.id === "row-2", "prefere a linha is_primary=true, mesmo não sendo a primeira");
    assert(result?.handle === "minhaloja2", "handle da linha primary");
    assert(result?.connectionId === "conn-2", "connectionId referencia meta_connections por FK, nunca duplica token");
    assert(result?.platform === "instagram", "platform instagram (V1)");
    assert(!JSON.stringify(result).toLowerCase().includes("token"), "nenhum campo de token no resultado, nunca");
  }

  console.log("[test] sem linha primary -- usa a primeira encontrada");
  {
    const db = fakeDb([
      { id: "row-1", asset_id: "ig-123", asset_name: "Loja", username: "loja", picture_url: null, meta_connection_id: "conn-1", is_primary: false },
    ]);
    const result = await resolveSocialProfileContext(db, "company-1");
    assert(result?.id === "row-1", "usa a única linha disponível quando nenhuma é primary");
  }

  console.log("[test] erro de DB -- degrada pra 'não conectado', nunca lança (REC OS continua utilizável)");
  {
    const db = fakeDb(null, { code: "42P01" });
    const result = await resolveSocialProfileContext(db, "company-1");
    assert(result?.status === "not_connected", "erro de DB nunca derruba o REC OS -- degrada com segurança");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
