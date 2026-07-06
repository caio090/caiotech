"use client";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { Zap } from "lucide-react";
import { MIN_PUBLIC_PRICE } from "@/lib/billing/plans";
import { LAUNCH_MODE } from "@/lib/launch/config";

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
                href="#plataforma"
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
              <span style={{ ...S.mono, fontSize: ".55rem", letterSpacing: ".08em", color: S.muted }}>·</span>
              <a href="/rec" style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".1em", textTransform: "uppercase", color: "#c0392b", textDecoration: "none", border: "1px solid #c0392b30", padding: ".15rem .5rem" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c0392b60")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#c0392b30")}
              >Lokat.rec</a>
              <span style={{ ...S.grotesk, fontSize: ".62rem", color: S.muted, fontStyle: "italic" }}>um ecossistema Lokat</span>
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

      {/* ── Transição hero → branco: gradiente + gota vermelha ── */}
      <div style={{ background: `linear-gradient(to bottom, ${S.bg} 0%, #ffffff 100%)`, padding: "0 0 0 0", position: "relative", overflow: "hidden" }}>
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          {/* Gota virada vermelha — ponte visual para Lokat.rec */}
          <svg
            viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg"
            className="lk-drop-float"
            style={{ width: "52px", height: "68px", filter: "drop-shadow(0 0 14px rgba(192,57,43,0.45))", "@media (prefers-reduced-motion: reduce)": { animation: "none" } } as React.CSSProperties}
          >
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
          <a href="/rec" style={{ ...S.mono, fontSize: ".65rem", letterSpacing: ".16em", textTransform: "uppercase", color: "#c0392b", textDecoration: "none", opacity: 0.8 }}>
            LOKAT.REC →
          </a>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          SEÇÕES CLARAS — abaixo do hero o design vira clean/branco
          ════════════════════════════════════════════════════════ */}
      <div style={{ background: "#fff", color: "#111" }}>

        {/* ── O que a Lokat OS organiza ── */}
        <section id="plataforma" className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-black text-gray-900 leading-tight mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              O que a Lokat OS organiza para você
            </h2>
            <p className="text-gray-500 text-sm md:text-base max-w-xl mx-auto leading-relaxed" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Cada parte do negócio num lugar só — sem planilha avulsa, sem WhatsApp perdido.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { color: "#7b6ef6", title: "Dados do negócio",      desc: "Faturamento, pedidos e métricas das suas fontes — atualizados automaticamente." },
              { color: "#10b981", title: "Conteúdo e aprovações", desc: "Calendário, briefings e aprovação por link. Sem vai e vem no WhatsApp." },
              { color: "#3b82f6", title: "Relatórios e decisões", desc: "Resultados de campanha, alcance Meta e ticket médio num único painel." },
              { color: "#a855f7", title: "Clientes e operação",   desc: "Gerencie clientes, equipe, tarefas e contratos no mesmo sistema." },
            ].map((c) => (
              <div key={c.title} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-xl mb-3 flex items-center justify-center" style={{ background: `${c.color}15` }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{c.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Jornada: Conecta → Analisa → Produz → Aprova → Mede ── */}
        <section className="py-12 md:py-20" style={{ background: "#f9f8ff" }}>
          <div className="max-w-5xl mx-auto px-4 md:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Do conteúdo ao faturamento, tudo no mesmo fluxo
              </h2>
              <p className="text-gray-500 text-sm max-w-md mx-auto" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Cada etapa conectada à próxima — sem exportar, sem copiar, sem retrabalho.
              </p>
            </div>
            <div className="flex flex-col md:flex-row items-stretch gap-0 overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
              {[
                { num: "1", label: "Conecta",  desc: "Cardápio, Meta, planilhas", color: "#7b6ef6" },
                { num: "2", label: "Analisa",  desc: "Dados e métricas reais",    color: "#a855f7" },
                { num: "3", label: "Produz",   desc: "Conteúdo com briefing IA",  color: "#6366f1" },
                { num: "4", label: "Aprova",   desc: "Cliente aprova por link",   color: "#8b5cf6" },
                { num: "5", label: "Mede",     desc: "Resultado e relatório",     color: "#10b981" },
              ].map((step, i, arr) => (
                <div
                  key={step.label}
                  className="flex-1 flex flex-col items-center justify-center text-center p-5 md:p-6 relative"
                  style={{ background: i % 2 === 0 ? "#fff" : "#fafafe", borderRight: i < arr.length - 1 ? "1px solid #ebebf7" : "none" }}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center mb-2.5 text-white text-xs font-black" style={{ background: step.color, fontFamily: "'Space Mono', monospace" }}>
                    {step.num}
                  </div>
                  <p className="font-black text-gray-900 text-sm mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{step.label}</p>
                  <p className="text-gray-400 text-xs" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Fontes que a Lokat OS entende ── */}
        <section className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Conecta com o que você já usa
            </h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Sem exportar planilha. Sem copiar dado à mão. Os números chegam automaticamente.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: "Cardápio Digital", sub: "Pedidos e faturamento",     color: "#10b981", status: "ativo"    },
              { name: "Meta / Instagram", sub: "Alcance e engajamento",     color: "#7b6ef6", status: "ativo"    },
              { name: "WhatsApp",         sub: "Aprovações e alertas",      color: "#25d366", status: "breve"    },
              { name: "Arquivos e planilhas", sub: "Entrada manual",        color: "#6b7280", status: "ativo"    },
              { name: "CRM",              sub: "Leads e oportunidades",     color: "#f59e0b", status: "breve"    },
              { name: "PDV / Caixa",      sub: "Vendas presenciais",        color: "#3b82f6", status: "roadmap"  },
            ].map((src) => (
              <div key={src.name} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${src.color}15` }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: src.color }} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-gray-900 leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{src.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{src.sub}</p>
                  <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ fontFamily: "'Space Mono', monospace", color: src.color, background: `${src.color}12` }}>
                    {src.status === "ativo" ? "Já conecta" : src.status === "breve" ? "Em validação" : "A caminho"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── REC OS ── */}
        <section id="rec-os" className="py-14 md:py-20" style={{ background: "#0e0e14" }}>
          <div className="max-w-5xl mx-auto px-4 md:px-8">
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-5">
                  <div style={{ width: 36, height: 36, background: "#c0392b15", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg viewBox="0 0 200 260" fill="none" style={{ width: 18, height: 23 }}>
                      <path d="M100 22 C146 80 174 123 174 164 C174 215 141 247 100 247 C59 247 26 215 26 164 C26 123 54 80 100 22Z" fill="#c0392b" />
                    </svg>
                  </div>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: ".7rem", letterSpacing: ".2em", textTransform: "uppercase", color: "#c0392b" }}>REC OS</span>
                </div>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.5rem, 4vw, 2.8rem)", fontWeight: 700, color: "#f0f0f0", lineHeight: 1.1, marginBottom: "1rem" }}>
                  Briefing, roteiro, vídeo e aprovação no mesmo lugar.
                </h2>
                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".95rem", lineHeight: 1.7, color: "#888899", maxWidth: "480px", marginBottom: "1.5rem" }}>
                  A área onde produção audiovisual e criação de conteúdo param de existir em planilhas separadas. Cada campanha tem briefing, roteiro, calendário, aprovação por link e relatório de performance — conectados em um único fluxo.
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {["Briefing", "Roteiro", "Calendário", "Aprovação por link", "Performance"].map((t) => (
                    <span key={t} style={{ fontFamily: "'Space Mono', monospace", fontSize: ".6rem", letterSpacing: ".1em", textTransform: "uppercase", color: "#c0392b", border: "1px solid #c0392b30", padding: ".2rem .6rem" }}>{t}</span>
                  ))}
                </div>
                <a href="/rec" style={{ fontFamily: "'Space Mono', monospace", fontSize: ".68rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#c0392b", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: ".4rem", border: "1px solid #c0392b40", padding: ".45rem 1rem" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c0392b90")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#c0392b40")}
                >
                  Explorar Lokat.rec →
                </a>
              </div>
              <div className="flex-shrink-0 grid grid-cols-2 gap-3 w-full md:w-64">
                {[
                  { label: "Briefing",         desc: "Organiza o pedido antes de começar" },
                  { label: "Roteiro",          desc: "Do roteiro ao produto final" },
                  { label: "Aprovação",        desc: "Cliente aprova por link, sem login" },
                  { label: "Calendário",       desc: "Agenda o que vai ao ar e quando" },
                ].map((f) => (
                  <div key={f.label} style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: 12, padding: "1rem" }}>
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".75rem", fontWeight: 700, color: "#e0e0e8", marginBottom: ".3rem" }}>{f.label}</p>
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".65rem", color: "#55556a", lineHeight: 1.4 }}>{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Beta pricing ── */}
        <section className="py-12 md:py-16" style={{ background: "#f9f8ff" }}>
          <div className="max-w-2xl mx-auto px-4 md:px-8 text-center">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full mb-5">
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-bold text-indigo-700" style={{ fontFamily: "'Space Mono', monospace" }}>Beta aberto por convite</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              A partir de R$ {MIN_PUBLIC_PRICE}/mês
            </h2>
            <p className="text-gray-400 text-xs mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              14 dias grátis · sem cartão · cancele quando quiser
            </p>
            <Link
              href={LAUNCH_MODE.publicSignupMode === "waitlist" ? "/pre-acesso" : "/criar-conta"}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-bold px-8 py-3 rounded-xl hover:bg-indigo-700 active:scale-[.98] transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {LAUNCH_MODE.publicSignupMode === "waitlist" ? "Reservar acesso beta" : "Começar grátis"}
            </Link>
            <p className="mt-4 text-xs text-gray-400">
              Ou{" "}
              <Link href="/planos" className="text-indigo-600 hover:underline">ver planos e preços</Link>
            </p>
          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="max-w-4xl mx-auto px-4 md:px-8 py-16 md:py-24 text-center">
          <h2 className="text-2xl md:text-4xl font-black text-gray-900 mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Diagnóstico gratuito.<br className="hidden md:block" /> Resultado em minutos.
          </h2>
          <p className="text-gray-500 text-sm md:text-base max-w-lg mx-auto mb-8 leading-relaxed" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Entenda o potencial da sua presença digital. Comece a organizar sem planilha, sem WhatsApp perdido e sem retrabalho.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/diagnostico"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-700 transition-colors"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Quero ver na prática →
            </Link>
            <Link
              href={LAUNCH_MODE.publicSignupMode === "waitlist" ? "/pre-acesso" : "/criar-conta"}
              className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 text-sm font-bold px-6 py-3.5 rounded-xl border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {LAUNCH_MODE.publicSignupMode === "waitlist" ? "Entrar na lista beta" : "Criar conta grátis"}
            </Link>
            <a
              href="https://wa.me/5589994584163?text=Ol%C3%A1%2C+vim+pelo+site+da+Lokat+e+tenho+interesse+em+um+projeto+para+minha+empresa."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-green-700 text-sm font-bold px-6 py-3.5 rounded-xl border border-green-200 hover:border-green-400 hover:bg-green-50 active:scale-[.98] transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
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
