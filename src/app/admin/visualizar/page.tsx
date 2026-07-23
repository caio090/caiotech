import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { resolveWorkspacePreview } from "@/lib/workspaces/preview";
import { WorkspacePreviewBanner } from "@/components/workspaces/workspace-preview-banner";
import { VisualizarShell } from "./_visualizar-shell";
import type { WorkspaceSurface } from "@/lib/workspaces/types";

interface PageProps {
  searchParams: Promise<{ preview_surface?: string; workspace_id?: string; blueprint_surface?: string }>;
}

const BLUEPRINT_SURFACES: WorkspaceSurface[] = ["agency", "agency_client", "direct_business"];

/**
 * Fase "Rotas": "Para preview do Super Admin, preferir /admin/visualizar...
 * O preview deve renderizar os mesmos componentes e capacidades." This page
 * resolves the preview server-side (never trusts the query string alone —
 * see resolveWorkspacePreview) and renders a capability-gated dashboard
 * shell reusing WorkspaceCapabilityGate. It links out to the REAL existing
 * pages (REC OS, Meu Negócio, Relatórios) with the resolved client id
 * already in the URL, instead of re-implementing those pages here.
 */
export default async function VisualizarPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Blueprint: fictional structure, nothing real to validate server-side.
  if (params.blueprint_surface && BLUEPRINT_SURFACES.includes(params.blueprint_surface as WorkspaceSurface)) {
    const surface = params.blueprint_surface as WorkspaceSurface;
    return (
      <div>
        <WorkspacePreviewBanner
          context={{
            surface, workspaceId: null, workspaceName: "Estrutura demonstrativa",
            parentWorkspaceId: null, parentWorkspaceName: null, isPreview: true, readOnly: true,
          }}
        />
        <VisualizarShell
          context={{
            surface, workspaceId: "blueprint", workspaceName: "Estrutura demonstrativa",
            parentWorkspaceId: null, parentWorkspaceName: null, isPreview: true, readOnly: true,
          }}
          isBlueprint
        />
      </div>
    );
  }

  const resolution = await resolveWorkspacePreview({
    previewSurface: params.preview_surface,
    workspaceId: params.workspace_id,
  });

  if (!resolution.ok) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <p className="text-sm font-bold text-gray-800 mb-1">Não foi possível abrir esta visualização</p>
        <p className="text-xs text-gray-400 mb-4">
          {{
            missing_params: "Superfície ou workspace não informado.",
            invalid_surface: "Superfície de visualização inválida.",
            unauthenticated: "Sessão não reconhecida.",
            forbidden_not_super_admin: "Apenas o Super Admin pode usar o modo de visualização.",
            agency_not_found_or_inactive: "Agência não encontrada ou inativa.",
            agency_workspaces_table_unavailable: "Estrutura de agências ainda não disponível neste ambiente.",
            business_not_found: "Empresa não encontrada.",
            business_is_agency_managed_not_direct: "Este registro é atendido por uma agência — use \"Cliente da agência\".",
            client_not_found: "Cliente não encontrado.",
            no_active_agency_relationship: "Este cliente não tem vínculo ativo com nenhuma agência.",
            agency_clients_table_unavailable: "Estrutura de vínculo agência–cliente ainda não disponível neste ambiente.",
            service_unavailable: "Serviço temporariamente indisponível.",
          }[resolution.reason] ?? "Motivo não reconhecido."}
        </p>
        <Link href="/admin/dashboard" className="text-xs font-bold text-indigo-600 underline">Voltar ao Painel ADM</Link>
      </div>
    );
  }

  return (
    <div>
      <WorkspacePreviewBanner context={resolution.context} />
      <VisualizarShell context={resolution.context} />
    </div>
  );
}
