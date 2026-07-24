import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getWorkspacePreviewContext } from "@/lib/workspaces/context";
import { WorkspacePreviewBanner } from "@/components/workspaces/workspace-preview-banner";
import { ClearInvalidPreviewCookie } from "@/components/workspaces/clear-invalid-preview-cookie";
import { VisualizarShell } from "./_visualizar-shell";

const STATUS_MESSAGES: Record<string, string> = {
  inactive: "Nenhuma visualização ativa. Use \"Visualizar como\" no menu para começar.",
  invalid: "Esta visualização não é mais válida — o workspace pode ter sido removido ou o vínculo desfeito.",
  expired: "Esta visualização expirou. Abra \"Visualizar como\" novamente.",
  revoked: "Sua sessão não confere mais como Super Admin — a visualização foi encerrada.",
};

/**
 * Fase 7 do hotfix 1.0.1 — este page.tsx não lê mais ?preview_surface=/
 * ?workspace_id= da URL. Todo o estado vem de getWorkspacePreviewContext(),
 * que lê o cookie assinado e revalida tudo no servidor a cada request —
 * uma URL adulterada não tem mais nenhum campo de autorização para adulterar.
 */
export default async function VisualizarPage() {
  const resolved = await getWorkspacePreviewContext();

  if (resolved.status !== "active_read_only" || !resolved.context) {
    // "inactive" = nenhum cookie presente, nada para limpar. Os outros três
    // status (invalid/expired/revoked) significam que existe um cookie
    // stale no navegador — limpa proativamente (Fase 17 do hotfix 1.0.2).
    const hasStaleCookie = resolved.status === "invalid" || resolved.status === "expired" || resolved.status === "revoked";
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        {hasStaleCookie && <ClearInvalidPreviewCookie />}
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <p className="text-sm font-bold text-gray-800 mb-1">Nenhuma visualização ativa</p>
        <p className="text-xs text-gray-400 mb-4">{STATUS_MESSAGES[resolved.status] ?? "Estado não reconhecido."}</p>
        <Link href="/admin/dashboard" className="text-xs font-bold text-indigo-600 underline">Voltar ao Painel ADM</Link>
      </div>
    );
  }

  return (
    <div>
      <WorkspacePreviewBanner context={resolved.context} />
      <VisualizarShell context={resolved.context} isBlueprint={resolved.context.workspaceId?.startsWith("blueprint-") ?? false} />
    </div>
  );
}
