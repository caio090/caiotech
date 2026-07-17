import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  createServerSupabaseClient,
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";
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
      const authClient = await createServerSupabaseClient();
      const { data: { user } } = await authClient.auth.getUser();
      if (user) {
        const { data: profile } = await authClient
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        role = profile?.role ?? "";
      }

      const { data: client } = await authClient
        .from("clients")
        .select("company_name, segment")
        .eq("id", clientId)
        .maybeSingle();

      clientName = client?.company_name ?? clientName;
      clientSegment = client?.segment ?? null;

      // Load draft with service-role client to bypass RLS on content_items
      if (contentId && hasSupabaseServiceRoleKey()) {
        try {
          const adminDb = createRequiredSupabaseAdminClient();
          const { data: item } = await adminDb
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
        } catch (loadErr) {
          console.error("[criar/page] draft load error:", loadErr instanceof Error ? loadErr.message : "unknown");
        }
      }
    } catch (e) {
      console.error("[criar/page] auth/client error:", e instanceof Error ? e.message : "unknown");
    }
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
