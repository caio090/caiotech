"use client";

import Link from "next/link";
import { Eye, X } from "lucide-react";
import { SURFACE_LABELS } from "@/config/workspace-capabilities";
import type { WorkspaceContext } from "@/lib/workspaces/types";

/**
 * Fixed banner shown for the entire duration of a Super Admin preview —
 * never disappears during navigation (Fase "Banner de visualização"). Every
 * page under /admin/visualizar renders this by wrapping its content, so
 * there's no route that can lose it.
 */
export function WorkspacePreviewBanner({ context }: { context: WorkspaceContext }) {
  if (!context.isPreview) return null;

  return (
    <div className="sticky top-0 z-40 bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-3 text-xs font-bold shadow-md">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 shrink-0" />
        <span>
          Visualização do Super ADM: {SURFACE_LABELS[context.surface]}
          {context.workspaceName ? ` · ${context.workspaceName}` : ""}
          {context.parentWorkspaceName ? ` (de ${context.parentWorkspaceName})` : ""}
          {context.readOnly ? " · Somente leitura" : ""}
        </span>
      </div>
      <Link
        href="/admin/dashboard"
        className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
      >
        <X className="w-3 h-3" /> Sair da visualização
      </Link>
    </div>
  );
}
