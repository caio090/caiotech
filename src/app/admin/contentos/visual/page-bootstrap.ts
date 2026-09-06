/**
 * Prompt 22 (Series Server-Authoritative Hydration Repair) — lógica de
 * bootstrap da página do Studio extraída de page.tsx (JSX) pra um
 * módulo `.ts` puro. Motivo: o harness de teste deste projeto
 * (node:test + loader TS customizado) nunca registrou transformação
 * pra `.tsx`/JSX -- todo teste de componente React nesta base sempre
 * inspecionou fonte como texto. Pra ESTE P1 especificamente, "teste de
 * fonte não é suficiente" (a lição do Prompt 20/21) -- então a decisão
 * real (que series_id resolve, qual clientId fica efetivo) mora aqui,
 * num módulo 100% importável/testável sem JSX, e page.tsx vira só um
 * wrapper fino que chama esta função e renderiza o resultado.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSeriesAndScope } from "@/lib/rec-os/studio/series/scope-resolution";
import { getCreativeSeriesWithItems } from "@/lib/rec-os/studio/series/repository";
import type { CreativeSeriesWithItems } from "@/lib/rec-os/studio/series/repository";

export interface StudioPageBootstrapParams {
  client?: string;
  series_id?: string;
}

export interface StudioPageBootstrapResult {
  clientId: string | null;
  resolvedSeries: CreativeSeriesWithItems | null;
}

/**
 * Única função que decide o `clientId` efetivo e a série inicial da
 * página -- SEMPRE na mesma passada síncrona, sob o client Supabase da
 * SESSÃO (RLS real, nunca admin/service role). Ver
 * scope-resolution.ts para a decisão pura em si (já testada
 * exaustivamente); esta função só faz a ponte com o Supabase real.
 */
export async function resolveStudioPageBootstrap(db: SupabaseClient, params: StudioPageBootstrapParams): Promise<StudioPageBootstrapResult> {
  const { effectiveClientId, resolvedSeries } = await resolveSeriesAndScope({
    urlClientId: params.client ?? null,
    urlSeriesId: params.series_id ?? null,
    fetchSeriesById: (seriesId) => getCreativeSeriesWithItems(db, seriesId),
  });
  return { clientId: effectiveClientId, resolvedSeries };
}
