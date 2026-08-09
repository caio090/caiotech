import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireAdminContentOSContext } from "@/lib/admin-contentos-api";
import { resolveClientContext } from "@/lib/rec-os-client-context";
import { getRoadmapItems } from "@/lib/rec-os-roadmap-data";
import type { RecOsRoadmapItem } from "@/lib/rec-os-roadmap";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
import { PageHeader } from "@/components/page-header";
import { RoadmapClient } from "./_roadmap-client";

/**
 * Sprint REC OS 3.0.1.1 (Fase 4) — Roadmap de Produção como experiência
 * navegável real, não apenas o registry criado na Sprint 3.0.1
 * (`rec_os_roadmap`, que ficava `planned`). A fonte é `getRoadmapItems()`
 * (Fase 5) — as quatro visualizações no client component consomem
 * exatamente este mesmo array.
 */
export default async function AdminContentosRoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const clientId = client ?? null;

  let items: RecOsRoadmapItem[] = [];
  let companyName = "";
  let clientStatus: "absent" | "valid" | "invalid" = "absent";
  let loadError = false;

  if (isSupabaseConfigured) {
    try {
      const ctx = await requireAdminContentOSContext();
      if (!(ctx instanceof Response)) {
        const { adminDb } = ctx;
        if (clientId) {
          const clientContext = await resolveClientContext(adminDb, clientId);
          clientStatus = clientContext.status;
          if (clientContext.status === "valid") {
            companyName = clientContext.companyName;
            items = await getRoadmapItems(adminDb, { clientId: clientContext.clientId });
          }
        } else {
          clientStatus = "absent";
          items = await getRoadmapItems(adminDb, { clientId: null });
        }
      } else {
        // Sprint QA Fix 3.0.2.6 (CI-PRODUCT-ROADMAP-SOURCE-UNAVAILABLE-001)
        // — antes, uma resposta 403/503 de requireAdminContentOSContext()
        // (ex.: sem SUPABASE_SERVICE_ROLE_KEY, o estado real do Environment
        // de CI local-e2e-qa) era silenciosamente tratada como "roadmap
        // genuinamente vazio", sem nunca acionar o aviso já existente
        // abaixo -- indistinguível de uma conta sem nenhum conteúdo real.
        loadError = true;
      }
    } catch {
      loadError = true;
    }
  }

  return (
    <>
      <ContentosSubNavServer initialClientId={clientId ?? undefined} />
      <PageHeader
        title="Roadmap de Produção"
        description={clientId ? `Quadro, lista, linha do tempo e calendário — ${companyName || "cliente"}` : "Quadro, lista, linha do tempo e calendário — todos os clientes"}
      />

      {loadError && (
        <div className="mb-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700">
          Não foi possível carregar os dados do roadmap agora. Os números abaixo podem estar incompletos.
        </div>
      )}
      {clientStatus === "invalid" && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl p-4 text-xs text-red-700">
          Cliente não encontrado ou sem acesso para o ID informado na URL. Selecione outro cliente ou remova o filtro para ver todos.
        </div>
      )}

      <RoadmapClient items={items} clientId={clientId} showClientColumn={!clientId} />
    </>
  );
}
