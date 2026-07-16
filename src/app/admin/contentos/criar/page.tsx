import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
import { GuidedCreateFlow } from "./_guided-create-flow";
import type { GuidedCreateDraft } from "./_guided-create-flow";

export default async function AdminContentosCriarPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; step?: string; content_id?: string }>;
}) {
  const params = await searchParams;
  const clientId = params.client ?? null;
  const contentId = params.content_id ?? null;

  if (!clientId) {
    redirect("/admin/contentos/selecionar-cliente");
  }

  let role = "";
  let clientName = "Cliente";
  let clientSegment: string | null = null;
  let initialDraft: GuidedCreateDraft | null = null;
  let initialContentId: string | null = null;

  if (isSupabaseConfigured) {
    const valid = await validateContentOSClient(clientId);
    if (!valid) {
      redirect("/admin/contentos/selecionar-cliente");
    }

    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        role = profile?.role ?? "";
      }

      const { data: client } = await supabase
        .from("clients")
        .select("company_name, segment")
        .eq("id", clientId)
        .maybeSingle();

      clientName = client?.company_name ?? clientName;
      clientSegment = client?.segment ?? null;

      if (contentId) {
        const { data: item } = await supabase
          .from("content_items")
          .select("id, client_id, metadata")
          .eq("id", contentId)
          .eq("client_id", clientId)
          .maybeSingle();

        if (item?.metadata) {
          const meta = item.metadata as Record<string, unknown>;
          if (meta.guided_create && typeof meta.guided_create === "object") {
            initialDraft = meta.guided_create as GuidedCreateDraft;
            initialContentId = item.id;
          }
        }
      }
    } catch {}
  }

  return (
    <>
      <ContentosSubNavServer initialClientId={clientId} />
      <GuidedCreateFlow
        clientId={clientId}
        clientName={clientName}
        clientSegment={clientSegment}
        initialStep={params.step ?? null}
        isSuperAdmin={role === "super_admin"}
        initialDraft={initialDraft}
        initialContentId={initialContentId}
      />
    </>
  );
}
