"use client";
import { useEffect, useState } from "react";
import { useOnboardingStore, getObjetivoPrincipal, getTomDeVoz } from "@/lib/onboarding-store";
import { PageHeader } from "@/components/page-header";
import { DashboardCard } from "@/components/dashboard-card";
import { StatusBadge } from "@/components/status-badge";
import { ApprovalCard } from "@/components/approval-card";
import { WelcomeBanner } from "@/components/welcome-banner";
import { mockProjects, mockApprovals, mockCalendarEvents, mockInvoices } from "@/data/mock-data";
import { FolderOpen, CheckSquare, Calendar, DollarSign, UtensilsCrossed, AtSign as AtSignIcon, Globe, Link2, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import type { ServerPageData, DbClient, DbOnboardingProfile } from "@/lib/supabase/types";
import { WelcomeTourModal } from "@/components/welcome-tour-modal";

const objetivoLabel: Record<string, string> = {
  vender:      "Vender mais",
  leads:       "Gerar leads",
  autoridade:  "Construir autoridade",
  engajamento: "Aumentar engajamento",
  marketing:   "Organizar marketing",
  atendimento: "Melhorar atendimento",
};

interface Props {
  serverData: ServerPageData | null;
}

export function ClientHomeContent({ serverData }: Props) {
  const localOnboarding = useOnboardingStore();

  // Busca client-side como fallback quando o server não trouxe dados.
  // O browser sempre tem sessão — não depende de cookie SSR.
  const serverHasReal = !!(serverData?.onboarding || serverData?.client);

  const [clientSideData, setClientSideData] = useState<{
    client: DbClient | null;
    onboarding: DbOnboardingProfile | null;
  }>({ client: null, onboarding: null });

  // isFetching: verdadeiro enquanto aguarda o fetch client-side.
  // Enquanto verdadeiro, não usamos localStorage para não mostrar dados de outra conta.
  const [isFetching, setIsFetching] = useState(
    isSupabaseConfigured && !serverHasReal
  );

  useEffect(() => {
    // isFetching already initialised to false when serverHasReal or Supabase not configured
    if (serverHasReal || !isSupabaseConfigured) return;

    let cancelled = false;
    async function fetchDirect() {
      try {
        // Chama API server-side que usa service role — não depende de RLS do browser
        const res = await fetch("/api/client/current");
        if (!res.ok || cancelled) {
          if (!cancelled) setIsFetching(false);
          return;
        }

        const json = await res.json() as { client: DbClient | null; clientId: string | null };
        const clientRow = json.client ?? null;

        let onboardingRow: DbOnboardingProfile | null = null;
        if (clientRow?.id) {
          const supabase = createClient();
          const { data: onbRow } = await supabase
            .from("onboarding_profiles")
            .select("*")
            .eq("client_id", clientRow.id)
            .maybeSingle();
          onboardingRow = (onbRow as DbOnboardingProfile) ?? null;
        }

        if (!cancelled) {
          setClientSideData({ client: clientRow, onboarding: onboardingRow });
          setIsFetching(false);
        }
      } catch (e) {
        console.error("[client/home] browser fetch error:", e);
        if (!cancelled) setIsFetching(false);
      }
    }

    fetchDirect();
    return () => { cancelled = true; };
  // serverHasReal is derived from serverData; run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dados reais: server > client-side fetch
  const onb = serverData?.onboarding ?? clientSideData.onboarding;
  const cli = serverData?.client    ?? clientSideData.client;

  const isRealData = !!(onb || cli);

  // Mock só em ambiente sem Supabase. Com Supabase configurado e usuário logado,
  // nunca inventar dados — se não houver client, mostrar empty state honesto.
  const useMock = !isSupabaseConfigured;

  const brandName = onb?.brand_name
    ?? cli?.company_name
    ?? (useMock ? localOnboarding.marca?.nome : null)
    ?? (useMock ? "Minha Marca" : (isFetching ? "..." : "Nenhuma empresa vinculada"));

  const firstName = serverData?.profile?.name?.split(" ")[0]
    ?? (useMock ? localOnboarding.cliente?.nome?.split(" ")[0] : null)
    ?? (isFetching ? "..." : null)
    ?? brandName;

  const segmento  = onb?.segment ?? (useMock ? localOnboarding.marca?.segmento : null);
  const principal = onb?.objective_primary ?? (useMock ? getObjetivoPrincipal(localOnboarding) : "");
  const tomDeVoz  = onb?.tone_of_voice ?? (useMock ? getTomDeVoz(localOnboarding) : []);
  const redes     = onb?.social_channels ?? (useMock ? localOnboarding.operacao?.redes : []) ?? [];
  const instagram = onb?.instagram ?? (useMock ? localOnboarding.marca?.instagram : null);

  const hasOnboarding = !!(onb?.brand_name ?? cli?.company_name ?? (useMock && localOnboarding.marca?.nome));

  // Mock data only used in demo mode — never shown when the account has real Supabase data
  const project          = useMock ? mockProjects.find((p) => p.clientId === "client-1") ?? null : null;
  const pendingApprovals = useMock ? mockApprovals.filter((a) => a.clientId === "client-1" && a.status === "pending") : [];
  const upcomingEvents   = useMock ? mockCalendarEvents.filter((e) => e.clientId === "client-1").slice(0, 3) : [];
  const invoices         = useMock ? mockInvoices.filter((i) => i.clientId === "client-1").slice(0, 2) : [];

  return (
    <div>
      <WelcomeTourModal accountType={useMock ? "business_owner" : "invited_client"} />
      <WelcomeBanner />

      {/* Badge de origem dos dados */}
      {isFetching ? (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Carregando…
          </span>
        </div>
      ) : isRealData ? (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
            ✓ Dados reais do Supabase
          </span>
        </div>
      ) : isSupabaseConfigured ? (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Sem empresa vinculada
          </span>
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Modo demonstração
          </span>
          <span className="text-xs text-gray-400">Dados do onboarding local</span>
        </div>
      )}

      {/* Brand identity header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 mb-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-lg font-black">
            {brandName[0]?.toUpperCase() ?? "M"}
          </div>
          <div>
            <h2 className="text-base font-black">{brandName}</h2>
            {segmento && <p className="text-xs text-white/70">{segmento}</p>}
          </div>
          {isRealData && (
            <span className="ml-auto text-[10px] font-bold bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full">
              ✓ Conta ativa
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {instagram && (
            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
              {instagram}
            </span>
          )}
          {redes.slice(0, 3).map((r) => (
            <span key={r} className="text-xs bg-white/10 text-white/80 px-2 py-0.5 rounded-full">{r}</span>
          ))}
        </div>

        {principal && (
          <div className="bg-white/10 rounded-xl px-3 py-2">
            <p className="text-xs text-white/60 mb-0.5">Objetivo principal</p>
            <p className="text-sm font-bold">{objetivoLabel[principal] ?? principal}</p>
          </div>
        )}
      </div>

      <PageHeader
        title={`Olá, ${firstName}!`}
        description={`Aqui está o resumo do projeto ${brandName} com a Lokat.`}
      />

      {/* Tom de voz chips */}
      {tomDeVoz.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          <span className="text-xs text-gray-400 self-center mr-1">Tom de voz:</span>
          {tomDeVoz.map((t) => (
            <span key={t} className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium capitalize">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DashboardCard
          title="Status do Projeto"
          value={project ? project.progress + "%" : "—"}
          subtitle={project ? "concluído" : "aguardando configuração"}
          icon={FolderOpen}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <DashboardCard
          title="Aprovações Pendentes"
          value={pendingApprovals.length}
          subtitle={pendingApprovals.length > 0 ? "aguardando você" : "nenhuma pendente"}
          icon={CheckSquare}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          alert={pendingApprovals.length > 0}
        />
        <DashboardCard
          title="Publicações esta semana"
          value={useMock ? 3 : 0}
          subtitle={useMock ? undefined : "aguardando integração"}
          icon={Calendar}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <DashboardCard
          title="Fatura em aberto"
          value={useMock ? formatCurrency(1800) : "—"}
          subtitle={useMock ? undefined : "aguardando configuração"}
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
      </div>

      {/* Conexões do negócio */}
      <div className="mb-8 bg-white border border-gray-100 rounded-2xl p-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Conexões do negócio</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* Instagram */}
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${instagram ? "bg-pink-50 border-pink-100" : "bg-gray-50 border-gray-100"}`}>
            <AtSignIcon className={`w-3.5 h-3.5 flex-shrink-0 ${instagram ? "text-pink-500" : "text-gray-300"}`} strokeWidth={1.5} />
            <div className="min-w-0">
              <p className={`text-[10px] font-bold truncate ${instagram ? "text-pink-700" : "text-gray-400"}`}>Instagram</p>
              <p className="text-[10px] text-gray-500 truncate">{instagram ? `@${instagram}` : "Não conectado"}</p>
            </div>
          </div>

          {/* Cardápio digital */}
          {segmento?.toLowerCase().includes("restaur") || segmento?.toLowerCase().includes("aliment") || segmento?.toLowerCase().includes("delivery") ? (
            <div className="flex items-center gap-2 rounded-xl border bg-gray-50 border-gray-100 px-3 py-2.5">
              <UtensilsCrossed className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" strokeWidth={1.5} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400">Cardápio Digital</p>
                <p className="text-[10px] text-gray-400 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />Em breve</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border bg-gray-50 border-gray-100 px-3 py-2.5">
              <Globe className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" strokeWidth={1.5} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400">Site / Landing</p>
                <p className="text-[10px] text-gray-400 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />Em breve</p>
              </div>
            </div>
          )}

          {/* Leads */}
          <div className="flex items-center gap-2 rounded-xl border bg-gray-50 border-gray-100 px-3 py-2.5">
            <Link2 className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" strokeWidth={1.5} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400">Leads</p>
              <p className="text-[10px] text-gray-400 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />Em breve</p>
            </div>
          </div>
        </div>
        <p className="text-[9px] text-gray-300 mt-2.5">Solicite à LOKAT para conectar canais do seu negócio.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Projeto */}
        <div>
          <h2 className="text-sm font-bold text-gray-800 mb-3">Seu Projeto</h2>
          {project ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{project.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{project.description}</p>
                </div>
                <StatusBadge status={project.status} />
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Progresso geral</span>
                  <span className="font-bold text-gray-700">{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                <span>{project.tasks.done} concluídas</span>
                <span>{project.tasks.total - project.tasks.done} pendentes</span>
                <span>{new Date(project.dueDate).toLocaleDateString("pt-BR")}</span>
              </div>
              <Link
                href="/client/projeto"
                className="mt-4 block text-center py-2 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-xl hover:bg-indigo-100 transition-colors"
              >
                Ver detalhes →
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
              <p className="text-sm font-semibold text-gray-600 mb-1">Projeto em configuração</p>
              <p className="text-xs text-gray-400">Quando a equipe configurar seu projeto, ele aparecerá aqui.</p>
            </div>
          )}

          <h2 className="text-sm font-bold text-gray-800 mb-3 mt-5">Próximas Publicações</h2>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 bg-pink-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-pink-500">{(e.platform ?? "IG")[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{e.title}</p>
                    <p className="text-xs text-gray-400">{e.platform} · {new Date(e.date).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <StatusBadge status={e.status as "scheduled"} />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-5 text-center">
              <p className="text-xs text-gray-400">Nenhuma publicação agendada ainda.</p>
            </div>
          )}
        </div>

        {/* Aprovações + Financeiro */}
        <div>
          <h2 className="text-sm font-bold text-gray-800 mb-3">Aprovações Pendentes</h2>
          {pendingApprovals.length > 0 ? (
            <div className="space-y-3">
              {pendingApprovals.map((a) => (
                <ApprovalCard key={a.id} {...a} />
              ))}
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
              <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-2"><CheckSquare className="w-5 h-5 text-emerald-500" /></div>
              <p className="text-sm font-semibold text-emerald-700">Sem pendências</p>
              <p className="text-xs text-emerald-600 mt-1">Nenhuma aprovação pendente no momento.</p>
            </div>
          )}

          <h2 className="text-sm font-bold text-gray-800 mb-3 mt-5">Financeiro</h2>
          {invoices.length > 0 ? (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div key={inv.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{inv.description}</p>
                    <p className="text-xs text-gray-400">{new Date(inv.dueDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(inv.amount)}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-5 text-center">
              <p className="text-xs text-gray-400">Nenhuma cobrança ativa no momento.</p>
              <Link href="/client/financeiro" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">Ver financeiro →</Link>
            </div>
          )}

          {/* Nudge onboarding quando não há dados */}
          {!hasOnboarding && (
            <div className="mt-5 bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-indigo-700 mb-1">Configure sua marca</p>
              <p className="text-xs text-indigo-600 mb-3">
                Complete o onboarding para personalizar seu painel com os dados da sua empresa.
              </p>
              <Link
                href="/onboarding/tipo"
                className="block text-center py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Completar onboarding →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
