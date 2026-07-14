import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
import { PageHeader } from "@/components/page-header";
import { FileText, BarChart3, MessageSquare, Calendar, ClipboardList, TrendingUp, Clock, CheckSquare } from "lucide-react";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { getContentOSSuggestions } from "@/lib/ai-suggestions";

export default async function AdminContentosRelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params   = await searchParams;
  const clientId = params.client ?? null;

  if (!clientId) redirect("/admin/contentos/selecionar-cliente");

  let companyName = "";
  let suggestions: Awaited<ReturnType<typeof getContentOSSuggestions>> = [];

  if (isSupabaseConfigured) {
    const valid = await validateContentOSClient(clientId);
    if (!valid) redirect("/admin/contentos/selecionar-cliente");
    companyName = valid.company_name ?? "";
    try {
      const supabase = await createServerSupabaseClient();
      suggestions = await getContentOSSuggestions(supabase, clientId);
    } catch {}
  }

  return (
    <>
      <ContentosSubNavServer />
      <PageHeader
        title="Relatórios"
        description={`Resultados e análises para ${companyName}`}
      />
      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} compact className="mb-5" />
      )}

      <div className="mb-6 bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-start gap-3">
        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-gray-700">Relatórios em desenvolvimento</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Esta aba centralizará relatórios mensais por cliente: dados digitais, dados físicos (se disponíveis),
            comparativos de campanha, recomendações para o próximo ciclo e histórico de envios.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          {
            icon: BarChart3,     color: "purple",
            label: "Desempenho dos conteúdos",
            desc:  "Conteúdos produzidos, aprovados e publicados no período",
            badge: "Em breve",
          },
          {
            icon: CheckSquare,   color: "indigo",
            label: "Aprovações e gargalos",
            desc:  "Tempo médio de aprovação, revisões solicitadas e taxa de aprovação",
            badge: "Em breve",
          },
          {
            icon: FileText,      color: "blue",
            label: "PDF do relatório",
            desc:  "Geração automática de PDF com resumo executivo de conteúdo do período",
            badge: "Em breve",
          },
          {
            icon: TrendingUp,    color: "emerald",
            label: "Campanhas e formatos",
            desc:  "Quais campanhas foram executadas, formatos mais usados e canais",
            badge: "Em breve",
          },
          {
            icon: Clock,         color: "amber",
            label: "Tempo médio de produção",
            desc:  "Do briefing à publicação: onde está o gargalo de cada conteúdo",
            badge: "Em breve",
          },
          {
            icon: BarChart3,     color: "teal",
            label: "Próximos passos",
            desc:  "O que funcionou, o que ajustar e qual a direção para o próximo ciclo",
            badge: "Em breve",
          },
        ].map(({ icon: Icon, label, desc, badge, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className={`w-8 h-8 bg-${color}-50 rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 text-${color}-500`} />
            </div>
            <p className="text-xs font-bold text-gray-800">{label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 mb-2">{desc}</p>
            <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">{badge}</span>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center mb-4">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <ClipboardList className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-bold text-gray-700 mb-1">Nenhum relatório de conteúdo disponível</p>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          Os relatórios serão gerados automaticamente com base nos conteúdos produzidos, aprovados e publicados para este cliente.
        </p>
        <p className="text-[10px] text-gray-400 mt-3 italic">
          Esta funcionalidade será ativada em fase futura.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-500">
        💡 Dados comerciais e faturamento ficam em <strong>Financeiro / Relatórios gerais</strong>, não aqui.
        Este módulo é focado exclusivamente em conteúdo, campanhas e desempenho editorial.
      </div>
    </>
  );
}
