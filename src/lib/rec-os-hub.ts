/**
 * REC OS Global Hub — read-only aggregation model (Sprint 4.0A-preview).
 *
 * Normalizes content_items (+ approvals for due dates) into the card counts,
 * attention list and per-client summary shown at /admin/contentos. No
 * Supabase calls here — pure functions over already-fetched rows, same
 * pattern as src/lib/global-calendar.ts (Sprint 3.1A).
 *
 * Status vocabulary is NOT the clean canonical list originally proposed —
 * it's the real content_items.status values observed in
 * src/app/admin/contentos/{producao,resultados}/page.tsx, including legacy
 * aliases ("em_producao" alongside "producao", "ajuste" alongside
 * "alteracao_solicitada") and an extra intermediate state
 * ("pronto_para_agendar") not in the original canonical list.
 */

import type { ContentItemRow, ApprovalRow, ClientNameLookup } from "./global-calendar";

export type HubCardId =
  | "aguardando_aprovacao"
  | "em_producao"
  | "em_revisao"
  | "alteracoes_solicitadas"
  | "agendados"
  | "publicados"
  | "em_andamento"
  | "clientes_com_pendencias";

export interface HubCardSpec {
  id: HubCardId;
  title: string;
  hint: string;
}

export const HUB_CARDS: HubCardSpec[] = [
  { id: "aguardando_aprovacao",    title: "Aguardando aprovação",    hint: "Enviado para o cliente aprovar" },
  { id: "em_producao",             title: "Em produção",             hint: "Em produção ou edição" },
  { id: "em_revisao",              title: "Em revisão",              hint: "Em revisão interna" },
  { id: "alteracoes_solicitadas",  title: "Alterações solicitadas",  hint: "Cliente pediu ajuste" },
  { id: "agendados",               title: "Agendados",               hint: "Com data de publicação marcada" },
  { id: "publicados",              title: "Publicados (30 dias)",    hint: "Publicados nos últimos 30 dias" },
  { id: "em_andamento",            title: "Conteúdos em andamento",  hint: "Da ideia até aprovado, exceto publicado" },
  { id: "clientes_com_pendencias", title: "Clientes com pendências", hint: "Têm algo aguardando ação agora" },
];

// ── Status bucketing (real vocabulary, not invented) ────────────────────────

const AGUARDANDO_APROVACAO = new Set(["enviado_aprovacao"]);
const EM_PRODUCAO          = new Set(["producao", "em_producao", "edicao"]);
const EM_REVISAO           = new Set(["revisao_interna"]);
const ALTERACOES           = new Set(["alteracao_solicitada", "ajuste"]);
const AGENDADOS            = new Set(["agendado"]);
const PUBLICADOS           = new Set(["publicado"]);
/** "Em andamento" = tudo entre ideia e aprovado/pronto_para_agendar, exceto publicado/agendado. */
const EM_ANDAMENTO_EXCLUDE = new Set(["publicado", "agendado"]);

export type StatusBucket = Exclude<HubCardId, "em_andamento" | "clientes_com_pendencias">;

export function bucketContentStatus(status: string): StatusBucket | null {
  if (AGUARDANDO_APROVACAO.has(status)) return "aguardando_aprovacao";
  if (EM_PRODUCAO.has(status))          return "em_producao";
  if (EM_REVISAO.has(status))           return "em_revisao";
  if (ALTERACOES.has(status))           return "alteracoes_solicitadas";
  if (AGENDADOS.has(status))            return "agendados";
  if (PUBLICADOS.has(status))           return "publicados";
  return null; // ideia, briefing, roteiro, aprovado, pronto_para_agendar — no card of their own
}

export interface HubCounts extends Record<StatusBucket, number> {
  em_andamento: number;
}

export function emptyHubCounts(): HubCounts {
  return {
    aguardando_aprovacao: 0, em_producao: 0, em_revisao: 0,
    alteracoes_solicitadas: 0, agendados: 0, publicados: 0, em_andamento: 0,
  };
}

/** publishedWithinDays: only "publicado" rows whose scheduled date falls in the window count toward "publicados". */
export function computeHubCounts(items: ContentItemRow[], today: Date, publishedWithinDays = 30): HubCounts {
  const counts = emptyHubCounts();
  const cutoff = new Date(today.getTime() - publishedWithinDays * 86_400_000);

  for (const item of items) {
    if (!EM_ANDAMENTO_EXCLUDE.has(item.status)) counts.em_andamento++;

    const bucket = bucketContentStatus(item.status);
    if (!bucket) continue;

    if (bucket === "publicados") {
      const when = item.scheduled_at ?? item.scheduled_date;
      if (when && new Date(when) >= cutoff) counts.publicados++;
      continue;
    }
    counts[bucket]++;
  }
  return counts;
}

// ── Per-client summary ───────────────────────────────────────────────────────

export interface ClientSummaryRow {
  client_id: string;
  client_name: string;
  aguardando_aprovacao: number;
  em_producao: number;
  alteracoes_solicitadas: number;
  agendados: number;
  em_andamento: number;
}

export function computeClientSummaries(
  items: ContentItemRow[],
  clientNames: ClientNameLookup
): ClientSummaryRow[] {
  const byClient = new Map<string, ClientSummaryRow>();

  for (const item of items) {
    const name = clientNames.get(item.client_id);
    if (!name) continue; // client not in the visible/authorized list — never surface it

    let row = byClient.get(item.client_id);
    if (!row) {
      row = {
        client_id: item.client_id, client_name: name,
        aguardando_aprovacao: 0, em_producao: 0, alteracoes_solicitadas: 0,
        agendados: 0, em_andamento: 0,
      };
      byClient.set(item.client_id, row);
    }

    if (!EM_ANDAMENTO_EXCLUDE.has(item.status)) row.em_andamento++;
    const bucket = bucketContentStatus(item.status);
    if (bucket === "aguardando_aprovacao")   row.aguardando_aprovacao++;
    if (bucket === "em_producao")            row.em_producao++;
    if (bucket === "alteracoes_solicitadas") row.alteracoes_solicitadas++;
    if (bucket === "agendados")              row.agendados++;
  }

  return Array.from(byClient.values()).sort((a, b) => a.client_name.localeCompare(b.client_name, "pt-BR"));
}

/** "Clientes com pendências" = has at least one item aguardando aprovação or com alteração solicitada. */
export function countClientsWithPendencies(summaries: ClientSummaryRow[]): number {
  return summaries.filter((s) => s.aguardando_aprovacao > 0 || s.alteracoes_solicitadas > 0).length;
}

// ── "Precisa da sua atenção" ─────────────────────────────────────────────────

export type AttentionReason = "aguardando_aprovacao" | "alteracao_solicitada" | "revisao_interna";

export interface AttentionItem {
  key: string;
  client_id: string;
  client_name: string | null;
  title: string;
  status: string;
  reason: AttentionReason;
  relevant_date: string | null; // real date column only — never computed/invented
  href: string;
}

const ATTENTION_STATUS_REASON: Record<string, AttentionReason> = {
  enviado_aprovacao:    "aguardando_aprovacao",
  alteracao_solicitada: "alteracao_solicitada",
  ajuste:               "alteracao_solicitada",
  revisao_interna:      "revisao_interna",
};

export function buildContentItemHref(clientId: string, contentId: string): string {
  return `/admin/contentos/criar?client=${encodeURIComponent(clientId)}&content_id=${encodeURIComponent(contentId)}`;
}

export function buildAttentionList(
  items: ContentItemRow[],
  clientNames: ClientNameLookup,
  limit = 20
): AttentionItem[] {
  const out: AttentionItem[] = [];
  for (const item of items) {
    const reason = ATTENTION_STATUS_REASON[item.status];
    if (!reason) continue;
    out.push({
      key: item.id,
      client_id: item.client_id,
      client_name: clientNames.get(item.client_id) ?? null,
      title: item.title?.trim() || "Conteúdo sem título",
      status: item.status,
      reason,
      relevant_date: item.scheduled_at ?? item.scheduled_date ?? null,
      href: buildContentItemHref(item.client_id, item.id),
    });
  }
  // Most urgent first: has a real date and it's soonest; undated items go last.
  out.sort((a, b) => {
    if (a.relevant_date && b.relevant_date) return a.relevant_date.localeCompare(b.relevant_date);
    if (a.relevant_date) return -1;
    if (b.relevant_date) return 1;
    return 0;
  });
  return out.slice(0, limit);
}

/** Approvals carry their own due date (approval_due_at) which content_items doesn't always have — used only to enrich, never to invent a date content_items lacks. */
export function approvalDueDates(approvals: ApprovalRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const a of approvals) {
    const due = a.approval_due_at ?? a.approval_sent_at ?? a.created_at;
    if (a.content_id && due) map.set(a.content_id, due);
  }
  return map;
}

// ── Hrefs for cards (Fase 7) ─────────────────────────────────────────────────

export type HubClientFilter = string | null; // null = "todos os clientes"

/**
 * Sprint 4.0A.1 fix: "Aguardando aprovação" must never point at the
 * Calendar (P1 reported against the previous version of this file). Every
 * card goes to its real page, with a `status` query param added as minimal
 * URL support (see producao/page.tsx and aprovacoes/page.tsx, which read it
 * to pre-filter/pre-select a tab).
 *
 * Fase 11 do hotfix canônico 1.0.1: antes, sem cliente selecionado
 * ("todos os clientes"), a maioria dos cards caía no Calendário Global como
 * substituto, porque producao/aprovacoes/resultados ainda redirecionavam ao
 * seletor sem `client`. A Fase 6 desta mesma sprint deu a essas três rotas
 * um modo global de verdade (nunca redirecionam mais), então os cards agora
 * apontam sempre para a página real, com ou sem cliente — `client` só é
 * incluído na query quando presente. "Conteúdos em andamento" foi corrigido
 * para Produção (antes ia para Resultados, que só tem agregados, não uma
 * lista) — sem filtro de status, porque o conjunto "em andamento" (tudo
 * entre ideia e aprovado, exceto publicado) é mais amplo que qualquer filtro
 * único que Produção aceita hoje; a contagem do card é sempre um teto do que
 * será visto ali, nunca um número fabricado que a página não sustente.
 */
export function buildCardHref(cardId: HubCardId, client: HubClientFilter): string {
  const c = client ? `client=${client}` : "";
  const join = (base: string, ...params: string[]) => {
    const qs = params.filter(Boolean).join("&");
    return qs ? `${base}?${qs}` : base;
  };

  switch (cardId) {
    case "aguardando_aprovacao":   return join("/admin/contentos/aprovacoes", c, "status=enviado_aprovacao");
    case "em_producao":            return join("/admin/contentos/producao", c, "status=producao,em_producao,edicao");
    case "em_revisao":             return join("/admin/contentos/producao", c, "status=revisao_interna");
    case "alteracoes_solicitadas": return join("/admin/contentos/producao", c, "status=alteracao_solicitada,ajuste");
    case "agendados":              return join("/admin/calendario", c, "source=content_item");
    case "publicados":             return join("/admin/contentos/resultados", c);
    case "em_andamento":           return join("/admin/contentos/producao", c);
    case "clientes_com_pendencias": return client
      ? `/admin/contentos?client=${client}#precisa-da-sua-atencao`
      : "/admin/contentos#resumo-por-cliente";
  }
}

export function buildClientFilterHref(clientId: string | null): string {
  return clientId ? `/admin/contentos?client=${clientId}` : "/admin/contentos";
}
