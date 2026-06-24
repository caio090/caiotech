import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ContentOSHomeContent } from "./_client-content";
import type { DbOnboardingProfile, DbContentItem, DbApprovalWithContent } from "@/lib/supabase/types";

export default async function ContentOSHomePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params = await searchParams;
  const activeClientId = params.client ?? null;

  let serverOnboarding: DbOnboardingProfile | null = null;
  let serverContents: DbContentItem[] | null = null;
  let serverApprovals: DbApprovalWithContent[] | null = null;
  let userRole = "";
  let companyName: string | null = null;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        userRole = profile?.role ?? "";

        const { data: clientData } = await supabase
          .from("clients")
          .select("id, company_name")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (clientData) {
          companyName = clientData.company_name ?? null;
          const [onbResult, contentsResult, approvalsResult] = await Promise.all([
            supabase.from("onboarding_profiles").select("*").eq("client_id", clientData.id).maybeSingle(),
            supabase.from("content_items").select("*").eq("client_id", clientData.id).order("created_at", { ascending: false }).limit(20),
            supabase.from("approvals").select("*, content_items(*)").eq("client_id", clientData.id).order("created_at", { ascending: false }).limit(10),
          ]);
          serverOnboarding = onbResult.data;
          serverContents = contentsResult.data ?? [];
          serverApprovals = (approvalsResult.data as DbApprovalWithContent[]) ?? [];
        } else {
          // Admin/operacional: conteúdos recentes de todos os clientes
          const { data: allContents } = await supabase
            .from("content_items")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20);
          serverContents = allContents ?? [];

          // Admin/staff: only load if an explicit client ID was provided via ?client=
          // (layout shell ensures staff always selects a client before reaching this page)
          if (activeClientId) {
            const { data: targetClient } = await supabase
              .from("clients")
              .select("id, company_name")
              .eq("id", activeClientId)
              .maybeSingle();
            if (targetClient) {
              companyName = targetClient.company_name ?? null;
              const { data: onb } = await supabase
                .from("onboarding_profiles")
                .select("*")
                .eq("client_id", targetClient.id)
                .maybeSingle();
              serverOnboarding = onb;
            }
          }
        }
      }
    } catch (e) {
      console.error("[contentos/home] Supabase fetch error:", e);
    }
  }

  return (
    <ContentOSHomeContent
      serverOnboarding={serverOnboarding}
      serverContents={serverContents}
      serverApprovals={serverApprovals}
      userRole={userRole}
      isSupabaseActive={isSupabaseConfigured}
      companyName={companyName}
    />
  );
}
