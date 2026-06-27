import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import { ContentosSubNav } from "../_contentos-subnav";
import { PageHeader } from "@/components/page-header";
import { MousePointerClick, Target, DollarSign, Clock, CheckCircle2, AlertCircle, Megaphone, Sparkles, Smartphone, Link2 } from "lucide-react";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { getContentOSSuggestions } from "@/lib/ai-suggestions";

export default async function AdminContentosDistribuicaoPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params   = await searchParams;
  const clientId = params.client ?? null;

  if (!clientId) redirect("/admin/contentos/selecionar-cliente");

  let companyName = "";
  let suggestions: Awaited<ReturnType<typeof getContentOSSuggestions>> = [];
  let metaConnected = false;

  if (isSupabaseConfigured) {
    const valid = await validateContentOSClient(clientId);
    if (!valid) redirect("/admin/contentos/selecionar-cliente");
    companyName = valid.company_name ?? "";
    try {
      const supabase = await createServerSupabaseClient();
      suggestions = await getContentOSSuggestions(supabase, clientId);
      const { data: assets } = await supabase
        .from("client_meta_assets")
        .select("id")
        .eq("client_id", clientId)
        .limit(1)
        .maybeSingle();
      if (assets) metaConnected = true;
    } catch {}
  }

  return (
    <>
      <ContentosSubNav />
      <PageHeader
        title="Distribuição"
        description={`Como e onde o conteúdo de ${companyName} será publicado`}
      />
      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} compact className="mb-5" />
      )}

      {/* Badge Meta */}
      <div className={`mb-4 flex items-start gap-3 rounded-2xl border p-4 ${metaConnected ? "bg-indigo-50 border-indigo-100" : "bg-gray-50 border-gray-100"}`}>
        <Smartphone className={`w-4 h-4 flex-shrink-0 mt-0.5 ${metaConnected ? "text-indigo-500" : "text-gray-300"}`} strokeWidth={1.5} />
        <div className="flex-1">
          {metaConnected ? (
            <p className="text-xs font-bold text-indigo-800">Meta conectada para este cliente</p>
          ) : (
            <>
              <p className="text-xs font-bold text-gray-600">Meta não vinculada a este cliente</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Conecte a Meta para liberar leitura de canais e futuras publicações.
              </p>
              <a href="/admin/conexoes" className="inline-flex items-center gap-1.5 mt-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                <Link2 className="w-3 h-3" /> Ir para Conexões →
              </a>
            </>
          )}
        </div>
      </div>

      <div className="mb-6 bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-start gap-3">
        <MousePointerClick className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-orange-800">Módulo de distribuição em desenvolvimento</p>
          <p className="text-xs text-orange-600 mt-0.5">
            Esta aba mostrará onde cada conteúdo será publicado, canal, formato, data, se foi publicado, se tem tráfego pago e qual o status de veiculação.
            Publicação automática: em breve, requer aprovação Meta.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { icon: CheckCircle2,     label: "Conteúdo aprovado p/ tráfego", desc: "Identificar peças com potencial de anúncio",  color: "emerald" },
          { icon: Target,           label: "Objetivo e público",            desc: "Topo, meio ou fundo de funil, por segmento", color: "blue" },
          { icon: DollarSign,       label: "Verba sugerida",                desc: "Orçamento, duração e canal de veiculação",   color: "purple" },
          { icon: Clock,            label: "Status de tráfego",             desc: "Sugerido → aprovado → rodando → finalizado", color: "amber" },
          { icon: MousePointerClick,label: "Dados de desempenho",           desc: "Alcance, cliques, CPM, CPC e conversões",    color: "indigo" },
          { icon: AlertCircle,      label: "Otimização sugerida",           desc: "Alertas de custo alto ou baixo desempenho",  color: "red" },
        ].map(({ icon: Icon, label, desc, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className={`w-8 h-8 bg-${color}-50 rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 text-${color}-500`} />
            </div>
            <p className="text-xs font-bold text-gray-800">{label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>
            <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full mt-1.5 inline-block">Em breve</span>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center">
        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Megaphone className="w-6 h-6 text-orange-400" />
        </div>
        <p className="text-sm font-bold text-gray-700 mb-1">Nenhum conteúdo sugerido para tráfego</p>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          Quando um conteúdo aprovado tiver potencial de anúncio, ele aparecerá aqui com sugestão de objetivo, público, verba e status de veiculação.
        </p>
      </div>

      <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
        <p className="text-xs font-bold text-indigo-800 mb-1 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Visão futura</p>
        <p className="text-xs text-indigo-600">
          Integração com Meta Ads: enviar campanha para rascunho, criar conjunto de anúncios, subir criativo, puxar resultado,
          sugerir otimização, pausar anúncio com mal desempenho e reforçar anúncio com bom desempenho.
          Sempre com aprovação humana antes de gastar dinheiro.
        </p>
      </div>
    </>
  );
}
