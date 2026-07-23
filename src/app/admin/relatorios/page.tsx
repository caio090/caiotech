"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import {
  BarChart3, FileText, Download, X, Mail, MessageCircle,
  CalendarDays, Clock, Building2, ShoppingCart, CheckSquare,
  DollarSign, AtSign, Link2, Zap,
} from "lucide-react";
import Link from "next/link";
import { AdaptiveReportsSection } from "./_adaptive-reports-section";

// ── Modal de exportação ────────────────────────────────────────
type ExportFormat = "pdf" | "png" | "whatsapp" | "email" | "agendar";

const EXPORT_OPTIONS: { value: ExportFormat; label: string; desc: string }[] = [
  { value: "pdf",      label: "Gerar PDF",          desc: "Download direto em PDF"       },
  { value: "png",      label: "Gerar PNG",           desc: "Imagem do relatório"           },
  { value: "whatsapp", label: "Enviar por WhatsApp", desc: "Compartilhar via WhatsApp"     },
  { value: "email",    label: "Enviar por e-mail",   desc: "Enviar para o cliente"         },
  { value: "agendar",  label: "Agendar envio",       desc: "Envio automático por data"     },
];

function ExportModal({ onClose }: { onClose: () => void }) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Download className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-sm font-bold text-gray-900">Exportar relatório</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2 mb-5">
          {EXPORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedFormat(opt.value)}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all ${
                selectedFormat === opt.value
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-gray-100 hover:border-gray-200 bg-white"
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                <p className="text-xs text-gray-400">{opt.desc}</p>
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                Em breve
              </span>
            </button>
          ))}
        </div>
        <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-500 mb-4">
          Exportação disponível após integração de dados reais. Por enquanto, visualize em tela.
        </div>
        <button onClick={onClose} className="w-full py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
          Fechar
        </button>
      </div>
    </div>
  );
}

// ── Bloco de tipo de relatório ─────────────────────────────────
interface ReportTypeProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  fonte: string;
  status: "pronto" | "aguardando" | "em_preparacao";
  cta?: { label: string; href: string };
  items: { label: string; ready: boolean }[];
}

const STATUS_STYLE = {
  pronto:         { label: "Ativo",         badge: "bg-emerald-50 text-emerald-700" },
  aguardando:     { label: "Aguardando fonte", badge: "bg-amber-50 text-amber-700"  },
  em_preparacao:  { label: "Em preparação", badge: "bg-gray-100 text-gray-500"      },
};

function ReportTypeCard({ icon: Icon, title, description, color, fonte, status, cta, items }: ReportTypeProps) {
  const s = STATUS_STYLE[status];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{title}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Fonte: {fonte}</p>
          </div>
        </div>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${s.badge}`}>{s.label}</span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      <div className="space-y-1.5">
        {items.map(({ label, ready }) => (
          <div key={label} className="flex items-center gap-2 text-[11px]">
            <span className={ready ? "text-emerald-500" : "text-gray-300"}>
              {ready ? "✓" : "○"}
            </span>
            <span className={ready ? "text-gray-700" : "text-gray-400"}>{label}</span>
          </div>
        ))}
      </div>
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors mt-auto"
        >
          <Zap className="w-3 h-3" />{cta.label} →
        </Link>
      )}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────
export default function AdminRelatoriosPage() {
  const [showExport, setShowExport] = useState(false);
  const [metaLinked, setMetaLinked] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/meta/status")
      .then((r) => r.json())
      .then((d: { connected?: boolean }) => setMetaLinked(!!d.connected))
      .catch(() => setMetaLinked(false));
  }, []);

  return (
    <div>
      <PageHeader title="Relatórios" description="Faturamento, pedidos, conteúdo e análises por cliente">
        <button
          onClick={() => setShowExport(true)}
          className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </PageHeader>

      {/* Aviso de fase */}
      <div className="mb-6 p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-start gap-2">
        <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>
          Relatórios serão ativados conforme as integrações forem conectadas. Conecte a Meta em{" "}
          <Link href="/admin/conexoes" className="font-bold underline">Conexões</Link> para iniciar a coleta de dados.
        </span>
      </div>

      {/* 4 tipos de relatório */}
      <div className="grid md:grid-cols-2 gap-5">
        <ReportTypeCard
          icon={AtSign}
          title="Relatório de Conteúdo"
          description="Performance de posts, alcance, engajamento, aprovações e calendário editorial por cliente."
          color="bg-pink-50 text-pink-600"
          fonte="Meta/Instagram · REC OS"
          status={metaLinked === true ? "em_preparacao" : "aguardando"}
          cta={{ label: "Ver relatório de conteúdo →", href: "/admin/relatorios/conteudo" }}
          items={[
            { label: "Alcance e impressões (Instagram)",    ready: metaLinked === true },
            { label: "Engajamento por post",                ready: false },
            { label: "Conteúdos publicados vs. planejados", ready: false },
            { label: "Taxa de aprovação cliente",           ready: false },
            { label: "Top performers do período",           ready: false },
          ]}
        />

        <ReportTypeCard
          icon={ShoppingCart}
          title="Relatório Comercial"
          description="Faturamento, ticket médio, produtos mais vendidos, recorrência e pedidos por período."
          color="bg-emerald-50 text-emerald-600"
          fonte="Cardápio Digital · API de vendas · Relatório manual"
          status="em_preparacao"
          cta={{ label: "Ver relatório de faturamento", href: "/admin/relatorios/faturamento" }}
          items={[
            { label: "Faturamento mensal",          ready: true  },
            { label: "Ticket médio",                ready: true  },
            { label: "Produto mais vendido",        ready: true  },
            { label: "Produto parado",              ready: false },
            { label: "Taxa de recorrência",         ready: false },
          ]}
        />

        <ReportTypeCard
          icon={CheckSquare}
          title="Relatório Operacional"
          description="Tarefas entregues, atrasos, aprovações travadas, produção por responsável e eficiência da equipe."
          color="bg-indigo-50 text-indigo-600"
          fonte="OperacionalOS · Kanban · Briefings"
          status="em_preparacao"
          items={[
            { label: "Tarefas concluídas vs. abertas",  ready: false },
            { label: "Atrasos e gargalos",              ready: false },
            { label: "Aprovações travadas",             ready: false },
            { label: "Produção por responsável",        ready: false },
            { label: "SLA de entrega",                  ready: false },
          ]}
        />

        <ReportTypeCard
          icon={DollarSign}
          title="Relatório Financeiro"
          description="Cobranças, inadimplência, histórico de planos e receita por cliente."
          color="bg-amber-50 text-amber-600"
          fonte="FinanceiroOS · Histórico de planos"
          status="em_preparacao"
          items={[
            { label: "Cobranças emitidas",     ready: false },
            { label: "Inadimplência",          ready: false },
            { label: "Plano ativo por cliente",ready: false },
            { label: "Histórico financeiro",   ready: false },
            { label: "Projeção de receita",    ready: false },
          ]}
        />
      </div>

      {/* Link para Fontes de Dados */}
      <div className="mt-6 bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Link2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800">Fontes de Dados</p>
            <p className="text-[10px] text-gray-400">Integrações, uploads manuais e saúde das conexões por cliente</p>
          </div>
        </div>
        <Link
          href="/admin/fontes-dados"
          className="flex-shrink-0 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors"
        >
          Gerenciar fontes →
        </Link>
      </div>

      {/* Próximas funções */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Building2,     label: "PDF por cliente",      note: "Relatório consolidado" },
          { icon: Mail,          label: "Envio por e-mail",     note: "Entrega automática ao cliente" },
          { icon: MessageCircle, label: "WhatsApp",             note: "Compartilhamento direto" },
          { icon: CalendarDays,  label: "Agendamento",          note: "Relatório mensal automático" },
        ].map(({ icon: Icon, label, note }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-3.5">
            <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center mb-2">
              <Icon className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <p className="text-xs font-bold text-gray-600">{label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{note}</p>
            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full mt-1.5 inline-block">Em breve</span>
          </div>
        ))}
      </div>

      <AdaptiveReportsSection />

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  );
}
