/**
 * Sprint REC OS 3.0.1.1 (Fase 4/5) — busca real para o Roadmap de Produção.
 * Lê content_items (fonte principal), operational_tasks (responsável/prazo
 * operacional) e approvals (estado de aprovação mais recente) — nenhuma
 * tabela nova, nenhuma coluna nova. Mapeamento puro fica em
 * src/lib/rec-os-roadmap.ts (testável sem banco).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapContentRowToRoadmapItem,
  type RecOsRoadmapItem,
  type ContentItemRow,
  type TaskRow,
  type ApprovalRow,
} from "./rec-os-roadmap";

export async function getRoadmapItems(
  adminDb: SupabaseClient,
  { clientId }: { clientId: string | null },
): Promise<RecOsRoadmapItem[]> {
  let query = adminDb
    .from("content_items")
    .select("id, client_id, title, type, channel, status, scheduled_date, responsible_id, created_at, clients(company_name), profiles(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (clientId) query = query.eq("client_id", clientId);

  const { data: contentRows } = await query;
  const rows = (contentRows ?? []) as unknown as ContentItemRow[];
  if (rows.length === 0) return [];

  const contentIds = rows.map((r) => r.id);

  const [{ data: taskRows }, { data: approvalRows }] = await Promise.all([
    adminDb
      .from("operational_tasks")
      .select("content_item_id, assigned_to, due_date")
      .in("content_item_id", contentIds),
    adminDb
      .from("approvals")
      .select("content_id, status, created_at")
      .in("content_id", contentIds)
      .order("created_at", { ascending: false }),
  ]);

  const taskByContent = new Map<string, TaskRow>();
  for (const t of (taskRows ?? []) as TaskRow[]) {
    if (t.content_item_id && !taskByContent.has(t.content_item_id)) taskByContent.set(t.content_item_id, t);
  }
  const approvalByContent = new Map<string, ApprovalRow>();
  for (const a of (approvalRows ?? []) as ApprovalRow[]) {
    if (a.content_id && !approvalByContent.has(a.content_id)) approvalByContent.set(a.content_id, a);
  }

  return rows.map((row) =>
    mapContentRowToRoadmapItem(row, taskByContent.get(row.id) ?? null, approvalByContent.get(row.id) ?? null),
  );
}
