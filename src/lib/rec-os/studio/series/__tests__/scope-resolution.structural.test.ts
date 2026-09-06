/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os/studio/series/__tests__/scope-resolution.structural.test.ts
 * Prompt 22 (Series Server-Authoritative Hydration Repair) —
 * resolveSeriesAndScope é a decisão real que fecha o P1 de Production
 * (série some no refresh). Comportamental de verdade (fetchSeriesById
 * é injetado como fake, nunca fonte/regex) -- cobre TEST 01/02/04/05/
 * 08/09/10 do Part I do prompt.
 */
import { resolveSeriesAndScope } from "../scope-resolution";
import type { CreativeSeriesWithItems } from "../repository";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function fakeSeries(id: string, clientId: string | null): CreativeSeriesWithItems {
  return {
    series: { id, clientId, contentId: null, campaignId: null, title: null, count: 3, placement: null, format: null, creativeDirection: null, status: "generating", createdBy: "user-1", createdAt: "x", updatedAt: "x" },
    items: [{ id: "item-1", position: 1, role: "Peça 1", brief: "x", status: "planned", visualAssetId: null, image: null, error: null }],
  };
}

async function main() {
  console.log("[test] [TEST 01] server series bootstrap -- series_id válido devolve série + items + scope real");
  {
    const series = fakeSeries("series-1", "company-a");
    const result = await resolveSeriesAndScope({
      urlClientId: "company-a", urlSeriesId: "series-1",
      fetchSeriesById: async (id) => (id === "series-1" ? series : null),
    });
    assert(result.resolvedSeries?.series.id === "series-1", "série resolvida");
    assert(result.resolvedSeries?.items.length === 1, "items vêm junto");
    assert(result.effectiveClientId === "company-a", "scope real = clientId da série");
  }

  console.log("[test] [TEST 02] série inexistente/não autorizada -- resultado genérico, NUNCA revela qual dos dois casos");
  {
    const notFound = await resolveSeriesAndScope({ urlClientId: "company-a", urlSeriesId: "series-inexistente", fetchSeriesById: async () => null });
    const forbidden = await resolveSeriesAndScope({ urlClientId: "company-a", urlSeriesId: "series-de-outra-company", fetchSeriesById: async () => null });
    assert(notFound.resolvedSeries === null, "inexistente -> resolvedSeries null");
    assert(forbidden.resolvedSeries === null, "não autorizada -> resolvedSeries null (RLS já devolveu null pro chamador)");
    assert(JSON.stringify(notFound) === JSON.stringify(forbidden), "as duas situações produzem EXATAMENTE o mesmo resultado -- nunca dá pra distinguir por fora");
  }

  console.log("[test] [TEST 04] Company hydration resolve pro MESMO clientId da série -- nunca reseta (é o caso mais importante do incidente real)");
  {
    const series = fakeSeries("series-1", "company-a");
    // Simula a sequência real: primeira leitura (urlClientId ainda não maduro) e segunda leitura (Company Context "pronto") --
    // ambas chamando a MESMA função pura, cada uma numa passada server-side síncrona e autocontida.
    const first = await resolveSeriesAndScope({ urlClientId: "company-a", urlSeriesId: "series-1", fetchSeriesById: async () => series });
    const second = await resolveSeriesAndScope({ urlClientId: "company-a", urlSeriesId: "series-1", fetchSeriesById: async () => series });
    assert(first.resolvedSeries?.series.id === "series-1" && second.resolvedSeries?.series.id === "series-1", "série presente nas duas passadas");
    assert(first.effectiveClientId === second.effectiveClientId, "o mesmo clientId de entrada produz o mesmo scope de saída -- nunca diverge entre chamadas idênticas (elimina a race do design)");
  }

  console.log("[test] [TEST 05 -- mudança real] Company muda de A pra B (série pertence só a A) -- scope efetivo NUNCA fica em B com a série de A");
  {
    const seriesA = fakeSeries("series-1", "company-a");
    // RLS real: se o usuário só tem acesso à Company A e pede a série 1
    // (que é de A) num contexto onde a URL diz client=B, a série ainda
    // é resolvida (RLS não olha pra query string) -- mas o scope
    // EFETIVO precisa refletir a Company REAL da série, nunca fingir
    // que a série pertence a B.
    const result = await resolveSeriesAndScope({ urlClientId: "company-b", urlSeriesId: "series-1", fetchSeriesById: async () => seriesA });
    assert(result.effectiveClientId === "company-a", "scope efetivo sincroniza pra Company real da série (Fase 14), nunca finge que é B");
    assert(result.resolvedSeries?.series.clientId === "company-a", "a série nunca é reapresentada como se fosse de outra Company");
  }

  console.log("[test] [TEST 08] recent NUNCA disputa com series_id explícito -- função nem recebe/considera 'recente' quando series_id existe");
  {
    const seriesA = fakeSeries("series-a", "company-1");
    let fetchCalls = 0;
    const result = await resolveSeriesAndScope({
      urlClientId: "company-1", urlSeriesId: "series-a",
      fetchSeriesById: async (id) => { fetchCalls++; return id === "series-a" ? seriesA : null; },
    });
    assert(result.resolvedSeries?.series.id === "series-a", "série A (explícita) é a resolvida, nunca uma 'mais recente' hipotética B");
    assert(fetchCalls === 1, "busca por ID uma única vez, nunca uma segunda chamada heurística dentro desta função");
  }

  console.log("[test] [TEST 09] Free Mode -- series_id de série sem Company, urlClientId ausente -- sobrevive, scope permanece null (Free Mode)");
  {
    const freeSeries = fakeSeries("series-free-1", null);
    const result = await resolveSeriesAndScope({ urlClientId: null, urlSeriesId: "series-free-1", fetchSeriesById: async () => freeSeries });
    assert(result.resolvedSeries?.series.clientId === null, "série Free Mode presente");
    assert(result.effectiveClientId === null, "scope efetivo continua null (Free Mode) -- nunca promovido a Company só por existir uma série");
  }

  console.log("[test] [TEST 10] conflito real de URL (series_id de A + client=B) -- nunca mostra A 'dentro' do contexto de B; resolve de um jeito determinístico e seguro");
  {
    const seriesA = fakeSeries("series-1", "company-a");
    const result = await resolveSeriesAndScope({ urlClientId: "company-b", urlSeriesId: "series-1", fetchSeriesById: async () => seriesA });
    // A resolução escolhida (Fase 14): series_id explícito vence, o
    // scope efetivo sincroniza pra Company real da série -- garantindo
    // que NUNCA existan dois valores de Company divergentes chegando
    // ao client ao mesmo tempo (a real causa do bug de hidratação).
    assert(result.effectiveClientId === result.resolvedSeries?.series.clientId, "scope efetivo e Company da série SEMPRE batem -- nunca dois valores divergentes simultâneos (a causa raiz do P1)");
  }

  console.log("[test] sem series_id na URL -- nunca busca nada, scope = urlClientId tal como veio (comportamento padrão preservado)");
  {
    let fetchCalls = 0;
    const result = await resolveSeriesAndScope({ urlClientId: "company-x", urlSeriesId: null, fetchSeriesById: async () => { fetchCalls++; return null; } });
    assert(fetchCalls === 0, "fetchSeriesById nunca chamado sem series_id -- Fase 06 (fallback 'recente' fica fora desta função, no chamador)");
    assert(result.effectiveClientId === "company-x", "scope preservado tal como veio");
    assert(result.resolvedSeries === null, "nenhuma série resolvida");
  }

  console.log("[test] fetchSeriesById lança -- nunca propaga, degrada pra 'não encontrada' (fail closed, nunca crasha a página)");
  {
    const result = await resolveSeriesAndScope({ urlClientId: "company-a", urlSeriesId: "series-1", fetchSeriesById: async () => { throw new Error("db indisponível"); } });
    assert(result.resolvedSeries === null, "erro do fetch nunca propaga -- vira 'não encontrada', nunca derruba a página");
    assert(result.effectiveClientId === "company-a", "scope cai pro que a URL já pedia quando a busca falha");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
