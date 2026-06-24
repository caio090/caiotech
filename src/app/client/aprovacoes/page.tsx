import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { dbApprovalStatusToUi } from "@/lib/supabase/types";
import type { DbApprovalWithContent } from "@/lib/supabase/types";
import { ClientAprovacoesContent } from "./_client-content";
import type { UiApproval } from "./_client-content";
import { getApprovalsByClient } from "@/data/mock-data";

function dbToUiApproval(a: DbApprovalWithContent & { content_id?: string }): UiApproval {
  const c        = a.content_items;
  const uiStatus = dbApprovalStatusToUi(a.status);
  const raw      = c?.scheduled_date ?? null;
  const deadline = raw
    ? (() => { const d = new Date(raw); return isNaN(d.getTime()) ? "Sem data definida" : d.toLocaleDateString("pt-BR"); })()
    : "Sem data definida";

  return {
    id:           a.id,
    contentId:    (a as { content_id?: string }).content_id ?? undefined,
    contentTitle: c?.title ?? "Sem título",
    platform:     c?.channel?.split(",")[0]?.trim() ?? "Instagram",
    preview:      c?.caption ?? "",
    deadline,
    status: (uiStatus === "change_requested" ? "rejected" : uiStatus) as "pending" | "approved" | "rejected",
    token:  a.public_token,
  };
}

export default async function ClientAprovacoesPage() {
  let approvals: UiApproval[] | null = null;
  let isDemo = true;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();
        if (clientData) {
          const { data } = await supabase
            .from("approvals")
            .select("*, content_items(id, title, type, channel, caption, status, scheduled_date)")
            .eq("client_id", clientData.id)
            .order("created_at", { ascending: false });
          if (data) {
            approvals = (data as (DbApprovalWithContent & { content_id?: string })[]).map(dbToUiApproval);
            isDemo = false;
          }
        }
      }
    } catch (e) {
      console.error("[client/aprovacoes] Supabase fetch error:", e);
    }
  }

  const demoRaw = getApprovalsByClient("client-1");
  const demoApprovals: UiApproval[] = demoRaw.map((a) => ({
    id:           a.id,
    contentTitle: a.contentTitle,
    platform:     a.platform,
    preview:      (a as { preview?: string }).preview ?? "",
    deadline:     (a as { deadline?: string }).deadline ?? "Sem data definida",
    status:       a.status as "pending" | "approved" | "rejected",
  }));

  return (
    <ClientAprovacoesContent
      initialApprovals={approvals ?? demoApprovals}
      isDemo={isDemo}
    />
  );
}
