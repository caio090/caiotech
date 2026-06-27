import { PageHeader } from "@/components/page-header";
import { mockDiagnostics, mockClients } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import { Sparkles, BarChart3, CheckCircle2, Clock, AlertCircle, Link2, FileText } from "lucide-react";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-bold text-gray-700">{value}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className={cn("h-1.5 rounded-full", value >= 80 ? "bg-emerald-500" : value >= 65 ? "bg-amber-400" : "bg-red-400")} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

type StatusKey = "completo" | "parcial" | "pendente" | "aguardando_conexao" | "aguardando_leitura";

const STATUS: Record<StatusKey, { label: string; color: string; bg: string }> = {
  completo:           { label: "Completo",           color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
  parcial:            { label: "Parcial",             color: "text-amber-700",   bg: "bg-amber-50 border-amber-100"     },
  pendente:           { label: "Pendente",            color: "text-gray-500",    bg: "bg-gray-50 border-gray-200"       },
  aguardando_conexao: { label: "Aguardando conexão",  color: "text-blue-700",    bg: "bg-blue-50 border-blue-100"       },
  aguardando_leitura: { label: "Aguardando leitura",  color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-100"   },
};

function StatusBadge({ status }: { status: StatusKey }) {
  const cfg = STATUS[status];
  const Icon = status === "completo" ? CheckCircle2 : status === "pendente" ? AlertCircle : status === "aguardando_conexao" ? Link2 : Clock;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" />{cfg.label}
    </span>
  );
}

function SourceBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${active ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-gray-50 text-gray-400 border-gray-100"}`}>
      {active ? "✓" : "○"} {label}
    </span>
  );
}

export default function AdminDiagnosticosPage() {
  return (
    <div>
      <PageHeader title="Diagnósticos" description="Saúde digital e comercial por cliente" />

      {/* Conceito de diagnóstico duplo */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8 p-5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" strokeWidth={1.5} />
            </div>
            <p className="text-xs font-black text-purple-800">Diagnóstico Digital</p>
          </div>
          <p className="text-[11px] text-purple-700 leading-relaxed">
            Mede a saúde da presença digital da marca — posicionamento, conteúdo, engajamento, consistência de comunicação e oportunidades.
            Alimenta a <strong>Content OS</strong> com contexto estratégico.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {["Diagnóstico da marca", "Content OS", "Insights Meta", "Calendário editorial"].map((l) => (
              <span key={l} className="text-[9px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{l}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
            </div>
            <p className="text-xs font-black text-emerald-800">Diagnóstico Comercial</p>
          </div>
          <p className="text-[11px] text-emerald-700 leading-relaxed">
            Mede a saúde comercial da empresa — faturamento, ticket médio, produtos mais vendidos, recorrência e gargalos de venda.
            Alimenta sugestões de <strong>campanha e conteúdo</strong> baseadas em dados reais.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {["OlaClick", "API de vendas", "Relatório anexado", "Dados manuais"].map((l) => (
              <span key={l} className="text-[9px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{l}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Cards por cliente (mock) */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {mockDiagnostics.map((d) => {
          const client = mockClients.find((c) => c.id === d.clientId);
          return (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("w-10 h-10 rounded-xl text-white text-sm font-bold flex items-center justify-center", client?.color)}>
                  {client?.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{d.clientName}</h3>
                  <p className="text-xs text-gray-400">{new Date(d.completedAt).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="text-center flex-shrink-0">
                  <div className={cn("text-2xl font-black", d.score >= 80 ? "text-emerald-600" : d.score >= 65 ? "text-amber-500" : "text-red-500")}>{d.score}</div>
                  <div className="text-[10px] text-gray-400">score</div>
                </div>
              </div>

              {/* Diagnóstico Digital */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-purple-500" strokeWidth={1.5} />
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Saúde Digital</p>
                  </div>
                  <StatusBadge status={d.score >= 80 ? "completo" : d.score >= 65 ? "parcial" : "pendente"} />
                </div>
                <div className="space-y-2">
                  <ScoreBar label="Presença Digital"  value={d.areas.presencaDigital} />
                  <ScoreBar label="Conteúdo"          value={d.areas.conteudo} />
                  <ScoreBar label="Engajamento"       value={d.areas.engajamento} />
                  <ScoreBar label="Consistência"      value={d.areas.consistencia} />
                  <ScoreBar label="Estratégia"        value={d.areas.estrategia} />
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <SourceBadge label="Diagnóstico da marca" active />
                  <SourceBadge label="Content OS"           active />
                  <SourceBadge label="Insights Meta"        active={d.score >= 70} />
                </div>
              </div>

              {/* Diagnóstico Comercial */}
              <div className="border-t border-gray-50 pt-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="w-3 h-3 text-emerald-500" strokeWidth={1.5} />
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Saúde Comercial</p>
                  </div>
                  <StatusBadge status="aguardando_leitura" />
                </div>
                <p className="text-[10px] text-gray-400 mb-1.5">
                  Dados de faturamento e pedidos ainda não disponíveis para este cliente.
                </p>
                <div className="flex flex-wrap gap-1">
                  <SourceBadge label="OlaClick"         active={false} />
                  <SourceBadge label="Relatório mensal" active={false} />
                </div>
              </div>

              {/* Recomendações */}
              <div className="border-t border-gray-50 pt-3">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Recomendações</p>
                <ul className="space-y-1">
                  {d.recommendations.map((r, i) => (
                    <li key={i} className="text-[11px] text-gray-500 flex items-start gap-1.5">
                      <span className="text-indigo-400 mt-0.5 flex-shrink-0">→</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}

        {/* Clientes sem diagnóstico */}
        {mockClients.filter((c) => !mockDiagnostics.find((d) => d.clientId === c.id)).map((c) => (
          <div key={c.id} className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
            <div className={cn("w-10 h-10 rounded-xl text-white text-sm font-bold flex items-center justify-center mb-3", c.color)}>{c.avatar}</div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">{c.name}</h3>
            <p className="text-xs text-gray-400 mb-1">Diagnóstico ainda não realizado</p>
            <div className="flex gap-1.5 mb-3 flex-wrap justify-center">
              <StatusBadge status="pendente" />
              <StatusBadge status="aguardando_conexao" />
            </div>
            <div className="flex flex-col gap-1.5 items-center">
              <button className="text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors">
                Iniciar Diagnóstico Digital
              </button>
              <button className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                Conectar fonte comercial
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Nota de desenvolvimento */}
      <div className="mt-6 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
        <p className="text-[11px] text-gray-400">
          <strong className="text-gray-600">Dados comerciais em fase de integração.</strong>{" "}
          Quando OlaClick ou outro sistema estiver conectado, o Diagnóstico Comercial exibirá faturamento, ticket médio, produtos mais vendidos e oportunidades de campanha automaticamente.
          Também será possível anexar relatórios mensais em PDF, CSV ou planilha.
        </p>
      </div>
    </div>
  );
}
