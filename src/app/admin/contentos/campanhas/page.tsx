import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import { ContentosSubNav } from "../_contentos-subnav";
import { PageHeader } from "@/components/page-header";
import { Flag, Plus, Target, CalendarDays, Users, TrendingUp, Rocket, BookOpen, Sparkles } from "lucide-react";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { getContentOSSuggestions } from "@/lib/ai-suggestions";

export default async function AdminContentosCampanhasPage({
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
      <ContentosSubNav />
      <PageHeader
        title="Campanhas"
        description={`Ciclos estratégicos de ${companyName}`}
      />
      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} compact className="mb-5" />
      )}

      {/* Alerta de fase futura */}
      <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
        <Flag className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-indigo-800">Gestão de campanhas em desenvolvimento</p>
          <p className="text-xs text-indigo-600 mt-0.5">
            Esta aba centralizará os ciclos estratégicos do cliente — Copa, Datas comemorativas, Campanhas institucionais, Tráfego e muito mais.
            Cada campanha terá objetivo, período, conteúdos, verba e resultado.
          </p>
        </div>
      </div>

      {/* Estrutura futura visual */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { icon: Target,       label: "Objetivo da campanha",    desc: "Vender, leads, engajamento" },
          { icon: CalendarDays, label: "Período",                 desc: "Início, fim e datas-chave" },
          { icon: Users,        label: "Público",                 desc: "Persona e segmentação" },
          { icon: TrendingUp,   label: "Verba sugerida",          desc: "Orçamento e canal" },
          { icon: Flag,         label: "Status",                  desc: "Planejada, ativa, finalizada" },
          { icon: Plus,         label: "Conteúdos",               desc: "Pautas ligadas à campanha" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-xs font-bold text-gray-800">{label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 text-center mb-4">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Rocket className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-bold text-gray-700 mb-1">Nenhuma campanha criada ainda</p>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          Crie uma campanha para organizar conteúdos, canais, prazos e metas em um único plano estratégico.
        </p>

        {/* Ações */}
        <div className="mt-5 flex flex-wrap gap-2 justify-center">
          <button disabled className="flex items-center gap-1.5 text-xs font-bold text-white bg-purple-600 px-3 py-2 rounded-xl opacity-50 cursor-not-allowed">
            <Plus className="w-3.5 h-3.5" /> Criar campanha
          </button>
          <button disabled className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-xl opacity-50 cursor-not-allowed">
            <Flag className="w-3.5 h-3.5" /> Criar a partir de conteúdo
          </button>
          <button disabled className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-xl opacity-50 cursor-not-allowed">
            <Sparkles className="w-3.5 h-3.5" /> Criar a partir de tendência
          </button>
          <button disabled className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-xl opacity-50 cursor-not-allowed">
            <BookOpen className="w-3.5 h-3.5" /> Criar a partir da base estratégica
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-3">Funcionalidade em desenvolvimento</p>
      </div>
    </>
  );
}
