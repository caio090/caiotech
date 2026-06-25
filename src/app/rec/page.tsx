"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Play, ExternalLink, Mail, AtSign, Video, ChevronLeft, ChevronRight } from "lucide-react";

// ── Design tokens LOKAT.REC ───────────────────────────────────────────────────
const R = {
  bg:      "#0a0806",
  warm:    "#14100a",
  border:  "#2a2018",
  text:    "#ede8e3",
  muted:   "#7a6f62",
  red:     "#c0392b",
  mono:    { fontFamily: "'Space Mono', monospace" } as React.CSSProperties,
  grotesk: { fontFamily: "'Space Grotesk', sans-serif" } as React.CSSProperties,
};

// ──────────────────────────────────────────────────────────────────────────────
// ASSET: coloque a foto do cais em public/rec/cais-floriano.jpg
// A página usa esse caminho como camada visual com overlay cinematográfico.
// Enquanto o arquivo não existir, os gradientes funcionam como fallback.
// ──────────────────────────────────────────────────────────────────────────────
const CAIS = "/rec/cais-floriano.jpg";

// ── Overlay cinematográfico sobre a foto do cais ──────────────────────────────
// Usamos múltiplas camadas: gradiente escuro → overlay colorido → foto
function caisOverlay(
  direction: "hero" | "qs" | "contato" = "hero",
  position = "center 55%"
): React.CSSProperties {
  const overlays: Record<typeof direction, string> = {
    hero:
      // Escurece bastante mas deixa textura da foto aparecer
      `linear-gradient(180deg,
        rgba(4,4,3,0.82) 0%,
        rgba(8,6,4,0.70) 35%,
        rgba(10,8,6,0.80) 70%,
        rgba(10,8,6,0.97) 100%
      ), linear-gradient(to right, rgba(192,57,43,0.06) 0%, transparent 60%)`,
    qs:
      // Painel esquerdo — quase opaco, como parede de concreto na sombra
      `linear-gradient(170deg,
        rgba(6,5,3,0.90) 0%,
        rgba(18,12,6,0.86) 55%,
        rgba(12,8,4,0.92) 100%
      )`,
    contato:
      // Mais quente, luz vinda de baixo como reflexo no rio
      `linear-gradient(180deg,
        rgba(10,8,6,0.96) 0%,
        rgba(14,10,6,0.88) 50%,
        rgba(10,8,6,0.96) 100%
      ), radial-gradient(ellipse 100% 60% at 40% 100%, rgba(80,35,10,0.18) 0%, transparent 70%)`,
  };
  return {
    backgroundImage: `${overlays[direction]}, url('${CAIS}')`,
    backgroundSize: `auto, cover`,
    backgroundPosition: `center, ${position}`,
    backgroundRepeat: "no-repeat",
  };
}

// ── Portfolio projects ────────────────────────────────────────────────────────
const PROJECTS = [
  {
    id: 1,
    title: "Nova Fase",
    category: "Documentário",
    year: "2024",
    type: "DOC",
    frame: "01",
    // Overlay sobre o cais — variações de crop e tint por card
    overlay: "linear-gradient(155deg, rgba(8,4,2,0.88) 0%, rgba(30,12,8,0.80) 55%, rgba(10,6,4,0.92) 100%)",
    position: "center 40%",
  },
  {
    id: 2,
    title: "Território",
    category: "Branded Content",
    year: "2024",
    type: "BC",
    frame: "02",
    overlay: "linear-gradient(155deg, rgba(6,6,4,0.90) 0%, rgba(20,16,6,0.82) 55%, rgba(8,8,4,0.92) 100%)",
    position: "30% 60%",
  },
  {
    id: 3,
    title: "Raiz",
    category: "Vídeo Manifesto",
    year: "2023",
    type: "VM",
    frame: "03",
    overlay: "linear-gradient(155deg, rgba(4,6,4,0.92) 0%, rgba(10,18,10,0.84) 55%, rgba(4,8,4,0.92) 100%)",
    position: "70% 50%",
  },
  {
    id: 4,
    title: "Impulso",
    category: "Campanha",
    year: "2023",
    type: "CP",
    frame: "04",
    overlay: "linear-gradient(155deg, rgba(8,6,2,0.90) 0%, rgba(28,18,4,0.82) 55%, rgba(10,8,2,0.92) 100%)",
    position: "50% 70%",
  },
  {
    id: 5,
    title: "Conexão",
    category: "Institucional",
    year: "2024",
    type: "IN",
    frame: "05",
    overlay: "linear-gradient(155deg, rgba(4,4,8,0.92) 0%, rgba(12,10,20,0.84) 55%, rgba(4,4,10,0.92) 100%)",
    position: "center 30%",
  },
];

// ── Drop SVG — starts purple, morphs to red via CSS ──────────────────────────
function RecDrop({ size = 130, phase = "purple" }: { size?: number; phase?: "purple" | "red" }) {
  const isRed = phase === "red";
  const c1 = isRed ? "#ff9a9a" : "#c4baff";
  const c2 = isRed ? "#c0392b" : "#7b6ef6";
  const c3 = isRed ? "#7a1a10" : "#3a2a9a";
  const glow = isRed
    ? "drop-shadow(0 0 36px rgba(192,57,43,0.8)) drop-shadow(0 0 90px rgba(192,57,43,0.35))"
    : "drop-shadow(0 0 28px rgba(123,110,246,0.6)) drop-shadow(0 0 60px rgba(123,110,246,0.2))";
  return (
    <svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: size, height: Math.round(size * 1.3), filter: glow, transition: "filter 1.4s ease" }}>
      <defs>
        <linearGradient id="rdg" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%"   stopColor={c1} style={{ transition: "stop-color 1.4s ease" }} />
          <stop offset="45%"  stopColor={c2} style={{ transition: "stop-color 1.4s ease" }} />
          <stop offset="100%" stopColor={c3} style={{ transition: "stop-color 1.4s ease" }} />
        </linearGradient>
        <linearGradient id="rdshine" x1="0" y1="0" x2="0.6" y2="0.6">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.25)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path d="M100 18 C148 78 178 122 178 165 C178 218 143 250 100 250 C57 250 22 218 22 165 C22 122 52 78 100 18Z" fill={c2} opacity="0.15" style={{ transition: "fill 1.4s ease" }} />
      <path d="M100 22 C146 80 174 123 174 164 C174 215 141 247 100 247 C59 247 26 215 26 164 C26 123 54 80 100 22Z" fill="url(#rdg)" />
      <path d="M70 58 C78 46 92 38 104 37 C92 78 74 112 63 143 C50 114 56 76 70 58Z" fill="url(#rdshine)" />
      <ellipse cx="80" cy="82" rx="6" ry="9" fill="rgba(255,255,255,0.18)" />
    </svg>
  );
}

// ── Portfolio Card — pôster audiovisual sobre a foto do cais ─────────────────
function PortfolioCard({ project, pos }: { project: typeof PROJECTS[0]; pos: number }) {
  const clamped = Math.max(-2, Math.min(2, pos));
  return (
    <div
      className="rec-card"
      data-pos={String(clamped)}
      style={{
        backgroundImage: `${project.overlay}, url('${CAIS}')`,
        backgroundSize: "auto, cover",
        backgroundPosition: `center, ${project.position}`,
        backgroundRepeat: "no-repeat",
      }}
    >
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "1.2rem" }}>
        {/* Topo */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ ...R.mono, fontSize: ".44rem", letterSpacing: ".2em", color: R.red }}>{project.frame}</span>
          <span style={{ ...R.mono, fontSize: ".44rem", letterSpacing: ".16em", textTransform: "uppercase", color: R.muted }}>{project.type}</span>
        </div>

        {/* Centro — marcas de enquadramento de frame */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: "10px", height: "10px", borderTop: `1px solid ${R.red}60`, borderLeft: `1px solid ${R.red}60` }} />
            <div style={{ position: "absolute", top: 0, right: 0, width: "10px", height: "10px", borderTop: `1px solid ${R.red}60`, borderRight: `1px solid ${R.red}60` }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, width: "10px", height: "10px", borderBottom: `1px solid ${R.red}60`, borderLeft: `1px solid ${R.red}60` }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: "10px", height: "10px", borderBottom: `1px solid ${R.red}60`, borderRight: `1px solid ${R.red}60` }} />
            <Play style={{ width: "20px", height: "20px", color: R.text, opacity: 0.55 }} strokeWidth={1} />
          </div>
        </div>

        {/* Scan line horizontal sutil */}
        <div style={{ position: "absolute", top: "47%", left: "1.2rem", right: "1.2rem", height: "1px", background: "rgba(255,255,255,0.05)" }} />

        {/* Rodapé */}
        <div>
          <p style={{ ...R.mono, fontSize: ".44rem", letterSpacing: ".18em", textTransform: "uppercase", color: R.muted, marginBottom: ".4rem" }}>
            {project.year} · LOKAT.REC
          </p>
          <p style={{ ...R.grotesk, fontSize: "1.4rem", fontWeight: 700, color: R.text, lineHeight: 1, marginBottom: ".2rem", letterSpacing: "-.01em" }}>
            {project.title.toUpperCase()}
          </p>
          <p style={{ ...R.mono, fontSize: ".44rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.red, opacity: 0.8 }}>
            {project.category}
          </p>
        </div>

        {/* Borda inferior vermelha */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(to right, ${R.red}, ${R.red}50, transparent)` }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: "2px", height: "30%", background: `linear-gradient(to bottom, ${R.red}70, transparent)` }} />
      </div>

      {/* Frame de filme */}
      <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(255,255,255,0.07)", pointerEvents: "none" }} />
      {/* Grain sobre o card */}
      <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LokatRecPage() {
  const [introComplete, setIntroComplete] = useState(false);
  const [dropPhase, setDropPhase] = useState<"purple" | "red">("purple");
  const [activeCard, setActiveCard] = useState(0);
  const portfolioRef  = useRef<HTMLDivElement>(null);
  const quemSomosRef  = useRef<HTMLDivElement>(null);
  const contatoRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setDropPhase("red"), 800);
    const t2 = setTimeout(() => setIntroComplete(true), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth" });

  const prevCard = () => setActiveCard((i) => (i - 1 + PROJECTS.length) % PROJECTS.length);
  const nextCard = () => setActiveCard((i) => (i + 1) % PROJECTS.length);
  const getPos = (index: number) => {
    let pos = index - activeCard;
    if (pos > 2) pos -= PROJECTS.length;
    if (pos < -2) pos += PROJECTS.length;
    return pos;
  };

  return (
    <div style={{ background: R.bg, color: R.text, minHeight: "100vh", overflowX: "hidden" }}>

      {/* ══ INTRO — NÃO ALTERAR ════════════════════════════════════ */}
      {!introComplete && (
        <div className="rec-intro-overlay" style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: R.bg,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "1.5rem",
        }}>
          <div className={`rec-drop-float ${dropPhase === "red" ? "rec-drop-morph" : ""}`}>
            <RecDrop size={110} phase={dropPhase} />
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ ...R.mono, fontSize: ".65rem", letterSpacing: ".3em", textTransform: "uppercase", color: dropPhase === "red" ? R.red : "#7b6ef6", transition: "color 1.4s ease" }}>
              LOKAT.REC
            </span>
          </div>
        </div>
      )}

      {/* ══ MENU ═══════════════════════════════════════════════════ */}
      <header className="rec-menu-in" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: ".9rem 2rem",
        background: "rgba(10,8,6,0.92)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: `1px solid ${R.border}`,
      }}>
        <span style={{ ...R.mono, fontSize: ".82rem", letterSpacing: ".08em", fontWeight: 700, color: R.text }}>
          LOKAT<span style={{ color: R.red }}>.</span><span style={{ color: R.red }}>REC</span>
        </span>

        <nav style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          {[
            { label: "Quem somos", ref: quemSomosRef },
            { label: "Portfólio",  ref: portfolioRef },
            { label: "Contato",    ref: contatoRef },
          ].map(({ label, ref }) => (
            <button key={label} onClick={() => scrollTo(ref)}
              style={{ ...R.mono, fontSize: ".62rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted, background: "none", border: "none", cursor: "pointer", transition: "color .2s", padding: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = R.text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = R.muted)}
            >{label}</button>
          ))}
        </nav>

        <Link href="/"
          style={{ ...R.mono, fontSize: ".58rem", letterSpacing: ".12em", textTransform: "uppercase", color: R.muted, textDecoration: "none", display: "flex", alignItems: "center", gap: ".4rem", transition: "color .2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = R.text)}
          onMouseLeave={(e) => (e.currentTarget.style.color = R.muted)}
        >
          <ArrowLeft style={{ width: "12px", height: "12px" }} /> LOKAT OS
        </Link>
      </header>

      {/* ══ HERO — foto do cais como base ══════════════════════════ */}
      <section style={{
        position: "relative", minHeight: "100vh", paddingTop: "5rem",
        overflow: "hidden",
        ...caisOverlay("hero", "center 55%"),
      }}>
        {/* Grain cinematográfico */}
        <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />

        {/* Acento de luz vermelha — reflexo no cais */}
        <div style={{
          position: "absolute", bottom: "10%", left: "15%",
          width: "500px", height: "160px",
          background: `radial-gradient(ellipse 80% 60% at 35% 100%, ${R.red}10 0%, transparent 80%)`,
          pointerEvents: "none",
        }} />

        {/* Linha vertical esquerda — moldura de frame */}
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 0, width: "2px",
          background: `linear-gradient(to bottom, transparent, ${R.red}28 30%, ${R.red}18 70%, transparent)`,
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "12vh 2rem 8rem", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2rem", position: "relative", zIndex: 1 }}>

          {/* Drop + label */}
          <div className="rec-hero-in" style={{ display: "flex", alignItems: "center", gap: "1.4rem" }}>
            <div className="rec-drop-float">
              <RecDrop size={52} phase="red" />
            </div>
            <div>
              <span style={{ ...R.mono, fontSize: ".52rem", letterSpacing: ".24em", textTransform: "uppercase", color: R.muted, display: "block", marginBottom: ".3rem" }}>
                Frente audiovisual da LOKAT
              </span>
              <div style={{ height: "1px", width: "80px", background: `linear-gradient(to right, ${R.red}, transparent)` }} />
            </div>
          </div>

          {/* Headline */}
          <h1 className="rec-hero-in-d1"
            style={{ ...R.grotesk, fontSize: "clamp(2.8rem, 8vw, 6rem)", fontWeight: 700, lineHeight: .96, letterSpacing: "-.03em", color: R.text, maxWidth: "820px" }}
          >
            Histórias que<br />
            <em style={{ fontStyle: "italic", color: R.red }}>conectam</em><br />
            marcas e pessoas.
          </h1>

          <span className="rec-divider rec-hero-in-d2" />

          <p className="rec-hero-in-d2"
            style={{ ...R.grotesk, fontSize: "1rem", lineHeight: 1.75, color: R.muted, maxWidth: "460px" }}
          >
            Produções audiovisuais com propósito. Estratégia, direção e tecnologia para transformar ideias em experiências que ficam.
          </p>

          <div className="rec-hero-in-d3" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo(portfolioRef)}
              style={{ background: R.red, color: "#fff", padding: ".85rem 2.2rem", ...R.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", border: "none", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: ".5rem" }}
            >
              <Play style={{ width: "14px", height: "14px" }} strokeWidth={2} /> Ver portfólio
            </button>
            <button onClick={() => scrollTo(contatoRef)}
              style={{ background: "rgba(10,8,6,0.6)", color: R.text, border: `1px solid ${R.border}`, padding: ".85rem 2rem", ...R.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer", backdropFilter: "blur(8px)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = R.red)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = R.border)}
            >
              Solicitar orçamento
            </button>
          </div>

          {/* Meta strip */}
          <div className="rec-hero-in-d3" style={{ display: "flex", gap: "2.5rem", paddingTop: "3rem", borderTop: `1px solid ${R.border}`, width: "100%", flexWrap: "wrap" }}>
            {[
              ["Localização", "Fortaleza — CE"],
              ["Desde",       "2022"],
              ["Especialidade", "Audiovisual"],
            ].map(([top, bot]) => (
              <div key={top}>
                <p style={{ ...R.mono, fontSize: ".48rem", letterSpacing: ".16em", textTransform: "uppercase", color: R.muted }}>{top}</p>
                <p style={{ ...R.grotesk, fontSize: ".82rem", fontWeight: 600, color: R.text, marginTop: ".15rem" }}>{bot}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Linha de base — transição para próxima seção */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "120px", background: `linear-gradient(to bottom, transparent, ${R.bg})`, pointerEvents: "none" }} />
      </section>

      {/* ══ QUEM SOMOS ═════════════════════════════════════════════ */}
      <section ref={quemSomosRef} style={{ background: R.bg, position: "relative", overflow: "hidden" }}>
        {/* Grain de fundo */}
        <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.6 }} />

        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "8rem 2rem", position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center" }}>

            {/* Lado esquerdo — foto do cais tratada como parede/concreto */}
            <div className="rec-reveal" style={{ position: "relative" }}>
              <div style={{
                width: "100%",
                aspectRatio: "4/5",
                position: "relative",
                overflow: "hidden",
                border: `1px solid ${R.border}`,
                ...caisOverlay("qs", "center 60%"),
              }}>
                {/* Grain */}
                <div className="rec-grain" style={{ position: "absolute", inset: 0 }} />

                {/* Linha do horizonte — lê como margem do rio */}
                <div style={{
                  position: "absolute", top: "42%", left: 0, right: 0, height: "1px",
                  background: `linear-gradient(to right, transparent 5%, rgba(200,150,70,0.18) 30%, rgba(220,170,80,0.22) 55%, rgba(180,130,60,0.14) 80%, transparent 95%)`,
                }} />

                {/* Frisos de concreto — rampa/cais */}
                {[18, 36, 60, 76, 90].map((pct) => (
                  <div key={pct} style={{
                    position: "absolute", bottom: `${pct}%`, left: "6%", right: "6%", height: "1px",
                    background: `rgba(255,255,255,${pct > 42 ? "0.03" : "0.02"})`,
                  }} />
                ))}

                {/* Marca d'água da gota */}
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: .06, zIndex: 1 }}>
                  <RecDrop size={200} phase="red" />
                </div>

                {/* Cantos de registro de frame */}
                <div style={{ position: "absolute", top: "1rem", right: "1rem", width: "16px", height: "16px", borderTop: `1px solid ${R.red}55`, borderRight: `1px solid ${R.red}55` }} />
                <div style={{ position: "absolute", top: "1rem", left: "1rem", width: "16px", height: "16px", borderTop: `1px solid ${R.red}30`, borderLeft: `1px solid ${R.red}30` }} />
                <div style={{ position: "absolute", bottom: "1rem", left: "1rem", width: "16px", height: "16px", borderBottom: `1px solid ${R.red}55`, borderLeft: `1px solid ${R.red}55` }} />
                <div style={{ position: "absolute", bottom: "1rem", right: "1rem", width: "16px", height: "16px", borderBottom: `1px solid ${R.red}30`, borderRight: `1px solid ${R.red}30` }} />

                {/* Código de localização */}
                <div style={{ position: "absolute", top: "1.5rem", left: "50%", transform: "translateX(-50%)", ...R.mono, fontSize: ".38rem", letterSpacing: ".2em", color: R.muted, opacity: 0.45, zIndex: 1, whiteSpace: "nowrap" }}>
                  LOKAT REC · CE · BR
                </div>

                {/* Texto no concreto */}
                <div style={{ position: "absolute", bottom: "2.5rem", left: "2rem", right: "2rem", zIndex: 1 }}>
                  <p style={{ ...R.grotesk, fontSize: "2.2rem", fontWeight: 700, color: R.text, lineHeight: 1, opacity: .42 }}>QUEM</p>
                  <p style={{ ...R.grotesk, fontSize: "2.2rem", fontWeight: 700, color: R.text, lineHeight: 1, opacity: .42 }}>SOMOS</p>
                  <p style={{ ...R.grotesk, fontSize: "2.2rem", fontWeight: 700, color: R.red, lineHeight: 1 }}>NÓS.</p>
                </div>
              </div>

              {/* Meta card */}
              <div style={{ position: "absolute", bottom: "-1.5rem", right: "-1.5rem", background: R.warm, border: `1px solid ${R.border}`, padding: "1rem 1.3rem" }}>
                <p style={{ ...R.mono, fontSize: ".48rem", letterSpacing: ".15em", textTransform: "uppercase", color: R.muted }}>Localização</p>
                <p style={{ ...R.grotesk, fontSize: ".82rem", fontWeight: 600, color: R.text, marginTop: ".2rem" }}>Fortaleza — CE · Brasil</p>
              </div>
            </div>

            {/* Lado direito — texto */}
            <div className="rec-reveal-d1">
              <p style={{ ...R.mono, fontSize: ".58rem", letterSpacing: ".2em", textTransform: "uppercase", color: R.red, marginBottom: ".6rem" }}>
                [Quem somos]
              </p>
              <h2 style={{ ...R.grotesk, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, color: R.text, lineHeight: 1.05, marginBottom: "1.5rem" }}>
                Estratégia + criatividade + tecnologia
              </h2>
              <span className="rec-divider" />
              <p style={{ ...R.grotesk, fontSize: ".95rem", lineHeight: 1.8, color: R.muted, marginBottom: "1.2rem" }}>
                Somos a frente audiovisual da LOKAT — uma produtora criativa que transforma histórias, marcas e territórios em narrativas visuais com direção, estratégia e presença.
              </p>
              <p style={{ ...R.grotesk, fontSize: ".95rem", lineHeight: 1.8, color: R.muted, marginBottom: "2rem" }}>
                Da concepção ao resultado: desenvolvemos campanhas, documentários, vídeos institucionais e conteúdo de marca com propósito estratégico e linguagem autoral.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: R.border, border: `1px solid ${R.border}`, marginBottom: "2rem" }}>
                {[
                  ["Direção criativa", "Conceito + storyboard + direção de cena"],
                  ["Produção",         "Gravação, trilha, edição e pós-produção"],
                  ["Branded content",  "Conteúdo de marca com estratégia de impacto"],
                  ["Documentário",     "Histórias reais com profundidade e narrativa"],
                ].map(([title, desc]) => (
                  <div key={title} style={{ background: R.bg, padding: "1rem" }}>
                    <p style={{ ...R.grotesk, fontSize: ".75rem", fontWeight: 700, color: R.text, marginBottom: ".25rem" }}>{title}</p>
                    <p style={{ ...R.grotesk, fontSize: ".68rem", lineHeight: 1.5, color: R.muted }}>{desc}</p>
                  </div>
                ))}
              </div>

              <p style={{ ...R.mono, fontSize: ".5rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted }}>
                ESTRATÉGIA · CRIATIVIDADE · TECNOLOGIA · HISTÓRIAS QUE CONECTAM.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PORTFÓLIO ══════════════════════════════════════════════ */}
      <section ref={portfolioRef} style={{ padding: "6rem 0 8rem", position: "relative", overflow: "hidden" }}>
        {/* Fundo: escuro quente com grain */}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${R.bg} 0%, #100d08 40%, #14100a 60%, ${R.bg} 100%)`, pointerEvents: "none" }} />
        <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5 }} />

        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 2rem", position: "relative", zIndex: 1 }}>
          <div className="rec-reveal" style={{ marginBottom: "4rem" }}>
            <p style={{ ...R.mono, fontSize: ".58rem", letterSpacing: ".2em", textTransform: "uppercase", color: R.red, marginBottom: ".6rem" }}>[Portfólio]</p>
            <h2 style={{ ...R.grotesk, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, color: R.text, lineHeight: 1.05 }}>
              Casos que<br />ficaram.
            </h2>
          </div>

          {/* Card deck */}
          <div className="rec-deck">
            {PROJECTS.map((project, index) => (
              <PortfolioCard key={project.id} project={project} pos={getPos(index)} />
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2rem", marginTop: "3rem" }}>
            <button onClick={prevCard}
              style={{ width: "44px", height: "44px", border: `1px solid ${R.border}`, background: "transparent", color: R.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "border-color .2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = R.red)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = R.border)}
            ><ChevronLeft style={{ width: "18px", height: "18px" }} strokeWidth={1.5} /></button>

            <div style={{ display: "flex", gap: ".5rem" }}>
              {PROJECTS.map((_, i) => (
                <button key={i} onClick={() => setActiveCard(i)}
                  style={{ width: i === activeCard ? "20px" : "6px", height: "6px", background: i === activeCard ? R.red : R.border, border: "none", cursor: "pointer", transition: "all .3s ease", padding: 0 }}
                />
              ))}
            </div>

            <button onClick={nextCard}
              style={{ width: "44px", height: "44px", border: `1px solid ${R.border}`, background: "transparent", color: R.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "border-color .2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = R.red)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = R.border)}
            ><ChevronRight style={{ width: "18px", height: "18px" }} strokeWidth={1.5} /></button>
          </div>

          <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
            <p style={{ ...R.mono, fontSize: ".48rem", letterSpacing: ".2em", textTransform: "uppercase", color: R.muted, marginBottom: ".3rem" }}>
              {PROJECTS[activeCard].year} · {PROJECTS[activeCard].category}
            </p>
            <p style={{ ...R.grotesk, fontSize: "1.4rem", fontWeight: 700, color: R.text }}>
              {PROJECTS[activeCard].title}
            </p>
          </div>

          <div style={{ textAlign: "center", marginTop: "3rem" }}>
            <button
              style={{ ...R.mono, fontSize: ".65rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted, background: "none", border: `1px solid ${R.border}`, padding: ".65rem 1.5rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: ".5rem", transition: "color .2s, border-color .2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = R.text; e.currentTarget.style.borderColor = R.red; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = R.muted; e.currentTarget.style.borderColor = R.border; }}
            >
              <ExternalLink style={{ width: "12px", height: "12px" }} /> Ver todos os projetos
            </button>
          </div>
        </div>
      </section>

      {/* ══ CONTATO — foto do cais como fundo ══════════════════════ */}
      <section ref={contatoRef} style={{
        position: "relative", overflow: "hidden",
        ...caisOverlay("contato", "center 45%"),
      }}>
        <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        {/* Transição de entrada */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "80px", background: `linear-gradient(to bottom, ${R.bg}, transparent)`, pointerEvents: "none" }} />

        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "8rem 2rem", position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "start" }}>

            {/* Esquerda */}
            <div className="rec-reveal">
              <p style={{ ...R.mono, fontSize: ".58rem", letterSpacing: ".2em", textTransform: "uppercase", color: R.red, marginBottom: ".6rem" }}>[Contato]</p>
              <h2 style={{ ...R.grotesk, fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 700, color: R.text, lineHeight: 1.05, marginBottom: "1rem" }}>
                Tem um projeto<br />em mente?
              </h2>
              <span className="rec-divider" />
              <p style={{ ...R.grotesk, fontSize: ".95rem", lineHeight: 1.8, color: R.muted, marginBottom: "2.5rem" }}>
                Conte sobre sua marca, sua história e o que você quer comunicar. Vamos criar algo que conecta de verdade.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: R.border }}>
                <a href="https://wa.me/5585999999999?text=Olá!%20Vi%20o%20portfólio%20da%20LOKAT.REC%20e%20quero%20solicitar%20um%20orçamento."
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.1rem 1rem", background: "rgba(20,16,10,0.85)", textDecoration: "none", transition: "background .2s", backdropFilter: "blur(6px)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30,22,12,0.9)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(20,16,10,0.85)")}
                >
                  <div style={{ width: "36px", height: "36px", background: `${R.red}18`, border: `1px solid ${R.red}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ExternalLink style={{ width: "14px", height: "14px", color: R.red }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p style={{ ...R.mono, fontSize: ".48rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted }}>WhatsApp</p>
                    <p style={{ ...R.grotesk, fontSize: ".82rem", color: R.text, fontWeight: 600 }}>Solicitar orçamento</p>
                  </div>
                  <div style={{ marginLeft: "auto", ...R.mono, fontSize: ".44rem", color: R.red }}>→</div>
                </a>
                <a href="mailto:rec@lokat.com.br"
                  style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.1rem 1rem", background: "rgba(20,16,10,0.85)", textDecoration: "none", transition: "background .2s", backdropFilter: "blur(6px)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30,22,12,0.9)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(20,16,10,0.85)")}
                >
                  <div style={{ width: "36px", height: "36px", background: `${R.red}18`, border: `1px solid ${R.red}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Mail style={{ width: "14px", height: "14px", color: R.red }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p style={{ ...R.mono, fontSize: ".48rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted }}>E-mail</p>
                    <p style={{ ...R.grotesk, fontSize: ".82rem", color: R.text, fontWeight: 600 }}>rec@lokat.com.br</p>
                  </div>
                  <div style={{ marginLeft: "auto", ...R.mono, fontSize: ".44rem", color: R.red }}>→</div>
                </a>
              </div>

              <div style={{ display: "flex", gap: ".75rem", marginTop: "1.5rem" }}>
                {[
                  { label: "Instagram", Icon: AtSign, href: "#" },
                  { label: "YouTube",   Icon: Video,  href: "#" },
                ].map(({ label, Icon, href }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: ".5rem", ...R.mono, fontSize: ".52rem", letterSpacing: ".12em", textTransform: "uppercase", color: R.muted, textDecoration: "none", border: `1px solid ${R.border}`, padding: ".5rem .8rem", transition: "color .2s, border-color .2s", background: "rgba(10,8,6,0.5)", backdropFilter: "blur(4px)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = R.text; e.currentTarget.style.borderColor = R.red; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = R.muted; e.currentTarget.style.borderColor = R.border; }}
                  >
                    <Icon style={{ width: "13px", height: "13px" }} strokeWidth={1.5} /> {label}
                  </a>
                ))}
              </div>
            </div>

            {/* Direita — formulário */}
            <div className="rec-reveal-d1">
              <form onSubmit={(e) => e.preventDefault()}
                style={{ display: "flex", flexDirection: "column", gap: ".75rem", background: "rgba(10,8,6,0.75)", padding: "2rem", backdropFilter: "blur(12px)", border: `1px solid ${R.border}` }}
              >
                {[
                  { label: "Nome / Empresa",      placeholder: "Sua marca ou nome",      type: "text" },
                  { label: "E-mail",               placeholder: "contato@suamarca.com.br", type: "email" },
                  { label: "Telefone / WhatsApp",  placeholder: "(85) 9 0000-0000",       type: "tel" },
                ].map(({ label, placeholder, type }) => (
                  <div key={label}>
                    <label style={{ ...R.mono, fontSize: ".5rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted, display: "block", marginBottom: ".4rem" }}>{label}</label>
                    <input type={type} placeholder={placeholder}
                      style={{ width: "100%", background: "rgba(20,16,10,0.9)", border: `1px solid ${R.border}`, color: R.text, padding: ".8rem 1rem", ...R.grotesk, fontSize: ".85rem", outline: "none", transition: "border-color .2s" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = R.red)}
                      onBlur={(e) => (e.currentTarget.style.borderColor = R.border)}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ ...R.mono, fontSize: ".5rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted, display: "block", marginBottom: ".4rem" }}>Conte sobre seu projeto</label>
                  <textarea rows={4} placeholder="Tipo de produção, objetivo, prazo, referências…"
                    style={{ width: "100%", background: "rgba(20,16,10,0.9)", border: `1px solid ${R.border}`, color: R.text, padding: ".8rem 1rem", ...R.grotesk, fontSize: ".85rem", outline: "none", resize: "vertical", transition: "border-color .2s" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = R.red)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = R.border)}
                  />
                </div>
                <button type="submit"
                  style={{ background: R.red, color: "#fff", padding: ".9rem 1.5rem", ...R.mono, fontSize: ".68rem", letterSpacing: ".14em", textTransform: "uppercase", border: "none", cursor: "pointer", fontWeight: 700, transition: "background .2s", textAlign: "center" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#a02a20")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = R.red)}
                >
                  ■ Enviar mensagem →
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Transição de saída */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "80px", background: `linear-gradient(to bottom, transparent, ${R.bg})`, pointerEvents: "none" }} />
      </section>

      {/* ══ FOOTER ═════════════════════════════════════════════════ */}
      <footer style={{ borderTop: `1px solid ${R.border}`, padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", textAlign: "center", background: R.bg }}>
        <span style={{ ...R.mono, fontSize: ".7rem", letterSpacing: ".1em", fontWeight: 700, color: R.text }}>
          LOKAT<span style={{ color: R.red }}>.</span><span style={{ color: R.red }}>REC</span>
        </span>
        <p style={{ ...R.mono, fontSize: ".48rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted }}>
          Fortaleza — CE · Brasil · Desde 2022
        </p>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link href="/"
            style={{ ...R.mono, fontSize: ".5rem", letterSpacing: ".12em", textTransform: "uppercase", color: R.muted, textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = R.text)}
            onMouseLeave={(e) => (e.currentTarget.style.color = R.muted)}
          >← LOKAT OS</Link>
          <span style={{ color: R.border }}>·</span>
          <span style={{ ...R.mono, fontSize: ".5rem", letterSpacing: ".12em", textTransform: "uppercase", color: R.muted }}>© 2026 LOKAT</span>
        </div>
      </footer>
    </div>
  );
}
