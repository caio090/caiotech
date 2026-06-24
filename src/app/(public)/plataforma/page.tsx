import Link from "next/link";
import { Users, FolderKanban, Wallet, TrendingUp, GraduationCap } from "lucide-react";

const features = [
  {
    icon: Users,
    color: "indigo",
    title: "Clientos — CRM Inteligente",
    desc: "Gerencie clientes ativos com health status, linha do tempo e integração total com projetos e financeiro.",
  },
  {
    icon: FolderKanban,
    color: "purple",
    title: "Contentos — Gestão de Entregas",
    desc: "Projetos, tarefas em kanban, upload de arquivos e aprovação de entregas. Tudo por cliente.",
  },
  {
    icon: Wallet,
    color: "emerald",
    title: "FinanceOS — Controle Financeiro",
    desc: "Receitas recorrentes, emissão de cobranças, despesas e fluxo de caixa. MRR sempre visível.",
  },
  {
    icon: TrendingUp,
    color: "teal",
    title: "GrowthOS — Pipeline de Vendas",
    desc: "Funil visual, leads, propostas e conversão em 1 clique. Saiba exatamente o que está em negociação.",
  },
  {
    icon: GraduationCap,
    color: "amber",
    title: "Academy — Equipe Capacitada",
    desc: "Crie cursos e trilhas de onboarding. Treine sua equipe dentro do mesmo sistema.",
  },
];

export default function PlataformaPage() {
  return (
    <div>
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-black text-gray-900 mb-4">A plataforma completa para agências</h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-12">
          Do primeiro lead ao cliente fidelizado — tudo em um único lugar, integrado e com visibilidade total.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="text-left bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 bg-${f.color}-50 rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 text-${f.color}-600`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="bg-indigo-600 py-16 text-center">
        <h2 className="text-2xl font-black text-white mb-4">Veja na prática</h2>
        <Link href="/login" className="inline-block px-8 py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors text-sm">
          Acessar demonstração →
        </Link>
      </section>
    </div>
  );
}
