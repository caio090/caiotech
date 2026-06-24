import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import { ContentosSubNav } from "../_contentos-subnav";
import { PageHeader } from "@/components/page-header";
import { ClipboardList } from "lucide-react";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { getContentOSSuggestions } from "@/lib/ai-suggestions";

export default async function AdminContentosBaseEstrategicaPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params   = await searchParams;
  const clientId = params.client ?? null;

  if (!clientId) redirect("/admin/contentos/selecionar-cliente");

  let companyName = "";
  let onboarding: Record<string, string | string[] | null> | null = null;
  let clientInfo: { segment?: string | null; city?: string | null } | null = null;
  let suggestions: Awaited<ReturnType<typeof getContentOSSuggestions>> = [];

  if (isSupabaseConfigured) {
    const valid = await validateContentOSClient(clientId);
    if (!valid) redirect("/admin/contentos/selecionar-cliente");
    companyName = valid.company_name ?? "";

    try {
      const supabase = await createServerSupabaseClient();
      const { data: onb } = await supabase
        .from("onboarding_profiles")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();

      if (onb) {
        onboarding = onb as Record<string, string | string[] | null>;
      }

      const { data: client } = await supabase
        .from("clients")
        .select("segment, city")
        .eq("id", clientId)
        .maybeSingle();
      clientInfo = client;
      suggestions = await getContentOSSuggestions(supabase, clientId);
    } catch {}
  }

  const seg    = (onboarding?.segment as string) ?? clientInfo?.segment ?? null;
  const city   = (onboarding?.city   as string) ?? clientInfo?.city   ?? null;
  const insta  = onboarding?.instagram as string ?? null;
  const tom    = onboarding?.tone_of_voice as string[] ?? null;
  const obj    = onboarding?.objective_primary as string ?? null;
  const objs   = onboarding?.objective_secondary as string[] ?? null;
  const redes  = onboarding?.social_channels as string[] ?? null;
  const brand  = (onboarding?.brand_name as string) ?? companyName;

  const TONE_LABELS: Record<string, string> = {
    profissional: "💼 Profissional", direto: "⚡ Direto", acolhedor: "🤗 Acolhedor",
    educativo: "📚 Educativo", popular: "🎉 Popular", sofisticado: "✨ Sofisticado",
    divertido: "😄 Divertido", tecnico: "🔧 Técnico", tradicional: "🏛️ Tradicional",
  };
  const OBJ_LABELS: Record<string, string> = {
    vender: "💰 Vender mais", leads: "🎯 Gerar leads", autoridade: "🏆 Autoridade",
    engajamento: "❤️ Engajamento", marketing: "📊 Marketing", atendimento: "💬 Atendimento",
  };

  const hasData = !!onboarding;

  return (
    <>
      <ContentosSubNav />
      <PageHeader
        title="Base Estratégica"
        description={`Informações estratégicas de ${brand || companyName}`}
      />
      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} compact className="mb-5" />
      )}

      {!hasData && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-6 flex items-start gap-3">
          <ClipboardList className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-bold text-amber-800">Diagnóstico não preenchido</p>
            <p className="text-xs text-amber-700 mt-0.5">
              O cliente ainda não completou o diagnóstico de onboarding. As informações estratégicas ficarão disponíveis após esse preenchimento.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">

        {/* Identidade da marca */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-4">Identidade da Marca</p>
          <div className="space-y-3">
            <Row label="Nome da marca" value={brand} />
            <Row label="Segmento" value={seg} />
            <Row label="Cidade" value={city} />
            <Row label="Instagram" value={insta} />
          </div>
        </div>

        {/* Canais e tom */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-4">Posicionamento</p>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Tom de voz</p>
              <div className="flex flex-wrap gap-1.5">
                {tom?.map((t) => (
                  <span key={t} className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full">
                    {TONE_LABELS[t] ?? t}
                  </span>
                )) ?? <span className="text-xs text-gray-300">Não definido</span>}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Objetivo principal</p>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                {obj ? (OBJ_LABELS[obj] ?? obj) : "—"}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Objetivos secundários</p>
              <div className="flex flex-wrap gap-1.5">
                {objs?.map((o) => (
                  <span key={o} className="text-[10px] font-medium bg-gray-50 text-gray-600 border border-gray-100 px-2 py-0.5 rounded-full">
                    {OBJ_LABELS[o] ?? o}
                  </span>
                )) ?? <span className="text-xs text-gray-300">Não definido</span>}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Canais sociais</p>
              <div className="flex flex-wrap gap-1.5">
                {redes?.map((r) => (
                  <span key={r} className="text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">{r}</span>
                )) ?? <span className="text-xs text-gray-300">Não definido</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Documentos estratégicos (visão futura) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-3">Documentos Estratégicos · Fase Futura</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: "📊", label: "Curva ABC", desc: "Produtos mais vendidos" },
              { icon: "📈", label: "Relatório de Vendas", desc: "Dados de performance comercial" },
              { icon: "🎯", label: "Persona", desc: "Público-alvo detalhado" },
              { icon: "🏆", label: "Diferenciais", desc: "Propostas de valor únicas" },
              { icon: "📱", label: "Instagram Insights", desc: "Dados de alcance e engajamento" },
              { icon: "💬", label: "Perguntas Frequentes", desc: "O que o cliente mais pergunta" },
              { icon: "🗂️", label: "Campanhas Anteriores", desc: "Histórico de resultados" },
              { icon: "📋", label: "Diagnóstico Comercial", desc: "Gargalos e oportunidades" },
            ].map((d) => (
              <div key={d.label} className="bg-white/70 rounded-xl border border-indigo-100 px-3 py-2.5">
                <p className="text-base mb-1">{d.icon}</p>
                <p className="text-xs font-bold text-gray-800">{d.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{d.desc}</p>
                <span className="text-[9px] font-bold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded-full mt-1.5 inline-block">Em breve</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-semibold text-gray-800 text-right max-w-[60%] truncate">
        {value ?? <span className="text-gray-300 font-normal">—</span>}
      </span>
    </div>
  );
}
