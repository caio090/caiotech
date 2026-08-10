"use client";
import { useState } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { Zap, Building2, Briefcase, Users, Sparkles, ArrowRight, FolderKanban, Target, CalendarDays, Clapperboard, Wand2 } from "lucide-react";
import { MIN_PUBLIC_PRICE } from "@/lib/billing/plans";
import { LAUNCH_MODE } from "@/lib/launch/config";
import { LeadConversationModal } from "@/components/lead-conversation-modal";

/**
 * Sprint Public Home + Brand SEO V1 — os 7 módulos reais já implementados
 * no app autenticado (nunca uma feature anunciada antes de existir).
 * Rotas/ícones conferidos contra src/components/app-sidebar.tsx.
 */
const REAL_MODULES = [
  { title: "Company Central", desc: "O painel central da sua empresa.",              color: "#7b6ef6", href: "/admin/empresa",    Icon: Building2 },
  { title: "Meu Escritório",  desc: "Sua rotina do dia, da semana e do mês.",         color: "#3b82f6", href: "/admin/escritorio", Icon: Briefcase },
  { title: "Projetos",        desc: "Cada projeto com seu andamento real.",           color: "#10b981", href: "/admin/projetos",   Icon: FolderKanban },
  { title: "CRM",             desc: "Leads e oportunidades no funil.",                color: "#f59e0b", href: "/admin/crm",        Icon: Target },
  { title: "REC OS",          desc: "Briefing, roteiro, aprovação e produção.",       color: "#c0392b", href: "/admin/contentos",  Icon: Clapperboard },
  { title: "Calendário",      desc: "Tudo o que vai acontecer, num só lugar.",        color: "#a855f7", href: "/admin/calendario", Icon: CalendarDays },
  { title: "Jarvis",          desc: "A camada inteligente conectada ao contexto da empresa.", color: "#7b6ef6", href: "/login", Icon: Wand2 },
] as const;

// ── Design tokens ─────────────────────────────────────────────
const S = {
  mono:   { fontFamily: "'Space Mono', monospace" }    as React.CSSProperties,
  grotesk:{ fontFamily: "'Space Grotesk', sans-serif" } as React.CSSProperties,
  bg:     "#0a0a0c",
  card:   "#13131a",
  border: "#222230",
  text:   "#e8e8e8",
  muted:  "#555566",
  accent: "#7b6ef6",
  red:    "#c0392b",
};

// ── FAQ data ───────────────────────────────────────────────────
const FAQ = [
  { q: "O que é a LOKAT OS?", a: "LOKAT OS é um sistema operacional para conectar marketing, clientes, produção, operação, CRM e dados em uma única plataforma. Funciona para empresas, agências, clínicas, lojas, equipes e qualquer negócio que precisa organizar sem planilhas espalhadas." },
  { q: "Para quem serve a LOKAT OS?", a: "Para empresas locais (restaurante, clínica, loja, academia), agências de marketing, equipes de marketing, autônomos e prestadores de serviços. A plataforma é horizontal — o mesmo ecossistema serve diferentes tipos de operação." },
  { q: "O acesso beta é gratuito?", a: "Entrar na lista beta é gratuito. O período de teste é de 14 dias sem cobrança automática. Você só paga se decidir continuar, com seu consentimento explícito." },
  { q: "O que é o REC OS?", a: "REC OS é a área de produção audiovisual dentro da LOKAT OS: briefing, roteiro, calendário, aprovação por link e performance — em um único fluxo. É diferente do Lokat.rec, que é uma plataforma separada de vídeo." },
  { q: "Preciso conectar o Cardápio Digital para usar a plataforma?", a: "Não. Cardápio Digital é uma integração opcional para negócios que utilizam pedidos online. A plataforma funciona com qualquer negócio — dados manuais, Meta, planilhas ou outras fontes." },
  { q: "WhatsApp está disponível?", a: "A integração de WhatsApp está em preparação. Quando disponível, funcionará como canal de atendimento, CRM e automação — não como produto principal." },
  { q: "Como funciona o diagnóstico gratuito?", a: "O diagnóstico analisa a presença digital do negócio e entrega um relatório de pontos de melhoria em marketing, dados e operação. É público, sem login e sem custo." },
];

// ── Ecosystem Cycle ───────────────────────────────────────────
const CYCLE_STEPS = [
  { label: "Diagnóstico",  icon: "◈", color: "#7b6ef6", desc: "Entenda o estado atual" },
  { label: "Estratégia",   icon: "◉", color: "#6366f1", desc: "Defina objetivos e plano" },
  { label: "Conteúdo",     icon: "◐", color: "#a855f7", desc: "Crie e aprove materiais" },
  { label: "Produção",     icon: "◑", color: "#8b5cf6", desc: "Audiovisual e execução" },
  { label: "Operação",     icon: "◒", color: "#3b82f6", desc: "Tarefas, equipe e prazos" },
  { label: "Dados",        icon: "◓", color: "#0ea5e9", desc: "Métricas e relatórios" },
  { label: "Insights",     icon: "◔", color: "#10b981", desc: "Interprete os resultados" },
  { label: "Próxima ação", icon: "◕", color: "#059669", desc: "Decida com clareza" },
];

function EcosystemCycle() {
  return (
    <div>
      {/* Desktop: horizontal flow */}
      <div className="hidden md:flex items-stretch gap-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {CYCLE_STEPS.map((step, i) => (
          <div key={step.label} className="flex items-stretch" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ flex: 1, background: `${step.color}09`, border: `1px solid ${step.color}20`, padding: "1.25rem .75rem", textAlign: "center", position: "relative" }}>
              <div style={{ fontSize: "1.1rem", color: step.color, marginBottom: ".5rem", lineHeight: 1 }} aria-hidden="true">{step.icon}</div>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: ".55rem", letterSpacing: ".1em", textTransform: "uppercase", color: step.color, marginBottom: ".3rem", fontWeight: 700 }}>{step.label}</p>
              <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".68rem", color: "#555566", lineHeight: 1.4 }}>{step.desc}</p>
            </div>
            {i < CYCLE_STEPS.length - 1 && (
              <div style={{ display: "flex", alignItems: "center", padding: "0 2px", color: "#333340", fontSize: ".7rem", flexShrink: 0 }} aria-hidden="true">→</div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: 2-column grid */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {CYCLE_STEPS.map((step) => (
          <div key={step.label} style={{ background: `${step.color}09`, border: `1px solid ${step.color}20`, padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: ".95rem", color: step.color, marginBottom: ".4rem" }} aria-hidden="true">{step.icon}</div>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: ".55rem", letterSpacing: ".1em", textTransform: "uppercase", color: step.color, fontWeight: 700 }}>{step.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

type LkIcon = React.ComponentType<{ size?: number; strokeWidth?: number }>;
type ProfileCardProps = {
  label: string; cta: string; desc: string; q: string; Icon: LkIcon;
  accent: string; mono: React.CSSProperties; grotesk: React.CSSProperties; text: string; muted: string;
};
function ProfileCard({ label, cta, desc, q, Icon, accent, mono, grotesk, text, muted }: ProfileCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={`/pre-acesso?perfil=${q}`}
      style={{
        display: "flex", flexDirection: "column", gap: ".75rem", textDecoration: "none",
        background: hovered ? `${accent}12` : `${accent}07`,
        border: `1px solid ${hovered ? `${accent}50` : `${accent}20`}`,
        padding: "1.25rem 1.25rem 1rem",
        boxShadow: hovered ? `0 4px 24px rgba(123,110,246,.1)` : "none",
        transition: "border-color .2s ease, background .2s ease, box-shadow .2s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ color: accent, opacity: hovered ? 1 : 0.65, transition: "opacity .2s" }}>
          <Icon size={20} strokeWidth={1.5} />
        </div>
        <ArrowRight size={14} strokeWidth={1.5} style={{ color: accent, opacity: hovered ? 0.85 : 0.3, transform: hovered ? "translateX(3px)" : "translateX(0)", transition: "opacity .2s, transform .2s" }} />
      </div>
      <div>
        <span style={{ ...mono, display: "block", fontSize: ".65rem", letterSpacing: ".08em", textTransform: "uppercase", color: text, fontWeight: 700, marginBottom: ".35rem" }}>{label}</span>
        <span style={{ ...grotesk, display: "block", fontSize: ".78rem", color: muted, lineHeight: 1.5 }}>{desc}</span>
      </div>
      <span style={{ ...mono, display: "block", fontSize: ".55rem", letterSpacing: ".1em", textTransform: "uppercase", color: accent, opacity: hovered ? 0.85 : 0.5, transition: "opacity .2s", paddingTop: ".25rem" }}>{cta} →</span>
    </Link>
  );
}

export default function HomeClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey,  setModalKey]  = useState(0);

  const openModal  = () => { setModalKey((k) => k + 1); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);
  const [openFaq, setOpenFaq]     = useState<number | null>(null);

  const betaHref = LAUNCH_MODE.publicSignupMode === "waitlist" ? "/pre-acesso" : "/criar-conta";
  const betaLabel = LAUNCH_MODE.publicSignupMode === "waitlist" ? "Entrar na lista beta" : "Criar conta grátis";

  return (
    <div style={{ background: S.bg, color: S.text, minHeight: "100vh" }}>
      <PublicHeader />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="px-4 md:px-8 pt-12 pb-10 md:py-[5rem]"
        style={{ minHeight: "clamp(auto, 72vh, 88vh)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", textAlign: "center" }}
      >
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 50% 55%, rgba(59,47,160,.13) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Corner marks */}
        {(["tl","tr","bl","br"] as const).map((pos) => (
          <div key={pos} style={{ position: "absolute", ...S.mono, fontSize: ".48rem", color: S.border, letterSpacing: ".3em", userSelect: "none", pointerEvents: "none", ...(pos==="tl"?{top:"2rem",left:"2rem"}:pos==="tr"?{top:"2rem",right:"2rem"}:pos==="bl"?{bottom:"2rem",left:"2rem"}:{bottom:"2rem",right:"2rem"}) }}>
            · · ·<br/>· · ·
          </div>
        ))}

        <div className="hero-fade-up" style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".2em", textTransform: "uppercase", color: S.accent, border: `1px solid ${S.accent}30`, background: `${S.accent}10`, padding: ".25rem .8rem", marginBottom: "2rem", display: "inline-block" }}>
          Sistema operacional para empresas, agências e equipes
        </div>

        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 w-full">
          {/* Text column */}
          <div className="flex-1 text-center lg:text-left">
            <h1
              className="hero-fade-up-d1"
              style={{ ...S.grotesk, fontSize: "clamp(2rem, 8vw, 6.2rem)", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-.03em", color: S.text, marginBottom: "1.2rem", textWrap: "balance" } as React.CSSProperties}
            >
              Sua empresa trabalhando como um sistema.
            </h1>

            <p className="hero-fade-up-d2 mx-auto lg:mx-0" style={{ ...S.grotesk, maxWidth: "500px", fontSize: "clamp(.85rem, 2.5vw, 1rem)", lineHeight: 1.7, color: S.muted, marginBottom: "2rem" }}>
              Centralize projetos, clientes, conteúdo, calendário e operação. Trabalhe com o Jarvis conectado ao contexto da sua empresa.
            </p>

            {/* CTA primário + secundário (Fase 4) */}
            <div className="hero-fade-up-d3 flex flex-col sm:flex-row gap-3">
              <a
                href="#o-que-e-lokat-os"
                className="w-full sm:w-auto text-center"
                style={{ background: S.accent, color: "#fff", padding: ".85rem 2rem", ...S.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-block", fontWeight: 700, transition: "background .2s, box-shadow .2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#8f84f8"; e.currentTarget.style.boxShadow = `0 0 28px ${S.accent}55`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = S.accent; e.currentTarget.style.boxShadow = "none"; }}
              >
                ■ Conhecer o LOKAT OS
              </a>
              <Link
                href="/login"
                className="w-full sm:w-auto text-center"
                style={{ background: "transparent", color: S.text, border: `1px solid ${S.border}`, padding: ".85rem 2rem", ...S.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-block", fontWeight: 700, transition: "border-color .2s, color .2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#44445a"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.color = S.text; }}
              >
                Entrar
              </Link>
            </div>

            {/* Links auxiliares discretos (Fase 8: Planos não é a única ação) */}
            <div className="hero-fade-up-d3 mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <Link
                href="/planos"
                style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: S.muted, textDecoration: "underline", textUnderlineOffset: "3px" }}
              >
                Ver planos →
              </Link>
              <Link
                href="/diagnostico"
                style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: S.muted, textDecoration: "underline", textUnderlineOffset: "3px" }}
              >
                Diagnóstico gratuito →
              </Link>
              <button
                onClick={openModal}
                style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: S.muted, textDecoration: "underline", textUnderlineOffset: "3px", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
              >
                Agendar demonstração →
              </button>
            </div>

            <div className="hero-fade-up-d3 flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-6 pt-6" style={{ borderTop: `1px solid ${S.border}` }}>
              <span style={{ ...S.mono, fontSize: ".58rem", letterSpacing: ".15em", textTransform: "uppercase", color: S.muted }}>Para</span>
              {["Empresas", "Agências", "Autônomos"].map((l) => (
                <span key={l} style={{ ...S.mono, fontSize: ".58rem", letterSpacing: ".12em", textTransform: "uppercase", color: S.text, border: `1px solid ${S.border}`, padding: ".15rem .6rem" }}>{l}</span>
              ))}
              <span style={{ ...S.mono, fontSize: ".5rem", color: S.muted }}>·</span>
              <a href="/rec" style={{ ...S.mono, fontSize: ".58rem", letterSpacing: ".1em", textTransform: "uppercase", color: S.red, textDecoration: "none", border: `1px solid ${S.red}30`, padding: ".15rem .5rem" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${S.red}60`)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${S.red}30`)}
              >Lokat.rec</a>
              <span style={{ ...S.grotesk, fontSize: ".6rem", color: S.muted, fontStyle: "italic" }}>um ecossistema Lokat</span>
            </div>
          </div>

          {/* Drop visual */}
          <div className="relative hero-robot-in flex-shrink-0 w-full lg:w-[340px] h-[280px] lg:h-[480px] hidden lg:flex items-center justify-center">
            <div className="glow-pulse pointer-events-none" style={{ position: "absolute", left: "50%", top: "45%", width: "180%", height: "160%", transform: "translate(-50%, -50%)", background: "radial-gradient(ellipse at center, rgba(123,110,246,0.24) 0%, rgba(103,80,220,0.1) 38%, rgba(66,47,160,0.04) 62%, transparent 80%)", borderRadius: "999px", filter: "blur(12px)" }} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg width="370" height="220" viewBox="0 0 370 220" fill="none" className="orbit-slow" style={{ opacity: 0.2 }}>
                <ellipse cx="185" cy="110" rx="170" ry="62" stroke="#7b6ef6" strokeWidth="1" strokeDasharray="5 9" />
                <circle cx="355" cy="110" r="4" fill="#7b6ef6" />
              </svg>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: "rotate(58deg)" }}>
              <svg width="290" height="290" viewBox="0 0 290 290" fill="none" className="orbit-rev" style={{ opacity: 0.13 }}>
                <ellipse cx="145" cy="145" rx="128" ry="46" stroke="#a855f7" strokeWidth="0.8" strokeDasharray="3 11" />
                <circle cx="17" cy="145" r="3" fill="#a855f7" />
              </svg>
            </div>
            <div className="relative z-10 lk-drop-float" style={{ width: "120px", height: "158px" }}>
              <svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", filter: "drop-shadow(0 0 28px rgba(123,110,246,0.55)) drop-shadow(0 0 60px rgba(123,110,246,0.2))" }}>
                <defs>
                  <linearGradient id="dg" x1="0.3" y1="0" x2="0.7" y2="1">
                    <stop offset="0%" stopColor="#c4baff" />
                    <stop offset="45%" stopColor="#7b6ef6" />
                    <stop offset="100%" stopColor="#3a2a9a" />
                  </linearGradient>
                  <linearGradient id="dshine" x1="0" y1="0" x2="0.6" y2="0.6">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </linearGradient>
                  <linearGradient id="dborder" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b8aeff" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#5040c0" stopOpacity="0.4" />
                  </linearGradient>
                </defs>
                <path d="M100 18 C148 78 178 122 178 165 C178 218 143 250 100 250 C57 250 22 218 22 165 C22 122 52 78 100 18Z" fill="#7b6ef6" opacity="0.18" />
                <path d="M100 22 C146 80 174 123 174 164 C174 215 141 247 100 247 C59 247 26 215 26 164 C26 123 54 80 100 22Z" fill="url(#dg)" />
                <path d="M100 22 C146 80 174 123 174 164 C174 215 141 247 100 247 C59 247 26 215 26 164 C26 123 54 80 100 22Z" fill="none" stroke="url(#dborder)" strokeWidth="1.5" />
                <path d="M70 58 C78 46 92 38 104 37 C92 78 74 112 63 143 C50 114 56 76 70 58Z" fill="url(#dshine)" />
                <ellipse cx="80" cy="82" rx="6" ry="9" fill="rgba(255,255,255,0.18)" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ── Seletor de perfil ─────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 pb-14 pt-4">
        <p style={{ ...S.mono, fontSize: ".58rem", letterSpacing: ".18em", textTransform: "uppercase", color: S.muted, marginBottom: "1.25rem", textAlign: "center" }}>
          Qual é o seu perfil?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {([
            { label: "Tenho uma agência",         cta: "Quero organizar minha agência",  desc: "Multi-clientes, equipe, aprovações e relatórios centralizados.",    q: "agency",       Icon: Building2 },
            { label: "Tenho uma empresa",          cta: "Quero organizar meu negócio",    desc: "Gerencie marketing, CRM, dados e operação tudo num fluxo único.",   q: "company",      Icon: Briefcase  },
            { label: "Sou profissional da área",   cta: "Quero minha central de trabalho",desc: "Tarefas, briefings, conteúdo e resultados num fluxo próprio.",      q: "professional", Icon: Users      },
            { label: "Quero ser cliente da LOKAT", cta: "Quero falar com a agência",      desc: "Agência especializada para tocar sua operação de marketing digital.", q: "lokat_client", Icon: Sparkles   },
          ] as const).map((p) => (
            <ProfileCard key={p.q} {...p} accent={S.accent} mono={S.mono} grotesk={S.grotesk} text={S.text} muted={S.muted} />
          ))}
        </div>
      </section>

      {/* ── Transição hero → branco ────────────────────────────── */}
      <div style={{ background: `linear-gradient(to bottom, ${S.bg} 0%, #ffffff 100%)`, height: "64px" }} />

      {/* ════════════════════════════════════════════════════════
          SEÇÕES CLARAS
          ════════════════════════════════════════════════════════ */}
      <div style={{ background: "#fff", color: "#111" }}>

        {/* ── O que é a LOKAT OS (Fase 5/6) ── */}
        <section id="o-que-e-lokat-os" className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 style={{ ...S.grotesk, fontSize: "clamp(1.5rem, 4vw, 2.8rem)", fontWeight: 800, color: "#111", lineHeight: 1.1, marginBottom: ".75rem", textWrap: "balance" } as React.CSSProperties}>
              O que é a LOKAT OS
            </h2>
            <p style={{ ...S.grotesk, fontSize: ".95rem", color: "#666", maxWidth: "520px", margin: "0 auto", lineHeight: 1.65 }}>
              Um sistema único onde cada parte da sua empresa conversa com a próxima — sem planilha, sem link perdido, sem retrabalho.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {REAL_MODULES.map((m) => (
              <Link key={m.title} href={m.href} className="lk-card-hover bg-white border border-gray-100 rounded-2xl p-5 shadow-sm block">
                <div className="w-9 h-9 rounded-xl mb-3 flex items-center justify-center" style={{ background: `${m.color}15` }}>
                  <m.Icon size={16} strokeWidth={1.75} style={{ color: m.color }} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{m.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{m.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Jarvis (Fase 7 — claims restritos ao que é real) ── */}
        <section className="py-14 md:py-20" style={{ background: "#111" }}>
          <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
            <div className="inline-flex items-center gap-2 border px-4 py-1.5 rounded-full mb-5" style={{ background: "#1a1a28", borderColor: "#2a2a40" }}>
              <Wand2 className="w-3.5 h-3.5" style={{ color: S.accent }} />
              <span style={{ ...S.mono, fontSize: ".62rem", letterSpacing: ".14em", textTransform: "uppercase", color: S.accent }}>Jarvis</span>
            </div>
            <h2 style={{ ...S.grotesk, fontSize: "clamp(1.4rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#f0f0f0", marginBottom: ".9rem", lineHeight: 1.2 }}>
              Um assistente que já conhece o contexto da sua empresa.
            </h2>
            <p style={{ ...S.grotesk, fontSize: ".92rem", color: "#888899", maxWidth: "540px", margin: "0 auto", lineHeight: 1.7 }}>
              Jarvis responde, resume e organiza informação com base no que já existe na sua operação — projetos, tarefas, calendário e conteúdo. Ele ajuda você a entender a operação; quem decide e executa continua sendo você.
            </p>
          </div>
        </section>

        {/* ── O Problema ── */}
        <section className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 style={{ ...S.grotesk, fontSize: "clamp(1.5rem, 4vw, 2.8rem)", fontWeight: 800, color: "#111", lineHeight: 1.1, marginBottom: ".75rem", textWrap: "balance" } as React.CSSProperties}>
              Você não tem problema de esforço.<br />Tem problema de organização.
            </h2>
            <p style={{ ...S.grotesk, fontSize: ".95rem", color: "#666", maxWidth: "480px", margin: "0 auto", lineHeight: 1.65 }}>
              Cada ferramenta separada cria uma nova planilha. Cada aprovação no WhatsApp cria um novo caos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { headline: "Os dados estão em 4 lugares diferentes", sub: "Cardápio, Instagram, planilha do mês passado e anotação no bloco." },
              { headline: "Aprovação de conteúdo pelo WhatsApp", sub: "\"Você aprovou aquela arte?\" → \"Qual arte?\" → volta ao início." },
              { headline: "Relatório que ninguém lê", sub: "Gerado manualmente, entregue fora do prazo, sem contexto de campanha." },
              { headline: "Briefing que some antes de virar conteúdo", sub: "O pedido estava no direct. O roteiro, numa pasta. A arte, em outro link." },
              { headline: "Custo invisível do retrabalho", sub: "Nenhuma planilha calcula quanto tempo você perdeu refazendo o que já estava pronto." },
            ].map((p) => (
              <div
                key={p.headline}
                className="lk-card-hover"
                style={{ border: "1px solid #e8e8f0", padding: "1.5rem", background: "#fafafe" }}
              >
                <p style={{ ...S.grotesk, fontSize: ".95rem", fontWeight: 700, color: "#111", marginBottom: ".5rem", lineHeight: 1.3 }}>
                  {p.headline}
                </p>
                <p style={{ ...S.grotesk, fontSize: ".82rem", color: "#888", lineHeight: 1.6 }}>{p.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Plataforma ── */}
        <section id="plataforma" className="py-12 md:py-20" style={{ background: "#f4f3ff" }}>
          <div className="max-w-5xl mx-auto px-4 md:px-8">
            <div className="text-center mb-10">
              <h2 style={{ ...S.grotesk, fontSize: "clamp(1.4rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#111", marginBottom: ".75rem" }}>
                O que a Lokat OS organiza para você
              </h2>
              <p style={{ ...S.grotesk, fontSize: ".9rem", color: "#666", maxWidth: "420px", margin: "0 auto", lineHeight: 1.6 }}>
                Cada parte do negócio num lugar só — sem planilha avulsa.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { color: "#7b6ef6", title: "Dados do negócio",      desc: "Faturamento, pedidos e métricas atualizados automaticamente." },
                { color: "#10b981", title: "Conteúdo e aprovações", desc: "Calendário, briefings e aprovação por link — sem vai-e-vem." },
                { color: "#3b82f6", title: "Relatórios e decisões", desc: "Resultados de campanha, alcance Meta e ticket médio num painel." },
                { color: "#a855f7", title: "Clientes e operação",   desc: "Gerencie clientes, equipe, tarefas e contratos no mesmo sistema." },
              ].map((c) => (
                <div key={c.title} className="lk-card-hover bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="w-8 h-8 rounded-xl mb-3 flex items-center justify-center" style={{ background: `${c.color}15` }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{c.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Ciclo do ecossistema ── */}
        <section className="py-14 md:py-20" style={{ background: "#111" }}>
          <div className="max-w-5xl mx-auto px-4 md:px-8">
            <div className="text-center mb-10">
              <h2 style={{ ...S.grotesk, fontSize: "clamp(1.4rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#f0f0f0", marginBottom: ".75rem" }}>
                Do diagnóstico à próxima decisão
              </h2>
              <p style={{ ...S.grotesk, fontSize: ".9rem", color: "#888899", maxWidth: "440px", margin: "0 auto", lineHeight: 1.6 }}>
                Cada etapa conectada à próxima — sem planilha avulsa, sem retrabalho.
              </p>
            </div>
            <EcosystemCycle />
          </div>
        </section>

        {/* ── Como começa em 3 passos ── */}
        <section className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="text-center mb-10">
            <h2 style={{ ...S.grotesk, fontSize: "clamp(1.4rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#111", marginBottom: ".75rem" }}>
              Como a LOKAT OS começa a trabalhar com você
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Entendemos sua operação", desc: "Diagnóstico, objetivos, clientes, equipe e fontes existentes. Mapeamos o que você já tem e o que está faltando." },
              { step: "02", title: "Conectamos e organizamos", desc: "Integrações, documentos, processos, campanhas e dados. Tudo em um fluxo — sem copiar, sem exportar." },
              { step: "03", title: "Executamos e interpretamos", desc: "Conteúdo, operação, relatórios, diagnósticos e próximas ações. Decisões baseadas em dados reais." },
            ].map((s) => (
              <div key={s.step} style={{ border: "1px solid #ebebf7", padding: "1.75rem", background: "#fff", position: "relative" }}>
                <div style={{ ...S.mono, fontSize: "2rem", fontWeight: 700, color: "#ebebf7", position: "absolute", top: "1rem", right: "1.25rem", lineHeight: 1 }}>{s.step}</div>
                <h3 style={{ ...S.grotesk, fontSize: ".95rem", fontWeight: 700, color: "#111", marginBottom: ".6rem", lineHeight: 1.3 }}>{s.title}</h3>
                <p style={{ ...S.grotesk, fontSize: ".82rem", color: "#666", lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/diagnostico" style={{ display: "inline-block", background: "#7b6ef6", color: "#fff", padding: ".85rem 2rem", ...S.mono, fontSize: ".68rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", fontWeight: 700 }}>
              Fazer diagnóstico →
            </Link>
          </div>
        </section>

        {/* ── Jornada: Como a Lokat OS resolve ── */}
        <section className="py-14 md:py-22">
          <div className="max-w-5xl mx-auto px-4 md:px-8">
            <div className="text-center mb-10">
              <h2 style={{ ...S.grotesk, fontSize: "clamp(1.4rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#111", marginBottom: ".75rem" }}>
                Do caos ao resultado — em um fluxo só
              </h2>
              <p style={{ ...S.grotesk, fontSize: ".9rem", color: "#666", maxWidth: "400px", margin: "0 auto", lineHeight: 1.6 }}>
                Cada etapa conectada à próxima. Sem exportar, sem copiar, sem retrabalho.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                { label: "Captar",      desc: "Leads e contatos",         color: "#7b6ef6" },
                { label: "Diagnosticar",desc: "Dados do negócio",         color: "#8b5cf6" },
                { label: "Planejar",    desc: "Calendário e briefings",   color: "#a855f7" },
                { label: "Produzir",    desc: "Conteúdo com IA",          color: "#6366f1" },
                { label: "Aprovar",     desc: "Cliente por link",         color: "#3b82f6" },
                { label: "Medir",       desc: "Resultados reais",         color: "#10b981" },
                { label: "Vender melhor",desc: "Decisões com dados",      color: "#059669" },
              ].map((step, i) => (
                <div key={step.label} className="lk-card-hover flex flex-col items-center text-center p-4 rounded-2xl border" style={{ borderColor: "#ebebf7", background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${step.color}18`, border: `1px solid ${step.color}30`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: ".6rem" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: step.color }} />
                  </div>
                  <p style={{ ...S.grotesk, fontSize: ".78rem", fontWeight: 700, color: "#111", marginBottom: ".2rem", lineHeight: 1.2 }}>{step.label}</p>
                  <p style={{ ...S.grotesk, fontSize: ".7rem", color: "#aaa", lineHeight: 1.4 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── REC OS ── */}
        <section id="rec-os" className="py-14 md:py-20" style={{ background: "#0e0e14" }}>
          <div className="max-w-5xl mx-auto px-4 md:px-8">
            <div className="flex flex-col md:flex-row items-start gap-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-5">
                  <div style={{ width: 34, height: 34, background: "#c0392b15", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg viewBox="0 0 200 260" fill="none" style={{ width: 16, height: 21 }}>
                      <path d="M100 22 C146 80 174 123 174 164 C174 215 141 247 100 247 C59 247 26 215 26 164 C26 123 54 80 100 22Z" fill={S.red} />
                    </svg>
                  </div>
                  <span style={{ ...S.mono, fontSize: ".68rem", letterSpacing: ".2em", textTransform: "uppercase", color: S.red }}>REC OS</span>
                </div>
                <h2 style={{ ...S.grotesk, fontSize: "clamp(1.4rem, 3.8vw, 2.6rem)", fontWeight: 700, color: "#f0f0f0", lineHeight: 1.1, marginBottom: "1rem", textWrap: "balance" } as React.CSSProperties}>
                  Briefing, roteiro, vídeo e aprovação no mesmo lugar.
                </h2>
                <p style={{ ...S.grotesk, fontSize: ".92rem", lineHeight: 1.7, color: "#888899", maxWidth: "460px", marginBottom: "1.5rem" }}>
                  A área dentro da Lokat OS onde produção audiovisual e criação de conteúdo param de existir em planilhas separadas. Cada campanha tem briefing, roteiro, calendário, aprovação por link e relatório de performance — conectados em um único fluxo.
                </p>
                <p style={{ ...S.mono, fontSize: ".62rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#44445a", marginBottom: "1rem" }}>
                  ≠ Lokat.rec — REC OS é uma área da plataforma, não a plataforma de vídeo.
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {["Briefing", "Roteiro", "Calendário", "Aprovação por link", "Performance"].map((t) => (
                    <span key={t} style={{ ...S.mono, fontSize: ".58rem", letterSpacing: ".1em", textTransform: "uppercase", color: S.red, border: `1px solid ${S.red}30`, padding: ".2rem .6rem" }}>{t}</span>
                  ))}
                </div>
                <a href="/rec" style={{ ...S.mono, fontSize: ".65rem", letterSpacing: ".14em", textTransform: "uppercase", color: S.red, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: ".4rem", border: `1px solid ${S.red}40`, padding: ".45rem 1rem" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${S.red}90`)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${S.red}40`)}
                >
                  Explorar Lokat.rec →
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full md:w-60 flex-shrink-0">
                {[
                  { label: "Briefing",   desc: "Organiza o pedido antes de começar" },
                  { label: "Roteiro",    desc: "Do roteiro ao produto final" },
                  { label: "Aprovação",  desc: "Cliente aprova por link, sem login" },
                  { label: "Calendário", desc: "Agenda o que vai ao ar e quando" },
                ].map((f) => (
                  <div key={f.label} className="lk-card-hover-dark" style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: 10, padding: "1rem" }}>
                    <p style={{ ...S.grotesk, fontSize: ".73rem", fontWeight: 700, color: "#e0e0e8", marginBottom: ".3rem" }}>{f.label}</p>
                    <p style={{ ...S.grotesk, fontSize: ".63rem", color: "#55556a", lineHeight: 1.4 }}>{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Fontes de dados ── */}
        <section className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="text-center mb-10">
            <h2 style={{ ...S.grotesk, fontSize: "clamp(1.4rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#111", marginBottom: ".75rem" }}>
              Conecta com o que você já usa
            </h2>
            <p style={{ ...S.grotesk, fontSize: ".9rem", color: "#666", maxWidth: "400px", margin: "0 auto", lineHeight: 1.6 }}>
              Os números chegam automaticamente. Sem exportar planilha. Sem copiar dado à mão.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: "Cardápio Digital", sub: "Pedidos e faturamento chegam direto ao painel",       color: "#10b981", tag: "Já conecta"   },
              { name: "Meta / Instagram", sub: "Alcance, engajamento e anúncios em um lugar só",      color: "#7b6ef6", tag: "Já conecta"   },
              { name: "WhatsApp",         sub: "Aprovações, alertas e notificações de clientes",      color: "#25d366", tag: "Em validação" },
              { name: "Arquivos e planilhas", sub: "Entrada manual quando a integração ainda não chegou", color: "#6b7280", tag: "Já conecta"  },
              { name: "CRM",              sub: "Leads e oportunidades conectados ao funil",           color: "#f59e0b", tag: "Em validação" },
              { name: "PDV / Caixa",      sub: "Vendas presenciais e ticket médio em tempo real",     color: "#3b82f6", tag: "A caminho"   },
            ].map((src) => (
              <div key={src.name} className="lk-card-hover bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${src.color}12` }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: src.color }} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-gray-900 leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{src.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{src.sub}</p>
                  <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5" style={{ fontFamily: "'Space Mono', monospace", color: src.color, background: `${src.color}10`, border: `1px solid ${src.color}25` }}>
                    {src.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Prévia visual ── */}
        <section className="py-12 md:py-16" style={{ background: "#f4f3ff" }}>
          <div className="max-w-5xl mx-auto px-4 md:px-8">
            <div className="text-center mb-8">
              <h2 style={{ ...S.grotesk, fontSize: "clamp(1.3rem, 3vw, 2rem)", fontWeight: 800, color: "#111", marginBottom: ".5rem" }}>
                Prévia visual da plataforma
              </h2>
              <p style={{ ...S.mono, fontSize: ".62rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#888", marginBottom: ".25rem" }}>
                Simulação — interface em desenvolvimento
              </p>
            </div>
            <div style={{ background: "#1a1a28", border: "1px solid #2a2a40", borderRadius: 14, padding: "1.5rem", overflow: "hidden" }}>
              {/* Fake browser bar */}
              <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: "1.25rem", paddingBottom: ".75rem", borderBottom: "1px solid #2a2a40" }}>
                {["#ff5f57","#febc2e","#28c840"].map((c) => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
                <div style={{ flex: 1, background: "#0f0f1c", borderRadius: 6, height: 22, marginLeft: ".5rem", display: "flex", alignItems: "center", paddingLeft: ".75rem" }}>
                  <span style={{ ...S.mono, fontSize: ".55rem", color: "#44445a", letterSpacing: ".06em" }}>app.lokat.io/dashboard</span>
                </div>
              </div>
              {/* Fake dashboard layout */}
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {[
                  { label: "Faturamento mensal", value: "R$ 18.450", color: "#10b981" },
                  { label: "Conteúdos planejados", value: "24",       color: "#7b6ef6" },
                  { label: "Aprovações pendentes", value: "3",        color: "#f59e0b" },
                  { label: "Alcance Meta (7d)",    value: "12.8K",    color: "#3b82f6" },
                ].map((m) => (
                  <div key={m.label} style={{ background: "#0f0f1c", border: "1px solid #1e1e30", borderRadius: 10, padding: ".85rem" }}>
                    <p style={{ ...S.mono, fontSize: ".52rem", letterSpacing: ".1em", textTransform: "uppercase", color: "#44445a", marginBottom: ".4rem" }}>{m.label}</p>
                    <p style={{ ...S.grotesk, fontSize: "1.2rem", fontWeight: 700, color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div style={{ background: "#0f0f1c", border: "1px solid #1e1e30", borderRadius: 10, padding: "1rem" }}>
                  <p style={{ ...S.mono, fontSize: ".52rem", letterSpacing: ".1em", textTransform: "uppercase", color: "#44445a", marginBottom: ".75rem" }}>Calendário editorial</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                    {["Post carrossel — marca X", "Reels produto novo", "Story promoção sexta"].map((item, i) => (
                      <div key={item} style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: ["#7b6ef6","#10b981","#f59e0b"][i], flexShrink: 0 }} />
                        <span style={{ ...S.grotesk, fontSize: ".72rem", color: "#888899" }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: "#0f0f1c", border: "1px solid #1e1e30", borderRadius: 10, padding: "1rem" }}>
                  <p style={{ ...S.mono, fontSize: ".52rem", letterSpacing: ".1em", textTransform: "uppercase", color: "#44445a", marginBottom: ".75rem" }}>Aprovações recentes</p>
                  {[["Arte lançamento produto", "aprovado"], ["Vídeo institucional", "aguardando"], ["Post patrocinado", "aprovado"]].map(([t, s]) => (
                    <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".4rem" }}>
                      <span style={{ ...S.grotesk, fontSize: ".72rem", color: "#888899" }}>{t}</span>
                      <span style={{ ...S.mono, fontSize: ".52rem", letterSpacing: ".08em", color: s === "aprovado" ? "#10b981" : "#f59e0b", background: s === "aprovado" ? "#10b98112" : "#f59e0b12", padding: ".1rem .4rem" }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Para quem ── */}
        <section className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="text-center mb-10">
            <h2 style={{ ...S.grotesk, fontSize: "clamp(1.4rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#111", marginBottom: ".75rem" }}>
              Para quem é a Lokat OS
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                type: "Negócios locais",
                color: "#10b981",
                desc: "Restaurante, clínica, loja, academia — qualquer negócio que precisa organizar conteúdo, aprovações e resultados sem contratar uma equipe grande.",
                fits: ["Conecta com cardápio digital", "Relatório de desempenho", "Aprovação por link para cliente"],
              },
              {
                type: "Agências",
                color: "#7b6ef6",
                desc: "Gerencie múltiplos clientes em um painel unificado. Cada cliente vê só o que é dele, e você vê tudo.",
                fits: ["Painel multi-cliente", "Briefing e calendário por conta", "Aprovação sem login para cliente final"],
              },
              {
                type: "Autônomos e freelancers",
                color: "#a855f7",
                desc: "Você faz tudo sozinho — planejamento, produção, entrega, cobrança. A Lokat OS centraliza o que está espalhado.",
                fits: ["Calendário editorial próprio", "OS por projeto", "Relatório de resultado para cliente"],
              },
            ].map((p) => (
              <div key={p.type} className="lk-card-hover" style={{ border: `1px solid ${p.color}25`, borderRadius: 14, padding: "1.5rem", background: `${p.color}05` }}>
                <div style={{ display: "inline-block", ...S.mono, fontSize: ".58rem", letterSpacing: ".14em", textTransform: "uppercase", color: p.color, border: `1px solid ${p.color}30`, padding: ".18rem .6rem", marginBottom: "1rem" }}>{p.type}</div>
                <p style={{ ...S.grotesk, fontSize: ".88rem", color: "#444", lineHeight: 1.65, marginBottom: "1.25rem" }}>{p.desc}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {p.fits.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: ".5rem", marginBottom: ".35rem" }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: p.color, marginTop: ".45rem", flexShrink: 0 }} />
                      <span style={{ ...S.grotesk, fontSize: ".78rem", color: "#666" }}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── Multinicho ── */}
        <section className="py-14 md:py-20" style={{ background: "#f4f3ff" }}>
          <div className="max-w-5xl mx-auto px-4 md:px-8">
            <div className="text-center mb-10">
              <h2 style={{ ...S.grotesk, fontSize: "clamp(1.4rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#111", marginBottom: ".75rem" }}>
                Uma plataforma, diferentes operações
              </h2>
              <p style={{ ...S.grotesk, fontSize: ".9rem", color: "#666", maxWidth: "440px", margin: "0 auto", lineHeight: 1.6 }}>
                O mesmo ecossistema serve negócios diferentes. A diferença está no contexto, não na plataforma.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { niche: "Clínicas e saúde",     color: "#10b981", useCase: "CRM de pacientes, agenda, conteúdo educativo, presença no Google e Instagram." },
                { niche: "Varejo e lojas",        color: "#f59e0b", useCase: "Campanhas sazonais, gestão de fornecedores, conteúdo de produto, relatórios de venda." },
                { niche: "Construção e serviços", color: "#6366f1", useCase: "OS de projetos, documentos, equipe, orçamentos, relatórios e presença digital." },
                { niche: "Restaurantes e food",   color: "#f97316", useCase: "Cardápio digital (opcional), conteúdo gastronômico, aprovações de campanha e dados de pedido." },
                { niche: "Agências",              color: "#7b6ef6", useCase: "Multi-clientes, briefings, calendário editorial, aprovação por link, relatórios por conta." },
                { niche: "Profissionais liberais", color: "#a855f7", useCase: "Calendário de conteúdo, CRM de prospects, relatório de presença digital, aprovações." },
              ].map((n) => (
                <div key={n.niche} style={{ border: `1px solid ${n.color}20`, background: `${n.color}05`, padding: "1.25rem 1.5rem", borderLeft: `3px solid ${n.color}` }}>
                  <span style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: n.color, fontWeight: 700 }}>{n.niche}</span>
                  <p style={{ ...S.grotesk, fontSize: ".85rem", color: "#555", lineHeight: 1.6, marginTop: ".5rem" }}>{n.useCase}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Beta ── */}
        <section className="py-12 md:py-16" style={{ background: "#fff" }}>
          <div className="max-w-2xl mx-auto px-4 md:px-8 text-center">
            <div className="inline-flex items-center gap-2 border px-4 py-1.5 rounded-full mb-5" style={{ background: "#eeeeff", borderColor: "#d0d0ff" }}>
              <Zap className="w-3.5 h-3.5" style={{ color: "#7b6ef6" }} />
              <span style={{ ...S.mono, fontSize: ".65rem", letterSpacing: ".1em", textTransform: "uppercase", color: "#7b6ef6" }}>Acesso por convite · Beta</span>
            </div>
            <h2 style={{ ...S.grotesk, fontSize: "clamp(1.2rem, 3vw, 1.8rem)", fontWeight: 800, color: "#111", marginBottom: ".5rem" }}>
              A partir de R$ {MIN_PUBLIC_PRICE}/mês
            </h2>
            <p style={{ ...S.grotesk, fontSize: ".85rem", color: "#888", marginBottom: ".5rem" }}>
              14 dias grátis · sem cartão · cancele quando quiser
            </p>
            <p style={{ ...S.grotesk, fontSize: ".82rem", color: "#aaa", marginBottom: "1.75rem" }}>
              Sem cobrança automática. Você escolhe se continua após o beta.
            </p>
            <Link
              href={betaHref}
              style={{ display: "inline-block", background: "#7b6ef6", color: "#fff", padding: ".85rem 2.2rem", ...S.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", fontWeight: 700, transition: "background .2s, box-shadow .2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#8f84f8"; e.currentTarget.style.boxShadow = "0 0 24px rgba(123,110,246,.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#7b6ef6"; e.currentTarget.style.boxShadow = "none"; }}
            >
              {betaLabel}
            </Link>
            <p style={{ ...S.grotesk, fontSize: ".78rem", color: "#bbb", marginTop: "1rem" }}>
              Ou{" "}
              <Link href="/planos" style={{ color: "#7b6ef6", textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
              >ver planos e preços</Link>
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="max-w-2xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="text-center mb-10">
            <h2 style={{ ...S.grotesk, fontSize: "clamp(1.3rem, 3vw, 2rem)", fontWeight: 800, color: "#111", marginBottom: ".5rem" }}>
              Perguntas frequentes
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
            {FAQ.map((item, i) => (
              <div key={i} style={{ border: "1px solid #e8e8f0", borderRadius: 10, overflow: "hidden" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", background: "#fff", border: "none", cursor: "pointer", textAlign: "left", gap: "1rem" }}
                >
                  <span style={{ ...S.grotesk, fontSize: ".9rem", fontWeight: 600, color: "#111", flex: 1, lineHeight: 1.4 }}>{item.q}</span>
                  <span style={{ ...S.mono, fontSize: ".75rem", color: "#888", flexShrink: 0, transition: "transform .2s", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: ".25rem 1.25rem 1rem", background: "#fafafe" }}>
                    <p style={{ ...S.grotesk, fontSize: ".87rem", color: "#555", lineHeight: 1.65 }}>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="max-w-4xl mx-auto px-4 md:px-8 py-16 md:py-24 text-center">
          <h2 style={{ ...S.grotesk, fontSize: "clamp(1.5rem, 4vw, 2.8rem)", fontWeight: 800, color: "#111", marginBottom: "1rem", lineHeight: 1.1, textWrap: "balance" } as React.CSSProperties}>
            Diagnóstico gratuito.<br className="hidden md:block" /> Resultado em minutos.
          </h2>
          <p style={{ ...S.grotesk, fontSize: ".95rem", color: "#666", maxWidth: "460px", margin: "0 auto 2rem", lineHeight: 1.65 }}>
            Entenda o potencial da sua presença digital. Comece a organizar sem planilha, sem WhatsApp perdido e sem retrabalho.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/diagnostico" style={{ display: "inline-block", background: "#7b6ef6", color: "#fff", padding: ".85rem 2.2rem", ...S.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", fontWeight: 700, transition: "background .2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#8f84f8")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#7b6ef6")}
            >
              Fazer diagnóstico gratuito →
            </Link>
            <Link href={betaHref} style={{ display: "inline-block", background: "#fff", color: "#333", padding: ".85rem 2rem", ...S.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", fontWeight: 700, border: "1px solid #ddd", transition: "border-color .2s, color .2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7b6ef6"; e.currentTarget.style.color = "#7b6ef6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#ddd"; e.currentTarget.style.color = "#333"; }}
            >
              {betaLabel}
            </Link>
            <a href="https://wa.me/5589994584163?text=Ol%C3%A1%2C+vim+pelo+site+da+Lokat+e+tenho+interesse+em+um+projeto+para+minha+empresa."
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", background: "#fff", color: "#25d366", padding: ".85rem 2rem", ...S.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", fontWeight: 700, border: "1px solid #25d36640", transition: "border-color .2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#25d36690")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#25d36640")}
            >
              Falar com a Lokat
            </a>
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${S.border}`, padding: "3rem 2rem 2rem" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 pb-8" style={{ borderBottom: `1px solid ${S.border}` }}>
            <div>
              <span style={{ ...S.mono, fontSize: ".78rem", letterSpacing: ".08em", textTransform: "uppercase", color: S.text, fontWeight: 700 }}>LOKAT</span>
              <p style={{ ...S.grotesk, fontSize: ".72rem", color: S.muted, marginTop: ".3rem", maxWidth: "250px" }}>
                Marketing, conteúdo e operação em um único OS.
              </p>
            </div>
            <div className="flex gap-8">
              <div>
                <p style={{ ...S.mono, fontSize: ".52rem", letterSpacing: ".15em", textTransform: "uppercase", color: S.muted, marginBottom: ".6rem" }}>Plataforma</p>
                {[["LOKAT OS", "/"], ["LOKAT.REC", "/rec"], ["Diagnóstico", "/diagnostico"]].map(([l, h]) => (
                  <a key={l} href={h} style={{ display: "block", ...S.grotesk, fontSize: ".73rem", color: S.muted, textDecoration: "none", marginBottom: ".35rem" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = S.text)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = S.muted)}
                  >{l}</a>
                ))}
              </div>
              <div>
                <p style={{ ...S.mono, fontSize: ".52rem", letterSpacing: ".15em", textTransform: "uppercase", color: S.muted, marginBottom: ".6rem" }}>Legal</p>
                {[["Privacidade", "/privacidade"], ["Termos", "/termos"], ["Contato", "/contato"], ["Blog", "/blog"]].map(([l, h]) => (
                  <a key={l} href={h} style={{ display: "block", ...S.grotesk, fontSize: ".73rem", color: S.muted, textDecoration: "none", marginBottom: ".35rem" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = S.text)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = S.muted)}
                  >{l}</a>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <span style={{ ...S.mono, fontSize: ".56rem", letterSpacing: ".08em", textTransform: "uppercase", color: S.muted }}>
              © 2026 LOKAT — Todos os direitos reservados
            </span>
            <a href="/rec" style={{ ...S.mono, fontSize: ".56rem", letterSpacing: ".14em", textTransform: "uppercase", color: S.red, textDecoration: "none", border: `1px solid ${S.red}40`, padding: ".2rem .6rem" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${S.red}80`)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${S.red}40`)}
            >LOKAT.REC →</a>
          </div>
        </div>
      </footer>

      {/* key={modalKey} remounts the modal on each open, resetting all internal state cleanly */}
      <LeadConversationModal key={modalKey} open={modalOpen} onClose={closeModal} />
    </div>
  );
}
