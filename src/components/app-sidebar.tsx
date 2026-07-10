"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Target, FolderOpen, BarChart3,
  FileText, DollarSign, Settings,
  Home, Image, CheckSquare, TrendingUp, Wallet,
  Archive, MessageSquare, HelpCircle, BookOpen,
  Sparkles,
  Map, ShoppingBag, Eye, Flag,
  CreditCard, FileSignature, Receipt, AlertTriangle,
  GraduationCap, BookMarked, Play, Package, Activity,
  LogOut, KanbanSquare, ClipboardList, CalendarDays, UserCheck,
  ScrollText, Palette, Video, MousePointerClick, Link2, SlidersHorizontal,
  Shield,
} from "lucide-react";
import { RecDropIcon } from "@/components/icons/RecDropIcon";

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
      { href: "/admin/inicio",            label: "Início",           icon: Home },
      { href: "/admin/dashboard",         label: "Dashboard",        icon: LayoutDashboard },
      { href: "/admin/contentos",         label: "REC OS",           icon: RecDropIcon },
      { href: "/admin/operacional",       label: "Operacional",      icon: KanbanSquare },
      { href: "/admin/clientes",          label: "Clientes",         icon: Users },
      { href: "/admin/relatorios",        label: "Dados & Insights", icon: BarChart3 },
      { href: "/admin/financeiro",        label: "Financeiro",       icon: DollarSign },
      { href: "/admin/super/billing",     label: "Billing & Planos", icon: CreditCard },
      { href: "/admin/super/accounts",    label: "Contas",           icon: Shield },
      { href: "/admin/conexoes",          label: "Integrações",      icon: Link2 },
      { href: "/admin/configuracoes",     label: "Configurações",    icon: Settings },
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
      { href: "/client/solicitacoes",  label: "Solicitações", icon: MessageSquare },
      { href: "/client/suporte",       label: "Suporte",      icon: HelpCircle },
      { href: "/client/configuracoes", label: "Configurações",icon: SlidersHorizontal },
    ],
  },
  contentos: {
    logo: "R",
    logoColor: "bg-red-600",
    title: "REC OS",
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
  /** Deixa o fundo translúcido (usado na tela Início, sobre o vídeo) em vez do bg-slate-900 sólido */
  transparent?: boolean;
}

export function AppSidebar({ variant, userName = "Usuário", userRole = "", onSignOut, badges, hideRoutes, transparent }: AppSidebarProps) {
  const pathname = usePathname();
  const config = configs[variant];

  return (
    <aside
      className={cn(
        "w-16 flex flex-col items-center h-full flex-shrink-0 transition-colors",
        transparent
          ? "bg-black/25 backdrop-blur-md border-r border-white/10"
          : "bg-slate-900"
      )}
    >
      <div className="py-4 border-b border-slate-800 w-full flex justify-center">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black", config.logoColor)} title={config.title}>
          {config.logo}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 flex flex-col items-center gap-1 w-full px-2">
        {config.nav.filter(({ href }) => !hideRoutes?.includes(href)).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const badge  = badges?.[href] ?? 0;
          return (
            <Link
              key={href}
              href={href}
              title={label}
              data-active={active ? "true" : "false"}
              className={cn(
                "relative flex items-center justify-center w-11 h-11 rounded-xl transition-all",
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              {badge > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="py-3 border-t border-slate-800 w-full flex flex-col items-center gap-2">
        <div
          className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          title={`${userName}${userRole ? ` · ${userRole}` : ""}`}
        >
          {userName.slice(0, 2).toUpperCase()}
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
    </aside>
  );
}
