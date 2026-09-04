/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os/studio/series/__tests__/series-orchestrator.structural.test.ts
 * Prompt 13 (REC OS Core Experience) — orquestração de Série Visual,
 * pura, sem rede/React (generate() é injetado como fake).
 */
import { buildInitialSeriesItems, runSeriesGeneration, markItemForRegeneration, cancelPendingItems } from "../series-orchestrator";
import type { CreativeSeriesItem } from "../types";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

async function main() {
  console.log("[test] buildInitialSeriesItems -- 1/3/6/9 suportados, N posições independentes, nunca menos/mais");
  {
    for (const size of [1, 3, 6, 9] as const) {
      const items = buildInitialSeriesItems("brief base", size);
      assert(items.length === size, `size ${size}: gera exatamente ${size} itens`);
      assert(items.every((i) => i.status === "planned"), `size ${size}: todos começam 'planned'`);
      assert(new Set(items.map((i) => i.id)).size === size, `size ${size}: IDs únicos -- N imagens independentes, nunca a mesma referência repetida`);
      assert(items.every((i) => i.image === null), `size ${size}: nenhuma imagem ainda -- REGRA ABSOLUTA, nunca 1 imagem com N layouts fingindo ser N itens`);
    }
  }

  console.log("[test] runSeriesGeneration -- processa SEQUENCIALMENTE (concorrência 1), nunca em paralelo");
  {
    const items = buildInitialSeriesItems("x", 3);
    const order: string[] = [];
    let concurrent = 0;
    let maxConcurrent = 0;
    await runSeriesGeneration(items, {
      generate: async (item) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        order.push(item.id);
        await new Promise((r) => setTimeout(r, 5));
        concurrent--;
        return { ok: true, image: { url: `data:image/png;base64,x-${item.id}`, width: 1080, height: 1080 } };
      },
      onItemUpdate: () => {},
    });
    assert(maxConcurrent === 1, "nunca mais de 1 geração em voo ao mesmo tempo (Fase 22)");
    assert(order.length === 3, "todos os 3 itens processados");
    assert(order[0] === "series-item-1" && order[1] === "series-item-2" && order[2] === "series-item-3", "ordem determinística por posição");
  }

  console.log("[test] runSeriesGeneration -- sucesso e erro por item, independentes (um erro não derruba os demais)");
  {
    const items = buildInitialSeriesItems("x", 3);
    const result = await runSeriesGeneration(items, {
      generate: async (item) => item.position === 2
        ? { ok: false, error: "falhou peça 2" }
        : { ok: true, image: { url: `data:image/png;base64,x`, width: 1080, height: 1080 } },
      onItemUpdate: () => {},
    });
    assert(result[0].status === "ready" && result[0].image !== null, "peça 1 ready com imagem própria");
    assert(result[1].status === "error" && result[1].error === "falhou peça 2", "peça 2 error, com mensagem própria");
    assert(result[2].status === "ready" && result[2].image !== null, "peça 3 ready, não afetada pela falha da peça 2");
  }

  console.log("[test] onItemUpdate -- chamado com status intermediário 'generating' antes do resultado final (UI vê progresso real)");
  {
    const items = buildInitialSeriesItems("x", 1);
    const seenStatuses: string[] = [];
    await runSeriesGeneration(items, {
      generate: async () => ({ ok: true, image: { url: "data:image/png;base64,x", width: 1080, height: 1080 } }),
      onItemUpdate: (item) => seenStatuses.push(item.status),
    });
    assert(seenStatuses[0] === "generating", "primeiro update é 'generating'");
    assert(seenStatuses[1] === "ready", "segundo update é o resultado final");
  }

  console.log("[test] regenerar só um item -- markItemForRegeneration nunca toca nos demais");
  {
    const items = buildInitialSeriesItems("x", 3);
    const afterFirstRun = await runSeriesGeneration(items, {
      generate: async () => ({ ok: true, image: { url: "data:image/png;base64,v1", width: 1080, height: 1080 } }),
      onItemUpdate: () => {},
    });
    const marked = markItemForRegeneration(afterFirstRun, "series-item-2");
    assert(marked[0].status === "ready" && marked[0].image?.url === "data:image/png;base64,v1", "peça 1 intocada");
    assert(marked[1].status === "planned", "só a peça 2 volta pra 'planned'");
    assert(marked[2].status === "ready" && marked[2].image?.url === "data:image/png;base64,v1", "peça 3 intocada");

    const afterRegen = await runSeriesGeneration(marked, {
      generate: async () => ({ ok: true, image: { url: "data:image/png;base64,v2", width: 1080, height: 1080 } }),
      onItemUpdate: () => {},
    });
    assert(afterRegen[0].image?.url === "data:image/png;base64,v1", "regenerar peça 2 NÃO regera a peça 1 (Fase 24)");
    assert(afterRegen[1].image?.url === "data:image/png;base64,v2", "peça 2 recebeu a nova imagem");
    assert(afterRegen[2].image?.url === "data:image/png;base64,v1", "regenerar peça 2 NÃO regera a peça 3 (Fase 24)");
  }

  console.log("[test] cancelPendingItems -- só cancela itens 'planned' (ainda não iniciados), nunca aborta um em voo");
  {
    const items: CreativeSeriesItem[] = [
      { id: "a", position: 1, role: "Peça 1", brief: "x", status: "planned", image: null, error: null },
      { id: "b", position: 2, role: "Peça 2", brief: "x", status: "generating", image: null, error: null },
      { id: "c", position: 3, role: "Peça 3", brief: "x", status: "planned", image: null, error: null },
    ];
    const canceled = cancelPendingItems(items, new Set(["a", "b", "c"]));
    assert(canceled[0].status === "canceled", "item 'planned' é cancelado");
    assert(canceled[1].status === "generating", "item 'generating' NUNCA é cancelado, mesmo pedido -- não aborta request em voo (Fase 24)");
    assert(canceled[2].status === "canceled", "outro item 'planned' também cancelado");
  }

  console.log("[test] runSeriesGeneration -- respeita isCanceled ANTES de iniciar um item ainda não começado");
  {
    const items = buildInitialSeriesItems("x", 3);
    let generateCalls = 0;
    const result = await runSeriesGeneration(items, {
      generate: async () => { generateCalls++; return { ok: true, image: { url: "data:image/png;base64,x", width: 1, height: 1 } }; },
      onItemUpdate: () => {},
      isCanceled: (id) => id === "series-item-2" || id === "series-item-3",
    });
    assert(generateCalls === 1, "generate() nunca chamado para um item cancelado antes de começar");
    assert(result[0].status === "ready", "item 1 (não cancelado) processado normalmente");
    assert(result[1].status === "canceled", "item 2 termina como 'canceled', nunca 'planned' preso");
    assert(result[2].status === "canceled", "item 3 termina como 'canceled', nunca 'planned' preso");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
