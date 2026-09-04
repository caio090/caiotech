/**
 * Prompt 13 (REC OS Core Experience) — Fase 13/31: Canonical Creative
 * Context. Único resolver que compõe Company DNA + Social Profile +
 * Feed DNA + (futuramente) Campaign/Recent/Planned/Slot pra alimentar
 * Studio, Criar e Feed Intelligence de forma consistente.
 *
 * REGRA CANÔNICA (Fase 13): compõe DINAMICAMENTE a partir das fontes
 * reais a cada chamada -- nunca copia pra uma tabela de snapshot. As
 * únicas coisas persistidas são as fontes em si (onboarding_profiles,
 * client_meta_assets, feed_dna_profiles), nunca este objeto composto.
 *
 * ESCOPO DESTA SPRINT: compõe Company DNA (via
 * buildStudioCreativeBusinessContext, já existente) + Social Profile +
 * Feed DNA. Strategic Living DNA (business-strategy/*, "Manual Vivo")
 * e Campaign/Recent Posts/Planned Posts/Slot ainda não têm um resolver
 * server-side equivalente auditado nesta sprint -- entram como `null`
 * explícito, nunca inventados, com um TODO apontando o próximo passo
 * (documentado como debt no relatório final, não fingido como pronto).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildStudioCreativeBusinessContext } from "../studio/business-context";
import type { StudioSkillBusinessContext } from "../studio/runtime";
import { resolveSocialProfileContext } from "./resolve";
import type { SocialProfileContext } from "./types";
import { resolveFeedDnaProfile } from "./feed-dna";
import type { ResolveFeedDnaResult } from "./feed-dna";

export interface CanonicalCreativeContext {
  companyId: string | null;
  companyDna: StudioSkillBusinessContext;
  /** TODO (débito documentado): integrar business-strategy/* (Strategic Living DNA / Manual Vivo) -- não auditado/wired nesta sprint. */
  strategicDna: null;
  socialProfile: SocialProfileContext | null;
  feedDna: ResolveFeedDnaResult | null;
  /** TODO (débito documentado): não existe entidade canônica de Campaign nesta base -- ver auditoria Fase 59. */
  campaign: null;
  /** TODO (débito documentado): depende do serviço de listagem de mídia do Instagram, ainda não implementado (Fase 15/40). */
  recentPosts: [];
  /** TODO (débito documentado): depende da integração com Calendar/content planning para status "planejado". */
  plannedPosts: [];
  slot: null;
}

export async function resolveCanonicalCreativeContext(
  db: SupabaseClient,
  companyId: string | null,
  companyName: string | null,
): Promise<CanonicalCreativeContext> {
  const [companyDna, socialProfile] = await Promise.all([
    buildStudioCreativeBusinessContext(db, companyId, companyName),
    resolveSocialProfileContext(db, companyId),
  ]);
  const feedDna = await resolveFeedDnaProfile(db, companyId);

  return {
    companyId,
    companyDna,
    strategicDna: null,
    socialProfile,
    feedDna,
    campaign: null,
    recentPosts: [],
    plannedPosts: [],
    slot: null,
  };
}
