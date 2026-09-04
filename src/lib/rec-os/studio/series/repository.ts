/**
 * Prompt 16 (REC OS Persistence Completion) — Fase 18-23: camada única
 * de persistência de Série Visual. Nenhuma query Supabase espalhada em
 * componentes React -- todo acesso a `creative_series`/
 * `creative_series_items` passa por aqui.
 *
 * SEMPRE recebe um client Supabase já vinculado à SESSÃO do usuário
 * (nunca o admin/service role) -- as policies RLS destas duas tabelas
 * são avaliadas via auth.uid() real (can_access_client_company/
 * can_write_client_company para client_id preenchido, created_by =
 * auth.uid() pro Free Mode) -- ver Fase 53. Este módulo nunca decide
 * autorização sozinho; a rota chamadora resolve Company/usuário ANTES
 * (Fase 06), e RLS é a segunda camada real de proteção.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreativeSeriesItem, CreativeSeriesItemStatus, CreativeSeriesSize } from "./types";

export interface CreativeSeriesRow {
  id: string;
  clientId: string | null;
  contentId: string | null;
  campaignId: string | null;
  title: string | null;
  count: CreativeSeriesSize;
  placement: string | null;
  format: string | null;
  creativeDirection: string | null;
  status: "draft" | "generating" | "ready" | "error";
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreativeSeriesWithItems {
  series: CreativeSeriesRow;
  items: CreativeSeriesItem[];
}

interface DbSeriesRow {
  id: string; client_id: string | null; content_id: string | null; campaign_id: string | null;
  title: string | null; count: number; placement: string | null; format: string | null;
  creative_direction: string | null; status: string; created_by: string | null;
  created_at: string; updated_at: string;
}
interface DbItemRow {
  id: string; series_id: string; position: number; role: string | null; brief: string | null;
  headline: string | null; cta: string | null; status: string; visual_asset_id: string | null;
  generation_metadata: Record<string, unknown> | null;
}

function rowToSeries(row: DbSeriesRow): CreativeSeriesRow {
  return {
    id: row.id, clientId: row.client_id, contentId: row.content_id, campaignId: row.campaign_id,
    title: row.title, count: row.count as CreativeSeriesSize, placement: row.placement, format: row.format,
    creativeDirection: row.creative_direction, status: row.status as CreativeSeriesRow["status"],
    createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function itemImageFromMetadata(row: DbItemRow): { url: string; width: number; height: number } | null {
  const meta = row.generation_metadata as { assetUrl?: string; width?: number; height?: number } | null;
  if (!meta?.assetUrl) return null;
  return { url: meta.assetUrl, width: meta.width ?? 1080, height: meta.height ?? 1080 };
}

function rowToItem(row: DbItemRow): CreativeSeriesItem {
  return {
    id: row.id, position: row.position, role: row.role ?? `Peça ${row.position}`, brief: row.brief ?? "",
    headline: row.headline ?? undefined, cta: row.cta ?? undefined,
    status: row.status as CreativeSeriesItemStatus,
    image: itemImageFromMetadata(row),
    error: (row.generation_metadata as { error?: string } | null)?.error ?? null,
  };
}

export interface CreateSeriesInput {
  clientId: string | null;
  contentId: string | null;
  campaignId: string | null;
  title: string | null;
  count: CreativeSeriesSize;
  placement: string | null;
  format: string | null;
  creativeDirection: string | null;
  createdBy: string;
  itemBriefs: { position: number; role: string; brief: string }[];
}

export type CreateSeriesResult = { ok: true; series: CreativeSeriesWithItems } | { ok: false; error: string };

/**
 * Fase 20/21 -- N peças = N rows reais em creative_series_items, nunca
 * uma única linha com JSON de N imagens. Fase 20 (atomicidade lógica):
 * se o insert dos items falhar depois do insert da série, o
 * compensating rollback apaga a série órfã (nenhuma RPC nova criada --
 * dois inserts sequenciais + delete de compensação, mesmo padrão já
 * usado em outros pontos do projeto quando não há transação real
 * disponível via PostgREST).
 */
export async function createCreativeSeries(db: SupabaseClient, input: CreateSeriesInput): Promise<CreateSeriesResult> {
  const { data: seriesRow, error: seriesError } = await db
    .from("creative_series")
    .insert({
      client_id: input.clientId, content_id: input.contentId, campaign_id: input.campaignId,
      title: input.title, count: input.count, placement: input.placement, format: input.format,
      creative_direction: input.creativeDirection, status: "draft", created_by: input.createdBy,
    })
    .select("*")
    .single();

  if (seriesError || !seriesRow) {
    return { ok: false, error: "Não foi possível criar a série agora." };
  }

  const itemsPayload = input.itemBriefs.map((b) => ({
    series_id: seriesRow.id, position: b.position, role: b.role, brief: b.brief, status: "planned",
  }));
  const { data: itemRows, error: itemsError } = await db
    .from("creative_series_items")
    .insert(itemsPayload)
    .select("*");

  if (itemsError || !itemRows || itemRows.length !== input.itemBriefs.length) {
    // Compensating rollback -- nunca deixa uma série órfã sem items.
    await db.from("creative_series").delete().eq("id", seriesRow.id);
    return { ok: false, error: "Não foi possível criar os itens da série agora." };
  }

  return {
    ok: true,
    series: {
      series: rowToSeries(seriesRow as DbSeriesRow),
      items: (itemRows as DbItemRow[]).sort((a, b) => a.position - b.position).map(rowToItem),
    },
  };
}

export async function getCreativeSeriesWithItems(db: SupabaseClient, seriesId: string): Promise<CreativeSeriesWithItems | null> {
  const { data: seriesRow, error: seriesError } = await db.from("creative_series").select("*").eq("id", seriesId).maybeSingle();
  if (seriesError || !seriesRow) return null;
  const { data: itemRows, error: itemsError } = await db.from("creative_series_items").select("*").eq("series_id", seriesId).order("position", { ascending: true });
  if (itemsError) return null;
  return { series: rowToSeries(seriesRow as DbSeriesRow), items: ((itemRows ?? []) as DbItemRow[]).map(rowToItem) };
}

/** Fase 25/26 -- série mais recente pro contexto (client/content), pra permitir "continuar" em vez de recomeçar a cada mount. */
export async function findRecentCreativeSeries(db: SupabaseClient, filter: { clientId: string | null; contentId: string | null }): Promise<CreativeSeriesWithItems | null> {
  let query = db.from("creative_series").select("*").order("created_at", { ascending: false }).limit(1);
  query = filter.contentId ? query.eq("content_id", filter.contentId) : query.is("content_id", null);
  query = filter.clientId ? query.eq("client_id", filter.clientId) : query.is("client_id", null);
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return getCreativeSeriesWithItems(db, (data as DbSeriesRow).id);
}

export interface UpdateSeriesItemInput {
  status: CreativeSeriesItemStatus;
  assetUrl?: string | null;
  width?: number;
  height?: number;
  error?: string | null;
  assetPersisted?: boolean;
}

/** Fase 23/27/29/30 -- transição de status de UM item, nunca recria a série nem os demais items. Nunca base64 gravado aqui -- só a URL/ref final (Fase 34). */
export async function updateCreativeSeriesItem(db: SupabaseClient, itemId: string, input: UpdateSeriesItemInput): Promise<boolean> {
  const generationMetadata: Record<string, unknown> = {};
  if (input.assetUrl) { generationMetadata.assetUrl = input.assetUrl; generationMetadata.width = input.width; generationMetadata.height = input.height; generationMetadata.persisted = input.assetPersisted ?? false; }
  if (input.error) generationMetadata.error = input.error;

  const { error } = await db.from("creative_series_items").update({
    status: input.status,
    generation_metadata: Object.keys(generationMetadata).length > 0 ? generationMetadata : null,
  }).eq("id", itemId);
  return !error;
}

/** Recalcula o status agregado da série a partir dos items -- nunca um segundo "source of truth" divergente. */
export async function recomputeSeriesStatus(db: SupabaseClient, seriesId: string): Promise<void> {
  const { data: items } = await db.from("creative_series_items").select("status").eq("series_id", seriesId);
  const statuses = ((items ?? []) as { status: string }[]).map((i) => i.status);
  if (statuses.length === 0) return;
  const terminal = new Set(["ready", "error", "canceled"]);
  const allTerminal = statuses.every((s) => terminal.has(s));
  const anyError = statuses.some((s) => s === "error");
  const nextStatus = !allTerminal ? "generating" : anyError ? "error" : "ready";
  await db.from("creative_series").update({ status: nextStatus }).eq("id", seriesId);
}
