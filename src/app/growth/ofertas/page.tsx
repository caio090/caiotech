import { PageHeader } from "@/components/page-header";

const offers = [
  { name: "Starter Social", price: 1200, clients: 2, features: ["2 posts/semana", "1 rede social", "Relatório mensal"] },
  { name: "Growth Pack", price: 2200, clients: 2, features: ["5 posts/semana", "2 redes sociais", "Gestão de comentários", "Relatório quinzenal"] },
  { name: "Full Agency", price: 3800, clients: 1, features: ["Posts diários", "Todas as redes", "Anúncios inclusos", "Reunião mensal", "Relatório semanal"] },
];

export default function GrowthOfertasPage() {
  return (
    <div>
      <PageHeader title="Ofertas" description="Planos e serviços da agência" />
      <div className="grid sm:grid-cols-3 gap-4">
        {offers.map((o, i) => (
          <div key={o.name} className={`rounded-2xl border p-5 ${i === 1 ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-100"}`}>
            {i === 1 && <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-3 inline-block ${i === 1 ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600"}`}>Mais popular</span>}
            <h3 className={`text-sm font-black mb-1 ${i === 1 ? "text-white" : "text-gray-900"}`}>{o.name}</h3>
            <div className={`text-2xl font-black mb-1 ${i === 1 ? "text-white" : "text-gray-900"}`}>
              R$ {o.price.toLocaleString("pt-BR")}
              <span className={`text-xs font-normal ${i === 1 ? "text-white/70" : "text-gray-400"}`}>/mês</span>
            </div>
            <p className={`text-xs mb-4 ${i === 1 ? "text-white/70" : "text-gray-400"}`}>{o.clients} cliente{o.clients > 1 ? "s" : ""} ativo{o.clients > 1 ? "s" : ""}</p>
            <ul className="space-y-1.5 mb-5">
              {o.features.map((f) => (
                <li key={f} className={`text-xs flex items-center gap-2 ${i === 1 ? "text-white/90" : "text-gray-600"}`}>
                  <span className={i === 1 ? "text-white" : "text-indigo-500"}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors ${i === 1 ? "bg-white text-indigo-600 hover:bg-indigo-50" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
              Editar plano
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
