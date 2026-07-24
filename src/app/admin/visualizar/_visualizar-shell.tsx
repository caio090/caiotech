"use client";

import Link from "next/link";
import { Users, FileText, TrendingUp, DollarSign, Plug, Settings, Building2 } from "lucide-react";
import type { WorkspaceContext } from "@/lib/workspaces/types";
import { SURFACE_LABELS } from "@/config/workspace-capabilities";
import { WorkspaceCapabilityGate } from "@/components/workspaces/workspace-capability-gate";

interface NavCard { icon: React.ElementType; label: string; href: string | null; capability: Parameters<typeof WorkspaceCapabilityGate>[0]["capability"] }

const AGENCY_NAV: NavCard[] = [
  { icon: Users, label: "Clientes", href: null, capability: "agency.manage_clients" },
  { icon: FileText, label: "REC OS (multi-cliente)", href: "/admin/contentos", capability: "agency.view_multi_client_rec_os" },
  { icon: TrendingUp, label: "Relatórios", href: "/admin/relatorios", capability: "agency.view_multi_client_reports" },
  { icon: Settings, label: "Equipe", href: "/admin/equipe", capability: "agency.manage_team" },
];

const DIRECT_BUSINESS_NAV: NavCard[] = [
  { icon: Building2, label: "Meu Negócio", href: "/admin/meu-negocio", capability: "business.manage_own_business" },
  { icon: FileText, label: "REC OS", href: "/admin/contentos", capability: "business.view_own_rec_os" },
  { icon: TrendingUp, label: "Relatórios", href: "/admin/relatorios", capability: "business.view_own_reports" },
  { icon: DollarSign, label: "Financeiro", href: "/admin/financeiro", capability: "business.manage_own_finance" },
  { icon: Plug, label: "Integrações", href: "/admin/conexoes", capability: "business.manage_own_integrations" },
];

const AGENCY_CLIENT_NAV: NavCard[] = [
  { icon: FileText, label: "Conteúdos", href: "/client/conteudos", capability: "client_portal.view_content" },
  { icon: Users, label: "Aprovações", href: "/client/aprovacoes", capability: "client_portal.approve_content" },
  { icon: TrendingUp, label: "Calendário", href: "/client/calendario", capability: "client_portal.view_calendar" },
  { icon: DollarSign, label: "Financeiro", href: "/client/financeiro", capability: "client_portal.view_finance" },
];

export function VisualizarShell({ context, isBlueprint }: { context: WorkspaceContext; isBlueprint?: boolean }) {
  const nav = context.surface === "agency" ? AGENCY_NAV : context.surface === "direct_business" ? DIRECT_BUSINESS_NAV : AGENCY_CLIENT_NAV;
  const clientQuery = !isBlueprint && context.workspaceId ? `?client=${context.workspaceId}` : "";

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">{SURFACE_LABELS[context.surface]}</p>
        <h1 className="text-xl font-black text-gray-900">{context.workspaceName}</h1>
        {context.surface === "agency_client" && (
          // Fase 4 do hotfix 1.0.4 — não deve mais cair no "—" silencioso:
          // context.ts (blueprint) e preview.ts (real) agora sempre resolvem
          // parentWorkspaceName ou falham fechado antes de chegar aqui. O
          // fallback abaixo é só uma rede de segurança, nunca o caminho normal.
          <p className="text-xs text-gray-400 mt-1">
            Atendido por: {context.parentWorkspaceName ?? "Relação não confirmada"}
          </p>
        )}
        {isBlueprint && (
          <span className="inline-block mt-2 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
            Estrutura demonstrativa — nenhum dado real
          </span>
        )}
      </div>

      {!isBlueprint && (
        <p className="text-[10px] text-gray-400 mb-4">
          Os atalhos abaixo abrem as páginas reais já existentes com este cliente selecionado. O bloqueio de escrita
          desta visualização cobre as ações desta tela; páginas reais ainda não recebem o sinalizador de somente
          leitura — como Super Admin você já tem acesso de escrita normal a este cliente de qualquer forma.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {nav.map(({ icon: Icon, label, href, capability }) => (
          <WorkspaceCapabilityGate key={label} context={context} capability={capability}>
            {href && !isBlueprint ? (
              <Link href={`${href}${clientQuery}`} className="flex flex-col items-center gap-2 bg-white border border-gray-100 rounded-2xl p-4 hover:border-purple-200 transition-colors w-full">
                <Icon className="w-5 h-5 text-purple-500" />
                <span className="text-xs font-bold text-gray-700 text-center">{label}</span>
              </Link>
            ) : (
              <div className="flex flex-col items-center gap-2 bg-gray-50 border border-gray-100 rounded-2xl p-4 w-full opacity-70">
                <Icon className="w-5 h-5 text-gray-400" />
                <span className="text-xs font-bold text-gray-500 text-center">{label}</span>
                <span className="text-[9px] text-gray-400">{isBlueprint ? "Blueprint" : "Sem dado ainda"}</span>
              </div>
            )}
          </WorkspaceCapabilityGate>
        ))}
      </div>

      {context.surface === "agency" && (
        <div className="mt-6 bg-gray-50 border border-gray-100 rounded-2xl p-5 text-center">
          <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-gray-600 mb-1">Carteira de clientes</p>
          <p className="text-[11px] text-gray-400">
            {isBlueprint
              ? "Nesta estrutura demonstrativa, a agência atenderia clientes vinculados — sem registros reais nesta sprint."
              : "Nenhum cliente vinculado a esta agência ainda."}
          </p>
        </div>
      )}
    </div>
  );
}
