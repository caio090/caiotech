import { PageHeader } from "@/components/page-header";

const competitors = [
  { name: "AgênciaX Social", niches: ["E-commerce", "Moda"], strengths: ["Reels de alta produção", "Design premium"], weaknesses: ["Atendimento lento", "Sem relatório"], priceRange: "R$ 1.800–4.000" },
  { name: "Criativa Marketing", niches: ["Saúde", "B2B"], strengths: ["Especialista em saúde", "Anúncios pagos"], weaknesses: ["Não atende food", "Pouco conteúdo orgânico"], priceRange: "R$ 1.500–3.500" },
  { name: "Social Plus", niches: ["Varejo", "Food"], strengths: ["Preço acessível", "Entrega rápida"], weaknesses: ["Sem estratégia", "Alta rotatividade"], priceRange: "R$ 800–1.800" },
];

export default function GrowthConcorrentesPage() {
  return (
    <div>
      <PageHeader title="Concorrentes" description="Mapeamento competitivo do mercado" />
      <div className="space-y-4">
        {competitors.map((c) => (
          <div key={c.name} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">{c.name}</h3>
                <div className="flex gap-1.5 mt-1">
                  {c.niches.map((n) => <span key={n} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{n}</span>)}
                </div>
              </div>
              <span className="text-xs font-bold text-gray-600 bg-gray-50 px-3 py-1 rounded-xl">{c.priceRange}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold text-emerald-600 mb-1.5">✓ Pontos fortes</p>
                <ul className="space-y-1">
                  {c.strengths.map((s) => <li key={s} className="text-xs text-gray-600">{s}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-bold text-red-500 mb-1.5">✕ Fraquezas</p>
                <ul className="space-y-1">
                  {c.weaknesses.map((w) => <li key={w} className="text-xs text-gray-600">{w}</li>)}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
