import { Suspense } from "react";
import Link from "next/link";
import { Wand2, LayoutGrid, Rocket, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getFeatureFlag } from "@/lib/feature-flags";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAdminContentOSClients } from "@/lib/admin-contentos-clients";
import { InlineClientPicker } from "@/components/inline-client-picker";
import EditorOSWorkspace from "./EditorOSWorkspace";

const FORMATS = [
  { id: "feed", label: "Feed", desc: "Imagem quadrada, para o feed do Instagram" },
  { id: "story", label: "Story", desc: "Vertical em tela cheia, 9:16" },
  { id: "carousel", label: "Carrossel", desc: "Múltiplos slides no formato feed" },
] as const;

/**
 * Fase 10 do hotfix canônico 1.0.1 — antes disto, faltar `client` levava a
 * um redirect silencioso para o seletor genérico, saindo do EditorOS. Agora
 * o EditorOS tem sua própria landing, na própria rota, com um seletor
 * pesquisável de cliente — nunca sai de /admin/contentos/editor-os.
 */
async function EditorOSLandingState() {
  const clients = isSupabaseConfigured ? await getAdminContentOSClients() : [];
  const clientOptions = clients
    .filter((c) => !!c.company_name)
    .map((c) => ({ id: c.id, name: c.company_name as string }));

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="flex items-center gap-2 mb-1">
        <Wand2 className="w-5 h-5 text-indigo-500" />
        <h1 className="text-xl font-black text-gray-900">EditorOS</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">Selecione um cliente para começar a editar.</p>

      <Suspense fallback={<div className="h-40 bg-gray-50 rounded-2xl animate-pulse mb-8" />}>
        <InlineClientPicker clientOptions={clientOptions} />
      </Suspense>

      <div className="grid grid-cols-3 gap-3 my-8">
        {FORMATS.map((f) => (
          <div key={f.id} className="bg-white border border-gray-100 rounded-2xl p-3.5 text-center">
            <LayoutGrid className="w-4 h-4 text-indigo-400 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-gray-800">{f.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3">
        <Link
          href="/admin/contentos"
          className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 px-4 py-2.5 rounded-xl hover:bg-gray-200 transition-colors"
        >
          <Rocket className="w-3.5 h-3.5" /> Abrir REC OS
        </Link>
        <Link
          href="/admin/contentos/criar"
          className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Criar conteúdo
        </Link>
      </div>
    </div>
  );
}

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
    return <EditorOSLandingState />;
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
    // Cliente inválido/sem acesso — mesma landing, nunca redireciona
    // silenciosamente para outra rota (Fase 10 do hotfix canônico 1.0.1).
    return <EditorOSLandingState />;
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
