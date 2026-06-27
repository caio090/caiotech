"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Target, FolderOpen, BarChart3,
  FileText, DollarSign, UsersRound, Settings, ChevronRight,
  Home, Image, CheckSquare, TrendingUp, Wallet,
  Archive, MessageSquare, HelpCircle, BookOpen,
  Sparkles,
  Map, ShoppingBag, Eye, Flag,
  CreditCard, FileSignature, Receipt, AlertTriangle,
  GraduationCap, BookMarked, Play, Package, Activity,
  LogOut, KanbanSquare, ClipboardList, CalendarDays, UserCheck,
  ScrollText, Palette, Video, MousePointerClick, Link2,
} from "lucide-react";

export type SidebarVariant = "admin" | "client" | "contentos" | "growth" | "financeiro" | "academy" | "operacional";

export const configs: Record<SidebarVariant, {
  logo: string;
  logoColor: string;
  title: string;
  nav: { href: string; label: string; icon: React.ElementType }[];
}> = {
  admin: {
    logo: "L",
    logoColor: "bg-indigo-600",
    title: "LOKAT OS",
    nav: [
      { href: "/admin/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
      { href: "/admin/contentos",    label: "ContentOS",    icon: Sparkles },
      { href: "/admin/recos",        label: "RecOS",        icon: Video },
      { href: "/admin/operacional",  label: "Operacional",  icon: KanbanSquare },
      { href: "/admin/clientes",     label: "Clientes",     icon: Users },
      { href: "/admin/leads",        label: "Leads",        icon: Target },
      { href: "/admin/projetos",     label: "Projetos",     icon: FolderOpen },
      { href: "/admin/diagnosticos", label: "Diagnósticos", icon: BarChart3 },
      { href: "/admin/relatorios",   label: "Relatórios",   icon: FileText },
      { href: "/admin/financeiro",   label: "Financeiro",   icon: DollarSign },
      { href: "/admin/equipe",       label: "Equipe",       icon: UsersRound },
      { href: "/admin/conexoes",     label: "Conexoes",     icon: Link2 },
      { href: "/admin/configuracoes",label: "Configurações",icon: Settings },
    ],
  },
  client: {
    logo: "C",
    logoColor: "bg-pink-500",
    title: "Meu Portal",
    nav: [
      { href: "/client/home",         label: "Início",       icon: Home },
      { href: "/client/projeto",      label: "Projeto",      icon: FolderOpen },
      { href: "/client/conteudos",    label: "Conteúdos",    icon: Image },
      { href: "/client/aprovacoes",   label: "Aprovações",   icon: CheckSquare },
      { href: "/client/calendario",   label: "Calendário",   icon: CalendarDays },
      { href: "/client/resultados",   label: "Resultados",   icon: TrendingUp },
      { href: "/client/financeiro",   label: "Financeiro",   icon: Wallet },
      { href: "/client/arquivos",     label: "Arquivos",     icon: Archive },
      { href: "/client/solicitacoes", label: "Solicitações", icon: MessageSquare },
      { href: "/client/suporte",      label: "Suporte",      icon: HelpCircle },
    ],
  },
  contentos: {
    logo: "C",
    logoColor: "bg-purple-600",
    title: "ContentOS",
    nav: [
      { href: "/contentos/home",             label: "Visão Geral",     icon: Home },
      { href: "/contentos/base-estrategica", label: "Base Estratégica",icon: BookOpen },
      { href: "/contentos/campanhas",        label: "Campanhas",       icon: Flag },
      { href: "/contentos/calendario",       label: "Calendário",      icon: CalendarDays },
      { href: "/contentos/producao",         label: "Produção",        icon: ScrollText },
      { href: "/contentos/distribuicao",     label: "Distribuição",    icon: MousePointerClick },
      { href: "/contentos/insights",         label: "Insights",        icon: BarChart3 },
      { href: "/contentos/aprovacoes",       label: "Aprovações",      icon: CheckSquare },
      { href: "/contentos/relatorios",       label: "Relatórios",      icon: FileText },
    ],
  },
  operacional: {
    logo: "L",
    logoColor: "bg-slate-700",
    title: "LOKAT OS",
    nav: [
      { href: "/operacional/dashboard",      label: "Dashboard",         icon: LayoutDashboard },
      { href: "/operacional/briefings",      label: "Briefings & Demandas", icon: ScrollText },
      { href: "/operacional/recos",          label: "RecOS",                icon: Video },
      { href: "/operacional/minhas-tarefas", label: "Minhas Tarefas",    icon: ClipboardList },
      { href: "/operacional/calendario",     label: "Calendário",        icon: CalendarDays },
      { href: "/operacional/perfil",         label: "Meu Perfil",        icon: UserCheck },
      { href: "/operacional/comercial",      label: "Comercial",         icon: TrendingUp },
    ],
  },
  growth: {
    logo: "G",
    logoColor: "bg-emerald-600",
    title: "GrowthOS",
    nav: [
      { href: "/growth/diagnosticos",  label: "Diagnósticos",   icon: Eye },
      { href: "/growth/plano-de-acao", label: "Plano de Ação",  icon: Map },
      { href: "/growth/funil",         label: "Funil de Vendas", icon: Target },
      { href: "/growth/ofertas",       label: "Ofertas",        icon: ShoppingBag },
      { href: "/growth/concorrentes",  label: "Concorrentes",   icon: Eye },
      { href: "/growth/metas",         label: "Metas",          icon: Flag },
    ],
  },
  financeiro: {
    logo: "F",
    logoColor: "bg-emerald-600",
    title: "FinanceOS",
    nav: [
      { href: "/financeiro/pagamentos",   label: "Pagamentos",   icon: CreditCard },
      { href: "/financeiro/contratos",    label: "Contratos",    icon: FileSignature },
      { href: "/financeiro/recibos",      label: "Recibos",      icon: Receipt },
      { href: "/financeiro/planos",       label: "Planos",       icon: ShoppingBag },
      { href: "/financeiro/inadimplencia",label: "Inadimplência",icon: AlertTriangle },
    ],
  },
  academy: {
    logo: "A",
    logoColor: "bg-amber-500",
    title: "Academy",
    nav: [
      { href: "/academy/home",      label: "Home",      icon: Home },
      { href: "/academy/cursos",    label: "Cursos",    icon: GraduationCap },
      { href: "/academy/curso",     label: "Meu Curso", icon: BookMarked },
      { href: "/academy/aula",      label: "Aula Atual",icon: Play },
      { href: "/academy/materiais", label: "Materiais", icon: Package },
      { href: "/academy/progresso", label: "Progresso", icon: Activity },
    ],
  },
};

// Exports for icon re-use in operacional pages
export { Palette, Video, ScrollText, MousePointerClick, UserCheck, ClipboardList };

interface AppSidebarProps {
  variant: SidebarVariant;
  userName?: string;
  userRole?: string;
  onSignOut?: () => void;
  badges?: Record<string, number>;
  /** Routes to hide from the nav (e.g. hide /operacional/comercial for non-comercial roles) */
  hideRoutes?: string[];
}

export function AppSidebar({ variant, userName = "Usuário", userRole = "", onSignOut, badges, hideRoutes }: AppSidebarProps) {
  const pathname = usePathname();
  const config = configs[variant];

  return (
    <aside className="w-56 bg-slate-900 flex flex-col h-full flex-shrink-0">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black", config.logoColor)}>
            {config.logo}
          </div>
          <span className="text-sm font-bold text-white">{config.title}</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-0.5">
        {config.nav.filter(({ href }) => !hideRoutes?.includes(href)).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const badge  = badges?.[href] ?? 0;
          return (
            <Link
              key={href}
              href={href}
              data-active={active ? "true" : "false"}
              className={cn(
                "lk-active-indicator flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all",
                active
                  ? "bg-white/10 text-white font-medium"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate flex-1">{label}</span>
              {badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
              {active && badge === 0 && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-800 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-slate-400 capitalize truncate">{userRole}</p>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0"
              title="Sair"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
