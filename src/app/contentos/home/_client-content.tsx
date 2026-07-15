"use client";
import { useState } from "react";

const _NOW = Date.now();
import { PageHeader } from "@/components/page-header";
import { DashboardCard } from "@/components/dashboard-card";
import { ContentCard } from "@/components/content-card";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { ApprovalCard } from "@/components/approval-card";
import {
  useOnboardingStore, OnboardingState,
  getObjetivoPrincipal, getObjetivosSecundarios, getTomDeVoz,
} from "@/lib/onboarding-store";
import { useCanvaStore, CanvaConfig } from "@/lib/canva-store";
import { mockContents, mockApprovals, mockCalendarEvents } from "@/data/mock-data";
import { Sparkles, CheckSquare, Calendar, BarChart3, ArrowRight, Bell, Clock, X, Loader2, Palette, Camera, Smartphone, Folder, CheckCircle2, Target, MessageCircle, Star } from "lucide-react";
import { SaudeEmpresaCards } from "@/components/saude-empresa-cards";
import Link from "next/link";
import type { DbOnboardingProfile, DbContentItem, DbApprovalWithContent } from "@/lib/supabase/types";
import { dbStatusToUi, contentTypeEmoji } from "@/lib/supabase/types";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";

/* ── Labels ──────────────────────────────────────────────── */

const objetivoMeta: Record<string, { label: string; color: string }> = {
  vender:      { label: "Vender mais 💰",   color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  leads:       { label: "Gerar leads 🎯",    color: "bg-blue-50 text-blue-700 border-blue-100" },
  autoridade:  { label: "Autoridade 🏆",     color: "bg-amber-50 text-amber-700 border-amber-100" },
  engajamento: { label: "Engajamento ❤️",    color: "bg-pink-50 text-pink-700 border-pink-100" },
  marketing:   { label: "Marketing 📊",      color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  atendimento: { label: "Atendimento 💬",    color: "bg-purple-50 text-purple-700 border-purple-100" },
};

const tomMeta: Record<string, string> = {
  profissional: "💼 Profissional", direto: "⚡ Direto", acolhedor: "🤗 Acolhedor",
  educativo: "📚 Educativo", popular: "🎉 Popular", sofisticado: "✨ Sofisticado",
  divertido: "😄 Divertido", tecnico: "🔧 Técnico", tradicional: "🏛️ Tradicional",
};

/* ── Sugestões por segmento / objetivo ───────────────────── */

const suggestoesPorSegmento: Record<string, Array<{ emoji: string; text: string }>> = {
  "Alimentação":   [
    { emoji: "🍬", text: "Carrossel: Como escolher o doce certo para cada ocasião" },
    { emoji: "🎬", text: "Reels: Bastidores da produção do produto mais pedido" },
    { emoji: "📊", text: "Story: Enquete — qual sabor lançar na próxima semana?" },
    { emoji: "✍️", text: "Post: O que a marca acredita sobre qualidade e afeto" },
  ],
  "Beleza & Estética": [
    { emoji: "✨", text: "Tutorial de cuidados em carrossel" },
    { emoji: "🔄", text: "Antes e depois do tratamento em Stories" },
    { emoji: "❓", text: "Reel: mitos e verdades do nicho" },
    { emoji: "💬", text: "Post: Depoimento real de cliente satisfeita" },
  ],
  "Saúde": [
    { emoji: "🏥", text: "Carrossel: 5 hábitos saudáveis para o dia a dia" },
    { emoji: "❓", text: "Reel: mitos e verdades sobre saúde" },
    { emoji: "💬", text: "Post: Depoimento de paciente com resultado" },
    { emoji: "📅", text: "Story: Dica rápida de saúde desta semana" },
  ],
  "Educação": [
    { emoji: "📖", text: "Carrossel: 5 dicas práticas do tema principal" },
    { emoji: "🏆", text: "Depoimento de aluno com resultado" },
    { emoji: "💡", text: "Reel: antes e depois do aprendizado" },
    { emoji: "📝", text: "Post: Metodologia exclusiva da escola" },
  ],
  "Tecnologia": [
    { emoji: "⚙️", text: "Tutorial rápido da funcionalidade oculta" },
    { emoji: "📈", text: "Case de sucesso de cliente real" },
    { emoji: "🆚", text: "Comparativo: antes vs. depois da solução" },
    { emoji: "💡", text: "Reel: problema que seu produto resolve" },
  ],
  "Construção": [
    { emoji: "🏠", text: "Antes e depois de projeto concluído" },
    { emoji: "🎬", text: "Reel: bastidores de uma obra em andamento" },
    { emoji: "📋", text: "Carrossel: erros comuns na reforma" },
    { emoji: "⭐", text: "Depoimento de cliente sobre o projeto" },
  ],
  "Varejo": [
    { emoji: "👗", text: "Look do dia com produto da coleção" },
    { emoji: "🛍️", text: "Carrossel: combinações de peças novas" },
    { emoji: "📦", text: "Reel: unboxing da novidade da semana" },
    { emoji: "💰", text: "Post: oferta especial para seguidores" },
  ],
  "Agência": [
    { emoji: "📊", text: "Resultado real de cliente em carrossel" },
    { emoji: "💡", text: "Thread: dica de marketing que funciona" },
    { emoji: "🎯", text: "Reel: processo de criação de campanha" },
    { emoji: "🤝", text: "Post: bastidores da equipe em ação" },
  ],
  "Moda": [
    { emoji: "👗", text: "Look do dia com a nova coleção" },
    { emoji: "🎬", text: "Reel: provação de 5 peças diferentes" },
    { emoji: "📸", text: "Carrossel: combinações para diferentes ocasiões" },
    { emoji: "💬", text: "Story: enquete sobre próximo lançamento" },
  ],
  "Serviços": [
    { emoji: "⭐", text: "Depoimento de cliente em carrossel" },
    { emoji: "🎬", text: "Reel: processo de atendimento da empresa" },
    { emoji: "💡", text: "Post: dica prática do seu segmento" },
    { emoji: "❓", text: "Story: FAQ sobre os serviços oferecidos" },
  ],
};

const sugestoesPorObjetivo: Record<string, Array<{ emoji: string; text: string }>> = {
  vender:      [
    { emoji: "💰", text: "Post de oferta com CTA direto para compra" },
    { emoji: "🛒", text: "Carrossel: top produtos mais vendidos" },
    { emoji: "💬", text: "Depoimento de cliente em Stories" },
    { emoji: "⏰", text: "Story: promoção relâmpago com contador" },
  ],
  leads:       [
    { emoji: "🎯", text: "Post com lead magnet gratuito" },
    { emoji: "📋", text: "Carrossel: checklist valioso para captura" },
    { emoji: "🔔", text: "Story com link para lista VIP" },
    { emoji: "📲", text: "Reel: problema que seu produto resolve" },
  ],
  autoridade:  [
    { emoji: "🏆", text: "Reel com sua opinião especializada" },
    { emoji: "📊", text: "Carrossel: dados e pesquisas do nicho" },
    { emoji: "🎓", text: "Post educativo profundo sobre o tema" },
    { emoji: "💡", text: "Thread: aprendizado que mudou a operação" },
  ],
  engajamento: [
    { emoji: "❤️", text: "Enquete nos Stories sobre preferências" },
    { emoji: "🔥", text: "Post com pergunta que divide opiniões" },
    { emoji: "🤝", text: "Bastidores e parte humana da marca" },
    { emoji: "😄", text: "Reel divertido sobre o dia a dia do nicho" },
  ],
  marketing:   [
    { emoji: "📅", text: "Carrossel com agenda da semana" },
    { emoji: "📊", text: "Post com resultado do mês anterior" },
    { emoji: "🗓️", text: "Série temática por dia da semana" },
    { emoji: "✅", text: "Checklist: o que a marca entregou este mês" },
  ],
  atendimento: [
    { emoji: "💬", text: "FAQ em carrossel sobre produtos" },
    { emoji: "⭐", text: "Destaques de avaliações e feedbacks" },
    { emoji: "🤝", text: "Post humanizado sobre a equipe" },
    { emoji: "📲", text: "Story: como nos chamar pelo WhatsApp" },
  ],
};

function getSugestoes(seg: string, obj: string): Array<{ emoji: string; text: string }> {
  if (seg && suggestoesPorSegmento[seg]) return suggestoesPorSegmento[seg].slice(0, 4);
  if (obj && sugestoesPorObjetivo[obj])  return sugestoesPorObjetivo[obj].slice(0, 4);
  return [
    { emoji: "✍️", text: "Conte a história da marca em Reel" },
    { emoji: "💡", text: "Carrossel com dicas do seu nicho" },
    { emoji: "🤝", text: "Bastidores do dia a dia da empresa" },
    { emoji: "❤️", text: "Enquete sobre o próximo produto" },
  ];
}

function calcProgress(data: OnboardingState, serverOnb: DbOnboardingProfile | null): number {
  if (serverOnb?.completed) return 100;
  const checks = [
    !!(serverOnb?.segment       ?? data.tipo),
    !!(serverOnb?.brand_name    ?? data.cliente?.nome),
    !!(serverOnb?.objective_primary ?? data.objetivo?.principal),
    !!(serverOnb?.brand_name    ?? data.marca?.nome),
    !!(serverOnb?.ideal_customer ?? data.publico?.clienteIdeal),
    !!(serverOnb?.visual_style  ?? data.identidade?.logoName),
    (serverOnb?.tone_of_voice ?? getTomDeVoz(data)).length > 0,
    !!(serverOnb?.approval_responsible ?? data.operacao?.responsavel),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function getNextStep(data: OnboardingState, canva: CanvaConfig, serverOnb: DbOnboardingProfile | null, clientId?: string | null) {
  const brandName = serverOnb?.brand_name ?? data.marca?.nome;
  const obj       = serverOnb?.objective_primary ?? getObjetivoPrincipal(data);
  const pub       = serverOnb?.ideal_customer ?? data.publico?.clienteIdeal;
  const tom       = (serverOnb?.tone_of_voice ?? getTomDeVoz(data));

  if (!brandName)             return { label: "Completar dados da marca",  href: "/onboarding/marca",    desc: "Nome, segmento e cidade da marca" };
  if (!obj)                   return { label: "Definir objetivo principal", href: "/onboarding/objetivo", desc: "O que a marca quer alcançar?" };
  if (!pub)                   return { label: "Descrever público-alvo",     href: "/onboarding/publico",  desc: "Quem é o cliente ideal da marca?" };
  if (tom.length === 0)       return { label: "Definir tom de voz",         href: "/onboarding/estilo",   desc: "Como a marca se comunica?" };
  if (canva.status === null)  return { label: "Configurar Canva",           href: clientId ? `/admin/contentos/criar?client=${clientId}&step=visual` : "/contentos/canva", desc: "Conecte o Canva para criar artes" };
  return                             { label: "Criar primeiro conteúdo",    href: clientId ? `/admin/contentos/criar?client=${clientId}` : "/contentos/criar", desc: "A marca está pronta para produzir!" };
}

function canvaChip(canva: CanvaConfig): { label: string; cls: string } {
  if (canva.status === "tem_conta" || canva.status === "tem_equipe")
    return { label: "Canva · Conectado ✓", cls: "text-emerald-700 bg-emerald-50 border-emerald-100" };
  if (canva.status === "nao_usa")
    return { label: "Canva · Não usa",     cls: "text-gray-500 bg-gray-50 border-gray-100" };
  if (canva.status === "nao_sei")
    return { label: "Canva · Pendente",    cls: "text-amber-700 bg-amber-50 border-amber-100" };
  return   { label: "Canva · Configurar", cls: "text-purple-700 bg-purple-50 border-purple-100 hover:bg-purple-100 transition-colors" };
}

const academyPorObjetivo: Record<string, { title: string; progress: number }> = {
  vender:      { title: "✍️ Copywriting para Vendas",           progress: 45 },
  leads:       { title: "🎯 Geração de Leads no Instagram",     progress: 30 },
  autoridade:  { title: "🏆 Posicionamento de Marca",           progress: 60 },
  engajamento: { title: "❤️ Engajamento Orgânico",              progress: 75 },
  marketing:   { title: "📊 Gestão de Conteúdo",               progress: 50 },
  atendimento: { title: "💬 Atendimento Digital",               progress: 20 },
};

const missions = [
  { id: "m1", label: "Revisar calendário da semana",   done: true  },
  { id: "m2", label: "Criar 3 posts para a marca ativa", done: true },
  { id: "m3", label: "Aprovar reel pendente",           done: false },
  { id: "m4", label: "Publicar conteúdo agendado",      done: false },
  { id: "m5", label: "Gerar relatório semanal",         done: false },
];

/* ── ScheduleModal ───────────────────────────────────────── */

function ScheduleModal({
  item,
  onClose,
  onSaved,
}: {
  item: DbContentItem;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [date,     setDate]    = useState("");
  const [time,     setTime]    = useState("09:00");
  const [channel,  setChannel] = useState(item.channel?.split(",")[0]?.trim() ?? "Instagram");
  const [format,   setFormat]  = useState(item.type ?? "feed");
  const [notes,    setNotes]   = useState("");
  const [saving,   setSaving]  = useState(false);

  async function handleSave() {
    if (!date || !isSupabaseConfigured) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const scheduled_at = new Date(`${date}T${time}:00`).toISOString();
      await supabase.from("content_items").update({
        status:           "agendado",
        scheduled_at,
        scheduled_format: format || null,
        ...(notes ? { script: notes } : {}),
      }).eq("id", item.id);
      onSaved(item.id);
    } catch (e) {
      console.error("[schedule-modal] save error:", e);
    } finally {
      setSaving(false);
      onClose();
    }
  }

  const CHANNELS = ["Instagram", "TikTok", "LinkedIn", "Facebook", "YouTube", "X / Twitter"];
  const FORMATS  = ["feed", "story", "reels", "carrossel", "legenda", "roteiro", "campanha"];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-black text-gray-900">Agendar publicação</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[260px]">{item.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Data *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Hora</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Canal</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400 bg-white"
              >
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Formato</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400 bg-white capitalize"
              >
                {FORMATS.map((f) => <option key={f} value={f} className="capitalize">{f}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Link, hashtags, CTA específico..."
              rows={2}
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400 resize-none placeholder-gray-300"
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 text-xs font-bold py-3 border border-gray-200 rounded-2xl text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!date || saving}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
            {saving ? "Salvando…" : "Confirmar agendamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ApprovalsPreviewModal ───────────────────────────────── */

function ApprovalsPreviewModal({
  late,
  pending,
  clientId,
  isAdmin,
  onClose,
}: {
  late: DbApprovalWithContent[];
  pending: DbApprovalWithContent[];
  clientId: string | null;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const all = [
    ...late,
    ...pending.filter((a) => !late.find((l) => l.id === a.id)),
  ];

  function approvalHref(approvalId: string): string {
    if (isAdmin && clientId) {
      return `/admin/contentos/aprovacoes?client=${clientId}&approval=${approvalId}`;
    }
    return "/contentos/aprovacoes";
  }

  const listHref = isAdmin && clientId
    ? `/admin/contentos/aprovacoes?client=${clientId}`
    : "/contentos/aprovacoes";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-black text-gray-900">Aprovações pendentes</h2>
            <p className="text-xs text-gray-400 mt-0.5">{all.length} conteúdo{all.length !== 1 ? "s" : ""} aguardando resposta</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-3 flex-1">
          {all.map((a) => {
            const c = a.content_items;
            const isLate = late.find((l) => l.id === a.id) !== undefined;
            const hAgo = a.approval_sent_at
              ? Math.floor((_NOW - new Date(a.approval_sent_at).getTime()) / 3600000)
              : null;
            return (
              <Link
                key={a.id}
                href={approvalHref(a.id)}
                onClick={onClose}
                className={`block rounded-2xl border p-4 hover:brightness-95 transition-all ${isLate ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{contentTypeEmoji(c?.type ?? null)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{c?.title ?? "Sem título"}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{c?.channel ?? "—"} · {c?.type ?? "—"}</p>
                    {hAgo !== null && (
                      <p className={`text-xs mt-1 ${isLate ? "text-red-600 font-medium" : "text-amber-600"}`}>
                        {isLate ? "⚠️ " : "⏳ "}Enviado há {hAgo < 1 ? "menos de 1h" : `${hAgo}h`}
                      </p>
                    )}
                  </div>
                  {isLate && (
                    <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex-shrink-0">
                      Atrasado
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
          {all.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma aprovação pendente.</p>
          )}
        </div>

        <div className="px-5 pb-5 pt-2 border-t border-gray-50">
          <Link
            href={listHref}
            onClick={onClose}
            className="block w-full text-center text-xs font-bold py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-colors"
          >
            Ver todas as aprovações →
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Component ───────────────────────────────────────────── */

interface Props {
  serverOnboarding: DbOnboardingProfile | null;
  serverContents?: DbContentItem[] | null;
  serverApprovals?: DbApprovalWithContent[] | null;
  userRole?: string;
  isSupabaseActive?: boolean;
  companyName?: string | null;
  metaAsset?: { page_name: string | null; instagram_username: string | null } | null;
  clientId?: string | null;
  hasOlaClick?: boolean;
}

export function ContentOSHomeContent({
  serverOnboarding,
  serverContents,
  serverApprovals,
  userRole = "",
  isSupabaseActive = false,
  companyName = null,
  metaAsset = null,
  clientId = null,
  hasOlaClick = false,
}: Props) {
  const [scheduleItem,          setScheduleItem]          = useState<DbContentItem | null>(null);
  const [scheduledIds,          setScheduledIds]          = useState<Set<string>>(new Set());
  const [showApprovalsPreview,  setShowApprovalsPreview]  = useState(false);

  const data  = useOnboardingStore();
  const canva = useCanvaStore();

  const isAdmin    = userRole === "admin" || userRole === "super_admin";
  const isDemo     = !isSupabaseActive;
  const isRealData = !!serverOnboarding;

  // Preferência: Supabase onboarding > clients.company_name > localStorage > vazio
  const brandName  = serverOnboarding?.brand_name    ?? companyName            ?? data.marca?.nome      ?? "";
  const brandSeg   = serverOnboarding?.segment       ?? data.marca?.segmento  ?? "";
  const brandCity  = serverOnboarding?.city          ?? data.marca?.cidade    ?? "";
  const instagram  = serverOnboarding?.instagram     ?? data.marca?.instagram ?? "";
  const redes      = serverOnboarding?.social_channels ?? data.operacao?.redes ?? ["Instagram", "TikTok"];
  const principal  = serverOnboarding?.objective_primary ?? getObjetivoPrincipal(data) ?? "vender";
  const secundarios = serverOnboarding?.objective_secondary ?? getObjetivosSecundarios(data);
  const tomDeVoz   = (serverOnboarding?.tone_of_voice ?? getTomDeVoz(data));
  const tomFinal   = tomDeVoz.length > 0 ? tomDeVoz : ["popular", "direto"];

  const progress   = calcProgress(data, serverOnboarding);
  const nextStep   = getNextStep(data, canva, serverOnboarding, clientId);
  const sugestoes  = getSugestoes(brandSeg || "Serviços", principal);
  const chip       = canvaChip(canva);
  const academy    = academyPorObjetivo[principal] ?? { title: "✍️ Copywriting para Redes Sociais", progress: 75 };
  const allObjetivos = [principal, ...secundarios].filter(Boolean);

  const brandDisplay = brandName || (isAdmin ? "Nenhum cliente selecionado" : "Complete o diagnóstico");
  const headerDesc   = brandName
    ? `Trabalhando em ${brandName} 👋`
    : isAdmin
      ? "Selecione um cliente para começar"
      : "Complete o diagnóstico da marca para começar";

  // Use real content when available, fall back to mock
  const allContents = serverContents
    ? serverContents.map(c => ({
        id:          c.id,
        title:       c.title,
        platform:    c.channel?.split(",")[0]?.trim() ?? "Instagram",
        type:        c.type ?? "post",
        status:      dbStatusToUi(c.status),
        thumbnail:   contentTypeEmoji(c.type),
        scheduledAt: c.scheduled_date ?? undefined,
      }))
    : mockContents;
  const inProgress       = allContents.filter((c) => c.status === "draft").slice(0, 3);
  const inReview         = allContents.filter((c) => c.status === "in_review");
  // Show mock approvals/calendar only in demo mode — real data fetched per respective pages
  const pendingApprovals = isSupabaseActive ? [] : mockApprovals.filter((a) => a.status === "pending").slice(0, 2);
  const upcoming         = isSupabaseActive ? [] : mockCalendarEvents.filter((e) => e.status === "scheduled").slice(0, 3);

  // Notifications from approvals
  const approvalsPending = (serverApprovals ?? []).filter((a) => a.status === "aguardando");
  const approvalsLate    = approvalsPending.filter((a) => {
    const due = a.approval_due_at ?? (a.created_at ? new Date(new Date(a.created_at).getTime() + 48 * 3600000).toISOString() : null);
    return due ? _NOW > new Date(due).getTime() : false;
  });

  // "Prontos para agendar" — real content items with status pronto_para_agendar
  const readyToSchedule = (serverContents ?? [])
    .filter((c) => c.status === "pronto_para_agendar" && !scheduledIds.has(c.id));

  return (
    <div>
      <PageHeader title="REC OS" description={headerDesc} />

      {/* Badges de contexto */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        {isDemo && (
          <>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Modo demonstração
            </span>
            <span className="text-xs text-gray-400">Dados do onboarding local</span>
          </>
        )}
        {isAdmin && !isDemo && (
          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Admin visualizando REC OS
          </span>
        )}
      </div>

      {/* Brand header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-purple-200 text-xs font-medium">Marca ativa</p>
              {isRealData && (
                <span className="text-[10px] font-bold text-emerald-200 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                  ✓ Supabase
                </span>
              )}
            </div>
            <h2 className="text-white font-black text-lg truncate">{brandDisplay}</h2>
            <p className="text-purple-200 text-xs mt-0.5">
              {brandSeg}{brandCity ? ` · ${brandCity}` : ""}
            </p>
            <div className="flex gap-1.5 flex-wrap mt-2">
              {redes.slice(0, 4).map((r) => (
                <span key={r} className="text-[10px] font-medium bg-white/15 text-white px-2 py-0.5 rounded-full">{r}</span>
              ))}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-white font-black text-3xl">{progress}%</div>
            <p className="text-purple-200 text-xs">configurado</p>
          </div>
        </div>
        <div className="mt-4 w-full bg-white/20 rounded-full h-1.5">
          <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Canais conectados */}
      <div className="mb-6 bg-white border border-gray-100 rounded-2xl p-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Canais conectados</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {/* Instagram */}
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${instagram ? "border-pink-100 bg-pink-50" : "border-gray-100 bg-gray-50"}`}>
            <Camera className={`w-3.5 h-3.5 flex-shrink-0 ${instagram ? "text-pink-500" : "text-gray-300"}`} strokeWidth={1.5} />
            <div className="min-w-0">
              <p className={`text-[10px] font-bold ${instagram ? "text-pink-700" : "text-gray-400"}`}>Instagram</p>
              <p className="text-[10px] text-gray-500 truncate">{instagram ? `@${instagram}` : (metaAsset?.instagram_username ? `@${metaAsset.instagram_username}` : "Não configurado")}</p>
            </div>
          </div>

          {/* Página Facebook */}
          {isAdmin && isSupabaseActive ? (
            metaAsset?.page_name ? (
              <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2">
                <Smartphone className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-indigo-700">Página Facebook</p>
                  <p className="text-[10px] text-indigo-600 truncate">{metaAsset.page_name}</p>
                </div>
              </div>
            ) : (
              <Link href="/admin/conexoes" className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 hover:bg-gray-100 transition-colors">
                <Smartphone className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400">Página Facebook</p>
                  <p className="text-[10px] text-indigo-500">Vincular →</p>
                </div>
              </Link>
            )
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <Smartphone className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" strokeWidth={1.5} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400">Página Facebook</p>
                <p className="text-[10px] text-gray-400">{(serverOnboarding?.uses_meta_business ?? data.operacao?.usaMeta) ? "Ativo" : "Não vinculada"}</p>
              </div>
            </div>
          )}

          {/* Canva */}
          <Link href={clientId ? `/admin/contentos/criar?client=${clientId}&step=visual` : "/contentos/canva"} className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors hover:opacity-80 ${chip.cls}`}>
            <Palette className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold truncate">{chip.label.split("·")[0]?.trim()}</p>
              <p className="text-[10px] opacity-70 truncate">{chip.label.split("·")[1]?.trim() ?? "Configurar"}</p>
            </div>
          </Link>

          {/* Insights Meta */}
          <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
            <BarChart3 className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" strokeWidth={1.5} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400">Insights Meta</p>
              <p className="text-[10px] text-gray-400">Em breve</p>
            </div>
          </div>

          {/* Publicação automática */}
          <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
            <Star className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" strokeWidth={1.5} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400">Publicação auto.</p>
              <p className="text-[10px] text-gray-400">Em breve</p>
            </div>
          </div>

          {/* Anúncios */}
          <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
            <Target className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" strokeWidth={1.5} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400">Anúncios</p>
              <p className="text-[10px] text-gray-400">Em breve</p>
            </div>
          </div>
        </div>

        {/* OlaClick badges */}
        {hasOlaClick && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-1">
              <CheckCircle2 className="w-3 h-3" />
              Cardápio Digital conectado
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-1">
              <CheckCircle2 className="w-3 h-3" />
              Dados de pedidos disponíveis
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-1">
              <Sparkles className="w-3 h-3" />
              Pode gerar ideias com base em vendas
            </span>
          </div>
        )}
      </div>

      {/* Saúde da empresa */}
      {isSupabaseActive && (
        <SaudeEmpresaCards
          hasOnboarding={!!serverOnboarding}
          metaConnected={!!(metaAsset?.page_name || metaAsset?.instagram_username)}
          hasOlaClick={hasOlaClick}
          clientId={clientId}
          isAdmin={isAdmin}
          companyName={brandName}
        />
      )}

      {/* Base estratégica (resumo compacto) */}
      {isAdmin && isSupabaseActive && serverOnboarding && (
        <div className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-purple-400 uppercase tracking-wider">Base Estratégica</p>
            <Link href={`/admin/contentos/base-estrategica?client=${clientId ?? ""}`} className="text-[10px] font-bold text-purple-600 hover:text-purple-800 transition-colors">Ver completa →</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {brandSeg && <span className="text-[10px] font-medium bg-white/70 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full">{brandSeg}</span>}
            {principal && <span className="text-[10px] font-medium bg-white/70 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">{objetivoMeta[principal]?.label ?? principal}</span>}
            {tomFinal.slice(0,2).map((t) => (
              <span key={t} className="text-[10px] font-medium bg-white/70 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">{tomMeta[t] ?? t}</span>
            ))}
            {redes.slice(0,3).map((r) => (
              <span key={r} className="text-[10px] font-medium bg-white/70 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">{r}</span>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <DashboardCard title="Em produção"          value={inProgress.length}       icon={Sparkles}    iconColor="text-purple-600" iconBg="bg-purple-50" />
        <DashboardCard title="Em revisão"           value={inReview.length}         icon={CheckSquare} iconColor="text-amber-600"  iconBg="bg-amber-50" alert />
        <DashboardCard title="Esta semana"          value={upcoming.length}         icon={Calendar}    iconColor="text-blue-600"   iconBg="bg-blue-50" />
        <DashboardCard title="Aprovações pendentes" value={pendingApprovals.length} icon={BarChart3}   iconColor="text-red-600"    iconBg="bg-red-50" alert={pendingApprovals.length > 0} />
      </div>

      {/* Notifications block */}
      {(approvalsPending.length > 0 || approvalsLate.length > 0 || readyToSchedule.length > 0) && (
        <div className="mb-6 space-y-2">
          {approvalsLate.length > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-xs text-red-700">
              <Bell className="w-3.5 h-3.5 flex-shrink-0" />
              <span><strong>{approvalsLate.length}</strong> aprovação{approvalsLate.length > 1 ? "ões" : ""} atrasada{approvalsLate.length > 1 ? "s" : ""} (mais de 48h sem resposta)</span>
              <button onClick={() => setShowApprovalsPreview(true)} className="ml-auto text-[10px] text-red-700 font-bold underline flex-shrink-0">Ver</button>
            </div>
          )}
          {approvalsPending.length > 0 && approvalsLate.length === 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-xs text-amber-700">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span><strong>{approvalsPending.length}</strong> conteúdo{approvalsPending.length > 1 ? "s" : ""} aguardando aprovação do cliente</span>
              <button onClick={() => setShowApprovalsPreview(true)} className="ml-auto text-[10px] text-amber-700 font-bold underline flex-shrink-0">Ver</button>
            </div>
          )}
          {readyToSchedule.length > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-xs text-emerald-700">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span><strong>{readyToSchedule.length}</strong> conteúdo{readyToSchedule.length > 1 ? "s" : ""} pronto{readyToSchedule.length > 1 ? "s" : ""} para agendar</span>
            </div>
          )}
        </div>
      )}

      {/* Prontos para agendar */}
      {readyToSchedule.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />Prontos para agendar</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {readyToSchedule.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-emerald-100 p-4 flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">{contentTypeEmoji(c.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{c.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.channel ?? "—"} · {c.type ?? "—"}</p>
                </div>
                <button
                  onClick={() => setScheduleItem(c)}
                  className="flex-shrink-0 text-xs font-bold px-3 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                >
                  Agendar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3-column grid */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Col 1 */}
        <div className="space-y-4">
          <Link href={nextStep.href} className="block bg-indigo-600 text-white rounded-2xl p-4 hover:bg-indigo-700 transition-colors group">
            <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-wider mb-1">Próximo passo</p>
            <p className="text-sm font-bold mb-0.5">{nextStep.label}</p>
            <p className="text-xs text-indigo-200">{nextStep.desc}</p>
            <div className="mt-3 flex items-center gap-1 text-indigo-200 text-xs group-hover:text-white transition-colors">
              Ir agora <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {allObjetivos.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="text-xs font-bold text-gray-800 mb-2.5 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />Objetivos da marca</h3>
              <div className="flex flex-wrap gap-1.5">
                {allObjetivos.map((o, i) => {
                  const m = objetivoMeta[o];
                  if (!m) return null;
                  return (
                    <span key={o} className={`text-xs font-medium px-2.5 py-1 rounded-xl border ${m.color} ${i === 0 ? "font-bold" : ""}`}>
                      {i === 0 ? <Star className="w-3 h-3 inline mr-0.5 text-amber-400" strokeWidth={1.5} /> : null}{m.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {tomFinal.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="text-xs font-bold text-gray-800 mb-2.5 flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />Tom de voz</h3>
              <div className="flex flex-wrap gap-1.5">
                {tomFinal.map((t) => (
                  <span key={t} className="text-xs font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-xl border border-gray-100">
                    {tomMeta[t] ?? t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <OnboardingProgress steps={missions} title="Missões do dia" />
        </div>

        {/* Col 2 */}
        <div>
          <h2 className="text-sm font-bold text-gray-800 mb-3">Conteúdos em andamento</h2>
          <div className="space-y-2 mb-4">
            {inProgress.map((c) => <ContentCard key={c.id} {...c} />)}
          </div>
          <h2 className="text-sm font-bold text-gray-800 mb-3 mt-4">Aprovações pendentes</h2>
          <div className="space-y-2">
            {pendingApprovals.map((a) => <ApprovalCard key={a.id} {...a} />)}
          </div>
        </div>

        {/* Col 3 */}
        <div>
          <h2 className="text-sm font-bold text-gray-800 mb-3">Sugestões para {brandDisplay}</h2>
          <div className="space-y-2 mb-5">
            {sugestoes.map((s, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 flex items-start gap-2.5">
                <span className="text-xl flex-shrink-0">{s.emoji}</span>
                <p className="text-xs text-gray-700 leading-relaxed flex-1">{s.text}</p>
                <Link href={clientId ? `/admin/contentos/criar?client=${clientId}` : "/contentos/criar"} className="text-[10px] text-purple-600 bg-purple-50 px-2 py-1 rounded-lg hover:bg-purple-100 transition-colors flex-shrink-0 font-medium">
                  Criar
                </Link>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-bold text-gray-800 mb-3">Próximas datas</h2>
          <div className="space-y-2 mb-5">
            {upcoming.map((e) => (
              <div key={e.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-2.5">
                <div className="text-center w-10 flex-shrink-0">
                  <div className="text-xs font-black text-indigo-600">{new Date(e.date).getDate()}</div>
                  <div className="text-[10px] text-gray-400">{new Date(e.date).toLocaleDateString("pt-BR", { month: "short" })}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{e.title}</p>
                  <p className="text-[10px] text-gray-400">{e.platform}</p>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-bold text-gray-800 mb-3">Academy recomendada</h2>
          <Link href="/academy/curso" className="block bg-amber-50 border border-amber-100 rounded-xl p-3 hover:bg-amber-100 transition-colors">
            <p className="text-xs font-bold text-amber-800">{academy.title}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-amber-600">{academy.progress}% concluído</p>
              <div className="w-16 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${academy.progress}%` }} />
              </div>
            </div>
          </Link>
        </div>
      </div>

      {scheduleItem && (
        <ScheduleModal
          item={scheduleItem}
          onClose={() => setScheduleItem(null)}
          onSaved={(id) => {
            setScheduledIds((prev) => new Set([...prev, id]));
            setScheduleItem(null);
          }}
        />
      )}

      {showApprovalsPreview && (
        <ApprovalsPreviewModal
          late={approvalsLate}
          pending={approvalsPending}
          clientId={(serverApprovals ?? [])[0]?.client_id ?? null}
          isAdmin={isAdmin}
          onClose={() => setShowApprovalsPreview(false)}
        />
      )}
    </div>
  );
}
