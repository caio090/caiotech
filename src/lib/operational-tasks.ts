/**
 * Central helper for operational task fetching.
 * ALL operacional pages must use these functions — do not duplicate query logic.
 *
 * Key fix: use "profiles!assigned_to(name)" instead of "profiles(name)" to
 * resolve the ambiguous FK (operational_tasks has two FKs to profiles:
 * assigned_to AND created_by — PostgREST errors without the explicit hint).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbOperationalTask } from "@/lib/supabase/types";
import { ROLE_DEPARTMENT_FILTER, formatRoleDisplay } from "@/lib/access-control";

// ── User context ──────────────────────────────────────────────

export interface OpUserCtx {
  userId:      string;
  primaryRole: string;
  extraRoles:  string[];
  allRoles:    string[];
  roleDisplay: string;
}

// ── Status normalization ──────────────────────────────────────

const LEGACY_STATUS_MAP: Record<string, string> = {
  draft:       "briefing",
  pending:     "briefing",
  in_progress: "em_producao",
  review:      "revisao_interna",
  done:        "concluido",
};

export function normalizeStatus(s: string): string {
  return LEGACY_STATUS_MAP[s] ?? s;
}

// ── Status labels (canonical) ─────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  backlog:           "Backlog",
  briefing:          "Briefing",
  em_producao:       "Em Produção",
  revisao_interna:   "Revisão Interna",
  ajuste:            "Ajustes",
  aguardando_cliente:"Aguardando Cliente",
  aprovado:          "Aprovado",
  agendado:          "Agendado",
  publicado:         "Publicado",
  concluido:         "Concluído",
  cancelado:         "Cancelado",
};

export const ACTIVE_STATUS_EXCLUDE = '("concluido","cancelado","publicado")';

// ── Fetch user context ────────────────────────────────────────

export async function getOpUserCtx(supabase: SupabaseClient): Promise<OpUserCtx | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const primaryRole = profile?.role ?? "operacional";

  let extraRoles: string[] = [];
  try {
    const { data: rolesData } = await supabase
      .from("profile_roles")
      .select("role")
      .eq("user_id", user.id);
    extraRoles = (rolesData ?? [])
      .map((r: { role: string }) => r.role)
      .filter((r: string) => r !== primaryRole);
  } catch {}

  return {
    userId:      user.id,
    primaryRole,
    extraRoles,
    allRoles:    [primaryRole, ...extraRoles],
    roleDisplay: formatRoleDisplay(primaryRole, extraRoles),
  };
}

// ── Build PostgREST OR filter ─────────────────────────────────

export function buildOpOrFilter(ctx: OpUserCtx): string[] {
  const conds: string[] = [`assigned_to.eq.${ctx.userId}`];
  for (const role of ctx.allRoles) {
    if (role === "admin") break;
    conds.push(`assigned_role.eq.${role}`);
    for (const dept of (ROLE_DEPARTMENT_FILTER[role] ?? [])) {
      conds.push(`department.eq.${dept}`);
    }
  }
  return conds;
}

// ── Main fetch function ───────────────────────────────────────

export async function fetchOpTasks(
  supabase: SupabaseClient,
  ctx: OpUserCtx,
  opts: {
    includeDone?:  boolean;
    statusFilter?: string | null;
    limit?:        number;
    orderBy?:      "due_date" | "created_at";
  } = {},
): Promise<DbOperationalTask[]> {
  const {
    includeDone  = false,
    statusFilter = null,
    limit        = 200,
    orderBy      = "due_date",
  } = opts;

  // IMPORTANT: "profiles!assigned_to" resolves the FK ambiguity.
  // Without this hint PostgREST throws an error and data = null.
  let q = supabase
    .from("operational_tasks")
    .select("*, clients(company_name), profiles!assigned_to(name)")
    .order(orderBy, { ascending: true, nullsFirst: false })
    .limit(limit);

  if (!includeDone)  q = q.not("status", "in", ACTIVE_STATUS_EXCLUDE);
  if (statusFilter)  q = q.eq("status", statusFilter);

  if (ctx.primaryRole !== "admin") {
    q = q.or(buildOpOrFilter(ctx).join(","));
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[op-tasks] userId:", ctx.userId);
    console.log("[op-tasks] roles:", ctx.allRoles.join(" + "));
    console.log("[op-tasks] filter:", ctx.primaryRole === "admin"
      ? "admin → all tasks"
      : buildOpOrFilter(ctx).join(","),
    );
  }

  const { data, error } = await q;

  if (process.env.NODE_ENV === "development") {
    if (error) console.error("[op-tasks] ERROR:", error.code, "-", error.message);
    else       console.log("[op-tasks] tasks returned:", data?.length ?? 0);
  }

  if (error || !data) return [];

  return data.map((t) => ({
    ...t,
    status: normalizeStatus(t.status),
  })) as DbOperationalTask[];
}

// ── Utility helpers ───────────────────────────────────────────

export function isTaskOverdue(due: string | null): boolean {
  if (!due) return false;
  const d = new Date(due + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export function fmtTaskDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return "—";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((dt.getTime() - today.getTime()) / 86400000);
  if (diff < 0)   return `${Math.abs(diff)}d em atraso`;
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
