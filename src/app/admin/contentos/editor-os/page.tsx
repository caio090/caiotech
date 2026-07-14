import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getFeatureFlag } from "@/lib/feature-flags";
import EditorOSWorkspace from "./EditorOSWorkspace";

interface PageProps {
  searchParams: Promise<{
    client_id?: string;
    campaign_id?: string;
    content_id?: string;
    briefing_id?: string;
  }>;
}

export default async function EditorOSPage({ searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const flag = getFeatureFlag("editor_os", { role: profile.role });
  if (!flag.enabled) redirect("/admin/contentos/selecionar-cliente");

  const params = await searchParams;

  let client: { id: string; company_name: string; segment: string | null } | null = null;
  let brandName: string | null = null;
  let socialChannels: string[] | null = null;

  if (params.client_id) {
    const { data: clientData } = await supabase
      .from("clients")
      .select("id, company_name, segment")
      .eq("id", params.client_id)
      .is("deleted_at", null)
      .single();

    if (clientData) {
      client = clientData;

      const { data: onboarding } = await supabase
        .from("onboarding_profiles")
        .select("brand_name, social_channels")
        .eq("client_id", params.client_id)
        .maybeSingle();

      if (onboarding) {
        brandName = onboarding.brand_name ?? null;
        socialChannels = Array.isArray(onboarding.social_channels)
          ? (onboarding.social_channels as string[])
          : null;
      }
    }
  }

  return (
    <EditorOSWorkspace
      client={client}
      brandName={brandName}
      socialChannels={socialChannels}
      campaignId={params.campaign_id ?? null}
      contentId={params.content_id ?? null}
      briefingId={params.briefing_id ?? null}
    />
  );
}
