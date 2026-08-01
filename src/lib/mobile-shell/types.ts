/**
 * Sprint REC OS 3.0.1 (Fase 31) — bottom navigation por superfície. Só
 * dados/regras puros aqui: o componente (`src/components/mobile-nav.tsx`)
 * é quem filtra contra os itens de navegação reais já autorizados por
 * capability (`configs[variant].nav`) — esta tabela nunca concede acesso a
 * uma rota por si só, apenas prioriza quais das rotas JÁ visíveis para o
 * usuário aparecem fixas no rodapé.
 *
 * Sprint REC OS 3.0.1.1 (Fase 19/20) — a auditoria desta sprint encontrou
 * um defeito real herdado da 3.0.1: `SURFACE_BOTTOM_NAV_PRIMARY` apontava
 * para rotas (`/admin/ecossistema`, `/admin/leads`,
 * `/admin/contentos/aprovacoes`) que não existiam em
 * `configs.admin.nav` (src/components/app-sidebar.tsx) — o filtro em
 * mobile-nav.tsx as descartava silenciosamente, deixando Super ADM com só
 * 2 abas fixas em vez de 4, e Cliente da Agência com só 3 em vez de 4.
 * Corrigido registrando as 3 rotas que faltavam no config real da sidebar
 * (mesma fonte usada pelo desktop) — não inventando uma segunda lista.
 *
 * `SURFACE_BOTTOM_NAV_ITEMS` é agora a fonte única e mais completa (id,
 * label, route, requiredCapability, activeMatch, priority); os arrays
 * `SURFACE_BOTTOM_NAV_PRIMARY`/`SURFACE_BOTTOM_NAV_LABEL` continuam
 * exportados, derivados deste, para não quebrar `mobile-nav.tsx` nem os
 * testes da Sprint 3.0.1.
 *
 * Sprint Navegação e Experiência 3.0.1.2 (Fase 19) — "Ecossistema" saiu da
 * posição operacional principal (virou Arquitetura da Plataforma, dentro
 * de Status — ver docs/platform/ecosystem-status-reinterpretation.md) e
 * "Meu Escritório" ocupou o lugar coerente para Super ADM. Agência e
 * Empresa Direta já tinham os 4 slots primários ocupados por itens já
 * validados (REC OS/Operação/Clientes; Meu Negócio/CRM/Calendário) — Meu
 * Escritório fica reachable para elas via o menu "Mais" (configs.admin.nav
 * já inclui a rota), sem deslocar nenhum item primário existente.
 */
import type { WorkspaceSurface } from "@/lib/workspaces/types";

export interface SurfaceBottomNavItem {
  id: string;
  label: string;
  route: string;
  /**
   * Documentação da capability esperada — não é enforcement em si (o
   * enforcement real continua sendo o filtro contra `configs[variant].nav`
   * em mobile-nav.tsx, que já reflete o que o usuário pode acessar).
   */
  requiredCapability: string;
  activeMatch: "exact" | "prefix";
  priority: number;
}

export const SURFACE_BOTTOM_NAV_ITEMS: Record<WorkspaceSurface, SurfaceBottomNavItem[]> = {
  super_admin: [
    { id: "inicio", label: "Início", route: "/admin/dashboard", requiredCapability: "dashboard.view", activeMatch: "exact", priority: 1 },
    { id: "escritorio", label: "Meu Escritório", route: "/admin/escritorio", requiredCapability: "business_office.view", activeMatch: "prefix", priority: 2 },
    { id: "rec_os", label: "REC OS", route: "/admin/contentos", requiredCapability: "content.view", activeMatch: "prefix", priority: 3 },
    { id: "crm", label: "CRM", route: "/admin/leads", requiredCapability: "crm.view", activeMatch: "prefix", priority: 4 },
  ],
  agency: [
    { id: "inicio", label: "Início", route: "/admin/dashboard", requiredCapability: "dashboard.view", activeMatch: "exact", priority: 1 },
    { id: "rec_os", label: "REC OS", route: "/admin/contentos", requiredCapability: "content.view", activeMatch: "prefix", priority: 2 },
    { id: "operacao", label: "Operação", route: "/admin/operacional", requiredCapability: "operations.view", activeMatch: "prefix", priority: 3 },
    { id: "clientes", label: "Clientes", route: "/admin/clientes", requiredCapability: "clients.view", activeMatch: "prefix", priority: 4 },
  ],
  agency_client: [
    { id: "inicio", label: "Início", route: "/admin/dashboard", requiredCapability: "dashboard.view", activeMatch: "exact", priority: 1 },
    { id: "conteudos", label: "Conteúdos", route: "/admin/contentos", requiredCapability: "content.view", activeMatch: "prefix", priority: 2 },
    { id: "aprovacoes", label: "Aprovações", route: "/admin/contentos/aprovacoes", requiredCapability: "content.approve", activeMatch: "prefix", priority: 3 },
    { id: "calendario", label: "Calendário", route: "/admin/calendario", requiredCapability: "calendar.view", activeMatch: "prefix", priority: 4 },
  ],
  direct_business: [
    { id: "inicio", label: "Início", route: "/admin/dashboard", requiredCapability: "dashboard.view", activeMatch: "exact", priority: 1 },
    { id: "meu_negocio", label: "Meu Negócio", route: "/admin/meu-negocio", requiredCapability: "business.view", activeMatch: "prefix", priority: 2 },
    { id: "crm", label: "CRM", route: "/admin/leads", requiredCapability: "crm.view", activeMatch: "prefix", priority: 3 },
    { id: "calendario", label: "Calendário", route: "/admin/calendario", requiredCapability: "calendar.view", activeMatch: "prefix", priority: 4 },
  ],
};

export const SURFACE_BOTTOM_NAV_PRIMARY: Record<WorkspaceSurface, string[]> = Object.fromEntries(
  (Object.entries(SURFACE_BOTTOM_NAV_ITEMS) as [WorkspaceSurface, SurfaceBottomNavItem[]][])
    .map(([surface, items]) => [surface, items.map((i) => i.route)]),
) as Record<WorkspaceSurface, string[]>;

export const SURFACE_BOTTOM_NAV_LABEL: Record<WorkspaceSurface, string[]> = Object.fromEntries(
  (Object.entries(SURFACE_BOTTOM_NAV_ITEMS) as [WorkspaceSurface, SurfaceBottomNavItem[]][])
    .map(([surface, items]) => [surface, items.map((i) => i.label)]),
) as Record<WorkspaceSurface, string[]>;

export const MAX_BOTTOM_NAV_ITEMS = 5; // 4 fixos + "Mais"

for (const surface of Object.keys(SURFACE_BOTTOM_NAV_ITEMS) as WorkspaceSurface[]) {
  if (SURFACE_BOTTOM_NAV_ITEMS[surface].length + 1 > MAX_BOTTOM_NAV_ITEMS) {
    throw new Error(`SURFACE_BOTTOM_NAV_ITEMS[${surface}] excede o máximo de ${MAX_BOTTOM_NAV_ITEMS} itens (4 fixos + Mais).`);
  }
}
