import { PageHeader } from "@/components/page-header";
import { adminMetrics } from "@/data/mock-data";
import { cn } from "@/lib/utils";

const goals = [
  { label: "MRR (Receita Mensal)", current: adminMetrics.mrr, target: 18000, unit: "R$", emoji: "💰" },
  { label: "Clientes ativos", current: adminMetrics.activeClients, target: 8, unit: "", emoji: "🤝" },
  { label: "Taxa de retenção", current: 85, target: 95, unit: "%", emoji: "🔒" },
  { label: "NPS médio", current: 72, target: 80, unit: "", emoji: "⭐" },
  { label: "Conteúdos entregues/mês", current: 42, target: 60, unit: "", emoji: "📄" },
];

export default function GrowthMetasPage() {
  return (
    <div>
      <PageHeader title="Metas" description="OKRs e objetivos da agência" />
      <div className="space-y-3">
        {goals.map((g) => {
          const pct = Math.min(Math.round((g.current / g.target) * 100), 100);
          return (
            <div key={g.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">{g.emoji}</span>
                <span className="text-sm font-bold text-gray-800 flex-1">{g.label}</span>
                <div className="text-right">
                  <span className="text-sm font-black text-gray-900">{g.unit}{typeof g.current === "number" && g.current > 999 ? g.current.toLocaleString("pt-BR") : g.current}{g.unit === "%" ? "" : ""}</span>
                  <span className="text-xs text-gray-400"> / {g.unit}{typeof g.target === "number" && g.target > 999 ? g.target.toLocaleString("pt-BR") : g.target}{g.unit === "%" ? "%" : ""}</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400")} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">{pct}% da meta</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
