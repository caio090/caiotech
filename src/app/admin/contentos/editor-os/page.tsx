import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getFeatureFlag } from "@/lib/feature-flags";
import { resolveEditorRuntimeMode } from "@/lib/runtime/demo-runtime";
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
    demo?: string;
  }>;
}

export default async function EditorOSPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Runtime decision happens BEFORE any Supabase client is created — this is
  // exactly what was missing before Sprint 1.0.1: createServerSupabaseClient()
  // throws when Supabase isn't configured, and that throw was previously the
  // very first thing this page did, with no fallback for non-Production
  // environments.
  const runtime = resolveEditorRuntimeMode(params.demo === "1");

  if (runtime.mode === "misconfigured") {
    // Fail closed. Production with Supabase absent is a configuration error,
    // never a demo — no secret, no stack, no editor.
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-100 px-6">
        <div className="max-w-sm text-center space-y-2">
          <p className="text-sm font-semibold">Não foi possível carregar o EditorOS.</p>
          <p className="text-xs text-zinc-500">Tente novamente em instantes.</p>
        </div>
      </div>
    );
  }

  if (runtime.mode === "blocked") {
    // Non-Production, Supabase absent, no explicit ?demo=1 — safe, informative,
    // never renders the editor, never touches client/content_id.
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-100 px-6">
        <div className="max-w-sm text-center space-y-4">
          <p className="text-sm font-semibold">EditorOS disponível em modo de demonstração.</p>
          <p className="text-xs text-zinc-500">
            Este ambiente não possui conexão de dados. Abra o EditorOS em modo de demonstração para testar OCR, camadas, undo/redo e exportação — nada é enviado ao banco.
          </p>
          <a
            href="/admin/contentos/editor-os?demo=1"
            data-testid="editor-demo-open-link"
            className="inline-flex items-center justify-center text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 transition-colors"
          >
            Abrir demonstração
          </a>
        </div>
      </div>
    );
  }

  if (runtime.mode === "demo") {
    // No Supabase client, no query, no client/content_id/approval_id/task_id/
    // campaign_id read from the URL — even if present, they are never looked at.
    return (
      <EditorOSWorkspace
        runtimeMode="demo"
        client={null}
        brandName={null}
        socialChannels={null}
        campaignId={null}
        contentId={null}
        briefingId={null}
        returnTo={null}
      />
    );
  }

  // runtime.mode === "authenticated" — unchanged normal flow.
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
      runtimeMode="authenticated"
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
