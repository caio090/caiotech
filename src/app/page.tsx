"use client";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { BeforeAfterSection } from "@/components/before-after-section";
import { Users, Sparkles, DollarSign, TrendingUp, GraduationCap, Video } from "lucide-react";
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
  { name: "DR",                file: "logo-dr.jpg"      },
];

// ── Ticker content (4 cópias para garantir loop sem fim seco em qualquer tela) ─
const _tickerBase = [
  "■ DO CONTEÚDO À VENDA EM UM ÚNICO OS",
  "✦ CONTEÚDO · LEADS · FINANÇAS · APROVAÇÕES",
  "■ PARA EMPRESAS, AGÊNCIAS E AUTÔNOMOS",
  "✦ COM IA E AUTOMAÇÃO DO INÍCIO AO FIM",
];
const tickerItems = [..._tickerBase, ..._tickerBase, ..._tickerBase, ..._tickerBase];

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
          Para agências, empresas e negócios locais
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
              Planeje conteúdo, aprovações, leads e finanças em um único lugar, sem planilha perdida, sem WhatsApp bagunçado e com IA do início ao fim.
            </p>

            <div className="hero-fade-up-d3 flex flex-col sm:flex-row flex-wrap gap-3">
              <Link
                href="/diagnostico"
                className="w-full sm:w-auto text-center"
                style={{ background: S.accent, color: "#fff", padding: ".85rem 2.2rem", ...S.mono, fontSize: ".72rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-block", fontWeight: 700, transition: "background .2s, box-shadow .2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#8f84f8"; e.currentTarget.style.boxShadow = `0 0 28px ${S.accent}55`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = S.accent; e.currentTarget.style.boxShadow = "none"; }}
              >
                ■ Quero ver na prática →
              </Link>
              <a
                href="#modulos"
                className="w-full sm:w-auto text-center"
                style={{ background: "transparent", color: S.text, border: `1px solid ${S.border}`, padding: ".85rem 2rem", ...S.mono, fontSize: ".72rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-block", transition: "border-color .2s, color .2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#44445a"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.color = S.text; }}
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

      {/* ── O que a Lokat OS resolve ── */}
      <section className="py-14 md:py-20" style={{ borderTop: `1px solid ${S.border}` }}>
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="mb-10 md:mb-14">
            <h2 style={{ ...S.grotesk, fontSize: "clamp(1.4rem, 4vw, 2.8rem)", fontWeight: 700, color: S.text, lineHeight: 1.1, maxWidth: "600px" }}>
              Tudo espalhado. Nada funcionando junto.
            </h2>
            <p style={{ ...S.grotesk, color: S.muted, fontSize: ".9rem", lineHeight: 1.7, maxWidth: "500px", marginTop: ".7rem" }}>
              A Lokat OS foi criada para resolver exatamente isso.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: S.border, border: `1px solid ${S.border}` }}>
            {[
              { problem: "Conteúdo aprovado via WhatsApp", solution: "Aprovação por link público — sem grupo, sem retrabalho", color: "#a855f7" },
              { problem: "Planilha de calendário desatualizada", solution: "Calendário editorial com status em tempo real", color: "#7b6ef6" },
              { problem: "Financeiro sem visibilidade", solution: "Faturamento, pedidos e ticket do cardápio em um painel", color: "#10b981" },
              { problem: "Dados de Instagram espalhados", solution: "Insights de Meta/Instagram integrados ao relatório do cliente", color: "#3b82f6" },
            ].map((item) => (
              <div key={item.problem} className="p-5 md:p-7 flex flex-col gap-3" style={{ background: S.card }}>
                <p style={{ ...S.grotesk, fontSize: ".7rem", lineHeight: 1.5, color: S.muted, textDecoration: "line-through" }}>{item.problem}</p>
                <div style={{ width: "24px", height: "1px", background: item.color, opacity: 0.5 }} />
                <p style={{ ...S.grotesk, fontSize: ".8rem", fontWeight: 600, color: S.text, lineHeight: 1.4 }}>{item.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Prova social — logos ── */}
      <section className="py-12 md:py-16" style={{ overflow: "hidden" }}>
        <p style={{ ...S.mono, fontSize: ".55rem", letterSpacing: ".22em", textTransform: "uppercase", color: S.muted, textAlign: "center", marginBottom: "2.5rem" }}>
          Empresas que confiam na Lokat
        </p>
        <div style={{ overflow: "hidden", maskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)", WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)" }}>
          <div className="lk-logo-track" style={{ display: "inline-flex", alignItems: "center", gap: "1.5rem" }}>
            {[...clients, ...clients, ...clients, ...clients].map((c, i) => (
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

      {/* ── Fontes que a Lokat OS entende ── */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-14 md:py-20">
        <div className="mb-10">
          <h2 style={{ ...S.grotesk, fontSize: "clamp(1.3rem, 3.5vw, 2.2rem)", fontWeight: 700, color: S.text, lineHeight: 1.1 }}>
            Conecta com o que você já usa
          </h2>
          <p style={{ ...S.grotesk, color: S.muted, fontSize: ".85rem", lineHeight: 1.65, marginTop: ".5rem", maxWidth: "480px" }}>
            Sem exportar planilha. Sem copiar dado manualmente. A plataforma puxa os números automaticamente.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { name: "Cardápio Digital", tag: "OlaClick", desc: "Pedidos, faturamento e ticket médio do seu cardápio digital em tempo real.", color: "#10b981", status: "ativo" },
            { name: "Meta · Instagram", tag: "Graph API", desc: "Alcance, impressões, seguidores e engajamento da página ou perfil vinculado.", color: "#7b6ef6", status: "ativo" },
            { name: "WhatsApp", tag: "Em breve", desc: "Aprovação de conteúdo, follow-up e alertas operacionais via WhatsApp.", color: "#25d366", status: "breve" },
            { name: "Google Analytics", tag: "Roadmap", desc: "Tráfego, sessões e conversões do site integrados ao painel de resultados.", color: "#f59e0b", status: "roadmap" },
            { name: "Google Meu Negócio", tag: "Roadmap", desc: "Avaliações, buscas e cliques no mapa para negócios locais.", color: "#ea4335", status: "roadmap" },
            { name: "Dados manuais", tag: "Sempre disponível", desc: "Qualquer dado pode ser inserido manualmente enquanto a integração automática não estiver pronta.", color: "#555566", status: "ativo" },
          ].map((src) => (
            <div key={src.name} className="p-5 flex flex-col gap-2.5" style={{ background: S.card, border: `1px solid ${S.border}` }}>
              <div className="flex items-center justify-between">
                <span style={{ ...S.grotesk, fontSize: ".85rem", fontWeight: 700, color: src.status === "roadmap" ? S.muted : S.text }}>{src.name}</span>
                <span style={{ ...S.mono, fontSize: ".5rem", letterSpacing: ".12em", textTransform: "uppercase", color: src.color, background: `${src.color}18`, border: `1px solid ${src.color}30`, padding: ".1rem .5rem" }}>{src.tag}</span>
              </div>
              <p style={{ ...S.grotesk, fontSize: ".72rem", lineHeight: 1.6, color: S.muted }}>{src.desc}</p>
              {src.status === "ativo" && (
                <div className="flex items-center gap-1.5" style={{ marginTop: "auto" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: src.color }} />
                  <span style={{ ...S.mono, fontSize: ".5rem", letterSpacing: ".1em", textTransform: "uppercase", color: src.color }}>integrado</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pb-14 md:pb-20">
        <div className="mb-10">
          <h2 style={{ ...S.grotesk, fontSize: "clamp(1.3rem, 3.5vw, 2.2rem)", fontWeight: 700, color: S.text, lineHeight: 1.1 }}>
            Como funciona
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: S.border, border: `1px solid ${S.border}` }}>
          {[
            { step: "1", color: "#7b6ef6", title: "Conecte e configure", desc: "Vincule o cardápio digital, Meta/Instagram e configure os clientes. Tudo em menos de 10 minutos." },
            { step: "2", color: "#a855f7", title: "Crie e aprove conteúdo", desc: "Briefings, calendário editorial e aprovação do cliente por link público — sem WhatsApp, sem retrabalho." },
            { step: "3", color: "#10b981", title: "Acompanhe os resultados", desc: "Faturamento, insights de Meta e relatórios por cliente em um painel que se atualiza automaticamente." },
          ].map((item) => (
            <div key={item.step} className="p-6 md:p-8 flex flex-col gap-4" style={{ background: S.card }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: `${item.color}18`, border: `1.5px solid ${item.color}35`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ ...S.mono, fontSize: ".7rem", color: item.color, fontWeight: 700 }}>{item.step}</span>
              </div>
              <div>
                <h3 style={{ ...S.grotesk, fontSize: ".95rem", fontWeight: 700, color: S.text, marginBottom: ".4rem", lineHeight: 1.2 }}>{item.title}</h3>
                <p style={{ ...S.grotesk, fontSize: ".75rem", lineHeight: 1.7, color: S.muted }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Antes e Depois (animado com IntersectionObserver) ── */}
      <BeforeAfterSection />


      {/* ── O que você visualiza no painel ── */}
      <section id="contentos" className="max-w-6xl mx-auto px-4 md:px-8 pb-10 md:pb-20">
        <div className="mb-8">
          <h2 style={{ ...S.grotesk, fontSize: "clamp(1.3rem, 3.5vw, 2.2rem)", fontWeight: 700, color: S.text, lineHeight: 1.1 }}>
            Tudo em um único painel
          </h2>
          <p style={{ ...S.grotesk, color: S.muted, fontSize: ".85rem", lineHeight: 1.65, marginTop: ".5rem", maxWidth: "480px" }}>
            Cada módulo resolve uma parte do negócio. Juntos, formam uma visão completa do cliente.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px" style={{ background: S.border, border: `1px solid ${S.border}` }}>
          {modules.map((m) => (
            <div
              key={m.title}
              className="p-4 md:p-6"
              style={{
                background: m.coming ? "#0d0d14" : S.card,
                position: "relative",
                transition: "background .2s",
                opacity: m.coming ? 0.55 : 1,
              }}
              onMouseEnter={(e) => { if (!m.coming) e.currentTarget.style.background = "#191924"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = m.coming ? "#0d0d14" : S.card; }}
            >
              {m.coming && (
                <div style={{ ...S.mono, fontSize: ".48rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#f59e0b", background: "#f59e0b18", border: "1px solid #f59e0b30", padding: ".1rem .4rem", position: "absolute", top: ".4rem", right: ".4rem" }}>
                  breve
                </div>
              )}
              <div style={{ width: "32px", height: "32px", background: `${m.accent}18`, border: `1px solid ${m.accent}30`, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: ".65rem" }}>
                <m.Icon style={{ width: "14px", height: "14px", color: m.accent }} strokeWidth={1.5} />
              </div>
              <p style={{ ...S.grotesk, fontSize: ".85rem", fontWeight: 700, color: S.text, marginBottom: ".25rem", lineHeight: 1.2 }}>{m.title}</p>
              <p style={{ ...S.grotesk, fontSize: ".7rem", lineHeight: 1.6, color: S.muted }}>{m.desc}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link href="/diagnostico" style={{ background: S.accent, color: "#fff", padding: ".85rem 1.8rem", ...S.mono, fontSize: ".68rem", letterSpacing: ".12em", textTransform: "uppercase", textDecoration: "none", textAlign: "center" }}>
            ■ Ver na prática →
          </Link>
          <Link href="/criar-conta" style={{ background: "transparent", color: S.text, border: `1px solid ${S.border}`, padding: ".85rem 1.8rem", ...S.mono, fontSize: ".68rem", letterSpacing: ".12em", textTransform: "uppercase", textDecoration: "none", textAlign: "center" }}>
            Criar conta grátis
          </Link>
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
              style={{ background: S.accent, color: "#fff", padding: ".85rem 2.5rem", ...S.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-block", fontWeight: 700, transition: "background .2s, box-shadow .2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#8f84f8"; e.currentTarget.style.boxShadow = `0 0 36px ${S.accent}60`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = S.accent; e.currentTarget.style.boxShadow = "none"; }}
            >
              ■ Quero ver na prática →
            </Link>
            <Link
              href="/criar-conta"
              className="w-full sm:w-auto text-center"
              style={{ background: "transparent", color: S.text, border: `1px solid ${S.border}`, padding: ".85rem 2rem", ...S.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-block", transition: "border-color .2s, color .2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#44445a"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.color = S.text; }}
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
