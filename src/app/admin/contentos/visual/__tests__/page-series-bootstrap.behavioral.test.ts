/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/app/admin/contentos/visual/__tests__/page-series-bootstrap.behavioral.test.ts
 * Prompt 22 (Series Server-Authoritative Hydration Repair) — chama
 * resolveStudioPageBootstrap() (page-bootstrap.ts) diretamente. Este
 * módulo é a ponte real entre page.tsx (Server Component, JSX -- não
 * importável neste harness de teste, ver nota abaixo) e a decisão pura
 * já testada em scope-resolution.structural.test.ts. Testar este módulo
 * é comportamental de verdade: chama a função async real, com
 * getCreativeSeriesWithItems mockado via node:test module mocking, e
 * confere o objeto {clientId, resolvedSeries} que page.tsx repassa sem
 * nenhuma transformação para <StudioExecutionForm>.
 *
 * Nota sobre o design: o loader de teste deste projeto
 * (.tmp/ts-extension-loader.mjs) só resolve especificadores sem
 * extensão pra .ts/.tsx -- nunca registrou um hook `load` que
 * transforme JSX/TS em JS executável. Por isso um `import("../page.tsx")`
 * direto falha com ERR_UNKNOWN_FILE_EXTENSION. A correção estrutural
 * (não um workaround de teste) foi extrair a decisão de bootstrap da
 * página para este módulo `.ts` puro (page-bootstrap.ts), que page.tsx
 * agora só chama e repassa -- "teste de fonte não é suficiente" (lição
 * do Prompt 20/21) exigia prova de comportamento real, e um módulo sem
 * JSX é o que torna isso possível neste harness.
 */
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import type { CreativeSeriesWithItems } from "../../../../../lib/rec-os/studio/series/repository";

async function loadBootstrapWith(t: TestContext, fetchSeriesById: (id: string) => Promise<unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/rec-os/studio/series/repository", {
    exports: { getCreativeSeriesWithItems: (_db: unknown, id: string) => fetchSeriesById(id) },
  });
  const mod = await import(`../page-bootstrap.ts?t=${Date.now()}-${Math.random()}`);
  return mod.resolveStudioPageBootstrap as (
    db: unknown,
    params: { client?: string; series_id?: string },
  ) => Promise<{ clientId: string | null; resolvedSeries: CreativeSeriesWithItems | null }>;
}

test("[TEST 01/07] series_id válido na URL -- resolveStudioPageBootstrap devolve initialSeries E clientId derivado da série, na MESMA passada", async (t) => {
  const fakeSeries = {
    series: { id: "series-1", clientId: "company-a", contentId: null, campaignId: null, title: null, count: 3, placement: null, format: null, creativeDirection: null, status: "generating", createdBy: "user-1", createdAt: "x", updatedAt: "x" },
    items: [],
  };
  const resolveStudioPageBootstrap = await loadBootstrapWith(t, async (id) => (id === "series-1" ? fakeSeries : null));
  const result = await resolveStudioPageBootstrap({}, { series_id: "series-1" });
  assert.deepEqual(result.resolvedSeries, fakeSeries, "resolvedSeries chega EXATAMENTE como o servidor resolveu -- nunca null nem refeito no client");
  assert.equal(result.clientId, "company-a", "clientId efetivo da página é derivado da série resolvida, nunca um valor solto/divergente");
});

test("[TEST 02] series_id inválido/não autorizado -- resolveStudioPageBootstrap devolve resolvedSeries null, nunca dado vazado", async (t) => {
  const resolveStudioPageBootstrap = await loadBootstrapWith(t, async () => null);
  const result = await resolveStudioPageBootstrap({}, { series_id: "series-de-outra-company", client: "company-a" });
  assert.equal(result.resolvedSeries, null, "nenhuma série vazada quando não autorizada/inexistente");
  assert.equal(result.clientId, "company-a", "sem série resolvida, o clientId explícito da URL é preservado (fallback seguro)");
});

test("[TEST 02b] not-found e forbidden produzem exatamente o mesmo resultado (fail closed, sem revelar existência)", async (t) => {
  // fetchSeriesById devolve null tanto pra "não existe" quanto pra "existe mas
  // RLS nega" (o próprio Supabase client sob RLS já não devolve linha nenhuma
  // nos dois casos) -- por isso a mesma fake serve pra provar as duas chamadas,
  // com params diferentes, colapsam no MESMO resultado observável.
  const resolveStudioPageBootstrap = await loadBootstrapWith(t, async () => null);
  const notFoundResult = await resolveStudioPageBootstrap({}, { series_id: "series-inexistente", client: "company-a" });
  const forbiddenResult = await resolveStudioPageBootstrap({}, { series_id: "series-de-outra-company", client: "company-a" });

  assert.equal(JSON.stringify(notFoundResult), JSON.stringify(forbiddenResult), "inexistente e não-autorizado são indistinguíveis do lado de fora");
});

test("[TEST 10] conflito series_id (Company A) + client explícito (Company B) -- clientId efetivo NUNCA fica em B com a série de A carregada", async (t) => {
  const fakeSeries = {
    series: { id: "series-1", clientId: "company-a", contentId: null, campaignId: null, title: null, count: 1, placement: null, format: null, creativeDirection: null, status: "draft", createdBy: "user-1", createdAt: "x", updatedAt: "x" },
    items: [],
  };
  const resolveStudioPageBootstrap = await loadBootstrapWith(t, async () => fakeSeries);
  const result = await resolveStudioPageBootstrap({}, { series_id: "series-1", client: "company-b" });
  assert.equal(result.clientId, result.resolvedSeries?.series.clientId, "clientId efetivo e a Company real da série NUNCA divergem na mesma passada -- elimina a causa raiz do incidente de hidratação");
  assert.equal(result.clientId, "company-a", "a série explícita vence o client da URL (Fase 14)");
});

test("[TEST 09] sem series_id, sem client (Free Mode puro) -- resolveStudioPageBootstrap devolve resolvedSeries null e clientId null, sem tocar o repositório", async (t) => {
  const resolveStudioPageBootstrap = await loadBootstrapWith(t, async () => {
    throw new Error("nunca deveria ser chamado sem series_id");
  });
  const result = await resolveStudioPageBootstrap({}, {});
  assert.equal(result.resolvedSeries, null);
  assert.equal(result.clientId, null);
});
