// Server-side rule-based suggestion engine — no real AI, no external APIs.
// Functions accept a pre-resolved Supabase client to avoid circular imports.

export type SuggestionType =
  | "next_action" | "risk_alert" | "opportunity" | "reminder"
  | "optimization" | "content_idea" | "workflow" | "financial"
  | "commercial" | "production" | "report_insight" | "productivity" | "voice_prompt";

export type Priority = "baixa" | "media" | "alta" | "urgente";

export interface AISuggestion {
  id: string;
  module: string;
  entity_type?: string | null;
  entity_id?: string | null;
  client_id?: string | null;
  title: string;
  description: string;
  suggestion_type: SuggestionType;
  priority: Priority;
  source?: string | null;
  action_label?: string | null;
  action_url?: string | null;
}

function makeId(parts: string[]): string {
  return parts.join("-").replace(/[^a-z0-9-]/gi, "").slice(0, 60);
}

const NOW = Date.now();
const MS_48H = 48 * 60 * 60 * 1000;
const MS_7D  =  7 * 24 * 60 * 60 * 1000;

// ── ContentOS suggestions for one client ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getContentOSSuggestions(supabase: any, clientId: string): Promise<AISuggestion[]> {
  const results: AISuggestion[] = [];
  try {
    const [approvalsRes, contentsRes, scheduledRes] = await Promise.all([
      supabase.from("approvals")
        .select("id, status, created_at, content_items(title)")
        .eq("client_id", clientId)
        .eq("status", "aguardando")
        .order("created_at", { ascending: true }),
      supabase.from("content_items")
        .select("id, title, status, type")
        .eq("client_id", clientId)
        .in("status", ["pronto_para_agendar", "aprovado"]),
      supabase.from("content_items")
        .select("id, scheduled_date")
        .eq("client_id", clientId)
        .eq("status", "agendado")
        .gte("scheduled_date", new Date().toISOString().split("T")[0])
        .lte("scheduled_date", new Date(NOW + MS_7D).toISOString().split("T")[0]),
    ]);

    // Late approvals (>48h waiting)
    for (const appr of (approvalsRes.data ?? [])) {
      const age = NOW - new Date(appr.created_at).getTime();
      if (age > MS_48H) {
        const title = appr.content_items?.title ?? "Conteúdo";
        results.push({
          id:              makeId(["ct-appr-late", appr.id]),
          module:          "contentos",
          entity_type:     "approval",
          entity_id:       appr.id,
          client_id:       clientId,
          title:           "Aprovação atrasada",
          description:     `"${title}" está aguardando resposta do cliente há mais de 48h.`,
          suggestion_type: "risk_alert",
          priority:        age > MS_48H * 2 ? "urgente" : "alta",
          source:          "Regra: aprovação > 48h",
          action_label:    "Ver aprovação",
          action_url:      `/admin/contentos/aprovacoes?client=${clientId}&approval=${appr.id}`,
        });
      }
    }

    // Content ready to schedule
    const readyItems = (contentsRes.data ?? []).filter((c: { status: string }) => c.status === "pronto_para_agendar");
    if (readyItems.length > 0) {
      results.push({
        id:              makeId(["ct-ready", clientId, String(readyItems.length)]),
        module:          "contentos",
        entity_type:     "content_item",
        client_id:       clientId,
        title:           "Conteúdo pronto para agendar",
        description:     `${readyItems.length} conteúdo${readyItems.length > 1 ? "s" : ""} finalizado${readyItems.length > 1 ? "s" : ""} pela produção aguardando agendamento.`,
        suggestion_type: "next_action",
        priority:        "alta",
        source:          "Regra: status pronto_para_agendar",
        action_label:    "Ver calendário",
        action_url:      `/admin/contentos/calendario?client=${clientId}`,
      });
    }

    // No content scheduled next 7 days
    const scheduledCount = (scheduledRes.data ?? []).length;
    if (scheduledCount === 0) {
      results.push({
        id:              makeId(["ct-nosched", clientId]),
        module:          "contentos",
        client_id:       clientId,
        title:           "Cliente sem conteúdo agendado",
        description:     "Este cliente não possui publicações agendadas para a próxima semana.",
        suggestion_type: "reminder",
        priority:        "media",
        source:          "Regra: sem agendamento nos próximos 7 dias",
        action_label:    "Abrir calendário",
        action_url:      `/admin/contentos/calendario?client=${clientId}`,
      });
    }

    // Approved content that could go to paid traffic
    const approvedItems = (contentsRes.data ?? []).filter((c: { status: string }) => c.status === "aprovado");
    if (approvedItems.length > 0) {
      results.push({
        id:              makeId(["ct-traffic", clientId, String(approvedItems.length)]),
        module:          "contentos",
        entity_type:     "content_item",
        client_id:       clientId,
        title:           "Possível reforço de tráfego",
        description:     `${approvedItems.length} conteúdo${approvedItems.length > 1 ? "s aprovados" : " aprovado"} com potencial de distribuição paga.`,
        suggestion_type: "opportunity",
        priority:        "baixa",
        source:          "Regra: status aprovado",
        action_label:    "Ver distribuição",
        action_url:      `/admin/contentos/distribuicao?client=${clientId}`,
      });
    }
  } catch {}
  return results;
}

// ── Admin general suggestions ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAdminSuggestions(supabase: any): Promise<AISuggestion[]> {
  const results: AISuggestion[] = [];
  try {
    const [approvalsRes, tasksRes, leadsRes] = await Promise.all([
      supabase.from("approvals")
        .select("id, client_id, created_at, content_items(title)")
        .eq("status", "aguardando")
        .order("created_at", { ascending: true })
        .limit(20),
      supabase.from("operational_tasks")
        .select("id, title, due_date, status, priority")
        .not("status", "eq", "concluido")
        .not("due_date", "is", null)
        .lte("due_date", new Date().toISOString().split("T")[0])
        .limit(10),
      supabase.from("leads")
        .select("id, name, next_action_at, stage")
        .not("next_action_at", "is", null)
        .lt("next_action_at", new Date().toISOString())
        .in("stage", ["qualificado", "proposta", "negociacao"])
        .limit(5),
    ]);

    // Late approvals
    const lateApprovals = (approvalsRes.data ?? []).filter(
      (a: { created_at: string }) => NOW - new Date(a.created_at).getTime() > MS_48H,
    );
    if (lateApprovals.length > 0) {
      results.push({
        id:              makeId(["admin-appr-late", String(lateApprovals.length)]),
        module:          "admin",
        title:           `${lateApprovals.length} aprovação${lateApprovals.length > 1 ? "ões" : ""} travada${lateApprovals.length > 1 ? "s" : ""}`,
        description:     `${lateApprovals.length} conteúdo${lateApprovals.length > 1 ? "s estão" : " está"} aguardando resposta do cliente há mais de 48h.`,
        suggestion_type: "risk_alert",
        priority:        "urgente",
        source:          "Regra: aprovação > 48h",
        action_label:    "Ver ContentOS",
        action_url:      "/admin/contentos",
      });
    }

    // Overdue tasks
    if ((tasksRes.data ?? []).length > 0) {
      const count = tasksRes.data!.length;
      results.push({
        id:              makeId(["admin-tasks-overdue", String(count)]),
        module:          "admin",
        title:           `${count} tarefa${count > 1 ? "s" : ""} atrasada${count > 1 ? "s" : ""}`,
        description:     `${count} tarefa${count > 1 ? "s operacionais estão" : " operacional está"} com prazo vencido.`,
        suggestion_type: "risk_alert",
        priority:        "alta",
        source:          "Regra: due_date < hoje",
        action_label:    "Ver kanban",
        action_url:      "/admin/operacional/kanban",
      });
    }

    // Overdue commercial follow-ups
    if ((leadsRes.data ?? []).length > 0) {
      const count = leadsRes.data!.length;
      results.push({
        id:              makeId(["admin-leads-late", String(count)]),
        module:          "admin",
        title:           `${count} follow-up${count > 1 ? "s" : ""} em atraso`,
        description:     `${count} lead${count > 1 ? "s" : ""} em etapa avançada com ação comercial pendente.`,
        suggestion_type: "commercial",
        priority:        "alta",
        source:          "Regra: next_action_at < agora",
        action_label:    "Ver leads",
        action_url:      "/admin/leads",
      });
    }
  } catch {}
  return results;
}

// ── Operational suggestions ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getOperationalSuggestions(supabase: any, userId: string, roles: string[]): Promise<AISuggestion[]> {
  const results: AISuggestion[] = [];
  const primaryRole = roles[0] ?? "operacional";
  try {
    const today   = new Date().toISOString().split("T")[0];
    const orFilter = `assigned_to.eq.${userId},assigned_role.in.(${roles.join(",")})`;

    const [overdueRes, todayRes, briefingRes] = await Promise.all([
      supabase.from("operational_tasks")
        .select("id, title, due_date, status")
        .or(orFilter)
        .not("status", "eq", "concluido")
        .not("due_date", "is", null)
        .lt("due_date", today)
        .limit(10),
      supabase.from("operational_tasks")
        .select("id, title, due_date, status")
        .or(orFilter)
        .not("status", "eq", "concluido")
        .eq("due_date", today)
        .limit(5),
      supabase.from("operational_tasks")
        .select("id, title, status, created_at")
        .or(orFilter)
        .eq("status", "briefing")
        .lt("created_at", new Date(NOW - MS_48H).toISOString())
        .limit(5),
    ]);

    if ((overdueRes.data ?? []).length > 0) {
      const count = overdueRes.data!.length;
      results.push({
        id:              makeId(["op-overdue", userId, String(count)]),
        module:          "operacional",
        entity_type:     "operational_task",
        title:           `${count} tarefa${count > 1 ? "s" : ""} atrasada${count > 1 ? "s" : ""}`,
        description:     `Você tem ${count} tarefa${count > 1 ? "s" : ""} com prazo vencido.`,
        suggestion_type: "risk_alert",
        priority:        "urgente",
        source:          "Regra: due_date < hoje",
        action_label:    "Ver kanban",
        action_url:      "/operacional/kanban",
      });
    }

    if ((todayRes.data ?? []).length > 0) {
      const count = todayRes.data!.length;
      results.push({
        id:              makeId(["op-today", userId, String(count)]),
        module:          "operacional",
        title:           `${count} tarefa${count > 1 ? "s" : ""} vence${count > 1 ? "m" : ""} hoje`,
        description:     `Atenção: ${count} tarefa${count > 1 ? "s" : ""} com prazo para hoje.`,
        suggestion_type: "reminder",
        priority:        "alta",
        source:          "Regra: due_date = hoje",
        action_label:    "Ver tarefas",
        action_url:      "/operacional/minhas-tarefas",
      });
    }

    if ((briefingRes.data ?? []).length > 0) {
      const count = briefingRes.data!.length;
      results.push({
        id:              makeId(["op-briefing-stuck", userId, String(count)]),
        module:          "operacional",
        title:           "Briefing precisa de atenção",
        description:     `${count} tarefa${count > 1 ? "s estão" : " está"} parada${count > 1 ? "s" : ""} em briefing há mais de 48h.`,
        suggestion_type: "workflow",
        priority:        "media",
        source:          "Regra: status briefing > 48h",
        action_label:    "Ver briefings",
        action_url:      "/operacional/briefings",
      });
    }

    // ── Role-specific suggestions ─────────────────────────────────────────────

    if (primaryRole === "designer" || primaryRole === "videomaker") {
      const { data: prodTasks } = await supabase.from("operational_tasks")
        .select("id", { count: "exact", head: false })
        .or(orFilter)
        .eq("status", "em_producao")
        .limit(10);
      if ((prodTasks ?? []).length > 0) {
        results.push({
          id:              makeId(["op-role-deliver", userId, primaryRole]),
          module:          "operacional",
          title:           "Registre seu entregável",
          description:     `Você tem ${prodTasks!.length} tarefa${prodTasks!.length > 1 ? "s" : ""} em produção. Lembre-se de anexar o link do arquivo antes de enviar para revisão.`,
          suggestion_type: "next_action",
          priority:        "media",
          source:          `Setor: ${primaryRole}`,
          action_label:    "Ver tarefas",
          action_url:      "/operacional/minhas-tarefas",
        });
      }
    }

    if (primaryRole === "social_media") {
      const { data: scheduledTasks } = await supabase.from("operational_tasks")
        .select("id, title, due_date")
        .or(orFilter)
        .in("status", ["aprovado", "agendado"])
        .gte("due_date", today)
        .lte("due_date", new Date(NOW + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .limit(5);
      if ((scheduledTasks ?? []).length > 0) {
        results.push({
          id:              makeId(["op-role-publish", userId]),
          module:          "operacional",
          title:           "Conteúdo para publicar em breve",
          description:     `${scheduledTasks!.length} conteúdo${scheduledTasks!.length > 1 ? "s aprovados vencem" : " aprovado vence"} nos próximos 3 dias. Confirme o agendamento.`,
          suggestion_type: "reminder",
          priority:        "alta",
          source:          "Setor: social_media",
          action_label:    "Ver calendário",
          action_url:      "/operacional/calendario",
        });
      }
    }

    if (primaryRole === "editor") {
      const { data: reviewTasks } = await supabase.from("operational_tasks")
        .select("id")
        .or(orFilter)
        .eq("status", "revisao_interna")
        .limit(5);
      if ((reviewTasks ?? []).length > 0) {
        results.push({
          id:              makeId(["op-role-review", userId]),
          module:          "operacional",
          title:           "Revisão aguardando feedback",
          description:     `${reviewTasks!.length} tarefa${reviewTasks!.length > 1 ? "s estão" : " está"} em revisão interna. Aprove ou solicite ajuste.`,
          suggestion_type: "next_action",
          priority:        "alta",
          source:          "Setor: editor",
          action_label:    "Ver tarefas",
          action_url:      "/operacional/minhas-tarefas",
        });
      }
    }

    if (primaryRole === "gestor_trafego") {
      const { data: readyForTraffic } = await supabase.from("operational_tasks")
        .select("id")
        .or(orFilter)
        .in("status", ["aprovado", "agendado"])
        .limit(5);
      if ((readyForTraffic ?? []).length > 0) {
        results.push({
          id:              makeId(["op-role-traffic", userId]),
          module:          "operacional",
          title:           "Conteúdo aprovado para tráfego",
          description:     `${readyForTraffic!.length} peça${readyForTraffic!.length > 1 ? "s aprovadas" : " aprovada"} com potencial de impulsionamento.`,
          suggestion_type: "opportunity",
          priority:        "media",
          source:          "Setor: gestor_trafego",
          action_label:    "Ver tarefas",
          action_url:      "/operacional/minhas-tarefas",
        });
      }
    }
  } catch {}
  return results;
}

// ── Productivity suggestions ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getProductivitySuggestions(supabase: any, userId: string, roles: string[]): Promise<AISuggestion[]> {
  const results: AISuggestion[] = [];
  try {
    const [noDateRes, noOwnerRes] = await Promise.all([
      supabase.from("operational_tasks")
        .select("id", { count: "exact", head: true })
        .or(`assigned_to.eq.${userId},assigned_role.in.(${roles.join(",")})`)
        .is("due_date", null)
        .not("status", "eq", "concluido"),
      supabase.from("operational_tasks")
        .select("id", { count: "exact", head: true })
        .is("assigned_to", null)
        .is("assigned_role", null)
        .not("status", "eq", "concluido"),
    ]);

    const noDateCount = noDateRes.count ?? 0;
    if (noDateCount > 0) {
      results.push({
        id:              makeId(["prod-nodate", userId]),
        module:          "produtividade",
        title:           "Tarefas sem data",
        description:     `${noDateCount} tarefa${noDateCount > 1 ? "s" : ""} sem prazo definido.`,
        suggestion_type: "productivity",
        priority:        "baixa",
        source:          "Regra: due_date null",
        action_label:    "Ver tarefas",
        action_url:      "/operacional/minhas-tarefas",
      });
    }

    const noOwnerCount = noOwnerRes.count ?? 0;
    if (noOwnerCount > 0) {
      results.push({
        id:              makeId(["prod-noowner"]),
        module:          "produtividade",
        title:           "Demandas sem responsável",
        description:     `${noOwnerCount} tarefa${noOwnerCount > 1 ? "s" : ""} sem dono definido.`,
        suggestion_type: "productivity",
        priority:        "media",
        source:          "Regra: assigned_to null",
        action_label:    "Ver kanban",
        action_url:      "/admin/operacional/kanban",
      });
    }
  } catch {}
  return results;
}

// ── Client-safe suggestions (visible to clients) ─────────────────────────────
// Never expose internal data, team info, financial info, prompts, or gargalos.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getClientSafeSuggestions(supabase: any, clientId: string): Promise<AISuggestion[]> {
  const results: AISuggestion[] = [];
  try {
    const [pendingRes, readyRes] = await Promise.all([
      supabase.from("approvals")
        .select("id, status, created_at, content_items(title)")
        .eq("client_id", clientId)
        .eq("status", "aguardando")
        .order("created_at", { ascending: true })
        .limit(5),
      supabase.from("content_items")
        .select("id, title")
        .eq("client_id", clientId)
        .eq("status", "pronto_para_agendar")
        .limit(3),
    ]);

    if ((pendingRes.data ?? []).length > 0) {
      results.push({
        id:              makeId(["client-pending", clientId]),
        module:          "cliente",
        client_id:       clientId,
        title:           "Conteúdo aguardando sua aprovação",
        description:     "Você tem conteúdos prontos esperando a sua avaliação.",
        suggestion_type: "next_action",
        priority:        "alta",
        source:          "Aprovações pendentes",
        action_label:    "Ver aprovações",
        action_url:      "/contentos/aprovacoes",
      });
    }

    if ((readyRes.data ?? []).length > 0) {
      results.push({
        id:              makeId(["client-ready", clientId]),
        module:          "cliente",
        client_id:       clientId,
        title:           "Conteúdo pronto para publicar",
        description:     "Conteúdos aprovados aguardam agendamento para publicação.",
        suggestion_type: "next_action",
        priority:        "media",
        source:          "Calendário",
        action_label:    "Ver calendário",
        action_url:      "/contentos/calendario",
      });
    }
  } catch {}
  return results;
}
