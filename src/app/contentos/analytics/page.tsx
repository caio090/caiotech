import { PageHeader } from "@/components/page-header";
import { mockReports, mockClients } from "@/data/mock-data";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ContentosAnalyticsPage() {
  return (
    <div>
      <PageHeader title="Analytics" description="Performance de conteúdo por marca" />
      <div className="space-y-5">
        {mockReports.map((r) => {
          const client = mockClients.find((c) => c.id === r.clientId);
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center", client?.color)}>
                  {client?.avatar}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{r.clientName}</h3>
                  <p className="text-xs text-gray-400">{r.period}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {Object.entries(r.metrics).map(([key, m]) => (
                  <div key={key} className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-sm font-black text-gray-900">
                      {typeof m.value === "number" && m.value > 1000 ? m.value.toLocaleString("pt-BR") : m.value}
                      {key === "engajamento" ? "%" : ""}
                    </div>
                    <div className="text-[10px] text-gray-500 capitalize mt-0.5">{key}</div>
                    <div className={cn("flex items-center justify-center gap-0.5 text-[10px] font-medium mt-1", m.growth > 0 ? "text-emerald-600" : "text-red-500")}>
                      {m.growth > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {Math.abs(m.growth)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
