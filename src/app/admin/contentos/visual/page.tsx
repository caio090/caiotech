import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import { ContentosSubNav } from "../_contentos-subnav";
import { PageHeader } from "@/components/page-header";
import {
  Sparkles, Zap, Layers, Image, CreditCard, AlertCircle, CheckCircle2,
  Clock, Link2, User, Package, Palette, Calendar, BarChart3, TrendingUp,
  Target, ArrowRight, Settings, History, PlusCircle, FolderOpen, Paperclip,
  Send, BookOpen, Lock,
} from "lucide-react";
import Link from "next/link";
import { isAiImageAvailable, activeProviderLabel } from "@/lib/ai/image-providers";
import { AI_PLANS, CREDIT_COSTS } from "@/lib/ai/credits";

/* ── Types ─────────────────────────────────────────────────── */

interface VisualContext {
  companyName: string;
  hasOnboarding: boolean;
  metaConnected: boolean;
  hasOlaClick: boolean;
  brandName: string | null;
  segment: string | null;
  toneOfVoice: string[] | null;
  creditWallet: { remaining_credits: number; monthly_quota: number; plan_key: string } | null;
}

/* ── Helpers ─────────────────────────────────────────────────── */

function ConnBadge({ label, ok, href }: { label: string; ok: boolean; href?: string }) {
  const inner = (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${ok ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-gray-50 text-gray-400 border-gray-200"}`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {label}
    </span>
  );
  if (!ok && href) return <Link href={href}>{inner}</Link>;
  return inner;
}

/* ── Pipeline Nodes ─────────────────────────────────────────── */

interface PipelineNode {
  id: string;
  label: string;
  subtitle: string;
  icon: typeof Sparkles;
  color: string;
  bg: string;
  border: string;
  badge?: string;
  isGlobal: boolean;
  isCentralizer?: boolean;
  isResult?: boolean;
  status: "active" | "connected" | "pending" | "ready";
}

function NodeCard({ node }: { node: PipelineNode }) {
  const statusColors = {
    active:    "bg-emerald-500",
    connected: "bg-blue-500",
    pending:   "bg-gray-300",
    ready:     "bg-purple-500",
  };

  return (
    <div className={`relative flex flex-col gap-1.5 rounded-xl border p-3 ${node.bg} ${node.border} ${node.isCentralizer ? "shadow-md" : ""} min-w-[120px] max-w-[140px]`}>
      {/* Status dot */}
      <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${statusColors[node.status]}`} />

      {/* Global badge */}
      {node.isGlobal && !node.isCentralizer && !node.isResult && (
        <span className="absolute -top-2 left-2 text-[8px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">Global</span>
      )}

      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${node.color} bg-white/60`}>
        <node.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-800 leading-tight">{node.label}</p>
        <p className="text-[9px] text-gray-400 leading-snug mt-0.5">{node.subtitle}</p>
      </div>
      {node.badge && (
        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border self-start ${node.bg} ${node.color}`}>{node.badge}</span>
      )}
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center flex-shrink-0 text-gray-200">
      <div className="h-px w-5 bg-gray-200" />
      <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4h6M4 1l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */

export default async function AdminContentosVisualPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params   = await searchParams;
  const clientId = params.client ?? null;

  if (!clientId) redirect("/admin/contentos/selecionar-cliente");

  const ctx: VisualContext = {
    companyName: "",
    hasOnboarding: false,
    metaConnected: false,
    hasOlaClick: false,
    brandName: null,
    segment: null,
    toneOfVoice: null,
    creditWallet: null,
  };

  if (isSupabaseConfigured) {
    const valid = await validateContentOSClient(clientId);
    if (!valid) redirect("/admin/contentos/selecionar-cliente");
    ctx.companyName = valid.company_name ?? "";

    try {
      const supabase = await createServerSupabaseClient();
      const [onbRes, metaRes, olaRes, walletRes] = await Promise.all([
        supabase.from("onboarding_profiles").select("brand_name,segment,tone_of_voice").eq("client_id", clientId).maybeSingle(),
        supabase.from("client_meta_assets").select("id").eq("client_id", clientId).limit(1).maybeSingle(),
        supabase.from("olaclick_connections").select("id").eq("client_id", clientId).eq("status", "connected").limit(1).maybeSingle(),
        supabase.from("ai_credit_wallet").select("remaining_credits,monthly_quota,plan_key").eq("client_id", clientId).maybeSingle(),
      ]);

      if (onbRes.data) {
        ctx.hasOnboarding = true;
        ctx.brandName     = onbRes.data.brand_name ?? null;
        ctx.segment       = onbRes.data.segment ?? null;
        ctx.toneOfVoice   = onbRes.data.tone_of_voice ?? null;
      }
      ctx.metaConnected = !!(metaRes.data && !metaRes.error);
      ctx.hasOlaClick   = !!(olaRes.data && !olaRes.error);
      if (walletRes.data && !walletRes.error) ctx.creditWallet = walletRes.data;
    } catch {}
  }

  const aiAvailable   = isAiImageAvailable();
  const providerLabel = activeProviderLabel();
  const displayName   = ctx.brandName ?? ctx.companyName;
  const defaultPlan   = AI_PLANS.basic;

  /* ── Pipeline nodes definition ── */
  const globalNodes: PipelineNode[] = [
    { id: "cliente",   label: "Cliente",           subtitle: displayName || "Nenhum",       icon: User,       color: "text-purple-600",  bg: "bg-purple-50",  border: "border-purple-100", isGlobal: true,  status: ctx.hasOnboarding ? "active" : "pending" },
    { id: "ativos",    label: "Ativos Globais",     subtitle: "Logo, pessoa, produto",        icon: FolderOpen, color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-100",   isGlobal: true,  status: "pending", badge: "Em breve" },
    { id: "contexto",  label: "Contexto",           subtitle: "Estratégia + tom de voz",      icon: BookOpen,   color: "text-indigo-600",  bg: "bg-indigo-50",  border: "border-indigo-100", isGlobal: true,  status: ctx.hasOnboarding ? "connected" : "pending" },
    { id: "comercial", label: "Dados Comerciais",   subtitle: "Cardápio Digital / relatório",         icon: BarChart3,  color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100",isGlobal: true,  status: ctx.hasOlaClick ? "connected" : "pending" },
    { id: "temporada", label: "Temporada",          subtitle: "Sazonalidade / trends",        icon: Calendar,   color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-100",  isGlobal: true,  status: "pending", badge: "Manual V1" },
  ];

  const specificNodes: PipelineNode[] = [
    { id: "referencia", label: "Referência Visual", subtitle: "Estilo, mood, inspiração",     icon: Image,      color: "text-pink-600",    bg: "bg-pink-50",    border: "border-pink-100",   isGlobal: false, status: "pending" },
    { id: "copy",       label: "Copy / Prompt",     subtitle: "Texto e instrução final",      icon: Sparkles,   color: "text-violet-600",  bg: "bg-violet-50",  border: "border-violet-100", isGlobal: false, status: "pending" },
  ];

  const centralizerNode: PipelineNode = {
    id: "centralizador", label: "■ Centralizador", subtitle: "Herança global → resultado", icon: Layers,
    color: "text-gray-700", bg: "bg-gray-900",  border: "border-gray-700", isGlobal: false, isCentralizer: true, status: "ready",
  };

  const resultNode: PipelineNode = {
    id: "resultado", label: "✦ Resultado",      subtitle: "Criativo gerado ou preparado", icon: Zap,
    color: "text-purple-300", bg: "bg-gradient-to-br from-purple-900 to-indigo-900", border: "border-purple-700", isGlobal: false, isResult: true, status: "pending",
  };

  return (
    <>
      <ContentosSubNav />
      <PageHeader
        title="PNG Vidigal"
        description={`Motor visual com IA para ${displayName || ctx.companyName}`}
      />

      {/* ── AI Provider Status ───────────────────────────────── */}
      {!aiAvailable ? (
        <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-xs font-bold text-amber-800">Estrutura pronta — geração real pendente</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Nenhum provedor de IA configurado. Configure <code className="bg-amber-100 px-1 rounded">AI_IMAGE_PROVIDER</code> + chave na Vercel para ativar a geração real.
              Tudo mais já funciona: pipeline, créditos, ativos, contexto e saídas.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
          <p className="text-xs font-bold text-emerald-700">Provedor ativo: {providerLabel}</p>
        </div>
      )}

      {/* ── Header row: Créditos + Conexões ─────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">

        {/* Créditos */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-purple-500" strokeWidth={1.5} />
            <p className="text-xs font-black text-purple-800">Créditos de IA</p>
            <span className="ml-auto text-[9px] font-bold text-purple-500 bg-purple-100 px-2 py-0.5 rounded-full uppercase">
              {ctx.creditWallet ? AI_PLANS[ctx.creditWallet.plan_key]?.label ?? ctx.creditWallet.plan_key : defaultPlan.label}
            </span>
          </div>
          {ctx.creditWallet ? (
            <>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-2xl font-black text-purple-800">{ctx.creditWallet.remaining_credits}</span>
                <span className="text-xs text-purple-400 mb-0.5">/ {ctx.creditWallet.monthly_quota} mensais</span>
              </div>
              <div className="w-full bg-purple-100 rounded-full h-1.5 mb-3">
                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (ctx.creditWallet.remaining_credits / ctx.creditWallet.monthly_quota) * 100)}%` }} />
              </div>
            </>
          ) : (
            <div className="mb-3">
              <p className="text-xs text-purple-500">Carteira não criada ainda.</p>
              <p className="text-[10px] text-purple-400 mt-0.5">Plano {defaultPlan.label} = {defaultPlan.monthlyCredits} créditos/mês</p>
            </div>
          )}
          <div className="space-y-1">
            {[
              ["Imagem simples",        CREDIT_COSTS.image_simple_1x],
              ["Com referência visual", CREDIT_COSTS.image_with_reference],
              ["Com pessoa/produto",    CREDIT_COSTS.image_with_person_or_product],
              ["Lote 4 variações",      CREDIT_COSTS.batch_4_variations],
            ].map(([label, cost]) => (
              <div key={String(label)} className="flex items-center justify-between text-[10px]">
                <span className="text-purple-600">{label}</span>
                <span className="font-bold text-purple-700">{cost} cr.</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-purple-300 mt-2 italic">Créditos internos LOKAT OS — não equivalem ao custo do fornecedor</p>
        </div>

        {/* Conexões */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Fontes conectadas</p>
          <div className="flex flex-col gap-2">
            <ConnBadge label="Base Estratégica"   ok={ctx.hasOnboarding}  href={`/admin/contentos/base-estrategica?client=${clientId}`} />
            <ConnBadge label="Meta / Instagram"   ok={ctx.metaConnected}  href="/admin/conexoes" />
            <ConnBadge label="Dados Comerciais"   ok={ctx.hasOlaClick}    href="/admin/conexoes" />
            <ConnBadge label="Google Drive"       ok={false} />
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-50">
            <button disabled className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-purple-600 text-white px-3 py-2 rounded-xl opacity-50 cursor-not-allowed">
              <PlusCircle className="w-3 h-3" /> Novo fluxo
            </button>
            <button disabled className="inline-flex items-center gap-1.5 text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl opacity-60 cursor-not-allowed">
              <History className="w-3 h-3" /> Histórico
            </button>
            <Link href={`/admin/contentos/base-estrategica?client=${clientId}`} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors">
              <Settings className="w-3 h-3" /> Ativos do cliente
            </Link>
          </div>
        </div>
      </div>

      {/* ── Pipeline por nós ────────────────────────────────── */}
      <div className="mb-6 bg-gray-50 border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Pipeline por nós</p>
          <span className="ml-auto text-[9px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">V1 Conceitual</span>
        </div>

        {/* Legenda */}
        <div className="flex gap-4 mb-4 text-[9px] font-bold">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />Global (herança)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />Específico (por resultado)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Conectado</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />Pendente</span>
        </div>

        {/* Pipeline row — scrollável */}
        <div className="overflow-x-auto pb-2">
          <div className="flex items-center gap-1.5 min-w-max">

            {/* Global nodes */}
            <div className="flex flex-col gap-2">
              {globalNodes.map((n) => <NodeCard key={n.id} node={n} />)}
            </div>

            <Arrow />

            {/* Centralizador */}
            <div className="flex flex-col items-center">
              <div className={`relative flex flex-col gap-1.5 rounded-xl border p-4 ${centralizerNode.bg} ${centralizerNode.border} shadow-lg min-w-[130px]`}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10">
                  <centralizerNode.icon className={`w-4 h-4 ${centralizerNode.color}`} strokeWidth={1.5} />
                </div>
                <p className={`text-xs font-black ${centralizerNode.color}`}>{centralizerNode.label}</p>
                <p className="text-[9px] text-gray-400">{centralizerNode.subtitle}</p>
              </div>
              <p className="text-[8px] text-gray-400 mt-1.5 font-bold uppercase tracking-wider">Herança global</p>
            </div>

            <Arrow />

            {/* Specific nodes */}
            <div className="flex flex-col gap-2">
              {specificNodes.map((n) => <NodeCard key={n.id} node={n} />)}
            </div>

            <Arrow />

            {/* Result node */}
            <div className="flex flex-col items-center">
              <div className={`relative flex flex-col gap-1.5 rounded-xl border p-4 ${resultNode.bg} ${resultNode.border} min-w-[130px]`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/10">
                    <resultNode.icon className={`w-3.5 h-3.5 ${resultNode.color}`} strokeWidth={1.5} />
                  </div>
                  {!aiAvailable && <Lock className="w-3 h-3 text-gray-500" strokeWidth={1.5} />}
                </div>
                <p className={`text-xs font-black ${resultNode.color}`}>{resultNode.label}</p>
                <p className="text-[9px] text-gray-400 leading-snug">{resultNode.subtitle}</p>
                <span className="text-[8px] font-bold text-purple-300 bg-white/5 border border-purple-700/30 px-1.5 py-0.5 rounded-full self-start">
                  {aiAvailable ? "Pronto para gerar" : "Aguardando IA"}
                </span>
              </div>

              {/* Output actions */}
              <div className="mt-2 flex flex-col gap-1">
                {[
                  { icon: Send,      label: "Enviar para aprovação" },
                  { icon: Target,    label: "Vincular campanha" },
                  { icon: Paperclip, label: "Salvar rascunho" },
                ].map((a) => (
                  <button key={a.label} disabled className="inline-flex items-center gap-1 text-[9px] text-gray-400 bg-white border border-gray-100 px-2 py-1 rounded-lg cursor-not-allowed opacity-60">
                    <a.icon className="w-2.5 h-2.5" strokeWidth={1.5} />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-[9px] text-gray-400 mt-3">
          Nós <strong>antes</strong> do Centralizador são herdados por todos os resultados. Nós <strong>depois</strong> são específicos por criativo.
        </p>
      </div>

      {/* ── Contexto do cliente ──────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">

        {/* Base Estratégica */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-3.5 h-3.5 text-purple-500" strokeWidth={1.5} />
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Base Estratégica</p>
          </div>
          {ctx.hasOnboarding ? (
            <div className="space-y-2">
              {ctx.segment && <p className="text-xs text-gray-700"><span className="text-gray-400">Segmento:</span> {ctx.segment}</p>}
              {ctx.toneOfVoice?.length ? (
                <div className="flex flex-wrap gap-1">
                  {ctx.toneOfVoice.map((t) => (
                    <span key={t} className="text-[9px] bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              ) : null}
              <Link href={`/admin/contentos/base-estrategica?client=${clientId}`} className="inline-flex items-center gap-1 text-[10px] text-purple-600 hover:text-purple-800 font-bold mt-1">
                Ver base completa <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-400 mb-2">Diagnóstico não preenchido.</p>
              <Link href={`/admin/contentos/base-estrategica?client=${clientId}`} className="text-[10px] font-bold text-purple-600 hover:text-purple-800">
                → Preencher agora
              </Link>
            </div>
          )}
        </div>

        {/* Dados comerciais */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.5} />
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Dados Comerciais</p>
          </div>
          {ctx.hasOlaClick ? (
            <div className="space-y-1.5">
              <p className="text-xs text-emerald-700 font-bold">Cardápio Digital conectado</p>
              <p className="text-[10px] text-gray-400 leading-relaxed">Sugestões visuais baseadas em dados de vendas em breve.</p>
              <div className="mt-2 space-y-1">
                {[
                  "Gerar criativo para produto parado",
                  "Criar campanha para item mais vendido",
                  "Story de urgência / combo",
                ].map((s) => (
                  <p key={s} className="text-[9px] text-gray-500 flex items-start gap-1">
                    <span className="text-emerald-400 flex-shrink-0">→</span>{s}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-400 mb-2">Nenhuma fonte comercial conectada.</p>
              <Link href="/admin/conexoes" className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800">→ Conectar Cardápio Digital</Link>
              <p className="text-[9px] text-gray-400 mt-2">Ou anexar relatório mensal (em breve)</p>
            </div>
          )}
        </div>

        {/* Contexto de temporada */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Temporada / Trends</p>
          </div>
          <div className="space-y-1.5">
            {[
              { emoji: "⚽", label: "Copa do Mundo", status: "Monitorar" },
              { emoji: "🎉", label: "São João / Festas Juninas", status: "Junho" },
              { emoji: "🖤", label: "Black Friday", status: "Novembro" },
              { emoji: "🎄", label: "Natal / Ano Novo", status: "Dezembro" },
              { emoji: "📱", label: "Trends Instagram", status: "Manual V1" },
            ].map((t) => (
              <div key={t.label} className="flex items-center justify-between text-[10px]">
                <span className="text-gray-600">{t.emoji} {t.label}</span>
                <span className="text-gray-400 font-medium">{t.status}</span>
              </div>
            ))}
          </div>
          <Link href={`/admin/contentos/radar?client=${clientId}`} className="inline-flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-800 font-bold mt-3">
            Ver Radar de Tendências <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── Biblioteca de ativos (estrutura preparada) ───────── */}
      <div className="mb-6 bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Biblioteca de ativos do cliente</p>
          </div>
          <button disabled className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-xl cursor-not-allowed opacity-60">
            <PlusCircle className="w-3 h-3" /> Adicionar ativo
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { icon: Palette,  label: "Logo",          type: "logo",      color: "text-purple-500 bg-purple-50 border-purple-100" },
            { icon: User,     label: "Pessoa",         type: "person",    color: "text-pink-500 bg-pink-50 border-pink-100" },
            { icon: Package,  label: "Produto",        type: "product",   color: "text-emerald-500 bg-emerald-50 border-emerald-100" },
            { icon: Image,    label: "Referência",     type: "reference", color: "text-amber-500 bg-amber-50 border-amber-100" },
            { icon: Layers,   label: "Campanha",       type: "campaign",  color: "text-indigo-500 bg-indigo-50 border-indigo-100" },
          ].map((a) => (
            <div key={a.type} className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center ${a.color} opacity-60`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/60 border border-current/20">
                <a.icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <p className="text-[10px] font-bold">{a.label}</p>
              <span className="text-[8px] font-bold bg-white/60 px-1.5 py-0.5 rounded-full">0 ativos</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-3">
          Upload de ativos e integração com Google Drive preparados. Ativação após SQL 40 + Storage configurado.
        </p>
      </div>

      {/* ── Identidade visual do cliente ─────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-indigo-500" strokeWidth={1.5} />
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Perfil visual do cliente</p>
          <span className="ml-auto text-[9px] font-bold text-indigo-400 bg-indigo-100 px-2 py-0.5 rounded-full">Em breve</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: "Assunto principal",    value: "—", desc: "Logo | Produto | Pessoa | Pessoa+Produto" },
            { label: "Estilo visual",         value: "—", desc: "Fotorrealista | Minimalista | Colorido | Dark" },
            { label: "Paleta de cores",       value: "—", desc: "Primária, secundária, accent, fundo" },
            { label: "Formatos preferidos",   value: "—", desc: "Feed 1:1 | Stories 9:16 | Reels | Carrossel" },
            { label: "Elementos proibidos",   value: "—", desc: "O que nunca deve aparecer nos criativos" },
            { label: "Tipografia",            value: "—", desc: "Heading, body, destaque" },
          ].map((f) => (
            <div key={f.label} className="bg-white/70 rounded-xl border border-indigo-100 px-3 py-2.5">
              <p className="text-[10px] font-bold text-gray-700 mb-0.5">{f.label}</p>
              <p className="text-xs text-gray-400">{f.value}</p>
              <p className="text-[9px] text-gray-300 mt-0.5 leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
