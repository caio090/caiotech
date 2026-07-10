import { PageHeader } from "@/components/page-header";
import { CheckCircle2, Clock, AlertCircle, Wifi, WifiOff, ShieldAlert } from "lucide-react";
import Link from "next/link";
import {
  PROJECT_DEADLINE_V1, V1_PROGRESS, V2_PROGRESS,
  getDaysRemainingV1, MILESTONES_V1, MILESTONES_V2,
} from "@/lib/project-status";

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
  { name: "REC OS",            desc: "Criar, produzir, aprovar, agendar conteúdos por cliente", status: "funcional" },
  { name: "Base Estratégica",  desc: "Onboarding, tom de voz, objetivo",    status: "funcional" },
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

  // Parcial adicional
  { name: "Portal da Agência",  desc: "/agency/home criado — em integração com planos e limites", status: "parcial", notes: "Limites de clientes por plano: em ajuste" },
  { name: "Billing / Planos",   desc: "Planos, cupons e trial configurados — gateway em breve",   status: "parcial", notes: "Pagamentos automáticos: próxima fase" },
  { name: "Diagnóstico mobile", desc: "Responsividade em ajuste — overflow identificado",         status: "parcial", notes: "Fix de viewport mobile: em andamento" },
  { name: "Central de Contas",         desc: "Classificação real de perfis em andamento: interno Lokat, agência parceira, cliente direto, cliente de agência, operacional e lead.", status: "parcial", notes: "Classificação de perfis em desenvolvimento ativo." },
  { name: "Pré-acesso / Waitlist Beta", desc: "Captação de interessados funcionando com origem, intenção e acompanhamento comercial. Próximo passo: refinar prioridade e segmentação.", status: "funcional" },
  { name: "Motion / Microinterações",   desc: "hover e active:scale nos CTAs da landing e planos. prefers-reduced-motion respeitado via Tailwind.", status: "parcial", notes: "Cards hover e animações de seção: próxima fase." },
  { name: "/rec Mobile",        desc: "Layout responsivo ajustado — navegação colapsada, grids em coluna única, textos legíveis e tratamento de erros de vídeo", status: "funcional" },
  { name: "Meta Insights",      desc: "Conexão Meta configurada — insights ativos, dados avançados de público dependem das permissões da conta", status: "parcial", notes: "Dados avançados dependem das permissões conectadas." },
  { name: "Cardápio Digital",   desc: "Faturamento real funcionando — paginação e produtos detalhados em breve", status: "parcial", notes: "Paginação além 50 pedidos: próxima fase" },

  // Em breve
  { name: "Storage & Drive",    desc: "Upload de arquivos, artes aprovadas, briefings e vínculos Google Drive. Planejado para Fase 1 via Supabase Storage.", status: "em_breve", notes: "Ver docs/STORAGE_AND_DRIVE_STRATEGY.md. Sem implementação ainda." },
  { name: "Tráfego OS",         desc: "Meta Ads, Google Ads, SEO, campanhas pagas, orçamento e públicos", status: "em_breve" },
  { name: "Inteligência Local", desc: "Rastreio por bairro, mapas, região, origem de pedidos e leads",    status: "em_breve" },
  { name: "WhatsApp QR",        desc: "Conexão QR via Evolution API / WhatsApp Cloud",                    status: "em_breve" },
  { name: "Aprovação por link", desc: "Clientes aprovam conteúdos via link externo sem login",            status: "em_breve" },
  { name: "REC OS Vídeo",       desc: "Timeline de produção audiovisual — roteiro, gravação, edição",     status: "em_breve" },
  { name: "Growth OS",          desc: "Leads, propostas, pipeline comercial",                             status: "em_breve" },
  { name: "Finance OS completo",desc: "Cobranças, receitas, inadimplência, MRR",                          status: "em_breve" },
  { name: "Academy",            desc: "Módulos de ensino para clientes e equipe",                         status: "em_breve" },
  { name: "Publicação automática", desc: "Postar no Instagram/Facebook via API",                          status: "em_breve" },
  { name: "Créditos de IA",     desc: "Controle de uso por plano e compra avulsa",                        status: "em_breve" },
  { name: "App do cliente",     desc: "Portal do cliente final para aprovações",                           status: "em_breve" },
];

const STATUS_CONFIG: Record<ModuleStatus, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  funcional: { label: "Funcional",  icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
  parcial:   { label: "Parcial",    icon: AlertCircle,  color: "text-amber-600",   bg: "bg-amber-50 border-amber-100"   },
  em_breve:  { label: "Em breve",   icon: Clock,        color: "text-gray-400",    bg: "bg-gray-50 border-gray-100"     },
};

const INTEGRATIONS = [
  {
    name: "Cardápio Digital / OlaClick",
    desc: "Faturamento real, pedidos, ticket médio — auto-refresh a cada 5 min",
    statusKey: "olaclick",
    status: "ativo",
    href: "/admin/fontes-dados",
  },
  {
    name: "Meta / Instagram",
    desc: "Conexão existe — insights dependem de vínculo e permissão da conta",
    statusKey: "meta",
    status: "parcial",
    href: "/admin/conexoes",
  },
  {
    name: "OpenAI / Busca IA",
    desc: "Dashboard search com IA + busca por palavras-chave",
    statusKey: "openai",
    status: "em_teste",
    href: "/admin/configuracoes",
  },
  {
    name: "Billing / Planos",
    desc: "Planos, cupons e trial configurados — gateway em breve",
    statusKey: "billing",
    status: "em_construcao",
    href: "/admin/super/billing",
  },
  {
    name: "Fontes manuais",
    desc: "Base criada — dados inseridos manualmente no painel",
    statusKey: "fontes_manuais",
    status: "ativo",
    href: "/admin/fontes-dados",
  },
  {
    name: "WhatsApp",
    desc: "Evolution API / WhatsApp Cloud — integração planejada para próxima fase",
    statusKey: "whatsapp",
    status: "planejado",
    href: "/admin/whatsapp",
  },
  {
    name: "Aprovações",
    desc: "Fluxo de aprovação de conteúdo por link — planejado",
    statusKey: "aprovacoes",
    status: "planejado",
    href: "/admin/contentos/aprovacoes",
  },
];

const INT_STATUS = {
  ativo:         { label: "Ativo",           icon: Wifi,        iconCls: "text-emerald-500", labelCls: "text-emerald-600" },
  parcial:       { label: "Parcial",         icon: AlertCircle, iconCls: "text-amber-400",  labelCls: "text-amber-500"  },
  em_teste:      { label: "Em teste",        icon: AlertCircle, iconCls: "text-blue-400",   labelCls: "text-blue-500"   },
  em_construcao: { label: "Em construção",   icon: AlertCircle, iconCls: "text-purple-400", labelCls: "text-purple-500" },
  planejado:     { label: "Planejado",       icon: Clock,       iconCls: "text-gray-300",   labelCls: "text-gray-400"   },
};

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

      {/* Progresso V1 / V2 */}
      <div className="mb-8 space-y-4">
        {/* V1 */}
        <div className="rounded-2xl border border-emerald-100 bg-white p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">V1 MVP</p>
              <p className="text-3xl font-black text-gray-900">{V1_PROGRESS}%</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 mb-0.5">Prazo</p>
              <p className="text-xs font-bold text-gray-700">{PROJECT_DEADLINE_V1}</p>
              <p className="text-xs text-emerald-600 font-black mt-0.5">{getDaysRemainingV1()} dias</p>
            </div>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${V1_PROGRESS}%` }} />
          </div>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {MILESTONES_V1.map((m) => (
              <div key={m.label} className="flex items-center gap-2">
                {m.status === "done"
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" strokeWidth={2} />
                  : m.status === "partial"
                    ? <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" strokeWidth={2} />
                    : <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" strokeWidth={2} />}
                <span className={`text-[11px] ${
                  m.status === "done" ? "text-gray-600" :
                  m.status === "partial" ? "text-amber-700" :
                  "text-gray-400"
                }`}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* V2 */}
        <div className="rounded-2xl border border-purple-100 bg-white p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">V2</p>
              <p className="text-3xl font-black text-purple-600">{V2_PROGRESS}%</p>
            </div>
            <p className="text-[11px] text-gray-400 pt-1">Planejamento em andamento</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-purple-400 rounded-full" style={{ width: `${V2_PROGRESS}%` }} />
          </div>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {MILESTONES_V2.map((m) => (
              <div key={m.label} className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" strokeWidth={2} />
                <span className="text-[11px] text-gray-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Integrações */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
          <h2 className="text-sm font-black text-gray-700">Integrações</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {INTEGRATIONS.map((int) => {
            const cfg = INT_STATUS[int.status as keyof typeof INT_STATUS] ?? INT_STATUS.planejado;
            const Icon = cfg.icon;
            return (
              <Link key={int.name} href={int.href} className="rounded-xl border p-3.5 flex items-start gap-3 no-underline transition-colors hover:bg-gray-50"
                style={{ background: "#fff", borderColor: "#f0f0f0" }}>
                <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.iconCls}`} strokeWidth={1.5} />
                <div>
                  <p className="text-xs font-bold text-gray-800">{int.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{int.desc}</p>
                  <p className={`text-[9px] font-semibold mt-1 ${cfg.labelCls}`}>{cfg.label}</p>
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
