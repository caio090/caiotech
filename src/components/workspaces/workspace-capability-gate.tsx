"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { hasCapability, isMutatingCapability, type WorkspaceCapability } from "@/config/workspace-capabilities";
import type { WorkspaceContext } from "@/lib/workspaces/types";

/**
 * Every mutation-shaped control (save/approve/delete/create/connect/invite)
 * must be wrapped here instead of a scattered `role === "x"` check. In a
 * read-only preview, a mutating capability renders disabled with an
 * explanatory tooltip — never hidden (Fase "Somente leitura": "Não bloquear
 * navegação... mostrar tooltip"). The frontend disable is a UX courtesy
 * only; the real enforcement is server-side (see
 * src/lib/workspaces/assert-not-preview.ts) — this component never claims
 * to BE the security boundary.
 */
export function WorkspaceCapabilityGate({
  context, capability, children, fallback,
}: {
  context: WorkspaceContext;
  capability: WorkspaceCapability;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const allowed = hasCapability(context.surface, capability);
  if (!allowed) return fallback ?? null;

  if (context.readOnly && isMutatingCapability(capability)) {
    return (
      <span title="Disponível somente no acesso real deste painel." className="inline-flex items-center gap-1.5 opacity-50 cursor-not-allowed">
        <Lock className="w-3 h-3" />
        {children}
      </span>
    );
  }

  return <>{children}</>;
}
