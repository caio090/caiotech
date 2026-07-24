import { AdminLayoutShell } from "./_layout-client";
import { getWorkspacePreviewContext } from "@/lib/workspaces/context";

// Fase 7 do hotfix 1.0.4 — resolvido uma única vez aqui, no servidor, e
// repassado para AdminLayoutShell, que agora renderiza o banner de preview
// para toda página admin (não só /admin/visualizar). getWorkspacePreviewContext()
// já revalida tudo (cookie, sessão, papel, workspace) a cada request — nada
// novo é confiado aqui além do que context.ts já garante.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const resolved = await getWorkspacePreviewContext();
  const previewContext = resolved.status === "active_read_only" ? resolved.context : null;

  return <AdminLayoutShell previewContext={previewContext}>{children}</AdminLayoutShell>;
}
