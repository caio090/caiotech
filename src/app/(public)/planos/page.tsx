import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "R$ 297",
    period: "/mês",
    desc: "Para freelancers e agências iniciando",
    features: ["Até 5 clientes", "Clientos + Contentos", "1 membro de equipe", "Suporte por email"],
    cta: "Começar grátis",
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 597",
    period: "/mês",
    desc: "Para agências em crescimento",
    features: ["Clientes ilimitados", "Todos os módulos", "Até 5 membros", "GrowthOS + FinanceOS", "Academy", "Suporte prioritário"],
    cta: "Testar 14 dias grátis",
    highlight: true,
  },
  {
    name: "Agency",
    price: "R$ 997",
    period: "/mês",
    desc: "Para agências escalando",
    features: ["Tudo do Pro", "Membros ilimitados", "API + integrações", "Relatórios avançados", "Gerente de sucesso dedicado"],
    cta: "Falar com consultor",
    highlight: false,
  },
];

export default function PlanosPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <div className="text-center mb-14">
        <h1 className="text-4xl font-black text-gray-900 mb-4">Planos simples, resultado real</h1>
        <p className="text-lg text-gray-500">Comece grátis. Escale conforme crescer.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div key={p.name} className={`rounded-3xl p-6 ${p.highlight ? "bg-indigo-600 text-white shadow-xl scale-105" : "bg-white border border-gray-100"}`}>
            <div className="mb-4">
              <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${p.highlight ? "text-indigo-200" : "text-gray-400"}`}>{p.name}</div>
              <div className="flex items-end gap-1">
                <span className={`text-3xl font-black ${p.highlight ? "text-white" : "text-gray-900"}`}>{p.price}</span>
                <span className={`text-sm mb-1 ${p.highlight ? "text-indigo-200" : "text-gray-400"}`}>{p.period}</span>
              </div>
              <p className={`text-sm mt-1 ${p.highlight ? "text-indigo-200" : "text-gray-500"}`}>{p.desc}</p>
            </div>
            <ul className="space-y-2 mb-6">
              {p.features.map((f) => (
                <li key={f} className={`text-sm flex items-start gap-2 ${p.highlight ? "text-white" : "text-gray-600"}`}>
                  <span>✓</span>{f}
                </li>
              ))}
            </ul>
            <Link href="/criar-conta" className={`block text-center py-3 rounded-xl font-bold text-sm transition-colors ${p.highlight ? "bg-white text-indigo-600 hover:bg-indigo-50" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
              {p.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
