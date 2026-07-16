import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getFeatureFlag } from "@/lib/feature-flags";
import EditorOSWorkspace from "./EditorOSWorkspace";

const ALLOWED_RETURN_TO_PREFIX = "/admin/contentos/";
const BLOCKED_RETURN_TO_PREFIXES = ["http://", "https://", "//", "javascript:", "data:"];

function sanitizeReturnTo(raw: string | undefined): string | null {
  if (!raw) return null;
  const decoded = decodeURIComponent(raw);
  if (BLOCKED_RETURN_TO_PREFIXES.some((p) => decoded.startsWith(p))) return null;
  if (!decoded.startsWith(ALLOWED_RETURN_TO_PREFIX)) return null;
  return decoded;
}

interface PageProps {
  searchParams: Promise<{
    client?: string;
    client_id?: string;
    campaign_id?: string;
    content_id?: string;
    briefing_id?: string;
    return_to?: string;
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

  // Canonical param: `client`. Accept `client_id` as legacy fallback.
  const activeClientId = params.client ?? params.client_id ?? null;

  if (!activeClientId) {
    redirect("/admin/contentos/selecionar-cliente");
  }

  let client: { id: string; company_name: string; segment: string | null } | null = null;
  let brandName: string | null = null;
  let socialChannels: string[] | null = null;

  const { data: clientData } = await supabase
    .from("clients")
    .select("id, company_name, segment")
    .eq("id", activeClientId)
    .is("deleted_at", null)
    .single();

  if (!clientData) {
    redirect("/admin/contentos/selecionar-cliente");
  }

  client = clientData;

  const { data: onboarding } = await supabase
    .from("onboarding_profiles")
    .select("brand_name, social_channels")
    .eq("client_id", activeClientId)
    .maybeSingle();

  if (onboarding) {
    brandName = onboarding.brand_name ?? null;
    socialChannels = Array.isArray(onboarding.social_channels)
      ? (onboarding.social_channels as string[])
      : null;
  }

  const returnTo = sanitizeReturnTo(params.return_to);

  return (
    <EditorOSWorkspace
      client={client}
      brandName={brandName}
      socialChannels={socialChannels}
      campaignId={params.campaign_id ?? null}
      contentId={params.content_id ?? null}
      briefingId={params.briefing_id ?? null}
      returnTo={returnTo}
    />
  );
}
