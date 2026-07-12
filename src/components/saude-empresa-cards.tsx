import { CheckCircle2, Clock, AlertCircle, Link2, Sparkles, FileText, BarChart3, Paperclip } from "lucide-react";
import Link from "next/link";

/* ── Status helpers ─────────────────────────────────────── */

type StatusKey =
  | "completo"
  | "parcial"
  | "pendente"
  | "aguardando_conexao"
  | "aguardando_leitura"
  | "aguardando_relatorio"
  | "insuficiente";

const STATUS_CONFIG: Record<StatusKey, { label: string; color: string; bg: string; Icon: typeof CheckCircle2 }> = {
  completo:             { label: "Completo",               color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100", Icon: CheckCircle2 },
  parcial:              { label: "Parcial",                color: "text-amber-700",   bg: "bg-amber-50 border-amber-100",     Icon: Clock        },
  pendente:             { label: "Pendente",               color: "text-gray-500",    bg: "bg-gray-50 border-gray-200",       Icon: AlertCircle  },
  aguardando_conexao:   { label: "Aguardando conexão",     color: "text-blue-700",    bg: "bg-blue-50 border-blue-100",       Icon: Link2        },
  aguardando_leitura:   { label: "Aguardando leitura",     color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-100",   Icon: Clock        },
  aguardando_relatorio: { label: "Aguardando relatório",   color: "text-orange-700",  bg: "bg-orange-50 border-orange-100",   Icon: FileText     },
  insuficiente:         { label: "Dados insuficientes",    color: "text-red-600",     bg: "bg-red-50 border-red-100",         Icon: AlertCircle  },
};

function StatusBadge({ status }: { status: StatusKey }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function SourceBadge({ label, active = true }: { label: string; active?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border ${active ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-gray-50 text-gray-400 border-gray-100"}`}>
      {active ? <Sparkles className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}

/* ── Main component ─────────────────────────────────────── */

interface SaudeEmpresaCardsProps {
  hasOnboarding: boolean;
  metaConnected: boolean;
  hasOlaClick: boolean;
  clientId?: string | null;
  isAdmin?: boolean;
  companyName?: string;
}

export function SaudeEmpresaCards({
  hasOnboarding,
  metaConnected,
  hasOlaClick,
  clientId = null,
  isAdmin = false,
  companyName = "",
}: SaudeEmpresaCardsProps) {
  /* Derive digital status */
  const digitalStatus: StatusKey = !hasOnboarding
    ? "pendente"
    : metaConnected
    ? "completo"
    : "parcial";

  const digitalDesc =
    digitalStatus === "completo"
      ? "Diagnóstico da marca preenchido e Meta conectada. Dados de alcance e engajamento disponíveis."
      : digitalStatus === "parcial"
      ? "Diagnóstico da marca preenchido. Conecte a Meta para enriquecer com dados reais de alcance."
      : "O diagnóstico de onboarding ainda não foi preenchido. Posicionamento, tom de voz e público-alvo pendentes.";

  /* Derive commercial status */
  const comercialStatus: StatusKey = hasOlaClick ? "aguardando_leitura" : "aguardando_conexao";

  const comercialDesc = hasOlaClick
    ? "Cardápio Digital conectado. Aguardando leitura dos dados de pedidos, produtos e faturamento."
    : "Nenhuma fonte de dados comerciais conectada. Conecte o Cardápio Digital ou anexe um relatório mensal.";

  const connectHref = isAdmin
    ? `/admin/conexoes${clientId ? `?client=${clientId}` : ""}`
    : "/contentos/configuracoes";
  const onboardingHref = isAdmin
    ? `/admin/contentos/base-estrategica${clientId ? `?client=${clientId}` : ""}`
    : "/contentos/base-estrategica";

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Saúde da empresa</p>
        {companyName && <span className="text-[10px] text-gray-300">· {companyName}</span>}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">

        {/* ── Saúde Digital ──────────────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-500" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs font-black text-gray-800">Saúde Digital</p>
                <p className="text-[10px] text-gray-400">Conteúdo, posicionamento e presença</p>
              </div>
            </div>
            <StatusBadge status={digitalStatus} />
          </div>

          <p className="text-[11px] text-gray-500 leading-relaxed mb-3">{digitalDesc}</p>

          {/* Source badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <SourceBadge label="Diagnóstico da marca" active={hasOnboarding} />
            <SourceBadge label="Baseado na REC OS" active={hasOnboarding} />
            <SourceBadge label="Insights Meta" active={metaConnected} />
            {!hasOnboarding && <SourceBadge label="Dados pendentes" active={false} />}
            {hasOnboarding && !metaConnected && <SourceBadge label="Meta: aguardando leitura" active={false} />}
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-1.5 pt-3 border-t border-gray-50">
            {!hasOnboarding && (
              <Link href={onboardingHref} className="text-[10px] font-bold text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1">
                → Preencher diagnóstico da marca
              </Link>
            )}
            {!metaConnected && (
              <Link href={connectHref} className="text-[10px] font-medium text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1">
                → Conectar Meta para enriquecer diagnóstico
              </Link>
            )}
            {digitalStatus === "completo" && (
              <span className="text-[10px] text-emerald-600 font-medium">✓ Diagnóstico digital completo</span>
            )}
          </div>
        </div>

        {/* ── Saúde Comercial ────────────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs font-black text-gray-800">Saúde Comercial</p>
                <p className="text-[10px] text-gray-400">Faturamento, pedidos e vendas</p>
              </div>
            </div>
            <StatusBadge status={comercialStatus} />
          </div>

          <p className="text-[11px] text-gray-500 leading-relaxed mb-3">{comercialDesc}</p>

          {/* Source badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <SourceBadge label="Cardápio Digital" active={hasOlaClick} />
            <SourceBadge label="Relatório mensal" active={false} />
            <SourceBadge label="Dados manuais" active={false} />
            {!hasOlaClick && <SourceBadge label="Sem dados de faturamento" active={false} />}
          </div>

          {/* Attach report + CTAs */}
          <div className="flex flex-col gap-1.5 pt-3 border-t border-gray-50">
            {!hasOlaClick && (
              <Link href={connectHref} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-1">
                → Conectar Cardápio Digital
              </Link>
            )}
            <button
              disabled
              className="inline-flex items-center gap-1.5 text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1.5 rounded-xl cursor-not-allowed w-fit mt-0.5"
              title="Anexar relatório — em breve"
            >
              <Paperclip className="w-3 h-3" />
              Anexar relatório mensal
              <span className="text-[9px] font-bold text-amber-500 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full ml-1">Em breve</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
