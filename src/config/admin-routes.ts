// Registro central das rotas administrativas canônicas do LOKAT OS.
// Não substitui a navegação da sidebar (src/components/app-sidebar.tsx já é
// a fonte única reutilizada por sidebar/mobile-nav/layouts) — serve para
// auditoria e para o teste de existência de rotas (Fase 12 da release
// canônica), que não deve depender de strings soltas espalhadas em scripts.

export type AdminRouteModule = "rec_os" | "meu_negocio" | "status" | "editor_os" | "integracoes";
export type AdminRouteVisibility = "primary" | "secondary" | "internal";

export interface AdminRouteDef {
  id: string;
  label: string;
  href: string;
  module: AdminRouteModule;
  preserveClient: boolean;
  visibility: AdminRouteVisibility;
  statusAreaId?: string;
}

export const ADMIN_ROUTES: AdminRouteDef[] = [
  { id: "rec_os_hub",        label: "REC OS",              href: "/admin/contentos",                     module: "rec_os",      preserveClient: true,  visibility: "primary",   statusAreaId: "rec_os_global_hub" },
  { id: "rec_os_radar",      label: "Radar",                href: "/admin/contentos/radar",                module: "rec_os",      preserveClient: true,  visibility: "primary" },
  { id: "rec_os_criar",      label: "Criar conteúdo",       href: "/admin/contentos/criar",                module: "rec_os",      preserveClient: true,  visibility: "primary" },
  { id: "rec_os_producao",   label: "Produção",              href: "/admin/contentos/producao",             module: "rec_os",      preserveClient: true,  visibility: "primary",   statusAreaId: "rec_os_global_production" },
  { id: "rec_os_aprovacoes", label: "Aprovações",            href: "/admin/contentos/aprovacoes",           module: "rec_os",      preserveClient: true,  visibility: "primary",   statusAreaId: "rec_os_global_approvals" },
  { id: "rec_os_calendario", label: "Calendário",            href: "/admin/contentos/calendario",           module: "rec_os",      preserveClient: true,  visibility: "primary" },
  { id: "rec_os_resultados", label: "Resultados",            href: "/admin/contentos/resultados",           module: "rec_os",      preserveClient: true,  visibility: "primary" },
  // Canônica real é /admin/conexoes (confirmado em _contentos-subnav.tsx);
  // não existe /admin/contentos/conexoes — não foi criada uma rota nova.
  { id: "rec_os_conexoes",   label: "Conexões",              href: "/admin/conexoes",                       module: "integracoes", preserveClient: false, visibility: "primary" },
  { id: "editor_os",         label: "EditorOS",              href: "/admin/contentos/editor-os",            module: "editor_os",   preserveClient: true,  visibility: "secondary" },
  { id: "rec_os_selecionar_cliente", label: "Selecionar cliente (redirect)", href: "/admin/contentos/selecionar-cliente", module: "rec_os", preserveClient: true, visibility: "secondary" },
  { id: "meu_negocio",       label: "Meu Negócio",           href: "/admin/meu-negocio",                    module: "meu_negocio", preserveClient: false, visibility: "primary",   statusAreaId: "business_os_preview" },
  { id: "status",            label: "Status",                href: "/admin/status",                         module: "status",      preserveClient: false, visibility: "internal" },
];
