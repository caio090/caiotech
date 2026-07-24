"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/workspaces/preview", { method: "DELETE" }).catch(() => {
      // Best-effort — o cookie já é tratado como inativo em toda leitura
      // subsequente mesmo se esta chamada falhar; não há nada para o
      // usuário fazer aqui.
    });
  }, []);

  // Fase 6 do hotfix 1.0.4 — mesmo raciocínio do banner (ver
  // workspace-preview-banner.tsx): se esta página "sem preview ativo" for
  // restaurada do cache de back/forward do navegador, um preview novo pode
  // ter começado nesse meio tempo em outra aba/navegação. Força reconferir
  // o cookie real em vez de manter a mensagem de erro desatualizada.
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) router.refresh();
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router]);

  return null;
}
