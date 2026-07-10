import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  ArrowLeft, AtSign, Calendar, CheckSquare,
  BarChart3, Clock, Zap, AlertCircle,
} from "lucide-react";

export const metadata: Metadata = { title: "Relatório de Conteúdo" };

const CONTENT_FIELDS = [
  { label: "Conteúdos planejados",  icon: Calendar,    ready: false },
  { label: "Conteúdos publicados",  icon: AtSign,      ready: false },
  { label: "Conteúdos pendentes",   icon: Clock,       ready: false },
  { label: "Aprovações no período", icon: CheckSquare, ready: false },
  { label: "Top posts (alcance)",   icon: BarChart3,   ready: false },
  { label: "Taxa de entrega",       icon: Zap,         ready: false },
];

export default function RelatorioConteudoPage() {
  return (
    <div>
      <PageHeader title="Relatório de Conteúdo" description="Performance editorial por cliente">
        <Link
          href="/admin/relatorios"
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl px-3 py-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Dados & Insights
        </Link>
      </PageHeader>

      <div className="mb-6 p-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-700 flex items-start gap-2">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>
          Relatório de conteúdo será preenchido conforme calendários, aprovações e publicações forem vinculados ao cliente no REC OS.
          Enquanto isso, use os{" "}
          <Link href="/admin/contentos/insights" className="font-bold underline">Insights da REC OS</Link>{" "}
          para visualizar os dados disponíveis diretamente.
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-800">Campos do relatório</p>
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
            Aguardando dados
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {CONTENT_FIELDS.map(({ label, icon: Icon, ready }) => (
            <div
              key={label}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${ready ? "bg-emerald-100" : "bg-gray-100"}`}>
                <Icon className={`w-3.5 h-3.5 ${ready ? "text-emerald-600" : "text-gray-400"}`} strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-medium ${ready ? "text-gray-800" : "text-gray-400"}`}>{label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{ready ? "Disponível" : "Aguardando fonte de dados"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/contentos/insights"
          className="flex items-center gap-2 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition-colors"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Ver Meta Insights (REC OS)
        </Link>
        <Link
          href="/admin/contentos/aprovacoes"
          className="flex items-center gap-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          Aprovações
        </Link>
        <Link
          href="/admin/contentos/calendario"
          className="flex items-center gap-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          Calendário editorial
        </Link>
      </div>
    </div>
  );
}
