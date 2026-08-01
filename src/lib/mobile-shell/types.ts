/**
 * Sprint REC OS 3.0.1 (Fase 31) — bottom navigation por superfície. Só
 * dados/regras puros aqui: o componente (`src/components/mobile-nav.tsx`)
 * é quem filtra contra os itens de navegação reais já autorizados por
 * capability (`configs[variant].nav`) — esta tabela nunca concede acesso a
 * uma rota por si só, apenas prioriza quais das rotas JÁ visíveis para o
 * usuário aparecem fixas no rodapé.
 */
import type { WorkspaceSurface } from "@/lib/workspaces/types";

export const SURFACE_BOTTOM_NAV_PRIMARY: Record<WorkspaceSurface, string[]> = {
  super_admin:     ["/admin/dashboard", "/admin/ecossistema", "/admin/contentos", "/admin/leads"],
  agency:          ["/admin/dashboard", "/admin/contentos", "/admin/operacional", "/admin/clientes"],
  agency_client:   ["/admin/dashboard", "/admin/contentos", "/admin/contentos/aprovacoes", "/admin/calendario"],
  direct_business: ["/admin/dashboard", "/admin/meu-negocio", "/admin/leads", "/admin/calendario"],
};

export const SURFACE_BOTTOM_NAV_LABEL: Record<WorkspaceSurface, string[]> = {
  super_admin:     ["Início", "Ecossistema", "REC OS", "CRM"],
  agency:          ["Início", "REC OS", "Operação", "Clientes"],
  agency_client:   ["Início", "Conteúdos", "Aprovações", "Calendário"],
  direct_business: ["Início", "Meu Negócio", "CRM", "Calendário"],
};

export const MAX_BOTTOM_NAV_ITEMS = 5; // 4 fixos + "Mais"

for (const surface of Object.keys(SURFACE_BOTTOM_NAV_PRIMARY) as WorkspaceSurface[]) {
  if (SURFACE_BOTTOM_NAV_PRIMARY[surface].length + 1 > MAX_BOTTOM_NAV_ITEMS) {
    throw new Error(`SURFACE_BOTTOM_NAV_PRIMARY[${surface}] excede o máximo de ${MAX_BOTTOM_NAV_ITEMS} itens (4 fixos + Mais).`);
  }
}
