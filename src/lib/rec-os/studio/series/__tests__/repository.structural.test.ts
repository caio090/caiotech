/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os/studio/series/__tests__/repository.structural.test.ts
 * Prompt 18 (Creative Series Control & Asset Link Repair) —
 * reconcileStaleGeneratingItems (Fase "STALE GENERATING", Test 06) e
 * updateCreativeSeriesItemStatus, com um fake Supabase client.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { reconcileStaleGeneratingItems, updateCreativeSeriesItemStatus } from "../repository";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function fakeUpdateChainDb() {
  const calls: { table: string; payload: unknown; filters: [string, unknown][] }[] = [];
  function builder(table: string, payload: unknown) {
    const filters: [string, unknown][] = [];
    const chain = {
      eq: (col: string, val: unknown) => { filters.push([col, val]); return chain; },
      lt: (col: string, val: unknown) => { filters.push([col, val]); return chain; },
      then: (resolve: (v: { error: null }) => void) => { calls.push({ table, payload, filters }); resolve({ error: null }); },
    };
    return chain;
  }
  return {
    db: { from: (table: string) => ({ update: (payload: unknown) => builder(table, payload) }) } as unknown as SupabaseClient,
    calls,
  };
}

async function main() {
  console.log("[test] [TEST 06] reconcileStaleGeneratingItems -- filtra por series_id + status=generating + updated_at antigo, marca error, NUNCA re-dispara geração");
  {
    const { db, calls } = fakeUpdateChainDb();
    await reconcileStaleGeneratingItems(db, "series-1");
    assert(calls.length === 1, "exatamente um UPDATE emitido");
    const call = calls[0];
    assert(call.table === "creative_series_items", "opera só em creative_series_items, nunca cria job/tabela nova");
    const payload = call.payload as { status: string; generation_metadata: { error: string } };
    assert(payload.status === "error", "vira 'error' (dentro do CHECK SQL real), nunca um status inventado");
    assert(typeof payload.generation_metadata.error === "string" && payload.generation_metadata.error.length > 0, "mensagem explicando a interrupção, nunca um erro genérico vazio");
    const filterCols = call.filters.map((f) => f[0]);
    assert(filterCols.includes("series_id"), "escopado à série (nunca afeta outras séries)");
    assert(filterCols.includes("status"), "só toca items 'generating'");
    assert(filterCols.includes("updated_at"), "só toca items com updated_at ANTIGO -- nunca um item que começou a gerar agora mesmo");
    const statusFilter = call.filters.find((f) => f[0] === "status");
    assert(statusFilter?.[1] === "generating", "filtro de status é exatamente 'generating'");
  }

  console.log("[test] updateCreativeSeriesItemStatus -- nunca aceita/grava assetUrl (Fase SIGNED URL: nunca persistir URL assinada)");
  {
    const { db, calls } = fakeUpdateChainDb();
    const ok = await updateCreativeSeriesItemStatus(db, "item-1", { status: "error", error: "falhou" });
    assert(ok === true, "atualização bem-sucedida");
    const payload = calls[0].payload as Record<string, unknown>;
    assert(!("assetUrl" in payload) && !("asset_url" in payload) && !("visual_asset_id" in payload), "nunca grava campo de asset por aqui -- só persistGeneratedSeriesItemAsset faz isso (Test 08)");
    assert(payload.status === "error", "status gravado");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
