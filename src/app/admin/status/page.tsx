import { PageHeader } from "@/components/page-header";
import { CheckCircle2, Clock, AlertCircle, Wifi, WifiOff, ShieldAlert } from "lucide-react";
import Link from "next/link";

type ModuleStatus = "funcional" | "parcial" | "em_breve";

interface Module {
  name: string;
  desc: string;
  status: ModuleStatus;
  notes?: string;
}

const MODULES: Module[] = [
  // Funcional
  { name: "Login",             desc: "Autenticação via Google OAuth",       status: "funcional" },
  { name: "Dashboard Admin",   desc: "KPIs, clientes, aprovações, módulos", status: "funcional" },
  { name: "Clientes",          desc: "Lista, badges Meta/IG, filtros",      status: "funcional" },
  { name: "Content OS",        desc: "Criar, produzir, aprovar, agendar",   status: "funcional" },
  { name: "Base Estratégica",  desc: "Onboarding, tom de voz, objetivo",    status: "funcional" },
  { name: "Rec OS",            desc: "Gravações, roteiros, aprovação",      status: "funcional" },
  { name: "Operacional",       desc: "Kanban de projetos e tarefas",        status: "funcional" },
  { name: "Conexões",          desc: "OAuth Meta/Instagram completo",       status: "funcional" },
  { name: "Equipe",            desc: "Solicitações de acesso e membros",    status: "funcional" },
  { name: "Configurações",     desc: "IA, preferências, onboarding",       status: "funcional" },

  // Parcial
  { name: "Meta / Instagram",  desc: "OAuth + ativos vinculados, insights pendentes", status: "parcial", notes: "Insights em tempo real: em breve" },
  { name: "Insights Content",  desc: "Pipeline de conteúdos com dados reais",         status: "parcial", notes: "Métricas de alcance: em breve" },
  { name: "Radar de Tendências", desc: "Estrutura criada, dados manuais por enquanto", status: "parcial", notes: "Integração Google Trends: roadmap" },
  { name: "Criação Visual",    desc: "Estrutura criada, geração bloqueada",           status: "parcial", notes: "Aguarda sistema de créditos" },
  { name: "Financeiro",        desc: "Página criada, sem dados reais ainda",         status: "parcial", notes: "Cobranças e MRR: próxima fase" },
  { name: "Relatórios",        desc: "Estrutura criada, dados limitados",            status: "parcial", notes: "Cruzamento de dados: próxima fase" },
  { name: "Diagnósticos",      desc: "Formulário criado, sem automação de envio",    status: "parcial" },

  // Em breve
  { name: "Growth OS",         desc: "Leads, propostas, pipeline comercial",         status: "em_breve" },
  { name: "Finance OS completo", desc: "Cobranças, receitas, inadimplência, MRR",    status: "em_breve" },
  { name: "Academy",           desc: "Módulos de ensino para clientes e equipe",     status: "em_breve" },
  { name: "Publicação automática", desc: "Postar no Instagram/Facebook via API",     status: "em_breve" },
  { name: "Anúncios Meta",     desc: "Criar e gerenciar campanhas Meta Ads",        status: "em_breve" },
  { name: "Google Meu Negócio", desc: "Gerenciar avaliações e publicações",         status: "em_breve" },
  { name: "Créditos de IA",    desc: "Controle de uso por plano e compra avulsa",   status: "em_breve" },
  { name: "App do cliente",    desc: "Portal do cliente final para aprovações",      status: "em_breve" },
];

const STATUS_CONFIG: Record<ModuleStatus, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  funcional: { label: "Funcional",  icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
  parcial:   { label: "Parcial",    icon: AlertCircle,  color: "text-amber-600",   bg: "bg-amber-50 border-amber-100"   },
  em_breve:  { label: "Em breve",   icon: Clock,        color: "text-gray-400",    bg: "bg-gray-50 border-gray-100"     },
};

const INTEGRATIONS = [
  { name: "Cardápio Digital (OlaClick)", desc: "Pedidos, faturamento e ticket médio via API", statusKey: "olaclick",     href: "/admin/fontes-dados" },
  { name: "Meta / Instagram",            desc: "Insights via Graph API",                       statusKey: "meta",         href: "/admin/conexoes"    },
  { name: "OpenAI",                      desc: "Busca com IA no painel",                       statusKey: "openai",       href: "/admin/configuracoes" },
  { name: "Supabase",                    desc: "Banco de dados e autenticação",                 statusKey: "supabase",     href: "/admin/configuracoes" },
  { name: "WhatsApp",                    desc: "Aprovações e alertas via WhatsApp",             statusKey: "whatsapp",     href: "/admin/whatsapp"    },
];

export default function AdminStatusPage() {
  const funcional = MODULES.filter((m) => m.status === "funcional");
  const parcial   = MODULES.filter((m) => m.status === "parcial");
  const emBreve   = MODULES.filter((m) => m.status === "em_breve");

  return (
    <div>
      <PageHeader
        title="Status da V1"
        description="Saúde das integrações e estado dos módulos da LOKAT OS"
      />

      {/* Integrações */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
          <h2 className="text-sm font-black text-gray-700">Integrações</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {INTEGRATIONS.map((int) => {
            const isActive  = ["olaclick", "meta", "supabase"].includes(int.statusKey);
            const isPartial = int.statusKey === "openai";
            const isSoon    = int.statusKey === "whatsapp";
            return (
              <Link key={int.name} href={int.href} className="rounded-xl border p-3.5 flex items-start gap-3 no-underline transition-colors hover:bg-gray-50"
                style={{ background: "#fff", borderColor: "#f0f0f0" }}>
                {isSoon
                  ? <Clock className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  : isActive
                    ? <Wifi className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    : isPartial
                      ? <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                      : <WifiOff className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                }
                <div>
                  <p className="text-xs font-bold text-gray-800">{int.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{int.desc}</p>
                  <p className={`text-[9px] font-semibold mt-1 ${isSoon ? "text-gray-300" : isActive ? "text-emerald-600" : isPartial ? "text-amber-500" : "text-gray-300"}`}>
                    {isSoon ? "Em breve" : isActive ? "Ativo" : isPartial ? "Configurar chave" : "Inativo"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {(["funcional", "parcial", "em_breve"] as const).map((s) => {
          const cfg   = STATUS_CONFIG[s];
          const count = MODULES.filter((m) => m.status === s).length;
          const Icon  = cfg.icon;
          return (
            <div key={s} className={`rounded-2xl border p-4 flex items-center gap-3 ${cfg.bg}`}>
              <Icon className={`w-5 h-5 ${cfg.color}`} strokeWidth={1.5} />
              <div>
                <p className={`text-xl font-black ${cfg.color}`}>{count}</p>
                <p className="text-xs text-gray-500">{cfg.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-8">
        <Section title="Funcional" modules={funcional} status="funcional" />
        <Section title="Parcial" modules={parcial} status="parcial" />
        <Section title="Em breve" modules={emBreve} status="em_breve" />
      </div>
    </div>
  );
}

function Section({ title, modules, status }: { title: string; modules: Module[]; status: ModuleStatus }) {
  const cfg  = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <div>
      <h2 className={`text-sm font-black mb-3 flex items-center gap-2 ${cfg.color}`}>
        <Icon className="w-4 h-4" strokeWidth={1.5} />
        {title}
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {modules.map((m) => (
          <div key={m.name} className={`rounded-xl border p-3.5 ${cfg.bg}`}>
            <p className="text-xs font-bold text-gray-800">{m.name}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{m.desc}</p>
            {m.notes && (
              <p className={`text-[9px] font-medium mt-1.5 ${cfg.color}`}>{m.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
