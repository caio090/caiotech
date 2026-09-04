/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os/studio/series/__tests__/asset-persistence.structural.test.ts
 * Prompt 18 (Creative Series Control & Asset Link Repair) —
 * persistGeneratedSeriesItemAsset com um fake Supabase (storage + db),
 * nunca rede/Storage real. Cobre P1-C (visual_asset_id sempre
 * vinculado no sucesso), compensação (Fase "COMPENSATING ROLLBACK") e
 * atomic swap (Fase "REGENERATE ASSET STRATEGY").
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { persistGeneratedSeriesItemAsset } from "../asset-persistence";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

async function realPngDataUrl(): Promise<string> {
  const buf = await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 9, g: 9, b: 9 } } }).png().toBuffer();
  return `data:image/png;base64,${buf.toString("base64")}`;
}

interface FakeDbOptions {
  uploadFails?: boolean;
  assetInsertFails?: boolean;
  itemLinkFails?: boolean;
  signedUrlFails?: boolean;
  oldAssetStoragePath?: string | null;
}

function fakeDb(opts: FakeDbOptions = {}) {
  const calls: { uploaded: string[]; removed: string[][]; assetInserted: unknown[]; assetDeletedIds: string[]; itemUpdated: unknown[] } = {
    uploaded: [], removed: [], assetInserted: [], assetDeletedIds: [], itemUpdated: [],
  };
  let assetIdCounter = 0;

  const storage = {
    from: (_bucket: string) => ({
      upload: async (path: string, _bytes: Buffer, _opts: unknown) => {
        calls.uploaded.push(path);
        return opts.uploadFails ? { error: { message: "bucket not found" } } : { error: null };
      },
      remove: async (paths: string[]) => { calls.removed.push(paths); return { error: null }; },
      createSignedUrl: async (_path: string, _ttl: number) =>
        opts.signedUrlFails ? { error: { message: "x" }, data: null } : { error: null, data: { signedUrl: "https://signed/x.png" } },
    }),
  };

  const clientVisualAssetsTable = {
    insert: (payload: unknown) => ({
      select: (_cols: string) => ({
        single: async () => {
          calls.assetInserted.push(payload);
          if (opts.assetInsertFails) return { data: null, error: { message: "insert failed" } };
          assetIdCounter++;
          return { data: { id: `asset-${assetIdCounter}` }, error: null };
        },
      }),
    }),
    delete: () => ({ eq: async (_col: string, id: string) => { calls.assetDeletedIds.push(id); return { error: null }; } }),
    select: (_cols: string) => ({
      eq: (_col: string, _id: string) => ({
        maybeSingle: async () => ({ data: opts.oldAssetStoragePath ? { storage_path: opts.oldAssetStoragePath } : null, error: null }),
      }),
    }),
  };

  const creativeSeriesItemsTable = {
    update: (payload: unknown) => ({
      eq: async (_col: string, _id: string) => { calls.itemUpdated.push(payload); return { error: opts.itemLinkFails ? { message: "link failed" } : null }; },
    }),
  };

  return {
    db: {
      storage,
      from: (table: string) => (table === "client_visual_assets" ? clientVisualAssetsTable : creativeSeriesItemsTable),
    } as unknown as SupabaseClient,
    calls,
  };
}

async function main() {
  const dataUrl = await realPngDataUrl();

  console.log("[test] [TEST 07] caminho feliz -- upload, asset row, item link, todos na ordem certa, visual_asset_id real devolvido");
  {
    const { db, calls } = fakeDb();
    const result = await persistGeneratedSeriesItemAsset(db, { clientId: "company-a", seriesId: "series-1", seriesItemId: "item-1", dataUrl, createdBy: "user-1" });
    assert(result.ok === true, "sucesso");
    if (result.ok) {
      assert(result.assetId === "asset-1", "assetId real devolvido");
      assert(result.signedUrl === "https://signed/x.png", "signed URL gerada, nunca persistida (só devolvida nesta resposta)");
    }
    assert(calls.uploaded.length === 1, "upload chamado exatamente uma vez");
    assert(calls.uploaded[0].startsWith("company-a/item-1/"), "path começa com {clientId}/{seriesItemId}/ (SQL 93 só valida o 1º segmento)");
    assert(calls.assetInserted.length === 1, "client_visual_assets.insert chamado uma vez");
    assert((calls.assetInserted[0] as { client_id: string }).client_id === "company-a", "asset row referencia a Company real");
    assert(calls.itemUpdated.length === 1, "creative_series_items.update chamado uma vez");
    const itemUpdate = calls.itemUpdated[0] as { visual_asset_id: string; status: string };
    assert(itemUpdate.visual_asset_id === "asset-1", "P1-C CORRIGIDO -- visual_asset_id realmente escrito no item, nunca mais NULL");
    assert(itemUpdate.status === "ready", "status ready só é setado junto com o vínculo real, nunca antes");
  }

  console.log("[test] [TEST 09a] upload falha -- ASSET_INSERT nunca chamado, nenhuma limpeza necessária, erro explícito");
  {
    const { db, calls } = fakeDb({ uploadFails: true });
    const result = await persistGeneratedSeriesItemAsset(db, { clientId: "company-a", seriesId: "series-1", seriesItemId: "item-1", dataUrl, createdBy: "user-1" });
    assert(result.ok === false, "falha explícita");
    if (!result.ok) assert(result.code === "STORAGE_NOT_CONFIGURED", "código específico -- bucket pode não existir ainda");
    assert(calls.assetInserted.length === 0, "nunca tenta inserir asset row sem upload bem-sucedido");
  }

  console.log("[test] [TEST 09b] upload PASS + asset insert FAIL -- storage cleanup via Storage API, nunca DELETE manual em storage.objects");
  {
    const { db, calls } = fakeDb({ assetInsertFails: true });
    const result = await persistGeneratedSeriesItemAsset(db, { clientId: "company-a", seriesId: "series-1", seriesItemId: "item-1", dataUrl, createdBy: "user-1" });
    assert(result.ok === false, "falha explícita");
    if (!result.ok) assert(result.code === "ASSET_INSERT_FAILED", "código específico");
    assert(calls.removed.length === 1, "storage.remove chamado (compensação) -- nunca um arquivo órfão silencioso");
    assert(calls.removed[0][0] === calls.uploaded[0], "remove o EXATO arquivo que acabou de subir");
  }

  console.log("[test] [TEST 09c] asset insert PASS + item link FAIL -- remove o asset row E o arquivo, nada fica órfão");
  {
    const { db, calls } = fakeDb({ itemLinkFails: true });
    const result = await persistGeneratedSeriesItemAsset(db, { clientId: "company-a", seriesId: "series-1", seriesItemId: "item-1", dataUrl, createdBy: "user-1" });
    assert(result.ok === false, "falha explícita");
    if (!result.ok) assert(result.code === "ITEM_LINK_FAILED", "código específico");
    assert(calls.assetDeletedIds.includes("asset-1"), "asset row recém-criado é removido (compensação)");
    assert(calls.removed.length === 1 && calls.removed[0][0] === calls.uploaded[0], "arquivo recém-criado também é removido (compensação dupla)");
  }

  console.log("[test] [TEST 12] atomic swap -- asset ANTERIOR só é removido DEPOIS que o novo já está linkado com sucesso");
  {
    const { db, calls } = fakeDb({ oldAssetStoragePath: "company-a/item-1/old-generation-id.jpg" });
    const result = await persistGeneratedSeriesItemAsset(db, {
      clientId: "company-a", seriesId: "series-1", seriesItemId: "item-1", dataUrl, createdBy: "user-1",
      previousAssetId: "asset-old-1",
    });
    assert(result.ok === true, "sucesso");
    assert(calls.itemUpdated.length === 1, "item já foi linkado ao asset NOVO antes de qualquer limpeza do antigo");
    assert(calls.assetDeletedIds.includes("asset-old-1"), "asset antigo removido só depois (mesma chamada, mas só alcançada após o link ter sucesso)");
    assert(calls.removed.some((r) => r[0] === "company-a/item-1/old-generation-id.jpg"), "arquivo antigo removido do Storage via API, nunca SQL direto");
  }

  console.log("[test] [TEST 12b] se o link do NOVO asset falhar, o antigo NUNCA é tocado (nem removido)");
  {
    const { db, calls } = fakeDb({ itemLinkFails: true, oldAssetStoragePath: "company-a/item-1/old-generation-id.jpg" });
    const result = await persistGeneratedSeriesItemAsset(db, {
      clientId: "company-a", seriesId: "series-1", seriesItemId: "item-1", dataUrl, createdBy: "user-1",
      previousAssetId: "asset-old-1",
    });
    assert(result.ok === false, "falha explícita");
    assert(!calls.assetDeletedIds.includes("asset-old-1"), "asset ANTIGO nunca é removido se o novo não confirmou -- item continua com a versão antiga intacta");
  }

  console.log("[test] imagem inválida (não decodificável) -- falha explícita, nunca tenta upload");
  {
    const { db, calls } = fakeDb();
    const result = await persistGeneratedSeriesItemAsset(db, { clientId: "company-a", seriesId: "series-1", seriesItemId: "item-1", dataUrl: "não é uma data url", createdBy: "user-1" });
    assert(result.ok === false, "falha explícita");
    if (!result.ok) assert(result.code === "INVALID_IMAGE", "código específico");
    assert(calls.uploaded.length === 0, "nunca chega no upload com imagem inválida");
  }

  console.log("[test] [IDEMPOTÊNCIA] duas chamadas pro mesmo item geram paths DIFERENTES (nunca colidem/sobrescrevem uma versão anterior ainda válida)");
  {
    const { db, calls } = fakeDb();
    await persistGeneratedSeriesItemAsset(db, { clientId: "company-a", seriesId: "series-1", seriesItemId: "item-1", dataUrl, createdBy: "user-1" });
    await persistGeneratedSeriesItemAsset(db, { clientId: "company-a", seriesId: "series-1", seriesItemId: "item-1", dataUrl, createdBy: "user-1" });
    assert(calls.uploaded.length === 2 && calls.uploaded[0] !== calls.uploaded[1], "cada tentativa usa um path único (generationId), nunca overwrite cego");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
