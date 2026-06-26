"use client";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { BeforeAfterSection } from "@/components/before-after-section";
import { Users, Sparkles, DollarSign, TrendingUp, GraduationCap, Video, FileSearch, CalendarDays, Calendar, FileText, CheckCircle2, Building2, Rocket, UserCheck, ClipboardList, BarChart3, Send, BarChart2, RefreshCw } from "lucide-react";
import type { ElementType } from "react";

// ── Modules ──────────────────────────────────────────────────
interface Module { Icon: ElementType; accent: string; tag: string; title: string; desc: string; num: string; coming?: boolean; }
const modules: Module[] = [
  { Icon: Users,         accent: "#7b6ef6", tag: "■ CRM",        num: "01", title: "Clientes",   desc: "Centralize clientes, histórico, entregas e relacionamento em um só lugar." },
  { Icon: Sparkles,      accent: "#a855f7", tag: "■ Conteúdo",   num: "02", title: "ContentOS",  desc: "Planeje, crie e aprove conteúdos com mais velocidade e menos retrabalho." },
  { Icon: Video,         accent: "#e0635a", tag: "■ Audiovisual", num: "03", title: "RecOS",      desc: "Organize roteiros, gravações e produção audiovisual com clareza." },
  { Icon: DollarSign,    accent: "#10b981", tag: "■ Finanças",    num: "04", title: "FinanceOS",  desc: "Acompanhe cobranças, receitas e pagamentos sem perder o controle." },
  { Icon: TrendingUp,    accent: "#3b82f6", tag: "■ Vendas",      num: "05", title: "GrowthOS",   desc: "Gerencie leads, propostas e oportunidades comerciais em um fluxo único." },
  { Icon: GraduationCap, accent: "#f59e0b", tag: "■ Academy",     num: "06", title: "Academy",    desc: "Treinamento e onboarding da equipe — em breve.", coming: true },
];

// ── ContentOS features ────────────────────────────────────────
const contentosFeatures: { Icon: ElementType; title: string; desc: string }[] = [
  { Icon: FileSearch,   title: "Diagnóstico da marca",  desc: "Posicionamento, voz e público definidos antes de criar qualquer conteúdo." },
  { Icon: CalendarDays, title: "Estratégia mensal",      desc: "Objetivos, formatos e canais planejados para o mês inteiro." },
  { Icon: Calendar,     title: "Calendário editorial",   desc: "Publicações com datas, status e responsáveis em um único painel." },
  { Icon: FileText,     title: "Roteiros e briefings",   desc: "Roteiros completos com legenda, CTA e referências visuais." },
  { Icon: CheckCircle2, title: "Aprovação pelo cliente", desc: "Link de aprovação público — o cliente aprova sem precisar de login." },
  { Icon: Video,        title: "Produção operacional",   desc: "Fluxo direto: briefing → produção → agendado → publicado." },
];

// ── Client logos ─────────────────────────────────────────────
const clients = [
  { name: "Duh Lanches",       file: "duh-lanches.jpeg" },
  { name: "MD Móveis",         file: "md-moveis.jpg"    },
  { name: "Los Caldos",        file: "los-caldos.jpg"   },
  { name: "My Sorvetes",       file: "my-sorvetes.png"  },
  { name: "O Pedreirão",       file: "pedreirar.jpeg"   },
  { name: "Odonto Lura",       file: "odonto-lura.jpg"  },
  { name: "Sandubão Lanches",  file: "sandubao.jpg"     },
  { name: "Banca do Jean",     file: "banca-jean.png"   },
];

// ── Ticker content ───────────────────────────────────────────
const tickerItems = [
  "■ DO CONTEÚDO À VENDA EM UM ÚNICO OS",
  "✦ CONTEÚDO · LEADS · FINANÇAS · APROVAÇÕES",
  "■ PARA EMPRESAS, AGÊNCIAS E AUTÔNOMOS",
  "✦ COM IA E AUTOMAÇÃO DO INÍCIO AO FIM",
  "■ DO CONTEÚDO À VENDA EM UM ÚNICO OS",
  "✦ CONTEÚDO · LEADS · FINANÇAS · APROVAÇÕES",
  "■ PARA EMPRESAS, AGÊNCIAS E AUTÔNOMOS",
  "✦ COM IA E AUTOMAÇÃO DO INÍCIO AO FIM",
];

const S = {
  mono: { fontFamily: "'Space Mono', monospace" } as React.CSSProperties,
  grotesk: { fontFamily: "'Space Grotesk', sans-serif" } as React.CSSProperties,
  bg: "#0a0a0c",
  card: "#13131a",
  border: "#222230",
  text: "#e8e8e8",
  muted: "#555566",
  accent: "#7b6ef6",
};

export default function HomePage() {
  return (
    <div style={{ background: S.bg, color: S.text, minHeight: "100vh" }}>
      <PublicHeader />

      {/* ── Ticker ── */}
      <div style={{ background: S.accent, overflow: "hidden", padding: ".3rem 0" }}>
        <div className="lk-ticker-track" style={{ display: "inline-flex" }}>
          {tickerItems.map((item, i) => (
            <span key={i} style={{ ...S.mono, fontSize: ".65rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#fff", margin: "0 3rem" }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── Hero ── */}
      <section
        className="px-4 md:px-8 pt-10 pb-8 md:py-[4rem]"
        style={{ minHeight: "clamp(auto, 70vh, 85vh)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", textAlign: "center" }}
      >
        {/* Background glow */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 50% 60%, rgba(59,47,160,.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Corner dots */}
        {(["tl","tr","bl","br"] as const).map((pos) => (
          <div key={pos} style={{ position: "absolute", ...S.mono, fontSize: ".5rem", color: S.border, letterSpacing: ".3em", userSelect: "none", pointerEvents: "none", ...(pos==="tl"?{top:"2rem",left:"2rem"}:pos==="tr"?{top:"2rem",right:"2rem"}:pos==="bl"?{bottom:"2rem",left:"2rem"}:{bottom:"2rem",right:"2rem"}) }}>
            · · ·<br/>· · ·
          </div>
        ))}

        <div className="hero-fade-up" style={{ fontSize: ".65rem", letterSpacing: ".2em", textTransform: "uppercase", color: S.accent, border: `1px solid ${S.accent}30`, background: `${S.accent}10`, padding: ".25rem .8rem", marginBottom: "2rem", display: "inline-block", ...S.mono }}>
          [OS do Marketing que Vende]
        </div>

        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 w-full">
          {/* Text */}
          <div className="flex-1 text-center lg:text-left">
            <h1
              className="hero-fade-up-d1"
              style={{ ...S.grotesk, fontSize: "clamp(2rem, 8vw, 6.5rem)", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-.03em", color: S.text, marginBottom: "1.2rem" }}
            >
              Marketing que<br />
              <em style={{ fontStyle: "italic", color: S.accent }}>funciona</em><br />
              e gera resultado.
            </h1>

            <p className="hero-fade-up-d2 mx-auto lg:mx-0" style={{ ...S.grotesk, maxWidth: "500px", fontSize: "clamp(.85rem, 2.5vw, 1rem)", lineHeight: 1.7, color: S.muted, marginBottom: "2rem" }}>
              Gerencie conteúdo, aprovações, leads e finanças em um único lugar — sem planilha, sem WhatsApp perdido, sem retrabalho. Com IA do início ao fim.
            </p>

            <div className="hero-fade-up-d3 flex flex-col sm:flex-row flex-wrap gap-3">
              <Link
                href="/diagnostico"
                className="w-full sm:w-auto text-center"
                style={{ background: S.accent, color: "#fff", padding: ".85rem 2.2rem", ...S.mono, fontSize: ".72rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-block", fontWeight: 700 }}
              >
                ■ Quero ver na prática →
              </Link>
              <a
                href="#modulos"
                className="w-full sm:w-auto text-center"
                style={{ background: "transparent", color: S.text, border: `1px solid ${S.border}`, padding: ".85rem 2rem", ...S.mono, fontSize: ".72rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-block" }}
              >
                Ver a plataforma
              </a>
            </div>

            <div className="hero-fade-up-d3 flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-6 pt-6" style={{ borderTop: `1px solid ${S.border}` }}>
              <span style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".15em", textTransform: "uppercase", color: S.muted }}>Para</span>
              {["Empresas", "Agências", "Autônomos"].map((l) => (
                <span key={l} style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: S.text, border: `1px solid ${S.border}`, padding: ".15rem .6rem" }}>{l}</span>
              ))}
            </div>
          </div>

          {/* Drop visual */}
          <div className="relative hero-robot-in flex-shrink-0 w-full lg:w-[360px] h-[300px] lg:h-[500px] hidden lg:flex items-center justify-center">
            <div className="absolute inset-0 glow-pulse pointer-events-none rounded-full" style={{ background: "radial-gradient(circle at 50% 45%, rgba(123,110,246,0.2) 0%, rgba(139,92,246,0.07) 45%, transparent 70%)" }} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg width="370" height="220" viewBox="0 0 370 220" fill="none" className="orbit-slow" style={{ opacity: 0.22 }}>
                <ellipse cx="185" cy="110" rx="170" ry="62" stroke="#7b6ef6" strokeWidth="1" strokeDasharray="5 9" />
                <circle cx="355" cy="110" r="4" fill="#7b6ef6" />
              </svg>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: "rotate(58deg)" }}>
              <svg width="290" height="290" viewBox="0 0 290 290" fill="none" className="orbit-rev" style={{ opacity: 0.14 }}>
                <ellipse cx="145" cy="145" rx="128" ry="46" stroke="#a855f7" strokeWidth="0.8" strokeDasharray="3 11" />
                <circle cx="17" cy="145" r="3" fill="#a855f7" />
              </svg>
            </div>
            <div className="relative z-10 lk-drop-float" style={{ width: "130px", height: "170px" }}>
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

      {/* ── Da ideia ao post publicado — etapas ── */}
      <section className="py-10 md:py-16" style={{ borderTop: `1px solid ${S.border}` }}>
        <div className="px-4 md:px-8 mb-6 md:mb-8">
          <p style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".18em", textTransform: "uppercase", color: S.accent, marginBottom: ".35rem" }}>[O fluxo]</p>
          <h2 style={{ ...S.grotesk, fontSize: "clamp(1.1rem, 3vw, 1.8rem)", fontWeight: 700, color: S.text, lineHeight: 1.1 }}>Da ideia ao post publicado</h2>
          <p className="lk-carousel-hint mt-2 md:hidden" style={{ color: S.muted }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M15 6l6 6-6 6"/></svg>
            <span style={{ ...S.mono, fontSize: ".55rem", letterSpacing: ".1em", textTransform: "uppercase" }}>deslize para ver</span>
          </p>
        </div>
        <div className="lk-carousel px-4 md:px-8">
          {[
            { num: "01", Icon: ClipboardList, color: "#7b6ef6", title: "Diagnóstico",  desc: "Entenda posicionamento, público e oportunidades da marca antes de criar." },
            { num: "02", Icon: BarChart2,     color: "#a855f7", title: "Estratégia",   desc: "Defina objetivos, formatos, canais e calendário para o mês inteiro." },
            { num: "03", Icon: Sparkles,      color: "#e0635a", title: "Conteúdo",     desc: "Crie briefings, legendas e roteiros com IA — sem retrabalho." },
            { num: "04", Icon: Video,         color: "#3b82f6", title: "Produção",      desc: "Organize gravações, storyboards e edição em um fluxo visual." },
            { num: "05", Icon: CheckCircle2,  color: "#10b981", title: "Aprovação",    desc: "O cliente aprova por link público sem precisar de login ou WhatsApp." },
            { num: "06", Icon: Send,          color: "#f59e0b", title: "Publicação",   desc: "Agende e publique com data, horário e status rastreável no calendário." },
            { num: "07", Icon: BarChart3,     color: "#06b6d4", title: "Relatório",    desc: "Resultados por cliente, formato e período em painel automático." },
            { num: "08", Icon: RefreshCw,     color: "#84cc16", title: "Automação",    desc: "Fluxos recorrentes, alertas e integrações que rodam sem intervenção." },
          ].map((step) => (
            <div key={step.num} className="lk-carousel-card" style={{ background: S.card, border: `1px solid ${S.border}`, padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: ".85rem" }}>
                <div style={{ width: "38px", height: "38px", flexShrink: 0, borderRadius: "10px", background: `${step.color}18`, border: `1px solid ${step.color}35`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <step.Icon style={{ width: "17px", height: "17px", color: step.color }} strokeWidth={1.5} />
                </div>
                <span style={{ ...S.mono, fontSize: ".5rem", letterSpacing: ".15em", textTransform: "uppercase", color: step.color }}>{step.num}</span>
              </div>
              <p style={{ ...S.grotesk, fontSize: ".9rem", fontWeight: 700, color: S.text, marginBottom: ".35rem", lineHeight: 1.2 }}>{step.title}</p>
              <p style={{ ...S.grotesk, fontSize: ".73rem", lineHeight: 1.6, color: S.muted }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Info strip ── */}
      <div style={{ borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}` }}>
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6 overflow-x-auto">
          <span style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".18em", textTransform: "uppercase", color: S.muted, whiteSpace: "nowrap" }}>IA · Automação · Dados · Conteúdo · Audiovisual</span>
        </div>
      </div>

      {/* ── Prova social — logos ── */}
      <section className="py-12 md:py-16" style={{ overflow: "hidden" }}>
        <p style={{ ...S.mono, fontSize: ".55rem", letterSpacing: ".22em", textTransform: "uppercase", color: S.muted, textAlign: "center", marginBottom: "2.5rem" }}>
          Empresas que confiam na Lokat
        </p>
        <div style={{ overflow: "hidden", maskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)", WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)" }}>
          <div className="lk-logo-track" style={{ display: "inline-flex", alignItems: "center", gap: "1.5rem" }}>
            {[...clients, ...clients].map((c, i) => (
              <div
                key={i}
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "50%",
                  width: "76px",
                  height: "76px",
                  filter: "grayscale(100%)",
                  opacity: 0.45,
                  transition: "opacity .3s, filter .3s, transform .3s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "scale(1.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.45"; e.currentTarget.style.filter = "grayscale(100%)"; e.currentTarget.style.transform = "scale(1)"; }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/clients/${c.file}`}
                  alt={c.name}
                  style={{ height: "44px", width: "44px", objectFit: "contain", borderRadius: "4px" }}
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.style.display = "none";
                    const next = el.nextElementSibling as HTMLElement;
                    if (next) next.style.display = "block";
                  }}
                />
                <span style={{ ...S.mono, fontSize: ".55rem", letterSpacing: ".08em", textTransform: "uppercase", color: S.muted, display: "none" }}>
                  {c.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Escolha seu caminho ── */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-14 md:py-20">
        <div className="mb-8 text-center">
          <p style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".18em", textTransform: "uppercase", color: S.accent, marginBottom: ".4rem" }}>[Para quem é?]</p>
          <h2 style={{ ...S.grotesk, fontSize: "clamp(1.4rem, 3.5vw, 2.4rem)", fontWeight: 700, color: S.text, lineHeight: 1.1 }}>Escolha seu caminho</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: S.border, border: `1px solid ${S.border}` }}>
          {[
            { Icon: Building2, iconColor: "#7b6ef6", title: "Sou empresa ou autônomo", desc: "Organize sua marca, conteúdo e leads com autonomia e IA — sem depender de agência.", cta: "Começar →", href: "/criar-conta", accent: "#7b6ef6" },
            { Icon: Rocket,    iconColor: "#a855f7", title: "Tenho uma agência ou produtora", desc: "Gerencie clientes, equipe, aprovações e entregas em um único sistema escalável.", cta: "Ver plataforma →", href: "/plataforma", accent: "#a855f7" },
            { Icon: UserCheck, iconColor: "#10b981", title: "Sou cliente ou recebi convite", desc: "Acesse aprovações, calendário e relatórios da sua marca atendida.", cta: "Entrar →", href: "/login", accent: "#10b981" },
            { Icon: ClipboardList, iconColor: "#f59e0b", title: "Quero só um diagnóstico", desc: "Receba uma análise da sua presença digital antes de criar conta. Grátis e sem compromisso.", cta: "Fazer diagnóstico →", href: "/diagnostico", accent: "#f59e0b" },
          ].map((item) => (
            <a key={item.title} href={item.href} className="p-5 md:p-8 flex flex-col no-underline" style={{ background: S.card, transition: "background .2s", textDecoration: "none" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#191924"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = S.card; }}
            >
              <div style={{ width: "36px", height: "36px", background: `${item.iconColor}18`, border: `1px solid ${item.iconColor}30`, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: ".85rem" }}>
                <item.Icon style={{ width: "17px", height: "17px", color: item.iconColor }} strokeWidth={1.5} />
              </div>
              <h3 style={{ ...S.grotesk, fontSize: ".9rem", fontWeight: 700, color: S.text, marginBottom: ".5rem", lineHeight: 1.3 }}>{item.title}</h3>
              <p style={{ ...S.grotesk, fontSize: ".73rem", lineHeight: 1.6, color: S.muted, flexGrow: 1, marginBottom: "1.2rem" }}>{item.desc}</p>
              <span style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: item.accent }}>{item.cta}</span>
            </a>
          ))}
        </div>
      </section>

      {/* ── Do diagnóstico à execução ── */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pb-14 md:pb-20">
        <div className="mb-10 text-center">
          <p style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".18em", textTransform: "uppercase", color: S.accent, marginBottom: ".4rem" }}>[O processo]</p>
          <h2 style={{ ...S.grotesk, fontSize: "clamp(1.4rem, 3.5vw, 2.4rem)", fontWeight: 700, color: S.text, lineHeight: 1.1 }}>Do diagnóstico à execução</h2>
          <p style={{ ...S.grotesk, fontSize: ".85rem", color: S.muted, marginTop: ".6rem" }}>Cada módulo conectado ao próximo.</p>
        </div>
        <div style={{ position: "relative" }}>
          {/* Linha conectora desktop */}
          <div className="hidden lg:block" style={{ position: "absolute", top: "28px", left: "10%", right: "10%", height: "1px", background: `linear-gradient(to right, transparent, ${S.border}, ${S.accent}50, ${S.border}, transparent)` }} />
          <div className="flex flex-col lg:grid lg:grid-cols-5 gap-3">
            {[
              { num: "01", Icon: ClipboardList, color: "#7b6ef6", title: "Diagnóstico",   desc: "Entenda a presença digital, oportunidades e gargalos da marca." },
              { num: "02", Icon: Sparkles,      color: "#a855f7", title: "ContentOS",      desc: "Estratégia, campanhas, briefings, legendas e aprovações com IA." },
              { num: "03", Icon: Video,          color: "#e0635a", title: "RecOS",          desc: "Roteiro, storyboard, gravação e produção audiovisual organizada." },
              { num: "04", Icon: DollarSign,     color: "#10b981", title: "FinanceOS",      desc: "Cobranças, recebimentos, inadimplência e previsibilidade financeira." },
              { num: "05", Icon: BarChart3,      color: "#3b82f6", title: "Relatórios",     desc: "Resultados, histórico, insights e próximos passos em painel claro." },
            ].map((step, idx, arr) => (
              <div key={step.num}>
                <div className="flex flex-row lg:flex-col items-center lg:items-center gap-4 lg:gap-0 p-4 lg:p-5 lg:text-center" style={{ background: S.card, border: `1px solid ${S.border}` }}>
                  <div className="flex-shrink-0" style={{ width: "44px", height: "44px", borderRadius: "50%", background: `${step.color}18`, border: `2px solid ${step.color}40`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1, backgroundColor: S.card }}>
                    <step.Icon style={{ width: "18px", height: "18px", color: step.color }} strokeWidth={1.5} />
                  </div>
                  <div className="lg:mt-3 flex-1">
                    <span style={{ ...S.mono, fontSize: ".5rem", letterSpacing: ".15em", textTransform: "uppercase", color: step.color, display: "block", marginBottom: ".25rem" }}>{step.num}</span>
                    <p style={{ ...S.grotesk, fontSize: ".82rem", fontWeight: 700, color: S.text, marginBottom: ".2rem" }}>{step.title}</p>
                    <p style={{ ...S.grotesk, fontSize: ".7rem", lineHeight: 1.5, color: S.muted }}>{step.desc}</p>
                  </div>
                </div>
                {/* Seta conectora entre steps — visível só no mobile */}
                {idx < arr.length - 1 && (
                  <div className="flex lg:hidden justify-center py-1" style={{ color: S.border }}>
                    <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><path d="M6 0v10M1 7l5 7 5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Antes e Depois (animado com IntersectionObserver) ── */}
      <BeforeAfterSection />

      {/* ── Módulos ── */}
      <section id="modulos" className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-20">
        <div className="flex items-end justify-between mb-6 pb-4 flex-wrap gap-3" style={{ borderBottom: `1px solid ${S.border}` }}>
          <div>
            <p style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".18em", textTransform: "uppercase", color: S.accent, marginBottom: ".35rem" }}>[Módulos]</p>
            <h2 style={{ ...S.grotesk, fontSize: "clamp(1.3rem, 4vw, 2.8rem)", fontWeight: 700, color: S.text, lineHeight: 1.1 }}>6 módulos. Um único OS.</h2>
          </div>
          <a href="#contentos" style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: S.muted, border: `1px solid ${S.border}`, padding: ".35rem .8rem", textDecoration: "none", whiteSpace: "nowrap" }}>
            Ver destaque →
          </a>
        </div>

        {/* Grid 2 col no mobile, 3 no desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px" style={{ background: S.border, border: `1px solid ${S.border}` }}>
          {modules.map((m) => (
            <div
              key={m.title}
              className="p-4 md:p-6"
              style={{
                background: m.coming ? "#0d0d14" : S.card,
                position: "relative",
                transition: "background .2s",
                cursor: "default",
                opacity: m.coming ? 0.55 : 1,
              }}
              onMouseEnter={(e) => { if (!m.coming) e.currentTarget.style.background = "#191924"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = m.coming ? "#0d0d14" : S.card; }}
            >
              <div style={{ ...S.mono, fontSize: ".5rem", color: S.border, position: "absolute", top: ".4rem", left: ".4rem" }}>{m.num}</div>
              {m.coming && (
                <div style={{ ...S.mono, fontSize: ".48rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#f59e0b", background: "#f59e0b18", border: "1px solid #f59e0b30", padding: ".1rem .4rem", position: "absolute", top: ".4rem", right: ".4rem" }}>
                  breve
                </div>
              )}
              <div style={{ width: "32px", height: "32px", background: `${m.accent}18`, border: `1px solid ${m.accent}30`, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: ".6rem" }}>
                <m.Icon style={{ width: "14px", height: "14px", color: m.accent }} strokeWidth={1.5} />
              </div>
              <div style={{ ...S.grotesk, fontSize: ".82rem", fontWeight: 700, color: S.text, marginBottom: ".25rem", lineHeight: 1.2 }}>{m.title}</div>
              <p className="hidden md:block" style={{ ...S.grotesk, fontSize: ".7rem", lineHeight: 1.6, color: S.muted }}>{m.desc}</p>
              <span className="md:hidden" style={{ ...S.mono, fontSize: ".48rem", letterSpacing: ".12em", textTransform: "uppercase", color: m.accent }}>{m.tag.replace("■ ", "")}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── ContentOS feature ── */}
      <section id="contentos" className="max-w-6xl mx-auto px-4 md:px-6 pb-10 md:pb-20">
        <div style={{ border: `1px solid ${S.border}`, background: S.card }}>
          {/* Header */}
          <div className="p-5 md:p-10" style={{ borderBottom: `1px solid ${S.border}` }}>
            <span style={{ ...S.mono, fontSize: ".52rem", letterSpacing: ".15em", textTransform: "uppercase", color: S.accent, background: `${S.accent}15`, border: `1px solid ${S.accent}25`, padding: ".15rem .5rem", display: "inline-block", marginBottom: ".7rem" }}>■ Módulo ContentOS</span>
            <h2 style={{ ...S.grotesk, fontSize: "clamp(1.3rem, 4vw, 2.6rem)", fontWeight: 700, color: S.text, lineHeight: 1.1, marginBottom: ".5rem" }}>
              Content OS
            </h2>
            <p style={{ ...S.grotesk, color: S.muted, fontSize: "clamp(.8rem, 2.5vw, .95rem)", maxWidth: "500px", lineHeight: 1.6 }}>
              Conteúdo, campanha, aprovação e operação no mesmo fluxo — sem planilhas, sem WhatsApp perdido.
            </p>
          </div>

          {/* Features grid: oculto no mobile, visível no md+ */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: S.border }}>
            {contentosFeatures.map((f) => (
              <div key={f.title} className="p-5 md:p-6" style={{ background: S.card }}>
                <div style={{ width: "34px", height: "34px", background: `${S.accent}18`, border: `1px solid ${S.accent}30`, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: ".65rem" }}>
                  <f.Icon style={{ width: "15px", height: "15px", color: S.accent }} strokeWidth={1.5} />
                </div>
                <p style={{ ...S.grotesk, fontSize: ".83rem", fontWeight: 600, color: S.text, marginBottom: ".3rem" }}>{f.title}</p>
                <p style={{ ...S.grotesk, fontSize: ".73rem", lineHeight: 1.6, color: S.muted }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Features mobile: carrossel compacto */}
          <div className="md:hidden lk-carousel px-4 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
            {contentosFeatures.map((f) => (
              <div key={f.title} className="lk-carousel-card" style={{ background: "#0d0d14", border: `1px solid ${S.border}`, padding: "1rem", minWidth: "200px", width: "70vw", maxWidth: "240px" }}>
                <f.Icon style={{ width: "16px", height: "16px", color: S.accent, marginBottom: ".5rem" }} strokeWidth={1.5} />
                <p style={{ ...S.grotesk, fontSize: ".8rem", fontWeight: 700, color: S.text, marginBottom: ".2rem", lineHeight: 1.2 }}>{f.title}</p>
                <p style={{ ...S.grotesk, fontSize: ".68rem", lineHeight: 1.5, color: S.muted }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="p-4 md:p-8 flex flex-col sm:flex-row gap-3">
            <Link href="/diagnostico" style={{ background: S.accent, color: "#fff", padding: ".85rem 1.5rem", ...S.mono, fontSize: ".68rem", letterSpacing: ".12em", textTransform: "uppercase", textDecoration: "none", textAlign: "center" }}>
              ■ Quero ver na prática →
            </Link>
            <Link href="/criar-conta" style={{ background: "transparent", color: S.text, border: `1px solid ${S.border}`, padding: ".85rem 1.5rem", ...S.mono, fontSize: ".68rem", letterSpacing: ".12em", textTransform: "uppercase", textDecoration: "none", textAlign: "center" }}>
              Criar conta grátis
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section id="cta" className="px-4 md:px-8 py-16 md:py-[6rem]" style={{ position: "relative", overflow: "hidden", textAlign: "center" }}>
        {/* bg accent gradient */}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${S.accent}22 0%, #a855f720 50%, ${S.accent}15 100%)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, borderTop: `1px solid ${S.accent}30`, borderBottom: `1px solid ${S.accent}30`, pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".2em", textTransform: "uppercase", color: S.accent, marginBottom: "1rem" }}>[Pronto para começar?]</p>
          <h2 style={{ ...S.grotesk, fontSize: "clamp(1.8rem, 5vw, 3.2rem)", fontWeight: 700, color: S.text, lineHeight: 1.1, marginBottom: ".75rem" }}>
            Diagnóstico gratuito.<br />Resultado em minutos.
          </h2>
          <p style={{ ...S.grotesk, color: S.muted, fontSize: ".95rem", maxWidth: "480px", margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
            Entenda o potencial da sua presença digital e comece a organizar sem planilha, sem WhatsApp perdido e sem retrabalho.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/diagnostico"
              className="w-full sm:w-auto text-center"
              style={{ background: S.accent, color: "#fff", padding: ".85rem 2.5rem", ...S.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-block", fontWeight: 700 }}
            >
              ■ Quero ver na prática →
            </Link>
            <Link
              href="/criar-conta"
              className="w-full sm:w-auto text-center"
              style={{ background: "transparent", color: S.text, border: `1px solid ${S.border}`, padding: ".85rem 2rem", ...S.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-block" }}
            >
              Criar conta grátis
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${S.border}`, padding: "3rem 2rem 2rem" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 pb-8" style={{ borderBottom: `1px solid ${S.border}` }}>
            <div>
              <span style={{ ...S.mono, fontSize: ".8rem", letterSpacing: ".08em", textTransform: "uppercase", color: S.text, fontWeight: 700 }}>LOKAT</span>
              <p style={{ ...S.grotesk, fontSize: ".73rem", color: S.muted, marginTop: ".3rem", maxWidth: "260px" }}>
                Marketing, conteúdo e operação em um único OS.
              </p>
            </div>
            <div className="flex gap-8">
              <div>
                <p style={{ ...S.mono, fontSize: ".55rem", letterSpacing: ".15em", textTransform: "uppercase", color: S.muted, marginBottom: ".6rem" }}>Plataforma</p>
                {[["LOKAT OS", "/"], ["LOKAT.REC", "/rec"], ["Diagnóstico", "/diagnostico"]].map(([l, h]) => (
                  <a key={l} href={h} style={{ display: "block", ...S.grotesk, fontSize: ".75rem", color: S.muted, textDecoration: "none", marginBottom: ".35rem" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = S.text)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = S.muted)}
                  >{l}</a>
                ))}
              </div>
              <div>
                <p style={{ ...S.mono, fontSize: ".55rem", letterSpacing: ".15em", textTransform: "uppercase", color: S.muted, marginBottom: ".6rem" }}>Legal</p>
                {["Privacidade", "Termos", "Contato"].map((l) => (
                  <a key={l} href="#" style={{ display: "block", ...S.grotesk, fontSize: ".75rem", color: S.muted, textDecoration: "none", marginBottom: ".35rem" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = S.text)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = S.muted)}
                  >{l}</a>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <span style={{ ...S.mono, fontSize: ".58rem", letterSpacing: ".08em", textTransform: "uppercase", color: S.muted }}>
              © 2026 LOKAT — Todos os direitos reservados
            </span>
            <a href="/rec" style={{ ...S.mono, fontSize: ".58rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#c0392b", textDecoration: "none", border: "1px solid #c0392b40", padding: ".2rem .6rem" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c0392b80")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#c0392b40")}
            >
              LOKAT.REC →
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
