"use client";
import { useState } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { Zap } from "lucide-react";
import { MIN_PUBLIC_PRICE } from "@/lib/billing/plans";
import { LAUNCH_MODE } from "@/lib/launch/config";
import { LeadConversationModal } from "@/components/lead-conversation-modal";

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

// ── Ticker items ───────────────────────────────────────────────
const _tickerBase = [
  "■ DIAGNÓSTICO",
  "✦ CONTEÚDO",
  "■ APROVAÇÃO",
  "✦ RELATÓRIO",
  "■ FATURAMENTO",
  "✦ REC OS",
  "■ TRÁFEGO",
  "✦ WHATSAPP",
];
const tickerItems = [..._tickerBase, ..._tickerBase, ..._tickerBase, ..._tickerBase];

// ── FAQ data ───────────────────────────────────────────────────
const FAQ = [
  { q: "O que é o acesso beta?", a: "É o período de uso antecipado da plataforma, por convite. Você entra antes do lançamento oficial, sem cobrança automática, e ajuda a moldar o produto com feedback real." },
  { q: "Preciso pagar para entrar na lista?", a: "Não. Entrar na lista beta é gratuito. Só há cobrança se você optar por assinar após o período de testes, com seu consentimento explícito." },
  { q: "O que é o REC OS dentro da Lokat OS?", a: "REC OS é a área de produção audiovisual: briefing, roteiro, calendário, aprovação por link e relatório de performance — tudo em um único fluxo. É diferente do Lokat.rec, que é uma plataforma separada." },
  { q: "A Lokat OS serve para pequenos negócios?", a: "Sim. Foi construída pensando em negócios locais, agências pequenas e autônomos que precisam de organização sem complexidade. Sem planilhas avulsas, sem WhatsApp bagunçado." },
  { q: "Como funciona a integração com o Cardápio Digital?", a: "A Lokat OS conecta diretamente com o OlaClick (Cardápio Digital) via API. Pedidos, faturamento e métricas chegam automaticamente ao painel — sem exportar planilha à mão." },
];

export default function HomePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [openFaq, setOpenFaq]     = useState<number | null>(null);

  const betaHref = LAUNCH_MODE.publicSignupMode === "waitlist" ? "/pre-acesso" : "/criar-conta";
  const betaLabel = LAUNCH_MODE.publicSignupMode === "waitlist" ? "Entrar na lista beta" : "Criar conta grátis";

  return (
    <div style={{ background: S.bg, color: S.text, minHeight: "100vh" }}>
      <PublicHeader />

      {/* ── Ticker ───────────────────────────────────────────── */}
      <div style={{ background: S.accent, overflow: "hidden", padding: ".3rem 0" }}>
        <div className="lk-ticker-track" style={{ display: "inline-flex" }}>
          {tickerItems.map((item, i) => (
            <span key={i} style={{ ...S.mono, fontSize: ".62rem", letterSpacing: ".2em", textTransform: "uppercase", color: "#fff", margin: "0 2.5rem", whiteSpace: "nowrap" }}>
              {item}
            </span>
          ))}
        </div>
      </div>

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
          Para agências, empresas e negócios locais
        </div>

        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 w-full">
          {/* Text column */}
          <div className="flex-1 text-center lg:text-left">
            <h1
              className="hero-fade-up-d1"
              style={{ ...S.grotesk, fontSize: "clamp(2rem, 8vw, 6.2rem)", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-.03em", color: S.text, marginBottom: "1.2rem", textWrap: "balance" } as React.CSSProperties}
            >
              Marketing que<br />
              <em style={{ fontStyle: "italic", color: S.accent }}>funciona</em><br />
              e gera resultado.
            </h1>

            <p className="hero-fade-up-d2 mx-auto lg:mx-0" style={{ ...S.grotesk, maxWidth: "500px", fontSize: "clamp(.85rem, 2.5vw, 1rem)", lineHeight: 1.7, color: S.muted, marginBottom: "2rem" }}>
              Planeje conteúdo, aprovações, leads e finanças em um único lugar — sem planilha perdida, sem WhatsApp bagunçado, com IA do início ao fim.
            </p>

            {/* 3 CTAs principais + modal */}
            <div className="hero-fade-up-d3 flex flex-col sm:flex-row flex-wrap gap-3">
              <Link
                href={betaHref}
                className="w-full sm:w-auto text-center"
                style={{ background: S.accent, color: "#fff", padding: ".85rem 2rem", ...S.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-block", fontWeight: 700, transition: "background .2s, box-shadow .2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#8f84f8"; e.currentTarget.style.boxShadow = `0 0 28px ${S.accent}55`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = S.accent; e.currentTarget.style.boxShadow = "none"; }}
              >
                ■ {betaLabel}
              </Link>
              <Link
                href="/diagnostico"
                className="w-full sm:w-auto text-center"
                style={{ background: "transparent", color: S.text, border: `1px solid ${S.border}`, padding: ".85rem 2rem", ...S.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-block", transition: "border-color .2s, color .2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#44445a"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.color = S.text; }}
              >
                Diagnóstico gratuito
              </Link>
              <a
                href="https://wa.me/5589994584163?text=Ol%C3%A1%2C+vim+pelo+site+da+Lokat+e+tenho+interesse+em+um+projeto+para+minha+empresa."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto text-center"
                style={{ background: "transparent", color: "#25d366", border: "1px solid #25d36640", padding: ".85rem 2rem", ...S.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-block", transition: "border-color .2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#25d36680"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#25d36640"; }}
              >
                Falar com a Lokat
              </a>
            </div>

            {/* Secondary action */}
            <div className="hero-fade-up-d3 mt-4">
              <button
                onClick={() => setModalOpen(true)}
                style={{ background: "none", border: "none", cursor: "pointer", ...S.mono, fontSize: ".65rem", letterSpacing: ".12em", textTransform: "uppercase", color: S.muted, textDecoration: "underline", textUnderlineOffset: "3px" }}
              >
                Ou agendar demonstração →
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
            <div className="absolute inset-0 glow-pulse pointer-events-none" style={{ background: "radial-gradient(circle at 50% 45%, rgba(123,110,246,0.2) 0%, rgba(139,92,246,0.07) 45%, transparent 70%)" }} />
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

      {/* ── Transição hero → branco ────────────────────────────── */}
      <div style={{ background: `linear-gradient(to bottom, ${S.bg} 0%, #ffffff 100%)`, position: "relative", overflow: "hidden" }}>
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="lk-drop-float"
            style={{ width: "48px", height: "63px", filter: "drop-shadow(0 0 12px rgba(192,57,43,0.45))" }}>
            <defs>
              <linearGradient id="rec-drop-g" x1="0.3" y1="0" x2="0.7" y2="1">
                <stop offset="0%" stopColor="#e07060" />
                <stop offset="55%" stopColor="#c0392b" />
                <stop offset="100%" stopColor="#7a1a10" />
              </linearGradient>
            </defs>
            <path d="M100 22 C146 80 174 123 174 164 C174 215 141 247 100 247 C59 247 26 215 26 164 C26 123 54 80 100 22Z" fill="url(#rec-drop-g)" />
            <path d="M70 58 C78 46 92 38 104 37 C92 78 74 112 63 143 C50 114 56 76 70 58Z" fill="rgba(255,255,255,0.15)" />
          </svg>
          <a href="/rec" style={{ ...S.mono, fontSize: ".62rem", letterSpacing: ".16em", textTransform: "uppercase", color: S.red, textDecoration: "none", opacity: 0.8 }}>LOKAT.REC →</a>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          SEÇÕES CLARAS
          ════════════════════════════════════════════════════════ */}
      <div style={{ background: "#fff", color: "#111" }}>

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

        {/* ── Beta ── */}
        <section className="py-12 md:py-16" style={{ background: "#f4f3ff" }}>
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
                {["Privacidade", "Termos", "Contato"].map((l) => (
                  <a key={l} href="#" style={{ display: "block", ...S.grotesk, fontSize: ".73rem", color: S.muted, textDecoration: "none", marginBottom: ".35rem" }}
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

      <LeadConversationModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
