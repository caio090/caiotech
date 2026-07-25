import { AdminLayoutShell } from "./_layout-client";
import { getWorkspacePreviewContext } from "@/lib/workspaces/context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveEffectiveUserRole } from "@/lib/access-control";

// Fase 7 do hotfix 1.0.4 — resolvido uma única vez aqui, no servidor, e
// repassado para AdminLayoutShell, que agora renderiza o banner de preview
// para toda página admin (não só /admin/visualizar). getWorkspacePreviewContext()
// já revalida tudo (cookie, sessão, papel, workspace) a cada request — nada
// novo é confiado aqui além do que context.ts já garante.
//
// Sprint Workspaces 1.0.7 — initialUserRole is resolved here, server-side,
// with the same resolveEffectiveUserRole() precedence proxy.ts and the
// login redirect already use, and passed down so AdminLayoutShell's first
// render already knows the role — no client-side fetch is the gate for
// whether "Painel ADM" / "Visualizar como" exist. Only the role string
// itself is passed, never a token, cookie, or the full user/profile object.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const resolved = await getWorkspacePreviewContext();
  const previewContext = resolved.status === "active_read_only" ? resolved.context : null;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  let initialUserRole: string | null = null;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    initialUserRole = resolveEffectiveUserRole({
      profileRole: profile?.role as string | undefined,
      userMetadataRole: user.user_metadata?.role as string | undefined,
      appMetadataRole: user.app_metadata?.role as string | undefined,
    });
  }

  return (
    <AdminLayoutShell previewContext={previewContext} initialUserRole={initialUserRole}>
      {children}
    </AdminLayoutShell>
  );
}
