"use client";

import { useEffect } from "react";

/**
 * Fase 17 do hotfix 1.0.2 — "cookie inválido é limpo". Server Components não
 * podem chamar cookies().set()/delete() (só Route Handlers e Server
 * Actions), então /admin/visualizar/page.tsx renderiza este componente
 * quando o status resolvido é invalid/expired/revoked, e ele mesmo dispara
 * a limpeza real (DELETE /api/admin/workspaces/preview) assim que monta.
 * Uso de useEffect aqui é o caso legítimo (sincronizar com um sistema
 * externo — o cookie HttpOnly via rede), não o padrão de setState-in-effect
 * que a Fase 17 do hotfix 1.0.1 corrigiu no switcher.
 */
export function ClearInvalidPreviewCookie() {
  useEffect(() => {
    fetch("/api/admin/workspaces/preview", { method: "DELETE" }).catch(() => {
      // Best-effort — o cookie já é tratado como inativo em toda leitura
      // subsequente mesmo se esta chamada falhar; não há nada para o
      // usuário fazer aqui.
    });
  }, []);

  return null;
}
