import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  createServerSupabaseClient,
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";
import { validateContentOSClient, getAdminContentOSClients } from "@/lib/admin-contentos-clients";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
import { GuidedCreateFlow } from "./_guided-create-flow";
import type { GuidedCreateDraft } from "./_guided-create-flow";
import { InlineClientPicker } from "@/components/inline-client-picker";
import { PageHeader } from "@/components/page-header";
import { findRadarOpportunity } from "@/lib/rec-os-workflow/radar-opportunities";

/**
 * Sprint REC OS 3.0.1.1 (Fase 3) — `seed`/`section` na URL só resolvem
 * contra um catálogo fixo conhecido (RADAR_DEMO_OPPORTUNITIES) — um `seed`
 * desconhecido ou adulterado simplesmente resolve para `null` e o fluxo
 * segue normal, sem conceder nenhum acesso extra e sem quebrar a página.
 */
function resolveSection(section: string | undefined): string | null {
  if (section === "ideia") return "brief";
  return null;
}

async function CriarClientRequiredState({ invalidClientId }: { invalidClientId: string | null }) {
  const clients = isSupabaseConfigured ? await getAdminContentOSClients() : [];
  const clientOptions = clients
    .filter((c) => !!c.company_name)
    .map((c) => ({ id: c.id, name: c.company_name as string }));

  return (
    <>
      <ContentosSubNavServer />
      <PageHeader title="Criar conteúdo" description="Selecione o cliente para começar o briefing guiado." />
      {invalidClientId && (
        <div className="max-w-md mx-auto mb-4 bg-red-50 border border-red-100 rounded-2xl p-4 text-xs text-red-700">
          Cliente não encontrado ou sem acesso para o ID informado na URL. Escolha um cliente abaixo.
        </div>
      )}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 text-center mb-4">
        <p className="text-sm font-bold text-gray-700 mb-1">Criar conteúdo é sempre para um cliente</p>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          O briefing guiado usa a marca, o segmento e o histórico do cliente — selecione um abaixo para continuar.
        </p>
      </div>
      <Suspense fallback={<div className="max-w-md mx-auto h-40 bg-gray-50 rounded-2xl animate-pulse" />}>
        <InlineClientPicker clientOptions={clientOptions} />
      </Suspense>
    </>
  );
}

export default async function AdminContentosCriarPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; step?: string; content_id?: string; seed?: string; section?: string }>;
}) {
  const params = await searchParams;
  const clientId = params.client ?? null;
  const contentId = params.content_id ?? null;
  const seedOpportunity = findRadarOpportunity(params.seed);
  const resolvedStep = resolveSection(params.section) ?? params.step ?? null;

  if (!clientId) {
    return <CriarClientRequiredState invalidClientId={null} />;
  }

  let role = "";
  let clientName = "Cliente";
  let clientSegment: string | null = null;
  let initialDraft: GuidedCreateDraft | null = null;
  let initialContentId: string | null = null;

  if (isSupabaseConfigured) {
    const valid = await validateContentOSClient(clientId);
    if (!valid) {
      return <CriarClientRequiredState invalidClientId={clientId} />;
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
        initialStep={resolvedStep}
        isSuperAdmin={role === "super_admin"}
        initialDraft={initialDraft}
        initialContentId={initialContentId}
        seedOpportunity={initialContentId ? null : seedOpportunity}
      />
    </>
  );
}
