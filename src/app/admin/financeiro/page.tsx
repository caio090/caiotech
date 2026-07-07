import { PageHeader } from "@/components/page-header";
import {
  DollarSign, TrendingUp, AlertTriangle, CreditCard,
  ArrowUpRight, ArrowDownRight, Clock, Zap, Target,
  Percent, BarChart2,
} from "lucide-react";

function SummaryCard({
  title, value, icon: Icon, color, bg, note,
}: {
  title: string; value: string; icon: React.ElementType;
  color: string; bg: string; note?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <p className="text-xs font-semibold text-gray-500">{title}</p>
        </div>
        <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">demo</span>
      </div>
      <p className="text-xl font-black text-gray-900">{value}</p>
      {note && <p className="text-[11px] text-gray-400 mt-0.5">{note}</p>}
    </div>
  );
}

export default function AdminFinanceiroPage() {
  return (
    <div>
      <PageHeader title="Financeiro" description="Visão financeira da operação — MRR, margens e métricas de crescimento" />

      {/* Aviso demonstração */}
      <div className="mb-6 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-500">
        <span className="font-bold text-gray-700">Demonstração</span>
        <span>·</span>
        <span>Dados reais serão exibidos após cadastro de cobranças e integração financeira.</span>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          title="MRR"
          value="—"
          icon={TrendingUp}
          color="text-emerald-600"
          bg="bg-emerald-50"
          note="Receita recorrente mensal"
        />
        <SummaryCard
          title="CAC"
          value="—"
          icon={Target}
          color="text-blue-600"
          bg="bg-blue-50"
          note="Custo de aquisição de cliente"
        />
        <SummaryCard
          title="LTV"
          value="—"
          icon={TrendingUp}
          color="text-indigo-600"
          bg="bg-indigo-50"
          note="Lifetime value médio"
        />
        <SummaryCard
          title="Churn"
          value="—"
          icon={AlertTriangle}
          color="text-red-600"
          bg="bg-red-50"
          note="Taxa de cancelamento mensal"
        />
        <SummaryCard
          title="ROI"
          value="—"
          icon={BarChart2}
          color="text-emerald-600"
          bg="bg-emerald-50"
          note="Retorno sobre investimento"
        />
        <SummaryCard
          title="ROAS"
          value="—"
          icon={DollarSign}
          color="text-blue-600"
          bg="bg-blue-50"
          note="Retorno sobre anúncios"
        />
        <SummaryCard
          title="Custo IA"
          value="—"
          icon={Zap}
          color="text-violet-600"
          bg="bg-violet-50"
          note="Créditos de IA consumidos"
        />
        <SummaryCard
          title="Margem"
          value="—"
          icon={Percent}
          color="text-emerald-600"
          bg="bg-emerald-50"
          note="Margem operacional estimada"
        />
      </div>

      {/* Resultado mensal */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-indigo-500" />
            <p className="text-sm font-bold text-gray-800">Resultado mensal</p>
          </div>
          <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">demo</span>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Receitas</p>
            <p className="text-lg font-black text-gray-900 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" /> —
            </p>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Despesas</p>
            <p className="text-lg font-black text-gray-900 flex items-center gap-1">
              <ArrowDownRight className="w-4 h-4 text-red-400" /> —
            </p>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Resultado</p>
            <p className="text-lg font-black text-gray-500">—</p>
          </div>
        </div>
      </div>

      {/* Inadimplência */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <p className="text-sm font-bold text-gray-800">Inadimplência</p>
          <span className="ml-auto text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">demo</span>
        </div>
        <div className="text-center py-8">
          <p className="text-xs text-gray-400">Nenhuma inadimplência registrada.</p>
        </div>
      </div>

      {/* Billing → link */}
      <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800">Planos e Assinaturas</p>
            <p className="text-[10px] text-gray-400">MRR por assinatura, cupons e controle de billing</p>
          </div>
        </div>
        <a
          href="/admin/super/billing"
          className="flex-shrink-0 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors"
        >
          Abrir Billing →
        </a>
      </div>

      <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-start gap-2">
        <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>
          O FinanceiroOS será populado com dados reais conforme as cobranças forem cadastradas.
          Integração com Asaas disponível para importação de cobranças.
        </span>
      </div>
    </div>
  );
}
