/**
 * Prompt 22 (Series Server-Authoritative Hydration Repair) — P1 real de
 * Production: uma Série corretamente persistida (banco correto,
 * series_id correto na URL) desaparecia da UI quando o Company Context
 * terminava sua hidratação client-side. Root cause: a série era
 * resolvida inteiramente no CLIENTE (fetch assíncrono em
 * _series-panel.tsx) e um efeito separado, disparado por mudanças no
 * prop `clientId`, podia rodar de novo DEPOIS da série já ter
 * carregado -- se o `clientId` observado nesse segundo disparo não
 * batesse com o da série (mesmo que fosse só uma reafirmação tardia do
 * MESMO valor lógico), o efeito resetava a série (falso positivo de
 * "Company mudou").
 *
 * Correção arquitetural (Regra Final: "remova a race da arquitetura,
 * não tente vencê-la com mais efeitos"): quando existe `series_id` na
 * URL, o SERVIDOR (Server Component da página do Studio) resolve a
 * série e o Company efetivo NA MESMA passada síncrona, sob a sessão
 * real (RLS) -- nunca em dois momentos client-side que podem divergir.
 * `resolveSeriesAndScope` é essa decisão, extraída como função pura
 * (testável sem React/Next.js/Supabase reais) precisamente porque
 * "teste de fonte não é suficiente para fechar este P1" (a lição do
 * Prompt 20, cujo bug sobreviveu a testes só de inspeção de código).
 */
import type { CreativeSeriesWithItems } from "./repository";

export interface ResolveSeriesScopeInput {
  /** `?client=` da URL, antes de qualquer ajuste -- pode ser null (Free Mode ou ausente). */
  urlClientId: string | null;
  /** `?series_id=` da URL -- null quando nenhuma série explícita foi pedida. */
  urlSeriesId: string | null;
  /** Busca a série por ID -- SEMPRE já resolvida sob RLS/sessão real pelo chamador (nunca admin/service role aqui). Nunca lança (erros viram null). */
  fetchSeriesById: (seriesId: string) => Promise<CreativeSeriesWithItems | null>;
}

export interface ResolveSeriesScopeResult {
  /** Fase 13/14 -- Company efetiva pra o resto da página (Studio form, Feed DNA, Social Profile). Quando uma série válida é resolvida, ela SEMPRE define o Company efetivo -- nunca dois valores divergentes chegando ao client. */
  effectiveClientId: string | null;
  /** null = sem series_id na URL, OU série inexistente/não autorizada pra esta sessão (Fase 09 -- nunca revela qual dos dois). */
  resolvedSeries: CreativeSeriesWithItems | null;
}

/**
 * Pura o suficiente pra testar sem infraestrutura real: `fetchSeriesById`
 * é injetado pelo chamador (Server Component, usando o client Supabase
 * da sessão -- Fase 07: nunca admin/service role). Esta função só
 * decide O QUE FAZER com o resultado, nunca busca dado sozinha.
 */
export async function resolveSeriesAndScope(input: ResolveSeriesScopeInput): Promise<ResolveSeriesScopeResult> {
  if (!input.urlSeriesId) {
    return { effectiveClientId: input.urlClientId, resolvedSeries: null };
  }

  let candidate: CreativeSeriesWithItems | null;
  try {
    candidate = await input.fetchSeriesById(input.urlSeriesId);
  } catch {
    candidate = null;
  }

  if (!candidate) {
    // Fase 09 -- SERIES_NOT_FOUND_OR_FORBIDDEN: nunca revela qual dos
    // dois casos é. O Company efetivo cai pro que a URL já pedia
    // (Free Mode ou a Company explícita), nunca herda nada de uma
    // série que não pôde ser confirmada.
    return { effectiveClientId: input.urlClientId, resolvedSeries: null };
  }

  // Fase 13/14 -- série resolvida com sucesso (RLS já provou acesso
  // real) SEMPRE define o Company efetivo, mesmo que `?client=` na URL
  // apontasse pra outra Company (Fase 15 -- conflito real nunca deixa
  // dois valores brigando no client: o servidor decide UMA vez).
  return { effectiveClientId: candidate.series.clientId, resolvedSeries: candidate };
}
