// Registro central das rotas administrativas canônicas do LOKAT OS.
// Não substitui a navegação da sidebar (src/components/app-sidebar.tsx já é
// a fonte única reutilizada por sidebar/mobile-nav/layouts) — serve para
// auditoria e para o teste de existência de rotas, que não deve depender de
// strings soltas espalhadas em scripts.

export type AdminRouteModule = "rec_os" | "meu_negocio" | "status" | "editor_os" | "integracoes";
export type AdminRouteVisibility = "primary" | "secondary" | "internal";

/**
 * Fase 18 do hotfix canônico 1.0.1 — como cada rota reage à ausência de
 * `?client=` na URL, confirmado lendo o código de cada página (não uma
 * intenção):
 * - global_supported: nunca redireciona; sem client, mostra "todos os
 *   clientes" com dado real agregado.
 * - client_required: nunca redireciona; sem client, mostra um seletor
 *   pesquisável inline na própria rota.
 * - content_required: precisa de client + um conteúdo específico; sem
 *   qualquer um dos dois, mostra sua própria landing/estado, nunca sai da
 *   rota.
 * - alias: rota antiga preservada só como redirect para a rota canônica,
 *   preservando os parâmetros relevantes.
 */
export type AdminRouteContextMode = "global_supported" | "client_required" | "content_required" | "alias";

export interface AdminRouteDef {
  id: string;
  label: string;
  href: string;
  module: AdminRouteModule;
  preserveClient: boolean;
  visibility: AdminRouteVisibility;
  contextMode: AdminRouteContextMode;
  statusAreaId?: string;
}

export const ADMIN_ROUTES: AdminRouteDef[] = [
  { id: "rec_os_hub",        label: "REC OS",              href: "/admin/contentos",                     module: "rec_os",      preserveClient: true,  visibility: "primary",   contextMode: "global_supported", statusAreaId: "rec_os_global_hub" },
  { id: "rec_os_radar",      label: "Radar",                href: "/admin/contentos/radar",                module: "rec_os",      preserveClient: true,  visibility: "primary",   contextMode: "global_supported" },
  { id: "rec_os_criar",      label: "Criar conteúdo",       href: "/admin/contentos/criar",                module: "rec_os",      preserveClient: true,  visibility: "primary",   contextMode: "client_required" },
  { id: "rec_os_producao",   label: "Produção",              href: "/admin/contentos/producao",             module: "rec_os",      preserveClient: true,  visibility: "primary",   contextMode: "global_supported", statusAreaId: "rec_os_global_production" },
  { id: "rec_os_aprovacoes", label: "Aprovações",            href: "/admin/contentos/aprovacoes",           module: "rec_os",      preserveClient: true,  visibility: "primary",   contextMode: "global_supported", statusAreaId: "rec_os_global_approvals" },
  { id: "rec_os_calendario", label: "Calendário",            href: "/admin/calendario",                     module: "rec_os",      preserveClient: true,  visibility: "primary",   contextMode: "global_supported" },
  { id: "rec_os_calendario_alias", label: "Calendário (alias legado)", href: "/admin/contentos/calendario", module: "rec_os",      preserveClient: true,  visibility: "secondary", contextMode: "alias" },
  { id: "rec_os_resultados", label: "Resultados",            href: "/admin/contentos/resultados",           module: "rec_os",      preserveClient: true,  visibility: "primary",   contextMode: "global_supported" },
  // Canônica real é /admin/conexoes (confirmado em _contentos-subnav.tsx);
  // não existe /admin/contentos/conexoes — não foi criada uma rota nova.
  { id: "rec_os_conexoes",   label: "Conexões",              href: "/admin/conexoes",                       module: "integracoes", preserveClient: false, visibility: "primary",   contextMode: "global_supported" },
  { id: "editor_os",         label: "EditorOS",              href: "/admin/contentos/editor-os",            module: "editor_os",   preserveClient: true,  visibility: "secondary", contextMode: "content_required" },
  { id: "rec_os_selecionar_cliente", label: "Selecionar cliente (alias)", href: "/admin/contentos/selecionar-cliente", module: "rec_os", preserveClient: true, visibility: "secondary", contextMode: "alias" },
  { id: "meu_negocio",       label: "Meu Negócio",           href: "/admin/meu-negocio",                    module: "meu_negocio", preserveClient: false, visibility: "primary",   contextMode: "global_supported", statusAreaId: "business_os_preview" },
  { id: "status",            label: "Status",                href: "/admin/status",                         module: "status",      preserveClient: false, visibility: "internal",  contextMode: "global_supported" },
];
