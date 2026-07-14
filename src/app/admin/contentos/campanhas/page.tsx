import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
import {
  Flag, Plus, Target, CalendarDays, Users, TrendingUp, Rocket,
  BookOpen, Sparkles, Globe, DollarSign, BarChart2
} from "lucide-react";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { getContentOSSuggestions } from "@/lib/ai-suggestions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";

type Tab = "campanhas" | "estrategia" | "trafego";

const TABS: { id: Tab; label: string }[] = [
  { id: "campanhas",  label: "Campanhas" },
  { id: "estrategia", label: "Estratégia" },
  { id: "trafego",    label: "Tráfego" },
];

export default async function AdminContentosCampanhasPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; tab?: string }>;
}) {
  const params   = await searchParams;
  const clientId = params.client ?? null;
  const tab      = (params.tab ?? "campanhas") as Tab;

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

  function tabHref(t: Tab) {
    return `/admin/contentos/campanhas?tab=${t}&client=${clientId}`;
  }

  return (
    <>
      <ContentosSubNavServer />

      <div className="mb-5">
        <h1 className="text-lg font-bold text-gray-900">Campanhas</h1>
        <p className="text-xs text-gray-400 mt-0.5">{companyName}</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-100">
        {TABS.map(({ id, label }) => {
          const active = tab === id;
          return (
            <Link
              key={id}
              href={tabHref(id)}
              className={`px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${
                active
                  ? "border-purple-600 text-purple-700 bg-purple-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} compact className="mb-5" />
      )}

      {/* ── CAMPANHAS ────────────────────────────────────────────────────────── */}
      {tab === "campanhas" && (
        <>
          <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
            <Flag className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-indigo-800">Gestão de campanhas em desenvolvimento</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Ciclos estratégicos do cliente — Copa, datas comemorativas, campanhas institucionais, tráfego e muito mais.
                Cada campanha terá objetivo, período, conteúdos, verba e resultado.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[
              { icon: Target,       label: "Objetivo",          desc: "Vender, leads, engajamento" },
              { icon: CalendarDays, label: "Período",           desc: "Início, fim e datas-chave" },
              { icon: Users,        label: "Público",           desc: "Persona e segmentação" },
              { icon: TrendingUp,   label: "Verba sugerida",    desc: "Orçamento e canal" },
              { icon: Flag,         label: "Status",            desc: "Planejada, ativa, finalizada" },
              { icon: Plus,         label: "Conteúdos",         desc: "Pautas ligadas à campanha" },
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

          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Rocket className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-bold text-gray-700 mb-1">Nenhuma campanha criada ainda</p>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Crie uma campanha para organizar conteúdos, canais, prazos e metas em um único plano estratégico.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              <button disabled className="flex items-center gap-1.5 text-xs font-bold text-white bg-purple-600 px-3 py-2 rounded-xl opacity-50 cursor-not-allowed">
                <Plus className="w-3.5 h-3.5" /> Criar campanha
              </button>
              <button disabled className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-xl opacity-50 cursor-not-allowed">
                <BookOpen className="w-3.5 h-3.5" /> A partir da base estratégica
              </button>
              <button disabled className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-xl opacity-50 cursor-not-allowed">
                <Sparkles className="w-3.5 h-3.5" /> A partir de tendência
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-3">Funcionalidade em desenvolvimento</p>
          </div>
        </>
      )}

      {/* ── ESTRATÉGIA ───────────────────────────────────────────────────────── */}
      {tab === "estrategia" && (
        <div className="space-y-5">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3">
            <BookOpen className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-indigo-800">Base Estratégica</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Contexto permanente da marca — posicionamento, público-alvo, diferenciais, tom de voz e referências.
                Esta base alimenta todas as campanhas e sugestões de pauta.
              </p>
            </div>
          </div>

          {[
            { label: "Posicionamento da marca",    desc: "Por que a marca existe e o que a diferencia",  done: false },
            { label: "Público-alvo e persona",      desc: "Perfil detalhado de quem a marca quer alcançar", done: false },
            { label: "Tom de voz e linguagem",      desc: "Como a marca fala, o que evita e o que usa",    done: false },
            { label: "Calendário estratégico",      desc: "Datas, sazonalidades e momentos do segmento",   done: false },
            { label: "Referências de conteúdo",     desc: "Marcas e criadores que inspiram o cliente",     done: false },
            { label: "Diferenciais competitivos",   desc: "O que torna o cliente único no mercado",        done: false },
          ].map(({ label, desc, done }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${done ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                {done ? "Preenchido" : "Pendente"}
              </span>
            </div>
          ))}

          <p className="text-[10px] text-gray-400 text-center">
            Preenchimento da base estratégica estará disponível no formulário de contexto da marca
          </p>
        </div>
      )}

      {/* ── TRÁFEGO ──────────────────────────────────────────────────────────── */}
      {tab === "trafego" && (
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
            <Globe className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-800">Tráfego pago · Visão em desenvolvimento</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Gestão de campanhas de tráfego pago — Meta Ads, Google Ads e outros canais.
                CPM, CPC, conversão e verba por objetivo.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: Users,      label: "Público",        desc: "Segmentação e persona" },
              { icon: DollarSign, label: "Verba",          desc: "Budget e distribuição" },
              { icon: BarChart2,  label: "Resultado",      desc: "CPM, CPC, conversão" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-xs font-bold text-gray-800">{label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-bold text-gray-700 mb-1">Nenhuma campanha de tráfego ativa</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              A gestão de tráfego pago estará integrada ao Meta Ads nesta seção.
              Criação, distribuição, monitoramento e otimização em um painel unificado.
            </p>
            <span className="inline-block mt-4 text-[10px] bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
              Em desenvolvimento
            </span>
          </div>
        </div>
      )}
    </>
  );
}
