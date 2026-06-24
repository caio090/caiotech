"use client";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { Users, Sparkles, DollarSign, TrendingUp, GraduationCap, Video, FileSearch, CalendarDays, Calendar, FileText, CheckCircle2 } from "lucide-react";
import type { ElementType } from "react";

// ── Modules ──────────────────────────────────────────────────
interface Module { Icon: ElementType; accent: string; tag: string; title: string; desc: string; num: string; }
const modules: Module[] = [
  { Icon: Users,         accent: "#7b6ef6", tag: "■ CRM",        num: "01", title: "Clientos",  desc: "CRM de clientes ativos com health status e linha do tempo completa." },
  { Icon: Sparkles,      accent: "#a855f7", tag: "■ Conteúdo",   num: "02", title: "ContentOS", desc: "Criação, aprovação e publicação de conteúdo com IA integrada." },
  { Icon: Video,         accent: "#e0635a", tag: "■ Audiovisual", num: "03", title: "RecOS",     desc: "Pré-produção audiovisual: roteiro, storyboard, shot list e gravação." },
  { Icon: DollarSign,    accent: "#10b981", tag: "■ Finanças",    num: "04", title: "FinanceOS", desc: "Receitas, cobranças e fluxo de caixa centralizado em tempo real." },
  { Icon: TrendingUp,    accent: "#3b82f6", tag: "■ Vendas",      num: "05", title: "GrowthOS",  desc: "Pipeline de vendas, leads, propostas e follow-ups automatizados." },
  { Icon: GraduationCap, accent: "#f59e0b", tag: "■ Academy",     num: "06", title: "Academy",   desc: "Treinamento e onboarding da equipe em um único lugar integrado." },
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
  "■ Sistema operacional para agências",
  "✦ ContentOS · RecOS · GrowthOS · FinanceOS",
  "■ Cases reais. Resultados mensuráveis.",
  "✦ Automação com inteligência estratégica",
  "■ Sistema operacional para agências",
  "✦ ContentOS · RecOS · GrowthOS · FinanceOS",
  "■ Cases reais. Resultados mensuráveis.",
  "✦ Automação com inteligência estratégica",
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
        style={{ minHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 2rem", position: "relative", overflow: "hidden", textAlign: "center" }}
      >
        {/* Background glow */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 50% 60%, rgba(59,47,160,.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Corner dots */}
        {(["tl","tr","bl","br"] as const).map((pos) => (
          <div key={pos} style={{ position: "absolute", ...S.mono, fontSize: ".5rem", color: S.border, letterSpacing: ".3em", userSelect: "none", pointerEvents: "none", ...(pos==="tl"?{top:"2rem",left:"2rem"}:pos==="tr"?{top:"2rem",right:"2rem"}:pos==="bl"?{bottom:"2rem",left:"2rem"}:{bottom:"2rem",right:"2rem"}) }}>
            · · ·<br/>· · ·
          </div>
        ))}

        <div className="hero-fade-up" style={{ fontSize: ".65rem", letterSpacing: ".2em", textTransform: "uppercase", color: S.muted, border: `1px solid ${S.border}`, padding: ".25rem .8rem", marginBottom: "2rem", display: "inline-block", ...S.mono }}>
          [Sistema Operacional para Agências]
        </div>

        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 w-full">
          {/* Text */}
          <div className="flex-1 text-left">
            <h1
              className="hero-fade-up-d1"
              style={{ ...S.grotesk, fontSize: "clamp(2.8rem, 8vw, 6.5rem)", fontWeight: 700, lineHeight: 1, letterSpacing: "-.03em", color: S.text, marginBottom: "1.5rem" }}
            >
              Atendimento,<br />
              <em style={{ fontStyle: "italic", color: S.accent }}>organizado</em><br />
              e escalável.
            </h1>

            <p className="hero-fade-up-d2" style={{ ...S.grotesk, maxWidth: "480px", fontSize: "1rem", lineHeight: 1.7, color: S.muted, marginBottom: "2.5rem" }}>
              LOKAT OS é o sistema central da sua agência. Clientes, conteúdo, audiovisual, financeiro e vendas — integrados em um único OS.
            </p>

            <div className="hero-fade-up-d3 flex flex-wrap gap-3">
              <Link
                href="/diagnostico"
                style={{ background: S.accent, color: "#fff", padding: ".75rem 2rem", ...S.mono, fontSize: ".72rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-block" }}
              >
                ■ Fazer diagnóstico →
              </Link>
              <Link
                href="/plataforma"
                style={{ background: "transparent", color: S.text, border: `1px solid ${S.border}`, padding: ".75rem 2rem", ...S.mono, fontSize: ".72rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-block" }}
              >
                Ver como funciona
              </Link>
            </div>

            <div className="hero-fade-up-d3 flex flex-wrap items-center gap-3 mt-8 pt-6" style={{ borderTop: `1px solid ${S.border}` }}>
              <span style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".15em", textTransform: "uppercase", color: S.muted }}>Um ecossistema</span>
              <span style={{ ...S.mono, fontWeight: 700, fontSize: ".8rem", color: S.text }}>
                Lokat<span style={{ color: S.accent }}>.</span><span style={{ color: S.muted, fontWeight: 400 }}>REC</span>
              </span>
            </div>
          </div>

          {/* Robot */}
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
                {/* outer glow layer */}
                <path d="M100 18 C148 78 178 122 178 165 C178 218 143 250 100 250 C57 250 22 218 22 165 C22 122 52 78 100 18Z" fill="#7b6ef6" opacity="0.18" />
                {/* main drop fill */}
                <path d="M100 22 C146 80 174 123 174 164 C174 215 141 247 100 247 C59 247 26 215 26 164 C26 123 54 80 100 22Z" fill="url(#dg)" />
                {/* border stroke */}
                <path d="M100 22 C146 80 174 123 174 164 C174 215 141 247 100 247 C59 247 26 215 26 164 C26 123 54 80 100 22Z" fill="none" stroke="url(#dborder)" strokeWidth="1.5" />
                {/* specular highlight */}
                <path d="M70 58 C78 46 92 38 104 37 C92 78 74 112 63 143 C50 114 56 76 70 58Z" fill="url(#dshine)" />
                {/* tiny inner reflection dot */}
                <ellipse cx="80" cy="82" rx="6" ry="9" fill="rgba(255,255,255,0.18)" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ── Info strip ── */}
      <div style={{ borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}` }}>
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6">
          <span style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".18em", textTransform: "uppercase", color: S.muted }}>IA · Automação · Dados · Conteúdo · Audiovisual</span>
        </div>
      </div>

      {/* ── Módulos ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-8 pb-4" style={{ borderBottom: `1px solid ${S.border}` }}>
          <div>
            <p style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".18em", textTransform: "uppercase", color: S.accent, marginBottom: ".4rem" }}>[Módulos]</p>
            <h2 style={{ ...S.grotesk, fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 700, color: S.text, lineHeight: 1.1 }}>6 módulos. Um único OS.</h2>
          </div>
          <Link href="/plataforma" style={{ ...S.mono, fontSize: ".65rem", letterSpacing: ".12em", textTransform: "uppercase", color: S.muted, border: `1px solid ${S.border}`, padding: ".4rem 1rem", textDecoration: "none", whiteSpace: "nowrap" }}>
            ■ Ver tudo →
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1px", background: S.border, border: `1px solid ${S.border}` }}>
          {modules.map((m) => (
            <div
              key={m.title}
              style={{ background: S.card, padding: "1.5rem", position: "relative", transition: "background .2s", cursor: "default" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#191924")}
              onMouseLeave={(e) => (e.currentTarget.style.background = S.card)}
            >
              <div style={{ ...S.mono, fontSize: ".55rem", color: S.border, position: "absolute", top: ".5rem", left: ".5rem" }}>{m.num}</div>
              <div style={{ width: "40px", height: "40px", background: `${m.accent}18`, border: `1px solid ${m.accent}30`, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                <m.Icon style={{ width: "18px", height: "18px", color: m.accent }} />
              </div>
              <span style={{ ...S.mono, fontSize: ".55rem", letterSpacing: ".15em", textTransform: "uppercase", color: m.accent, background: `${m.accent}15`, border: `1px solid ${m.accent}25`, padding: ".15rem .5rem", display: "inline-block", marginBottom: ".5rem" }}>{m.tag}</span>
              <div style={{ ...S.grotesk, fontSize: ".95rem", fontWeight: 600, color: S.text, marginBottom: ".5rem" }}>{m.title}</div>
              <p style={{ ...S.grotesk, fontSize: ".75rem", lineHeight: 1.6, color: S.muted }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cases / Clientes ── */}
      <section style={{ padding: "5rem 2rem 4rem", overflow: "hidden" }}>
        <p style={{ ...S.mono, fontSize: ".55rem", letterSpacing: ".22em", textTransform: "uppercase", color: S.muted, textAlign: "center", marginBottom: "3rem" }}>
          Empresas que confiam na Lokat
        </p>

        <div style={{ overflow: "hidden", maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)", WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)" }}>
          <div className="lk-logo-track" style={{ display: "inline-flex", alignItems: "center", gap: "2.5rem" }}>
            {[...clients, ...clients, ...clients].map((c, i) => (
              <div
                key={i}
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "50%",
                  padding: "0",
                  minWidth: "88px",
                  width: "88px",
                  height: "88px",
                  filter: "grayscale(100%)",
                  opacity: 0.5,
                  transition: "opacity .3s ease, filter .3s ease, transform .3s ease",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.filter = "none";
                  e.currentTarget.style.transform = "scale(1.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.5";
                  e.currentTarget.style.filter = "grayscale(100%)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/clients/${c.file}`}
                  alt={c.name}
                  style={{ height: "52px", width: "52px", objectFit: "contain", borderRadius: "4px" }}
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.style.display = "none";
                    const next = el.nextElementSibling as HTMLElement;
                    if (next) next.style.display = "block";
                  }}
                />
                <span style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".1em", textTransform: "uppercase", color: S.muted, display: "none" }}>
                  {c.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ContentOS feature ── */}
      <section id="contentos" className="max-w-6xl mx-auto px-6 py-20">
        <div style={{ border: `1px solid ${S.border}`, background: S.card }}>
          <div className="p-8 md:p-12" style={{ borderBottom: `1px solid ${S.border}` }}>
            <span style={{ ...S.mono, fontSize: ".55rem", letterSpacing: ".15em", textTransform: "uppercase", color: S.accent, background: `${S.accent}15`, border: `1px solid ${S.accent}25`, padding: ".15rem .5rem", display: "inline-block", marginBottom: "1rem" }}>■ Módulo ContentOS</span>
            <h2 style={{ ...S.grotesk, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, color: S.text, lineHeight: 1.1, marginBottom: ".75rem" }}>
              Content OS
            </h2>
            <p style={{ ...S.grotesk, color: S.muted, fontSize: "1rem", maxWidth: "520px", lineHeight: 1.7 }}>
              ContentOS é o módulo de criação de conteúdo da LOKAT OS — do diagnóstico de marca até a análise de resultados, tudo em um fluxo único e colaborativo.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1px", background: S.border }}>
            {([
              { Icon: FileSearch,   title: "Diagnóstico da marca",  desc: "Posicionamento, voz e público antes de criar qualquer conteúdo." },
              { Icon: CalendarDays, title: "Estratégia mensal",      desc: "Objetivos, formatos e canais para o mês inteiro de forma estruturada." },
              { Icon: Calendar,     title: "Calendário editorial",   desc: "Todas as publicações com datas, status e responsáveis." },
              { Icon: FileText,     title: "Roteiros e briefings",   desc: "Roteiros completos com legenda, CTA e referências visuais." },
              { Icon: CheckCircle2, title: "Aprovação pelo cliente", desc: "Link de aprovação público — sem login do cliente." },
              { Icon: Video,        title: "Produção operacional",   desc: "Fluxo: rascunho → revisão → aprovado → agendado → publicado." },
            ] as { Icon: ElementType; title: string; desc: string }[]).map((f) => (
              <div key={f.title} style={{ background: S.card, padding: "1.5rem" }}>
                <div style={{ width: "36px", height: "36px", background: `${S.accent}18`, border: `1px solid ${S.accent}30`, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: ".75rem" }}>
                  <f.Icon style={{ width: "16px", height: "16px", color: S.accent }} />
                </div>
                <p style={{ ...S.grotesk, fontSize: ".85rem", fontWeight: 600, color: S.text, marginBottom: ".3rem" }}>{f.title}</p>
                <p style={{ ...S.grotesk, fontSize: ".75rem", lineHeight: 1.6, color: S.muted }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-8 flex flex-wrap gap-3">
            <Link href="/login" style={{ background: S.accent, color: "#fff", padding: ".75rem 1.5rem", ...S.mono, fontSize: ".7rem", letterSpacing: ".12em", textTransform: "uppercase", textDecoration: "none" }}>
              ■ Entrar no sistema →
            </Link>
            <Link href="/plataforma" style={{ background: "transparent", color: S.text, border: `1px solid ${S.border}`, padding: ".75rem 1.5rem", ...S.mono, fontSize: ".7rem", letterSpacing: ".12em", textTransform: "uppercase", textDecoration: "none" }}>
              Ver a plataforma
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: S.accent, padding: "5rem 2rem", textAlign: "center" }}>
        <p style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(255,255,255,.6)", marginBottom: "1rem" }}>[Pronto para começar?]</p>
        <h2 style={{ ...S.grotesk, fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 700, color: "#fff", lineHeight: 1.1, marginBottom: "1rem" }}>
          Acesse agora e explore o sistema.
        </h2>
        <p style={{ ...S.grotesk, color: "rgba(255,255,255,.7)", fontSize: "1rem", marginBottom: "2.5rem", maxWidth: "480px", margin: "0 auto 2.5rem" }}>
          Perfis de demonstração disponíveis. Sem cartão de crédito.
        </p>
        <Link
          href="/login"
          style={{ background: "#fff", color: S.accent, padding: ".85rem 2.5rem", ...S.mono, fontSize: ".72rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-block", fontWeight: 700 }}
        >
          ■ Entrar na demonstração →
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${S.border}`, padding: "3rem 2rem 2rem" }}>
        <div className="max-w-6xl mx-auto flex justify-between items-center flex-wrap gap-4">
          <span style={{ ...S.mono, fontSize: ".65rem", letterSpacing: ".08em", textTransform: "uppercase", color: S.muted }}>
            © 2026 LOKAT OS — O sistema operacional do seu negócio
          </span>
          <div className="flex gap-6">
            {["Privacidade", "Termos", "Contato"].map((l) => (
              <a key={l} href="#" style={{ ...S.mono, fontSize: ".65rem", letterSpacing: ".08em", textTransform: "uppercase", color: S.muted, textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = S.text)}
                onMouseLeave={(e) => (e.currentTarget.style.color = S.muted)}
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
