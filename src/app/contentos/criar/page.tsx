"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useOnboardingStore, getObjetivoPrincipal, getObjetivosSecundarios, getTomDeVoz } from "@/lib/onboarding-store";
import { PageHeader } from "@/components/page-header";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { ACTIVE_CLIENT_KEY, ACTIVE_CLIENT_NAME_KEY } from "@/lib/active-client";
import { cn } from "@/lib/utils";
import {
  Check, ChevronLeft, ChevronRight, Send, Sparkles, Calendar,
  Copy, Loader2, ClipboardList, X, Palette, Video, ScrollText, Users,
  PenLine, Wand2, Package, Megaphone, ListOrdered, ArrowLeft,
  TrendingUp, Scissors, ChevronDown, ChevronUp, Layers, AlertCircle,
  ExternalLink,
} from "lucide-react";

// ── Prod options ───────────────────────────────────────────────────────────────

const PROD_OPTIONS = [
  { id: "designer",       icon: Palette,    label: "Design",       desc: "Arte, carrossel, story, feed, impresso",  task_type: "arte",      department: "design",    assigned_role: "designer"       },
  { id: "videomaker",     icon: Video,      label: "Videomaker",   desc: "Captação, vídeo, reels, produção",         task_type: "video",     department: "video",     assigned_role: "videomaker"     },
  { id: "editor",         icon: Scissors,   label: "Editor",       desc: "Edição de vídeo, motion, corte",           task_type: "edicao",    department: "edicao",    assigned_role: "editor"         },
  { id: "social_media",   icon: ScrollText, label: "Social Media", desc: "Legenda, roteiro, calendário",             task_type: "legenda",   department: "social",    assigned_role: "social_media"   },
  { id: "gestor_trafego", icon: Megaphone,  label: "Tráfego",      desc: "Anúncio, campanha, criativo",              task_type: "trafego",   department: "trafego",   assigned_role: "gestor_trafego" },
  { id: "operacional",    icon: Users,      label: "Operacional",  desc: "Tarefa geral para a equipe",               task_type: "geral",     department: "geral",     assigned_role: "operacional"    },
  { id: "comercial",      icon: TrendingUp, label: "Comercial",    desc: "Proposta, follow-up, reunião",             task_type: "comercial", department: "comercial", assigned_role: "comercial"      },
] as const;

type ProdOptionId = (typeof PROD_OPTIONS)[number]["id"];

const PRIORITY_OPTIONS = [
  { id: "baixa", label: "Baixa" }, { id: "media", label: "Média" },
  { id: "alta",  label: "Alta"  }, { id: "urgente", label: "Urgente" },
];

function getDefaultProdOption(tipo: string): ProdOptionId {
  const map: Record<string, ProdOptionId> = {
    feed: "designer", story: "designer", stories: "designer",
    carousel: "designer", carrossel: "designer", feed_stories: "designer",
    outdoor: "designer", banner: "designer", impresso: "designer",
    reels: "videomaker",
    trafego: "gestor_trafego", campanha: "gestor_trafego",
    legenda: "social_media", roteiro: "social_media", whatsapp: "social_media",
  };
  return map[tipo] ?? "operacional";
}

// ── ProdSectorGrid ─────────────────────────────────────────────────────────────

function ProdSectorGrid({ selected, onSelect }: { selected: ProdOptionId; onSelect: (id: ProdOptionId) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {PROD_OPTIONS.map((o) => {
        const Icon = o.icon;
        return (
          <button key={o.id} onClick={() => onSelect(o.id)}
            className={cn("flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all",
              selected === o.id ? "border-slate-700 bg-slate-50" : "border-gray-100 hover:border-gray-200 bg-white")}>
            <Icon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", selected === o.id ? "text-slate-700" : "text-gray-400")} />
            <div>
              <p className={cn("text-xs font-bold", selected === o.id ? "text-slate-800" : "text-gray-700")}>{o.label}</p>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{o.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── SendToProdModal (Caminho A) ────────────────────────────────────────────────

interface ProdCfg { task_type: string; department: string; assigned_role: string; due_date: string | null; priority: string; notes: string; }

interface SendToProdModalProps {
  onClose: () => void; onSubmit: (cfg: ProdCfg) => Promise<void>;
  defaultOption: ProdOptionId; contentTitle: string; clientName: string; sending: boolean;
}

function SendToProdModal({ onClose, onSubmit, defaultOption, contentTitle, clientName, sending }: SendToProdModalProps) {
  const [selected, setSelected] = useState<ProdOptionId>(defaultOption);
  const [dueDate,  setDueDate]  = useState("");
  const [priority, setPriority] = useState("media");
  const [notes,    setNotes]    = useState("");
  const opt = PROD_OPTIONS.find((o) => o.id === selected) ?? PROD_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-600" />
            <div>
              <h2 className="text-base font-black text-gray-900">Enviar para produção</h2>
              <p className="text-xs text-gray-400 mt-0.5">Escolha o setor responsável</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-gray-400">Conteúdo</span><span className="font-medium text-gray-700 truncate max-w-[60%] text-right">{contentTitle}</span></div>
            {clientName && <div className="flex justify-between"><span className="text-gray-400">Cliente</span><span className="font-medium text-gray-700">{clientName}</span></div>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Setor / responsável *</label>
            <ProdSectorGrid selected={selected} onSelect={setSelected} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Prazo</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Prioridade</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 bg-white">
                {PRIORITY_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Observação interna (opcional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes para a equipe..." rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50">Cancelar</button>
            <button onClick={() => onSubmit({ task_type: opt.task_type, department: opt.department, assigned_role: opt.assigned_role, due_date: dueDate || null, priority, notes })}
              disabled={sending}
              className="flex-1 bg-slate-700 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-slate-800 flex items-center justify-center gap-2 disabled:opacity-60">
              {sending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando…</> : <><ClipboardList className="w-3.5 h-3.5" /> Enviar tarefa</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PreApprovalModal (Caminho B — setor pós-aprovação) ────────────────────────

interface PreApprovalCfg { enabled: boolean; option: ProdOptionId; due_date: string; priority: string; notes: string; }

interface PreApprovalModalProps {
  onClose: () => void; onConfirm: (cfg: PreApprovalCfg) => void;
  defaultOption: ProdOptionId; contentTitle: string; clientName: string;
}

function PreApprovalModal({ onClose, onConfirm, defaultOption, contentTitle, clientName }: PreApprovalModalProps) {
  const [needsProd, setNeedsProd] = useState(true);
  const [selected,  setSelected]  = useState<ProdOptionId>(defaultOption);
  const [dueDate,   setDueDate]   = useState("");
  const [priority,  setPriority]  = useState("media");
  const [notes,     setNotes]     = useState("");

  function handleConfirm() {
    onConfirm(needsProd
      ? { enabled: true, option: selected, due_date: dueDate, priority, notes }
      : { enabled: false, option: selected, due_date: "", priority: "media", notes: "" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
          <div>
            <h2 className="text-base font-black text-gray-900">Antes de enviar para aprovação</h2>
            <p className="text-xs text-gray-400 mt-0.5">Defina o destino após aprovação do cliente</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-indigo-400">Conteúdo</span><span className="font-medium text-indigo-800 truncate max-w-[60%] text-right">{contentTitle}</span></div>
            {clientName && <div className="flex justify-between"><span className="text-indigo-400">Cliente</span><span className="font-medium text-indigo-800">{clientName}</span></div>}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">Após aprovação do cliente, precisa de produção interna?</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setNeedsProd(true)}
                className={cn("py-2.5 rounded-xl border-2 text-xs font-bold transition-all",
                  needsProd ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-100 text-gray-500 hover:border-gray-200")}>
                Sim, precisa
              </button>
              <button onClick={() => setNeedsProd(false)}
                className={cn("py-2.5 rounded-xl border-2 text-xs font-bold transition-all",
                  !needsProd ? "border-gray-600 bg-gray-50 text-gray-800" : "border-gray-100 text-gray-500 hover:border-gray-200")}>
                Não precisa
              </button>
            </div>
            {!needsProd && (
              <p className="mt-2 text-[10px] text-gray-400">Ex: legenda, texto, comunicado já pronto. Nenhuma tarefa será criada no Operacional.</p>
            )}
          </div>
          {needsProd && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Setor responsável após aprovação *</label>
                <ProdSectorGrid selected={selected} onSelect={setSelected} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Prazo após aprovação</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Prioridade</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white">
                    {PRIORITY_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Observação para o operacional (opcional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Criar arte final após validação do texto pelo cliente." rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none" />
              </div>
            </>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50">Voltar</button>
            <button onClick={handleConfirm}
              className="flex-1 bg-indigo-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2">
              <Send className="w-3.5 h-3.5" /> Enviar para aprovação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Content types ──────────────────────────────────────────────────────────────

const TYPES = [
  { id: "feed",      label: "Feed",      desc: "Post quadrado ou retrato" },
  { id: "story",     label: "Stories",   desc: "Vertical 9:16" },
  { id: "reels",     label: "Reels",     desc: "Vídeo curto vertical" },
  { id: "carousel",  label: "Carrossel", desc: "Sequência de slides" },
  { id: "trafego",   label: "Tráfego",   desc: "Anúncio / campanha paga" },
  { id: "outdoor",   label: "Outdoor",   desc: "Material para área externa" },
  { id: "banner",    label: "Banner",    desc: "Banner digital ou impresso" },
  { id: "impresso",  label: "Impresso",  desc: "Panfleto, cardápio, placa" },
  { id: "legenda",   label: "Legenda",   desc: "Só o texto da legenda" },
  { id: "roteiro",   label: "Roteiro",   desc: "Roteiro para vídeo/reel" },
  { id: "campanha",  label: "Campanha",  desc: "Pacote de conteúdos" },
  { id: "whatsapp",  label: "WhatsApp",  desc: "Mensagem de disparo" },
];

const HYBRID_TYPES = [
  { id: "feed",     label: "Feed"      }, { id: "story",    label: "Stories"   },
  { id: "reels",    label: "Reels"     }, { id: "carousel", label: "Carrossel" },
  { id: "trafego",  label: "Tráfego"   }, { id: "outdoor",  label: "Outdoor"   },
  { id: "banner",   label: "Banner"    }, { id: "impresso", label: "Impresso"  },
  { id: "legenda",  label: "Legenda"   }, { id: "roteiro",  label: "Roteiro"   },
];

const VISUAL_FORMATS = new Set(["feed", "story", "stories", "carousel", "carrossel", "outdoor", "banner", "impresso", "feed_stories"]);

const CANAIS = [
  { id: "Instagram", label: "Instagram" }, { id: "TikTok",    label: "TikTok"     },
  { id: "Facebook",  label: "Facebook"  }, { id: "LinkedIn",  label: "LinkedIn"   },
  { id: "YouTube",   label: "YouTube"   }, { id: "WhatsApp",  label: "WhatsApp"   },
  { id: "Meta Ads",  label: "Meta Ads"  }, { id: "Google",    label: "Google Ads" },
  { id: "Impresso",  label: "Impresso"  }, { id: "Outdoor",   label: "Outdoor"    },
  { id: "Outro",     label: "Outro"     },
];

const OBJETIVO_META: Record<string, string> = {
  vender: "Vender", leads: "Gerar leads", autoridade: "Autoridade",
  engajamento: "Engajamento", marketing: "Marketing", atendimento: "Atendimento",
};

const TOM_META: Record<string, string> = {
  profissional: "Profissional", direto: "Direto", acolhedor: "Acolhedor",
  educativo: "Educativo", popular: "Popular", sofisticado: "Sofisticado",
  divertido: "Divertido", tecnico: "Técnico", tradicional: "Tradicional",
};

const STEPS = ["Tipo", "Objetivo", "Tema", "Canal", "Tom", "Arte / Copy", "Revisão", "Aprovação", "Agendamento"];

const TEMPLATE_OPTIONS = [
  { id: "minimalista",  label: "Minimalista",      desc: "Fundo branco, tipografia limpa" },
  { id: "colorido",     label: "Colorido",         desc: "Cores da identidade visual"     },
  { id: "foto",         label: "Com foto",         desc: "Imagem de produto ou pessoa"    },
  { id: "story_poll",   label: "Story c/ enquete", desc: "Interação via enquete"           },
  { id: "carousel_edu", label: "Carrossel edu.",   desc: "Slides para ensinar"             },
  { id: "sem_template", label: "Só legenda",       desc: "Sem visual, apenas texto"        },
];

// ── Hub ────────────────────────────────────────────────────────────────────────

type CreateMode = "manual" | "ia" | "pacote" | null;

const MODE_CARDS = [
  { id: "manual" as CreateMode, icon: PenLine, label: "Criar manualmente", desc: "Preencha as informações com controle total.", color: "border-purple-200 hover:border-purple-400", iconColor: "text-purple-600" },
  { id: "ia"     as CreateMode, icon: Wand2,   label: "Criar com IA",       desc: "A IA gera sugestões com base na estratégia do cliente.", color: "border-indigo-200 hover:border-indigo-300", iconColor: "text-indigo-500", badge: "Em breve" },
  { id: "pacote" as CreateMode, icon: Package, label: "Criar pacote",       desc: "Monte um pacote para um período ou campanha.", color: "border-gray-200 hover:border-gray-300", iconColor: "text-gray-500", badge: "Em breve" },
];

function CreateHub({ onSelect }: { onSelect: (mode: CreateMode) => void }) {
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 mb-1">Criar na ContentOS</h1>
        <p className="text-sm text-gray-500">Crie conteúdos, campanhas, briefings e demandas de forma manual ou com apoio de IA.</p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {MODE_CARDS.map((card) => {
          const Icon = card.icon;
          const disabled = !!card.badge;
          return (
            <button key={card.id} onClick={() => !disabled && onSelect(card.id)} disabled={disabled}
              className={cn("flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all",
                disabled ? "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed" : cn(card.color, "bg-white cursor-pointer"))}>
              <div className={cn("w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm", !disabled && card.iconColor)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-bold text-gray-900">{card.label}</p>
                  {card.badge && <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{card.badge}</span>}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
              {!disabled && <ChevronRight className="w-4 h-4 text-gray-300 mt-1 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
      <div className="mt-8">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Criação rápida</p>
        <div className="flex flex-wrap gap-2">
          {["Feed", "Stories", "Reels", "Carrossel", "Tráfego", "Legenda", "Roteiro"].map((t) => (
            <button key={t} onClick={() => onSelect("manual")}
              className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-xl hover:bg-purple-100 transition-colors">{t}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function IaComingSoon({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-2xl">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar
      </button>
      <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-8 text-center">
        <div className="w-14 h-14 bg-white rounded-2xl border border-indigo-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Wand2 className="w-7 h-7 text-indigo-400" />
        </div>
        <h2 className="text-lg font-black text-indigo-900 mb-2">Criação com IA</h2>
        <p className="text-sm text-indigo-600 mb-4 leading-relaxed max-w-md mx-auto">A IA vai gerar conteúdos com base na estratégia do cliente, formato, canal, objetivo e tom de voz.</p>
        <div className="bg-white rounded-2xl border border-indigo-100 p-4 text-left space-y-2 mb-5 max-w-sm mx-auto">
          {["Prompt personalizado por cliente", "Tom de voz da marca", "Sugestões de legenda, CTA e hashtag", "Integração com campanhas ativas"].map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs text-indigo-700"><ListOrdered className="w-3 h-3 text-indigo-400 flex-shrink-0" />{item}</div>
          ))}
        </div>
        <p className="text-xs font-semibold text-indigo-500 bg-indigo-100 inline-block px-4 py-2 rounded-xl">Será ativado quando a integração estiver disponível.</p>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-1">
        {label}{hint && <span className="font-normal text-gray-400 ml-1">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

type SubmitMode = "rascunho" | "enviar_aprovacao" | "producao" | "agendar" | null;

export default function ContentosCriarPage() {
  const pathname = usePathname();
  const isAdmin  = pathname.startsWith("/admin/");

  const data        = useOnboardingStore();
  const brandName   = data.marca?.nome     || "Minha Marca";
  const redes       = data.operacao?.redes || ["Instagram", "TikTok", "Facebook", "LinkedIn"];
  const principal   = getObjetivoPrincipal(data);
  const secundarios = getObjetivosSecundarios(data);
  const tomDeVoz    = getTomDeVoz(data);
  const allObjetivos = [principal, ...secundarios].filter(Boolean);

  const [mode, setMode] = useState<CreateMode>(null);

  // Wizard state
  const [step,          setStep]          = useState(0);
  const [isHybrid,      setIsHybrid]      = useState(false);
  const [hybridFormats, setHybridFormats] = useState<string[]>([]);
  const [tipo,          setTipo]          = useState("");
  const [carouselPages, setCarouselPages] = useState(3);
  const [objetivo,      setObjetivo]      = useState(principal || "");
  const [tema,          setTema]          = useState("");
  const [canais,        setCanais]        = useState<string[]>([redes[0] ?? "Instagram"]);
  const [tom,           setTom]           = useState<string[]>(tomDeVoz.slice(0, 1));
  const [template,      setTemplate]      = useState("");
  const [legenda,       setLegenda]       = useState("");
  const [dataPubl,      setDataPubl]      = useState("");

  // Visual briefing
  const [showAdvancedBrief, setShowAdvancedBrief] = useState(false);
  const [headline,          setHeadline]          = useState("");
  const [apoio,             setApoio]             = useState("");
  const [complemento,       setComplemento]       = useState("");
  const [cta,               setCta]               = useState("");
  const [badge,             setBadge]             = useState("");
  const [visualNotes,       setVisualNotes]       = useState("");
  const [requiredElements,  setRequiredElements]  = useState("");
  const [optionalElements,  setOptionalElements]  = useState("");

  // Flow state
  const [submitMode,      setSubmitMode]      = useState<SubmitMode>(null);
  const [done,            setDone]            = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [approvalLink,    setApprovalLink]    = useState<string | null>(null);
  const [copiedLink,      setCopiedLink]      = useState(false);
  const [savedContentId,  setSavedContentId]  = useState<string | null>(null);
  const [savedApprovalId, setSavedApprovalId] = useState<string | null>(null);
  const [savedTaskId,     setSavedTaskId]     = useState<string | null>(null);
  const [savedClientId,   setSavedClientId]   = useState<string | null>(null);
  const [savedTitle,      setSavedTitle]      = useState("");
  const [savedClientName, setSavedClientName] = useState("");
  const [sentToProd,      setSentToProd]      = useState(false);
  const [sendingProd,     setSendingProd]     = useState(false);
  const [showProdModal,   setShowProdModal]   = useState(false);
  const [showPreApproval, setShowPreApproval] = useState(false);
  const [dateWarning,     setDateWarning]     = useState(false);
  const [postApprovalDept, setPostApprovalDept] = useState<string | null>(null);

  const availableCanais = [...new Set([...redes, ...CANAIS.map((c) => c.id)])];
  const primaryFormat   = isHybrid ? (hybridFormats[0] ?? "") : tipo;
  const isVisualFormat  = VISUAL_FORMATS.has(tipo) || (isHybrid && hybridFormats.some((f) => VISUAL_FORMATS.has(f)));
  const hasCarousel     = (!isHybrid && (tipo === "carousel" || tipo === "carrossel")) ||
                          (isHybrid && (hybridFormats.includes("carousel") || hybridFormats.includes("carrossel")));

  const formatLabel = isHybrid
    ? hybridFormats.map((f) => HYBRID_TYPES.find((t) => t.id === f)?.label ?? f).join(" + ")
    : (TYPES.find((t) => t.id === tipo)?.label ?? tipo);

  const canSaveRascunho = isHybrid ? hybridFormats.length > 0 : !!tipo;

  function toggleCanal(c: string) { setCanais((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c]); }
  function toggleTom(t: string)   { setTom((p) => p.includes(t) ? p.filter((x) => x !== t) : p.length < 3 ? [...p, t] : p); }
  function toggleHybridFormat(id: string) { setHybridFormats((p) => p.includes(id) ? p.filter((f) => f !== id) : [...p, id]); }

  function canNext() {
    if (step === 0) return isHybrid ? hybridFormats.length > 0 : !!tipo;
    if (step === 2) return tema.trim().length > 0;
    if (step === 3) return canais.length > 0;
    return true;
  }

  const next = () => { if (step < STEPS.length - 1) setStep(step + 1); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  function preserveClient(id: string | null, name: string | null) {
    if (id)   localStorage.setItem(ACTIVE_CLIENT_KEY, id);
    if (name) localStorage.setItem(ACTIVE_CLIENT_NAME_KEY, name);
  }

  function buildApprovalUrl(): string {
    const base = isAdmin ? "/admin/contentos/aprovacoes" : "/contentos/aprovacoes";
    const p = new URLSearchParams();
    if (savedClientId && isAdmin) p.set("client", savedClientId);
    if (savedApprovalId)          p.set("approval", savedApprovalId);
    const q = p.toString();
    return q ? `${base}?${q}` : base;
  }

  function buildContentosUrl(): string {
    const base = isAdmin ? "/admin/contentos/home" : "/contentos/home";
    return (savedClientId && isAdmin) ? `${base}?client=${savedClientId}` : base;
  }

  function buildOperacionalUrl(): string {
    return savedTaskId ? `/operacional/briefings?task=${savedTaskId}` : "/operacional/briefings";
  }

  function buildCalendarioUrl(): string {
    const base = isAdmin ? "/admin/contentos/producao" : "/contentos/producao";
    return (savedClientId && isAdmin) ? `${base}?client=${savedClientId}` : base;
  }

  async function resolveClient(supabase: ReturnType<typeof createClient>, userId: string | undefined) {
    const storedId   = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CLIENT_KEY)      : null;
    const storedName = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CLIENT_NAME_KEY) : null;
    let clientId = storedId, clientName = storedName;
    if (!clientId && userId) {
      const { data } = await supabase.from("clients").select("id, company_name").eq("owner_id", userId).maybeSingle();
      clientId = data?.id ?? null; clientName = data?.company_name ?? null;
    }
    return { clientId, clientName };
  }

  function buildVisualStructure() {
    if (!showAdvancedBrief) return undefined;
    const vs = {
      ...(headline         ? { headline }                          : {}),
      ...(apoio            ? { support_text: apoio }              : {}),
      ...(complemento      ? { complementary_text: complemento }  : {}),
      ...(cta              ? { cta }                              : {}),
      ...(badge            ? { badge_text: badge }                : {}),
      ...(visualNotes      ? { visual_notes: visualNotes }        : {}),
      ...(requiredElements ? { required_elements: requiredElements } : {}),
      ...(optionalElements ? { optional_elements: optionalElements } : {}),
    };
    return Object.keys(vs).length > 0 ? vs : undefined;
  }

  function buildContentMetadata(extras?: Record<string, unknown>) {
    const vs = buildVisualStructure();
    return {
      ...(isHybrid && hybridFormats.length > 1 ? { is_hybrid: true, formats: hybridFormats } : {}),
      ...(hasCarousel ? { carousel_pages_count: carouselPages } : {}),
      ...(vs ? { visual_structure: vs } : {}),
      ...extras,
    };
  }

  // ── Caminho A: produção direta ────────────────────────────────────────────────

  async function handleSubmit(mode: "producao" | "agendar" | "rascunho") {
    if (mode === "agendar" && !dataPubl) {
      setDateWarning(true);
      setStep(8);
      return;
    }
    setSubmitMode(mode);
    setSaving(true);

    if (isSupabaseConfigured) {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const { clientId, clientName } = await resolveClient(supabase, user?.id);
        const title = tema.trim() || `${formatLabel} — ${canais.join(", ")} — ${new Date().toLocaleDateString("pt-BR")}`;
        setSavedTitle(title); setSavedClientName(clientName ?? "");
        preserveClient(clientId, clientName);

        const dbStatus = mode === "producao" ? "em_producao" : mode === "agendar" ? "agendado" : "rascunho";

        const { data: cd } = await supabase.from("content_items").insert({
          client_id: clientId, title,
          type:      isHybrid ? (hybridFormats[0] ?? null) : (tipo || null),
          channel:   canais.join(", ") || null, objective: objetivo || null,
          caption:   legenda || null, status: dbStatus,
          scheduled_date:       dataPubl ? new Date(`${dataPubl}T09:00:00`).toISOString() : null,
          responsible_id:       user?.id ?? null,
          carousel_pages_count: hasCarousel ? carouselPages : null,
          metadata:             buildContentMetadata(),
        }).select("id").single();

        if (cd?.id) { setSavedContentId(cd.id); setSavedClientId(clientId); }
      } catch (e) { console.error("[criar]", e); }
    }

    setSaving(false);
    setDone(true);
    if (mode === "producao") setShowProdModal(true);
  }

  // ── Caminho B: aprovação → setor pós-aprovação ────────────────────────────────

  async function doSubmitApproval(cfg: PreApprovalCfg) {
    setShowPreApproval(false);
    setSubmitMode("enviar_aprovacao");
    setSaving(true);

    const optInfo = PROD_OPTIONS.find((o) => o.id === cfg.option) ?? PROD_OPTIONS[0];
    if (cfg.enabled) setPostApprovalDept(optInfo.label);

    let generatedLink: string | null = null;

    if (isSupabaseConfigured) {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const { clientId, clientName } = await resolveClient(supabase, user?.id);
        const title = tema.trim() || `${formatLabel} — ${canais.join(", ")} — ${new Date().toLocaleDateString("pt-BR")}`;
        setSavedTitle(title); setSavedClientName(clientName ?? "");
        preserveClient(clientId, clientName);

        // Production config saved in content_item.metadata for DB trigger to read
        const prodMeta = cfg.enabled ? {
          enabled: true, task_type: optInfo.task_type, department: optInfo.department,
          assigned_role: optInfo.assigned_role, priority: cfg.priority,
          due_date: cfg.due_date || null, internal_notes: cfg.notes || null,
        } : { enabled: false };

        const { data: cd } = await supabase.from("content_items").insert({
          client_id: clientId, title,
          type:      isHybrid ? (hybridFormats[0] ?? null) : (tipo || null),
          channel:   canais.join(", ") || null, objective: objetivo || null,
          caption:   legenda || null, status: "enviado_aprovacao",
          responsible_id:       user?.id ?? null,
          carousel_pages_count: hasCarousel ? carouselPages : null,
          metadata:             buildContentMetadata({ production_after_approval: prodMeta }),
        }).select("id").single();

        if (cd?.id) {
          setSavedContentId(cd.id); setSavedClientId(clientId);

          const { data: ad } = await supabase.from("approvals").insert({
            content_id: cd.id, client_id: clientId, status: "aguardando",
            metadata: { production_after_approval: prodMeta },
          }).select("id, public_token").single();

          if (ad) {
            setSavedApprovalId(ad.id);
            if (ad.public_token) {
              generatedLink = `${window.location.origin}/aprovar/${ad.public_token}`;
            }
          }
        }
      } catch (e) { console.error("[criar] aprovação:", e); }
    }

    setSaving(false);
    if (generatedLink) setApprovalLink(generatedLink);
    setDone(true);
  }

  // ── Modal de produção direta (Caminho A, pós-criação) ────────────────────────

  async function handleSendToProd(cfg: ProdCfg) {
    if (!savedContentId || sendingProd) return;
    setSendingProd(true);
    const vs = buildVisualStructure();

    if (isSupabaseConfigured) {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const { data: td } = await supabase.from("operational_tasks").insert({
          client_id: savedClientId, content_item_id: savedContentId,
          title:     savedTitle || tema.trim() || formatLabel,
          description: legenda || null,
          task_type: cfg.task_type, department: cfg.department, assigned_role: cfg.assigned_role,
          status: "briefing", priority: cfg.priority, due_date: cfg.due_date || null,
          channel: canais.join(", ") || null, format: primaryFormat || null,
          carousel_pages_count: hasCarousel ? carouselPages : null,
          internal_notes: cfg.notes || null, created_by: user?.id ?? null,
          brief: {
            tipo: primaryFormat, objetivo, canais: canais.join(", "), tom: tom.join(", "), template,
            ...(legenda ? { legenda } : {}),
            ...(isHybrid && hybridFormats.length > 1 ? { is_hybrid: true, formats: hybridFormats, required_assets: hybridFormats } : {}),
            ...(hasCarousel ? { carousel_pages_count: carouselPages } : {}),
            ...(vs ? { visual_structure: vs } : {}),
          },
        }).select("id").single();

        if (td?.id) setSavedTaskId(td.id);
      } catch (e) { console.error("[criar] prod:", e); }
    }

    setSendingProd(false); setSentToProd(true); setShowProdModal(false);
  }

  function resetWizard() {
    setStep(0); setDone(false); setTema(""); setLegenda(""); setDataPubl("");
    setApprovalLink(null); setSavedContentId(null); setSavedApprovalId(null);
    setSavedTaskId(null); setSentToProd(false); setSavedTitle(""); setTipo("");
    setIsHybrid(false); setHybridFormats([]); setMode(null);
    setSubmitMode(null); setPostApprovalDept(null); setDateWarning(false);
    setShowAdvancedBrief(false); setHeadline(""); setApoio(""); setComplemento("");
    setCta(""); setBadge(""); setVisualNotes(""); setRequiredElements(""); setOptionalElements("");
  }

  function handleCriarNovo() {
    preserveClient(savedClientId, savedClientName || null);
    resetWizard();
  }

  function copyApprovalLink(link: string) {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1500);
  }

  // ── Hub / IA / Pacote ────────────────────────────────────────────────────────

  if (mode === null) return <CreateHub onSelect={setMode} />;
  if (mode === "ia") return <IaComingSoon onBack={() => setMode(null)} />;
  if (mode === "pacote") {
    return (
      <div className="max-w-2xl">
        <button onClick={() => setMode(null)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-6"><ArrowLeft className="w-3.5 h-3.5" /> Voltar</button>
        <div className="bg-gray-50 border border-gray-200 rounded-3xl p-8 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-black text-gray-700 mb-2">Criação em lote</h2>
          <p className="text-sm text-gray-500 mb-4">Monte um pacote para um período ou campanha.</p>
          <p className="text-xs font-semibold text-gray-400 bg-gray-100 inline-block px-4 py-2 rounded-xl">Será ativado na próxima fase.</p>
        </div>
      </div>
    );
  }

  // ── Done state ───────────────────────────────────────────────────────────────

  if (done) {
    const isAprovacao = submitMode === "enviar_aprovacao";
    const isProducao  = submitMode === "producao";
    const isAgendado  = submitMode === "agendar";

    const doneTitle =
      isAprovacao ? "Enviado para aprovação!" :
      isProducao  ? "Conteúdo criado!" :
      isAgendado  ? "Conteúdo agendado!" : "Rascunho salvo!";

    const doneDesc =
      isAprovacao ? "O cliente pode acessar o link para revisar e aprovar." :
      isProducao  ? "Defina o setor e prazo de produção abaixo." :
      isAgendado  ? `Agendado para ${dataPubl ? new Date(`${dataPubl}T12:00:00`).toLocaleDateString("pt-BR") : "data não definida"}.` :
      "Salvo. Você pode continuar editando ou criar novo conteúdo.";

    return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
          isAprovacao ? "bg-indigo-100" : isProducao ? "bg-slate-100" : isAgendado ? "bg-purple-100" : "bg-gray-100")}>
          <Check className={cn("w-8 h-8", isAprovacao ? "text-indigo-500" : isProducao ? "text-slate-600" : isAgendado ? "text-purple-500" : "text-gray-500")} />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-1">{doneTitle}</h1>
        <p className="text-sm text-gray-500 mb-6">{doneDesc}</p>

        {/* Resumo */}
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 text-left space-y-2 mb-5">
          {[
            { label: "Formato",   value: formatLabel },
            { label: "Tema",      value: tema },
            { label: "Canais",    value: canais.join(", ") },
            savedClientName ? { label: "Cliente", value: savedClientName } : null,
            isAprovacao && postApprovalDept ? { label: "Setor após aprovação", value: postApprovalDept } : null,
            dataPubl && isAgendado ? { label: "Publicação", value: new Date(`${dataPubl}T12:00:00`).toLocaleDateString("pt-BR") } : null,
          ].filter(Boolean).map((r) => r && (
            <div key={r.label} className="flex justify-between text-xs">
              <span className="text-gray-500">{r.label}</span>
              <span className="font-medium text-gray-800">{r.value}</span>
            </div>
          ))}
        </div>

        {/* Link de aprovação */}
        {approvalLink && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-left mb-5">
            <p className="text-xs font-bold text-indigo-700 mb-2">Link de aprovação para o cliente</p>
            <div className="flex items-center gap-2 bg-white rounded-xl p-2.5 border border-indigo-100">
              <code className="text-[11px] text-gray-700 flex-1 truncate">{approvalLink}</code>
              <button onClick={() => copyApprovalLink(approvalLink)}
                className={cn("flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-lg border transition-all flex-shrink-0",
                  copiedLink ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-indigo-200 text-indigo-600 hover:bg-indigo-100")}>
                <Copy className="w-3 h-3" />{copiedLink ? "Copiado!" : "Copiar"}
              </button>
            </div>
            {postApprovalDept && (
              <p className="text-[11px] text-indigo-500 mt-2">
                Após aprovação, será enviado automaticamente para: <strong>{postApprovalDept}</strong>
              </p>
            )}
          </div>
        )}

        {/* Caminho A: envio direto para produção */}
        {isProducao && savedContentId && !sentToProd && (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left mb-5">
            <p className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5 text-slate-500" /> Definir setor e prazo</p>
            <p className="text-xs text-slate-500 mb-3">Escolha quem vai executar e o prazo de entrega.</p>
            <button onClick={() => setShowProdModal(true)}
              className="flex items-center gap-1.5 text-sm font-bold text-white bg-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-800">
              <ClipboardList className="w-4 h-4" /> Definir setor e prazo
            </button>
          </div>
        )}

        {/* Confirmação de envio direto */}
        {sentToProd && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-left mb-5 flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-800">Tarefa enviada para produção!</p>
              <p className="text-xs text-emerald-600 mt-0.5">A equipe pode ver em Briefings & Demandas.</p>
            </div>
          </div>
        )}

        {/* Botões por modo */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={handleCriarNovo} className="text-sm font-medium text-gray-700 bg-gray-100 px-5 py-2.5 rounded-xl hover:bg-gray-200">
            Criar novo
          </button>

          {isAprovacao && (
            <a href={buildApprovalUrl()} onClick={() => preserveClient(savedClientId, savedClientName || null)}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-indigo-600 px-5 py-2.5 rounded-xl hover:bg-indigo-700">
              Ver aprovações <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {isProducao && sentToProd && (
            <a href={buildOperacionalUrl()}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-slate-700 px-5 py-2.5 rounded-xl hover:bg-slate-800">
              Ver demanda operacional <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {isAgendado && (
            <a href={buildCalendarioUrl()} onClick={() => preserveClient(savedClientId, savedClientName || null)}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-purple-600 px-5 py-2.5 rounded-xl hover:bg-purple-700">
              Ver calendário <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <a href={buildContentosUrl()} onClick={() => preserveClient(savedClientId, savedClientName || null)}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2.5">
            ← ContentOS
          </a>
        </div>

        {showProdModal && (
          <SendToProdModal
            onClose={() => setShowProdModal(false)}
            onSubmit={handleSendToProd}
            defaultOption={getDefaultProdOption(isHybrid ? (hybridFormats[0] ?? "") : tipo)}
            contentTitle={savedTitle || tema}
            clientName={savedClientName}
            sending={sendingProd}
          />
        )}
      </div>
    );
  }

  // ── Wizard ───────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setMode(null)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-3.5 h-3.5" /> Criar
        </button>
        <span className="text-xs text-gray-300">/</span>
        <span className="text-xs text-gray-600 font-medium">Manual</span>
      </div>
      <PageHeader title="Criar Conteúdo" description={`Para ${savedClientName || brandName}`} />

      <div className="max-w-2xl mb-8">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Etapa {step + 1} de {STEPS.length} — <strong className="text-gray-800">{STEPS[step]}</strong></span>
          <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
        </div>
        <div className="flex gap-0.5">
          {STEPS.map((s, i) => (
            <div key={s} className={cn("flex-1 h-1.5 rounded-full transition-colors", i <= step ? "bg-purple-600" : "bg-gray-100")} />
          ))}
        </div>
      </div>

      <div className="max-w-2xl space-y-6">

        {step === 0 && (
          <div>
            <h2 className="text-lg font-black text-gray-900 mb-1">Que tipo de conteúdo?</h2>
            <p className="text-sm text-gray-500 mb-4">Escolha o formato que será criado.</p>
            <div className="flex items-center bg-gray-100 rounded-xl p-0.5 w-fit mb-4">
              {(["single", "hybrid"] as const).map((m) => (
                <button key={m} onClick={() => { setIsHybrid(m === "hybrid"); setTipo(""); setHybridFormats([]); }}
                  className={cn("text-xs font-medium px-3.5 py-1.5 rounded-lg transition-all",
                    (m === "hybrid") === isHybrid ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                  {m === "single" ? "Formato único" : "Múltiplos formatos"}
                </button>
              ))}
            </div>
            {!isHybrid && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {TYPES.map((t) => (
                  <button key={t.id} onClick={() => setTipo(t.id)}
                    className={cn("flex flex-col items-start gap-1.5 p-3.5 rounded-2xl border-2 text-left transition-all",
                      tipo === t.id ? "border-purple-500 bg-purple-50" : "bg-white border-gray-100 hover:border-gray-200")}>
                    <p className={cn("text-xs font-bold", tipo === t.id ? "text-purple-700" : "text-gray-800")}>{t.label}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{t.desc}</p>
                  </button>
                ))}
              </div>
            )}
            {isHybrid && (
              <div>
                <p className="text-xs text-gray-500 mb-3">Selecione todos os formatos desta entrega.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {HYBRID_TYPES.map((t) => {
                    const active = hybridFormats.includes(t.id);
                    return (
                      <button key={t.id} onClick={() => toggleHybridFormat(t.id)}
                        className={cn("flex items-center justify-between gap-2 px-3.5 py-3 rounded-2xl border-2 text-left transition-all",
                          active ? "border-purple-500 bg-purple-50" : "bg-white border-gray-100 hover:border-gray-200")}>
                        <span className={cn("text-xs font-bold", active ? "text-purple-700" : "text-gray-800")}>{t.label}</span>
                        {active && <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {hybridFormats.length > 0 && (
                  <div className="mt-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 text-xs text-purple-700">
                    <span className="font-bold">Formatos: </span>
                    {hybridFormats.map((f) => HYBRID_TYPES.find((t) => t.id === f)?.label ?? f).join(", ")}
                  </div>
                )}
              </div>
            )}
            {hasCarousel && (
              <div className="mt-4 bg-purple-50 border border-purple-100 rounded-2xl p-4">
                <label className="block text-xs font-bold text-purple-800 mb-2">Quantas páginas tem o carrossel?</label>
                <div className="flex items-center gap-3">
                  <input type="number" min={2} max={20} value={carouselPages}
                    onChange={(e) => setCarouselPages(Math.max(2, Math.min(20, Number(e.target.value))))}
                    className="w-20 border border-purple-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-purple-400 bg-white" />
                  <span className="text-xs text-purple-600">slides</span>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-lg font-black text-gray-900 mb-1">Objetivo do conteúdo</h2>
            <p className="text-sm text-gray-500 mb-4">Baseado nos objetivos da marca. Ajuste se quiser.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {Object.entries(OBJETIVO_META).map(([id, label]) => (
                <button key={id} onClick={() => setObjetivo(id)}
                  className={cn("flex items-center gap-2.5 p-3.5 rounded-2xl border-2 text-left transition-all",
                    objetivo === id ? "border-purple-500 bg-purple-50" : "bg-white border-gray-100 hover:border-gray-200")}>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-bold", objetivo === id ? "text-purple-700" : "text-gray-800")}>{label}</p>
                    {allObjetivos.includes(id) && <p className="text-[10px] text-purple-400 font-medium">Da marca</p>}
                  </div>
                  {objetivo === id && <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-black text-gray-900 mb-1">Tema ou assunto</h2>
            <p className="text-sm text-gray-500 mb-4">Descreva o tema central, produto ou campanha.</p>
            <textarea value={tema} onChange={(e) => setTema(e.target.value)}
              placeholder="Ex: Lançamento da caixa de bombons para o Dia dos Namorados"
              className="w-full h-32 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 resize-none" />
            <p className="text-xs text-gray-400 mt-3 mb-2">Sugestões:</p>
            <div className="flex flex-wrap gap-1.5">
              {["Produto da semana", "Data comemorativa", "Bastidores", "Depoimento de cliente", "Oferta especial", "Dica do segmento"].map((s) => (
                <button key={s} onClick={() => setTema(s)}
                  className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-xl hover:bg-purple-50 hover:text-purple-700 transition-colors">{s}</button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-black text-gray-900 mb-1">Onde publicar?</h2>
            <p className="text-sm text-gray-500 mb-4">Selecione os canais para este conteúdo.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {availableCanais.map((r) => {
                const label = CANAIS.find((c) => c.id === r)?.label ?? r;
                return (
                  <button key={r} onClick={() => toggleCanal(r)}
                    className={cn("flex items-center gap-2 p-3.5 rounded-2xl border-2 text-left transition-all",
                      canais.includes(r) ? "border-purple-500 bg-purple-50" : "bg-white border-gray-100 hover:border-gray-200")}>
                    <span className={cn("text-sm font-medium flex-1", canais.includes(r) ? "text-purple-700" : "text-gray-700")}>{label}</span>
                    {canais.includes(r) && <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-lg font-black text-gray-900 mb-1">Tom de voz</h2>
            <p className="text-sm text-gray-500 mb-4">Pré-selecionado com base na marca. Até 3.</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(TOM_META).map(([id, label]) => (
                <button key={id} onClick={() => toggleTom(id)}
                  className={cn("p-3 rounded-2xl border-2 text-center text-xs font-medium transition-all",
                    tom.includes(id) ? "border-purple-500 bg-purple-50 text-purple-700" : "bg-white border-gray-100 text-gray-600 hover:border-gray-200")}>
                  {label}
                </button>
              ))}
            </div>
            {tomDeVoz.length > 0 && (
              <button onClick={() => setTom(tomDeVoz.slice(0, 3))} className="mt-3 text-xs text-purple-600 hover:underline">Restaurar tom da marca</button>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">Arte / Copy</h2>
              <p className="text-sm text-gray-500">Legenda e briefing visual para a equipe.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Legenda / copy <span className="font-normal text-gray-400">— texto que vai na publicação</span>
              </label>
              <textarea value={legenda} onChange={(e) => setLegenda(e.target.value)}
                placeholder={`Escreva a legenda aqui…\n\nEx: A experiência que você merece começa aqui.\n\n#${brandName.replace(/\s/g, "")}`}
                rows={5} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 resize-none" />
              <div className="flex justify-between mt-1 text-xs text-gray-400">
                <span>{legenda.length} caracteres</span>
                <button onClick={() => setLegenda("")} className="hover:text-gray-600">Limpar</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Visual / template</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {TEMPLATE_OPTIONS.map((t) => (
                  <button key={t.id} onClick={() => setTemplate(t.id)}
                    className={cn("flex flex-col items-start gap-1.5 p-3.5 rounded-2xl border-2 text-left transition-all",
                      template === t.id ? "border-purple-500 bg-purple-50" : "bg-white border-gray-100 hover:border-gray-200")}>
                    <p className={cn("text-xs font-bold", template === t.id ? "text-purple-700" : "text-gray-800")}>{t.label}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            {isVisualFormat && (
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <button onClick={() => setShowAdvancedBrief((v) => !v)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                  <Layers className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-800">Briefing avançado para arte</p>
                    <p className="text-[10px] text-gray-500">Headline, textos, CTA e orientações para o designer</p>
                  </div>
                  {showAdvancedBrief ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {showAdvancedBrief && (
                  <div className="px-4 py-4 space-y-4 bg-white">
                    <Field label="Headline" hint="Texto principal da arte">
                      <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Ex: Promoção especial de hoje"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-400" />
                    </Field>
                    <Field label="Texto de apoio" hint="Complementa a headline">
                      <textarea value={apoio} onChange={(e) => setApoio(e.target.value)} rows={2}
                        placeholder="Ex: Na compra de 2 combos, o refrigerante é por nossa conta."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-400 resize-none" />
                    </Field>
                    <Field label="Texto complementar" hint="Condições, datas, regras">
                      <textarea value={complemento} onChange={(e) => setComplemento(e.target.value)} rows={2}
                        placeholder="Ex: Válido somente hoje. Consumo local e retirada."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-400 resize-none" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="CTA" hint="Chamada para ação">
                        <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Ex: Peça agora pelo WhatsApp"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-400" />
                      </Field>
                      <Field label="Selo / destaque" hint="Etiqueta visual">
                        <input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Ex: Oferta limitada"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-400" />
                      </Field>
                    </div>
                    <Field label="Observações visuais" hint="Orientações para o designer">
                      <textarea value={visualNotes} onChange={(e) => setVisualNotes(e.target.value)} rows={3}
                        placeholder="Ex: Destacar produto, usar foto do lanche, manter visual limpo, CTA visível, paleta da marca."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-400 resize-none" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Elementos obrigatórios">
                        <textarea value={requiredElements} onChange={(e) => setRequiredElements(e.target.value)} rows={3}
                          placeholder="Logo, produto, preço, CTA, WhatsApp..."
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-400 resize-none" />
                      </Field>
                      <Field label="Elementos opcionais">
                        <textarea value={optionalElements} onChange={(e) => setOptionalElements(e.target.value)} rows={3}
                          placeholder="Ícones, QR Code, textura, fundo temático..."
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-400 resize-none" />
                      </Field>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 6 && (
          <div>
            <h2 className="text-lg font-black text-gray-900 mb-1">Revisão</h2>
            <p className="text-sm text-gray-500 mb-4">Confirme os dados antes de enviar.</p>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              {[
                { label: "Formato",  value: formatLabel },
                { label: "Objetivo", value: objetivo ? OBJETIVO_META[objetivo] : "" },
                { label: "Tema",     value: tema },
                { label: "Canais",   value: canais.join("  ·  ") },
                { label: "Tom",      value: tom.map((t) => TOM_META[t] ?? t).join(", ") },
                { label: "Visual",   value: TEMPLATE_OPTIONS.find((t) => t.id === template)?.label },
                headline    ? { label: "Headline",    value: headline }    : null,
                cta         ? { label: "CTA",         value: cta }         : null,
                visualNotes ? { label: "Observações", value: visualNotes } : null,
              ].filter(Boolean).filter((r) => r?.value).map((r) => r && (
                <div key={r.label} className="flex items-start justify-between gap-4 text-xs border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                  <span className="text-gray-500 font-medium flex-shrink-0">{r.label}</span>
                  <span className="text-gray-800 text-right">{r.value}</span>
                </div>
              ))}
            </div>
            {legenda && (
              <div className="mt-3 bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 mb-1">Legenda / copy</p>
                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{legenda}</p>
              </div>
            )}
          </div>
        )}

        {step === 7 && (
          <div>
            <h2 className="text-lg font-black text-gray-900 mb-1">Enviar para aprovação</h2>
            <p className="text-sm text-gray-500 mb-4">O cliente recebe um link para revisar e aprovar o conteúdo.</p>
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
              <h3 className="text-xs font-bold text-indigo-700 mb-3">Como funciona o fluxo de aprovação?</h3>
              <ol className="space-y-2">
                {[
                  "Você define o setor que vai produzir após aprovação",
                  "O cliente acessa o link e revisa o conteúdo",
                  "Ao aprovar, o sistema cria a tarefa no Operacional automaticamente",
                  "O setor executa e entrega em Briefings & Demandas",
                ].map((item, i) => (
                  <li key={i} className="text-xs text-indigo-600 flex items-start gap-2">
                    <span className="font-bold text-indigo-400 flex-shrink-0">{i + 1}.</span>{item}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {step === 8 && (
          <div>
            <h2 className="text-lg font-black text-gray-900 mb-1">Agendar publicação</h2>
            <p className="text-sm text-gray-500 mb-4">Defina quando este conteúdo deve ser publicado.</p>
            {dateWarning && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">Preencha a data de publicação antes de agendar.</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Data de publicação *</label>
              <input type="date" value={dataPubl}
                onChange={(e) => { setDataPubl(e.target.value); setDateWarning(false); }}
                className={cn("w-full border rounded-xl px-4 py-2.5 text-sm outline-none",
                  dateWarning ? "border-amber-400 focus:border-amber-500" : "border-gray-200 focus:border-purple-400")} />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          {step > 0 && (
            <button onClick={prev} className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 px-4 py-2.5 rounded-xl hover:bg-gray-200">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <button onClick={next} disabled={!canNext()}
              className={cn("flex items-center gap-1.5 text-sm font-bold px-5 py-2.5 rounded-xl transition-colors",
                canNext() ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-gray-100 text-gray-400 cursor-not-allowed")}>
              Continuar <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleSubmit("agendar")} disabled={saving}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-100 px-4 py-2.5 rounded-xl hover:bg-gray-200 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                Só agendar
              </button>
              <button onClick={() => handleSubmit("producao")} disabled={saving}
                className="flex items-center gap-1.5 text-sm font-bold text-white bg-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-800 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                Enviar para produção
              </button>
              <button onClick={() => setShowPreApproval(true)} disabled={saving}
                className="flex items-center gap-1.5 text-sm font-bold text-white bg-indigo-600 px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar para aprovação
              </button>
            </div>
          )}
        </div>

        <button onClick={() => handleSubmit("rascunho")} disabled={saving || !canSaveRascunho}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40">
          <Sparkles className="w-3 h-3" /> Salvar rascunho
        </button>
      </div>

      {showPreApproval && (
        <PreApprovalModal
          onClose={() => setShowPreApproval(false)}
          onConfirm={doSubmitApproval}
          defaultOption={getDefaultProdOption(isHybrid ? (hybridFormats[0] ?? "") : tipo)}
          contentTitle={tema.trim() || formatLabel}
          clientName={savedClientName}
        />
      )}
    </div>
  );
}
