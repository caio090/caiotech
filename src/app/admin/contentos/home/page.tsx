import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import { ContentOSHomeContent } from "@/app/contentos/home/_client-content";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
import type { DbOnboardingProfile, DbContentItem, DbApprovalWithContent } from "@/lib/supabase/types";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { getContentOSSuggestions } from "@/lib/ai-suggestions";
import { BriefGate } from "./_brief-gate";
import { RecOSTools } from "./_recos-tools";

export default async function AdminContentosHomePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params         = await searchParams;
  const activeClientId = params.client ?? null;

  if (!activeClientId) {
    redirect("/admin/contentos/selecionar-cliente");
  }

  let serverOnboarding: DbOnboardingProfile | null    = null;
  let serverContents:   DbContentItem[] | null         = null;
  let serverApprovals:  DbApprovalWithContent[] | null = null;
  let userRole = "";
  let companyName: string | null = null;
  let suggestions: Awaited<ReturnType<typeof getContentOSSuggestions>> = [];
  let hasClientContext = false;
  let metaAsset: { page_name: string | null; instagram_username: string | null } | null = null;
  let hasOlaClick = false;

  if (isSupabaseConfigured) {
    const validClient = await validateContentOSClient(activeClientId);
    if (!validClient) {
      redirect("/admin/contentos/selecionar-cliente");
    }

    try {
      const supabase = await createServerSupabaseClient();
      companyName = validClient.company_name;

      // Fetch role alongside other data
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        userRole = profileData?.role ?? "admin";
      }

      const [onbResult, contentsResult, approvalsResult, contextResult, assetsResult] = await Promise.all([
        supabase.from("onboarding_profiles").select("*").eq("client_id", activeClientId).maybeSingle(),
        supabase.from("content_items").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(20),
        supabase.from("approvals").select("*, content_items(*)").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(10),
        supabase.from("client_context").select("id").eq("client_id", activeClientId).maybeSingle(),
        supabase.from("client_meta_assets").select("asset_type, asset_name, username").eq("client_id", activeClientId),
      ]);
      serverOnboarding = onbResult.data;
      serverContents   = contentsResult.data ?? [];
      serverApprovals  = (approvalsResult.data as DbApprovalWithContent[]) ?? [];
      suggestions      = await getContentOSSuggestions(supabase, activeClientId!);
      hasClientContext = !contextResult.error && !!contextResult.data;

      if (!assetsResult.error && assetsResult.data && assetsResult.data.length > 0) {
        const rows = assetsResult.data as Array<{ asset_type: string; asset_name: string | null; username: string | null }>;
        const page = rows.find((r) => r.asset_type === "facebook_page");
        const ig   = rows.find((r) => r.asset_type === "instagram_business");
        metaAsset = {
          page_name:          page?.asset_name ?? null,
          instagram_username: ig?.username     ?? null,
        };
      }

      const olaClickRes = await supabase
        .from("olaclick_connections")
        .select("id")
        .eq("client_id", activeClientId)
        .eq("status", "connected")
        .limit(1)
        .maybeSingle();
      if (!olaClickRes.error && olaClickRes.data) {
        hasOlaClick = true;
      }
    } catch (e) {
      console.error("[admin/contentos/home] Supabase fetch error:", e);
    }
  }

  return (
    <>
      <ContentosSubNavServer />
      {isSupabaseConfigured && !hasClientContext && (
        <BriefGate clientId={activeClientId} companyName={companyName} />
      )}
      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} className="mb-5" />
      )}
      <RecOSTools clientId={activeClientId} role={userRole} />
      <ContentOSHomeContent
        serverOnboarding={serverOnboarding}
        serverContents={serverContents}
        serverApprovals={serverApprovals}
        userRole={userRole || "admin"}
        isSupabaseActive={isSupabaseConfigured}
        companyName={companyName}
        metaAsset={metaAsset}
        clientId={activeClientId}
        hasOlaClick={hasOlaClick}
      />
    </>
  );
}
