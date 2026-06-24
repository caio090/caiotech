import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import { ContentOSHomeContent } from "@/app/contentos/home/_client-content";
import { ContentosSubNav } from "../_contentos-subnav";
import type { DbOnboardingProfile, DbContentItem, DbApprovalWithContent } from "@/lib/supabase/types";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { getContentOSSuggestions } from "@/lib/ai-suggestions";

export default async function AdminContentosHomePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params        = await searchParams;
  const activeClientId = params.client ?? null;

  if (!activeClientId) {
    redirect("/admin/contentos/selecionar-cliente");
  }

  let serverOnboarding: DbOnboardingProfile | null     = null;
  let serverContents:   DbContentItem[] | null          = null;
  let serverApprovals:  DbApprovalWithContent[] | null  = null;
  const userRole = "admin";
  let companyName: string | null = null;
  let suggestions: Awaited<ReturnType<typeof getContentOSSuggestions>> = [];

  if (isSupabaseConfigured) {
    // Validate that the client is a real client (not operacional/admin/test/archived)
    const validClient = await validateContentOSClient(activeClientId);
    if (!validClient) {
      redirect("/admin/contentos/selecionar-cliente");
    }

    try {
      const supabase = await createServerSupabaseClient();
      companyName = validClient.company_name;

      const [onbResult, contentsResult, approvalsResult] = await Promise.all([
        supabase.from("onboarding_profiles").select("*").eq("client_id", activeClientId).maybeSingle(),
        supabase.from("content_items").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(20),
        supabase.from("approvals").select("*, content_items(*)").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(10),
      ]);
      serverOnboarding = onbResult.data;
      serverContents   = contentsResult.data ?? [];
      serverApprovals  = (approvalsResult.data as DbApprovalWithContent[]) ?? [];
      suggestions      = await getContentOSSuggestions(supabase, activeClientId!);
    } catch (e) {
      console.error("[admin/contentos/home] Supabase fetch error:", e);
    }
  }

  return (
    <>
      <ContentosSubNav />
      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} className="mb-5" />
      )}
      <ContentOSHomeContent
        serverOnboarding={serverOnboarding}
        serverContents={serverContents}
        serverApprovals={serverApprovals}
        userRole={userRole}
        isSupabaseActive={isSupabaseConfigured}
        companyName={companyName}
      />
    </>
  );
}
