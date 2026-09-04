/**
 * Prompt 13 (REC OS Core Experience) — Fase 14/15/17: contexto temporal
 * do feed (o que veio antes / está sendo criado / vem depois).
 *
 * Auditoria confirmou: não existe hoje nenhum serviço de listagem de
 * mídia do Instagram (só insights agregados) nem uma entidade canônica
 * de Campaign/Calendar que este módulo possa consultar com segurança
 * nesta sprint. Por isso `published`/`planned` vêm sempre vazios com
 * `limitation` explícita -- NUNCA simulados como se fossem dado real
 * (Fase 17: "não fingir suporte perfeito... classificar como SIMULAÇÃO
 * DO FEED e documentar limitação"). `inCreation` é preenchido pelo
 * chamador (Studio já sabe o que está sendo gerado agora, na própria
 * sessão) -- este módulo só define o contrato e o texto de limitação.
 */

export type FeedTimelineItemStatus = "published" | "planned" | "in_creation" | "future_slot";

export interface FeedTimelineItem {
  id: string;
  status: FeedTimelineItemStatus;
  thumbnailUrl: string | null;
  label: string | null;
  occurredAt: string | null;
}

export interface FeedTemporalContext {
  published: FeedTimelineItem[];
  planned: FeedTimelineItem[];
  inCreation: FeedTimelineItem[];
  /** Fase 17 -- sempre presente quando published/planned não vêm de sincronização real. `null` só quando ambas as fontes forem reais no futuro. */
  limitation: string | null;
}

const NO_MEDIA_SYNC_LIMITATION =
  "SIMULAÇÃO DO FEED: publicações reais do Instagram e conteúdos planejados no calendário ainda não são sincronizados aqui -- esta prévia mostra apenas o que está sendo criado agora nesta sessão.";

/**
 * Monta o contexto temporal. `inCreation` vem do chamador (ex.: peças
 * de uma série em andamento no Studio) -- este resolver nunca inventa
 * published/planned quando a fonte real não está disponível.
 */
export function resolveFeedTemporalContext(inCreation: FeedTimelineItem[] = []): FeedTemporalContext {
  return {
    published: [],
    planned: [],
    inCreation,
    limitation: NO_MEDIA_SYNC_LIMITATION,
  };
}
