import { PageHeader } from "@/components/page-header";
import {
  DollarSign, TrendingUp, AlertTriangle, CreditCard,
  ArrowUpRight, ArrowDownRight, Clock, ChevronRight,
} from "lucide-react";

function EmptyCategory({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-5">
      <p className="text-sm font-semibold text-gray-600 mb-0.5">{title}</p>
      <p className="text-xs text-gray-400">{desc}</p>
      <span className="inline-block mt-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
        Sem dados cadastrados
      </span>
    </div>
  );
}

function SummaryCard({
  title, value, icon: Icon, color, bg, note,
}: {
  title: string; value: string; icon: React.ElementType;
  color: string; bg: string; note?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <p className="text-xs font-semibold text-gray-500">{title}</p>
      </div>
      <p className="text-xl font-black text-gray-900">{value}</p>
      {note && <p className="text-[11px] text-gray-400 mt-0.5">{note}</p>}
    </div>
  );
}

export default function AdminFinanceiroPage() {
  return (
    <div>
      <PageHeader title="Financeiro" description="Visão geral financeira da agência" />

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          title="MRR"
          value="—"
          icon={TrendingUp}
          color="text-emerald-600"
          bg="bg-emerald-50"
          note="Sem dados ainda"
        />
        <SummaryCard
          title="Recebido no mês"
          value="—"
          icon={DollarSign}
          color="text-emerald-600"
          bg="bg-emerald-50"
          note="Sem dados ainda"
        />
        <SummaryCard
          title="Pendente"
          value="—"
          icon={CreditCard}
          color="text-amber-600"
          bg="bg-amber-50"
          note="Sem dados ainda"
        />
        <SummaryCard
          title="Inadimplência"
          value="—"
          icon={AlertTriangle}
          color="text-red-600"
          bg="bg-red-50"
          note="Sem dados ainda"
        />
      </div>

      {/* Categorias financeiras */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <EmptyCategory
          title="Receitas"
          desc="Mensalidades, projetos e serviços recebidos no mês."
        />
        <EmptyCategory
          title="Despesas fixas"
          desc="Ferramentas, salários, aluguéis e custos recorrentes."
        />
        <EmptyCategory
          title="Despesas variáveis"
          desc="Freelancers, impressões, eventos e custos pontuais."
        />
        <EmptyCategory
          title="Custos por cliente"
          desc="Horas trabalhadas e recursos alocados por conta."
        />
        <EmptyCategory
          title="Serviços extras"
          desc="Cobranças avulsas, alterações e upgrades de plano."
        />
        <EmptyCategory
          title="Previsão de recebimento"
          desc="Cobranças futuras e contratos com datas definidas."
        />
      </div>

      {/* Seção inadimplência */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <p className="text-sm font-bold text-gray-800">Inadimplência</p>
        </div>
        <div className="text-center py-8">
          <p className="text-xs text-gray-400">Nenhuma inadimplência registrada.</p>
        </div>
      </div>

      {/* Resultado mensal */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-indigo-500" />
          <p className="text-sm font-bold text-gray-800">Resultado mensal</p>
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
