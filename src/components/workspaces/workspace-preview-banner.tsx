"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, X } from "lucide-react";
import { SURFACE_LABELS } from "@/config/workspace-capabilities";
import type { WorkspaceContext, WorkspaceRelationshipType } from "@/lib/workspaces/types";

// Fase 4/7 do hotfix 1.0.4 — o banner agora recebe e exibe relationshipType,
// não só o nome do pai (que sozinho não distinguia "gerenciado pela agência"
// de qualquer outra relação futura).
const RELATIONSHIP_LABELS: Record<WorkspaceRelationshipType, string> = {
  managed_client: "cliente gerenciado",
  direct_customer: "cliente direto",
  platform_owned: "da plataforma",
  support_access: "acesso de suporte",
};

/**
 * Fixed banner shown for the entire duration of a Super Admin preview —
 * never disappears during navigation (Fase "Banner de visualização"). Every
 * page under /admin/visualizar renders this by wrapping its content, so
 * there's no route that can lose it.
 *
 * "Sair da visualização" now calls DELETE /api/admin/workspaces/preview to
 * clear the signed cookie before navigating — previously a plain <Link>
 * that only changed pathname while leaving the preview cookie active.
 */
export function WorkspacePreviewBanner({ context }: { context: WorkspaceContext }) {
  const router = useRouter();

  // Fase 6 do hotfix 1.0.4 — "browser back não restaura estado inválido".
  // Next.js mantém um cache de back/forward independente de staleTimes
  // (ver next.config staleTimes docs: "this doesn't change back/forward
  // caching behavior"), então voltar para /admin/visualizar depois de sair
  // do preview em outra navegação pode reexibir este banner a partir do
  // cache do navegador antes de qualquer novo request ao servidor. O evento
  // pageshow com persisted:true é o sinal padrão de "esta página veio do
  // bfcache, não de um render novo" — force um refresh do RSC para
  // reconferir o cookie real.
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) router.refresh();
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router]);

  if (!context.isPreview) return null;

  async function exit() {
    try {
      await fetch("/api/admin/workspaces/preview", { method: "DELETE" });
    } finally {
      router.push("/admin/dashboard");
    }
  }

  return (
    <div className="sticky top-0 z-40 bg-amber-500 text-white px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 text-xs font-bold shadow-md">
      <div className="flex items-start sm:items-center gap-2 min-w-0">
        <Eye className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
        <span className="break-words">
          Visualização do Super ADM: {SURFACE_LABELS[context.surface]}
          {context.workspaceName ? ` · ${context.workspaceName}` : ""}
          {context.parentWorkspaceName ? ` (de ${context.parentWorkspaceName}${context.relationshipType ? ` · ${RELATIONSHIP_LABELS[context.relationshipType]}` : ""})` : ""}
          {context.readOnly ? " · Somente leitura" : ""}
        </span>
      </div>
      <button
        onClick={exit}
        className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto shrink-0"
      >
        <X className="w-3 h-3" /> Sair da visualização
      </button>
    </div>
  );
}
