"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Mail, AtSign, Video, ChevronLeft, ChevronRight, Pause, Volume2, VolumeX } from "lucide-react";

// ── Design tokens ────────────────────────────────────────────────────────────
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

const CAIS = "/rec/cais-floriano.jpg";

function caisOverlay(direction: "hero" | "qs" | "contato" = "hero", position = "center 55%"): React.CSSProperties {
  const overlays: Record<typeof direction, string> = {
    hero:    `linear-gradient(180deg,rgba(4,4,3,0.82) 0%,rgba(8,6,4,0.70) 35%,rgba(10,8,6,0.80) 70%,rgba(10,8,6,0.97) 100%),linear-gradient(to right,rgba(192,57,43,0.06) 0%,transparent 60%)`,
    qs:      `linear-gradient(170deg,rgba(6,5,3,0.90) 0%,rgba(18,12,6,0.86) 55%,rgba(12,8,4,0.92) 100%)`,
    contato: `linear-gradient(180deg,rgba(10,8,6,0.96) 0%,rgba(14,10,6,0.88) 50%,rgba(10,8,6,0.96) 100%),radial-gradient(ellipse 100% 60% at 40% 100%,rgba(80,35,10,0.18) 0%,transparent 70%)`,
  };
  return {
    backgroundImage: `${overlays[direction]}, url('${CAIS}')`,
    backgroundSize: `auto, cover`,
    backgroundPosition: `center, ${position}`,
    backgroundRepeat: "no-repeat",
  };
}

// ── Vídeos reais ─────────────────────────────────────────────────────────────
const VIDEOS = [
  { id: 1, file: "/rec/duh-dia-solteiro.mp4",   title: "Dia do Solteiro",        client: "Duh Lanches",  tag: "Reel",      frame: "01" },
  { id: 2, file: "/rec/duh-checklist-copa.mp4",  title: "Checklist da Copa",       client: "Duh Lanches",  tag: "Campanha",  frame: "02" },
  { id: 3, file: "/rec/duh-gosta-suco.mp4",      title: "Gosta de Suco?",          client: "Duh Lanches",  tag: "Produto",   frame: "03" },
  { id: 4, file: "/rec/duh-carnaval.mp4",        title: "Preparada pro Carnaval",  client: "Duh Lanches",  tag: "Ação",      frame: "04" },
  { id: 5, file: "/rec/duh-depoimento.mp4",      title: "Depoimento real",         client: "Duh Lanches",  tag: "Social",    frame: "05" },
  { id: 6, file: "/rec/vt-hp.mp4",              title: "VT Institucional",         client: "HP",           tag: "VT",        frame: "06" },
];

// ── Drop SVG ─────────────────────────────────────────────────────────────────
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

// ── VideoCard — card com vídeo real ──────────────────────────────────────────
function VideoCard({ video, active, onClick }: {
  video: typeof VIDEOS[0];
  active: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (hovered) {
      el.play().catch(() => undefined);
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [hovered]);

  // Pause when card goes off screen
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (!entry.isIntersecting) { el.pause(); el.currentTime = 0; } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className="rec-card"
      data-pos={active ? "0" : "1"}
      style={{ cursor: "pointer", position: "relative", overflow: "hidden" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Vídeo real como fundo */}
      <video
        ref={ref}
        src={video.file}
        muted
        loop
        playsInline
        preload="metadata"
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover",
          opacity: hovered ? 1 : 0,
          transition: "opacity .5s ease",
        }}
      />

      {/* Overlay escuro quando não está em hover */}
      <div style={{
        position: "absolute", inset: 0,
        background: hovered
          ? "linear-gradient(to top, rgba(10,8,6,0.92) 0%, rgba(10,8,6,0.3) 60%, transparent 100%)"
          : `linear-gradient(155deg, rgba(8,4,2,0.90) 0%, rgba(25,12,6,0.82) 55%, rgba(10,6,4,0.94) 100%), url('${CAIS}') center/cover`,
        transition: "background .5s ease",
      }} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "1.2rem" }}>
        {/* Topo */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ ...R.mono, fontSize: ".44rem", letterSpacing: ".2em", color: R.red }}>{video.frame}</span>
          <span style={{ ...R.mono, fontSize: ".44rem", letterSpacing: ".16em", textTransform: "uppercase", color: R.muted }}>{video.tag}</span>
        </div>

        {/* Ícone central */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: "10px", height: "10px", borderTop: `1px solid ${R.red}60`, borderLeft: `1px solid ${R.red}60` }} />
            <div style={{ position: "absolute", top: 0, right: 0, width: "10px", height: "10px", borderTop: `1px solid ${R.red}60`, borderRight: `1px solid ${R.red}60` }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, width: "10px", height: "10px", borderBottom: `1px solid ${R.red}60`, borderLeft: `1px solid ${R.red}60` }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: "10px", height: "10px", borderBottom: `1px solid ${R.red}60`, borderRight: `1px solid ${R.red}60` }} />
            <Play style={{ width: "20px", height: "20px", color: hovered ? R.red : R.text, opacity: hovered ? 1 : 0.45, transition: "color .3s, opacity .3s" }} strokeWidth={1.5} />
          </div>
        </div>

        {/* Rodapé */}
        <div>
          <p style={{ ...R.mono, fontSize: ".44rem", letterSpacing: ".18em", textTransform: "uppercase", color: R.muted, marginBottom: ".3rem" }}>
            {video.client} · LOKAT.REC
          </p>
          <p style={{ ...R.grotesk, fontSize: "1.3rem", fontWeight: 700, color: R.text, lineHeight: 1, marginBottom: ".2rem", letterSpacing: "-.01em" }}>
            {video.title.toUpperCase()}
          </p>
        </div>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(to right, ${R.red}, ${R.red}50, transparent)` }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: "2px", height: "30%", background: `linear-gradient(to bottom, ${R.red}70, transparent)` }} />
      </div>

      <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(255,255,255,0.07)", pointerEvents: "none" }} />
      <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
    </div>
  );
}

// ── VideoModal — player completo ao clicar no card ──────────────────────────
function VideoModal({ video, onClose }: { video: typeof VIDEOS[0]; onClose: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    ref.current?.play().catch(() => undefined);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const togglePlay = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) { el.play().catch(() => undefined); setPlaying(true); }
    else           { el.pause(); setPlaying(false); }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(4,3,2,0.96)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "900px", position: "relative" }}>
        <video
          ref={ref}
          src={video.file}
          muted={muted}
          loop
          playsInline
          controls={false}
          style={{ width: "100%", display: "block", background: "#000" }}
        />

        {/* Controles */}
        <div style={{ position: "absolute", bottom: "1rem", left: "1rem", display: "flex", gap: ".5rem" }}>
          <button onClick={togglePlay} style={{ width: "36px", height: "36px", background: "rgba(10,8,6,0.8)", border: `1px solid ${R.border}`, color: R.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {playing ? <Pause style={{ width: "14px", height: "14px" }} /> : <Play style={{ width: "14px", height: "14px" }} />}
          </button>
          <button onClick={() => { setMuted((m) => !m); }} style={{ width: "36px", height: "36px", background: "rgba(10,8,6,0.8)", border: `1px solid ${R.border}`, color: R.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {muted ? <VolumeX style={{ width: "14px", height: "14px" }} /> : <Volume2 style={{ width: "14px", height: "14px" }} />}
          </button>
        </div>

        {/* Info */}
        <div style={{ position: "absolute", top: "-2.5rem", left: 0, display: "flex", gap: "1rem", alignItems: "baseline" }}>
          <span style={{ ...R.mono, fontSize: ".5rem", letterSpacing: ".16em", textTransform: "uppercase", color: R.red }}>{video.tag}</span>
          <span style={{ ...R.grotesk, fontSize: ".9rem", fontWeight: 700, color: R.text }}>{video.title}</span>
          <span style={{ ...R.mono, fontSize: ".44rem", color: R.muted }}>{video.client}</span>
        </div>

        {/* Fechar */}
        <button onClick={onClose} style={{ position: "absolute", top: "-2.5rem", right: 0, ...R.mono, fontSize: ".5rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted, background: "none", border: "none", cursor: "pointer" }}>
          ✕ fechar
        </button>
      </div>
    </div>
  );
}

// ── FeedbackSection — depoimento em vídeo ───────────────────────────────────
function FeedbackSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const [visible, setVisible]   = useState(false);
  const [playing, setPlaying]   = useState(false);
  const [muted,   setMuted]     = useState(true);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    if (prefersReduced) { setVisible(true); }
    else { obs.observe(el); }
    return () => obs.disconnect();
  }, []);

  // Pause when out of view
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (!entry.isIntersecting) { el.pause(); setPlaying(false); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) { el.play().catch(() => undefined); setPlaying(true); }
    else           { el.pause(); setPlaying(false); }
  };

  return (
    <section ref={sectionRef} style={{ position: "relative", padding: "8rem 0", overflow: "hidden" }}>
      {/* Fundo */}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${R.bg} 0%, #100c06 50%, ${R.bg} 100%)`, pointerEvents: "none" }} />
      <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5 }} />
      {/* Acento vermelho */}
      <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: "3px", height: "40%", background: `linear-gradient(to bottom, transparent, ${R.red}50, transparent)`, pointerEvents: "none" }} />

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 2rem", position: "relative", zIndex: 1 }}>
        {/* Label */}
        <div style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity .7s ease, transform .7s ease",
          marginBottom: "3rem",
        }}>
          <p style={{ ...R.mono, fontSize: ".58rem", letterSpacing: ".2em", textTransform: "uppercase", color: R.red, marginBottom: ".4rem" }}>[Feedback real]</p>
          <h2 style={{ ...R.grotesk, fontSize: "clamp(1.6rem,3.5vw,2.4rem)", fontWeight: 700, color: R.text, lineHeight: 1.05 }}>
            O resultado<br />em palavras.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
          {/* Vídeo de feedback */}
          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
            transition: "opacity .8s .1s ease, transform .8s .1s ease",
            position: "relative",
          }}>
            <div style={{ position: "relative", border: `1px solid ${R.border}`, overflow: "hidden" }}>
              <video
                ref={videoRef}
                src="/rec/feedback-duh.mp4"
                muted={muted}
                playsInline
                preload="metadata"
                style={{ width: "100%", display: "block", background: "#0a0806", aspectRatio: "9/16", objectFit: "cover" }}
              />

              {/* Overlay play */}
              {!playing && (
                <div
                  onClick={togglePlay}
                  style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,8,6,0.5)", cursor: "pointer" }}
                >
                  <div style={{ width: "60px", height: "60px", border: `1px solid ${R.red}80`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `${R.red}22`, backdropFilter: "blur(4px)" }}>
                    <Play style={{ width: "22px", height: "22px", color: R.red, marginLeft: "2px" }} strokeWidth={1.5} />
                  </div>
                </div>
              )}

              {/* Controles */}
              <div style={{ position: "absolute", bottom: ".75rem", left: ".75rem", display: "flex", gap: ".4rem" }}>
                <button onClick={togglePlay} style={{ width: "32px", height: "32px", background: "rgba(10,8,6,0.85)", border: `1px solid ${R.border}`, color: R.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  {playing ? <Pause style={{ width: "12px" }} /> : <Play style={{ width: "12px" }} />}
                </button>
                <button onClick={() => setMuted((m) => !m)} style={{ width: "32px", height: "32px", background: "rgba(10,8,6,0.85)", border: `1px solid ${R.border}`, color: R.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  {muted ? <VolumeX style={{ width: "12px" }} /> : <Volume2 style={{ width: "12px" }} />}
                </button>
              </div>

              {/* Cantos de frame */}
              <div style={{ position: "absolute", top: ".75rem", left: ".75rem", width: "14px", height: "14px", borderTop: `1px solid ${R.red}55`, borderLeft: `1px solid ${R.red}55`, pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: ".75rem", right: ".75rem", width: "14px", height: "14px", borderTop: `1px solid ${R.red}30`, borderRight: `1px solid ${R.red}30`, pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: ".75rem", right: ".75rem", width: "14px", height: "14px", borderBottom: `1px solid ${R.red}30`, borderRight: `1px solid ${R.red}30`, pointerEvents: "none" }} />
            </div>

            {/* Tag do cliente */}
            <div style={{ marginTop: ".75rem", display: "flex", alignItems: "center", gap: ".6rem" }}>
              <div style={{ width: "6px", height: "6px", background: R.red, borderRadius: "50%", flexShrink: 0 }} />
              <span style={{ ...R.mono, fontSize: ".48rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted }}>
                Duh Lanches · Fortaleza — CE
              </span>
            </div>
          </div>

          {/* Contexto textual */}
          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
            transition: "opacity .8s .25s ease, transform .8s .25s ease",
          }}>
            <div style={{ ...R.mono, fontSize: "3rem", color: R.red, opacity: 0.4, lineHeight: 1, marginBottom: ".5rem" }}>"</div>
            <p style={{ ...R.grotesk, fontSize: "1.15rem", fontWeight: 600, color: R.text, lineHeight: 1.5, marginBottom: "1.5rem" }}>
              Quem assiste, para.
            </p>
            <p style={{ ...R.grotesk, fontSize: ".9rem", lineHeight: 1.75, color: R.muted, marginBottom: "2rem" }}>
              Os vídeos da Duh Lanches foram produzidos para parar o scroll. Cada peça tem roteiro, direção de cena e edição alinhados à identidade da marca — o resultado fala por si.
            </p>

            {/* Stats simples */}
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem", borderLeft: `2px solid ${R.red}40`, paddingLeft: "1.2rem" }}>
              {[
                ["Cliente",    "Duh Lanches"],
                ["Serviço",    "Reels + VTs + Depoimento"],
                ["Localidade", "Fortaleza — CE"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: ".75rem", alignItems: "baseline" }}>
                  <span style={{ ...R.mono, fontSize: ".44rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted, minWidth: "80px" }}>{k}</span>
                  <span style={{ ...R.grotesk, fontSize: ".82rem", fontWeight: 600, color: R.text }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "2rem" }}>
              <span style={{ ...R.mono, fontSize: ".48rem", letterSpacing: ".16em", textTransform: "uppercase", color: R.muted }}>
                ■ PRODUÇÃO AUDIOVISUAL · LOKAT.REC
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function LokatRecPage() {
  const [introComplete, setIntroComplete] = useState(false);
  const [dropPhase,     setDropPhase]     = useState<"purple" | "red">("purple");
  const [activeCard,    setActiveCard]    = useState(0);
  const [modalVideo,    setModalVideo]    = useState<typeof VIDEOS[0] | null>(null);

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

  const prevCard = useCallback(() => setActiveCard((i) => (i - 1 + VIDEOS.length) % VIDEOS.length), []);
  const nextCard = useCallback(() => setActiveCard((i) => (i + 1) % VIDEOS.length), []);
  const getPos = useCallback((index: number) => {
    let pos = index - activeCard;
    if (pos > 2) pos -= VIDEOS.length;
    if (pos < -2) pos += VIDEOS.length;
    return pos;
  }, [activeCard]);

  return (
    <div style={{ background: R.bg, color: R.text, minHeight: "100vh", overflowX: "hidden" }}>

      {/* Modal de vídeo */}
      {modalVideo && <VideoModal video={modalVideo} onClose={() => setModalVideo(null)} />}

      {/* ══ INTRO ═══════════════════════════════════════════════════ */}
      {!introComplete && (
        <div className="rec-intro-overlay" style={{
          position: "fixed", inset: 0, zIndex: 100, background: R.bg,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem",
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

      {/* ══ MENU ════════════════════════════════════════════════════ */}
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
            { label: "Trabalhos",  ref: portfolioRef },
            { label: "Quem somos", ref: quemSomosRef },
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

      {/* ══ HERO ════════════════════════════════════════════════════ */}
      <section style={{
        position: "relative", minHeight: "100vh", paddingTop: "5rem", overflow: "hidden",
        ...caisOverlay("hero", "center 55%"),
      }}>
        <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "15%", width: "500px", height: "160px", background: `radial-gradient(ellipse 80% 60% at 35% 100%, ${R.red}10 0%, transparent 80%)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "2px", background: `linear-gradient(to bottom, transparent, ${R.red}28 30%, ${R.red}18 70%, transparent)`, pointerEvents: "none" }} />

        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "12vh 2rem 8rem", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2rem", position: "relative", zIndex: 1 }}>

          <div className="rec-hero-in" style={{ display: "flex", alignItems: "center", gap: "1.4rem" }}>
            <div className="rec-drop-float">
              <RecDrop size={52} phase="red" />
            </div>
            <div>
              <span style={{ ...R.mono, fontSize: ".52rem", letterSpacing: ".24em", textTransform: "uppercase", color: R.muted, display: "block", marginBottom: ".3rem" }}>
                Produção audiovisual · Fortaleza CE
              </span>
              <div style={{ height: "1px", width: "80px", background: `linear-gradient(to right, ${R.red}, transparent)` }} />
            </div>
          </div>

          {/* Headline melhorada — mais direta, menos genérica */}
          <h1 className="rec-hero-in-d1"
            style={{ ...R.grotesk, fontSize: "clamp(2.2rem, 6vw, 4.8rem)", fontWeight: 700, lineHeight: .96, letterSpacing: "-.03em", color: R.text, maxWidth: "820px" }}
          >
            Vídeos com<br />
            <em style={{ fontStyle: "italic", color: R.red }}>direção, ritmo</em><br />
            e intenção.
          </h1>

          <span className="rec-divider rec-hero-in-d2" />

          <p className="rec-hero-in-d2"
            style={{ ...R.grotesk, fontSize: ".95rem", lineHeight: 1.75, color: R.muted, maxWidth: "440px" }}
          >
            Criamos vídeos e campanhas para marcas locais que precisam vender, posicionar e aparecer com consistência.
            Da ideia ao corte final.
          </p>

          <div className="rec-hero-in-d3" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo(portfolioRef)}
              style={{ background: R.red, color: "#fff", padding: ".85rem 2.2rem", ...R.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", border: "none", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: ".5rem" }}
            >
              <Play style={{ width: "14px", height: "14px" }} strokeWidth={2} /> Ver trabalhos
            </button>
            <button onClick={() => scrollTo(contatoRef)}
              style={{ background: "rgba(10,8,6,0.6)", color: R.text, border: `1px solid ${R.border}`, padding: ".85rem 2rem", ...R.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer", backdropFilter: "blur(8px)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = R.red)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = R.border)}
            >
              Falar sobre gravação
            </button>
          </div>

          <div className="rec-hero-in-d3" style={{ display: "flex", gap: "2.5rem", paddingTop: "3rem", borderTop: `1px solid ${R.border}`, width: "100%", flexWrap: "wrap" }}>
            {[
              ["Localização",   "Fortaleza — CE"],
              ["Desde",         "2022"],
              ["Especialidade", "Audiovisual"],
              ["Clientes",      "Marcas locais"],
            ].map(([top, bot]) => (
              <div key={top}>
                <p style={{ ...R.mono, fontSize: ".48rem", letterSpacing: ".16em", textTransform: "uppercase", color: R.muted }}>{top}</p>
                <p style={{ ...R.grotesk, fontSize: ".82rem", fontWeight: 600, color: R.text, marginTop: ".15rem" }}>{bot}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "120px", background: `linear-gradient(to bottom, transparent, ${R.bg})`, pointerEvents: "none" }} />
      </section>

      {/* ══ TRABALHOS — cards com vídeos reais ══════════════════════ */}
      <section ref={portfolioRef} style={{ padding: "6rem 0 8rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${R.bg} 0%, #100d08 40%, #14100a 60%, ${R.bg} 100%)`, pointerEvents: "none" }} />
        <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5 }} />

        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 2rem", position: "relative", zIndex: 1 }}>
          <div className="rec-reveal" style={{ marginBottom: "4rem" }}>
            <p style={{ ...R.mono, fontSize: ".58rem", letterSpacing: ".2em", textTransform: "uppercase", color: R.red, marginBottom: ".6rem" }}>[Trabalhos]</p>
            <h2 style={{ ...R.grotesk, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, color: R.text, lineHeight: 1.05 }}>
              Passe o mouse.<br />O vídeo toca.
            </h2>
            <p style={{ ...R.grotesk, fontSize: ".85rem", color: R.muted, marginTop: ".75rem" }}>
              Clique para assistir em tela cheia com som.
            </p>
          </div>

          {/* Deck de cards */}
          <div className="rec-deck">
            {VIDEOS.map((video, index) => (
              <VideoCard
                key={video.id}
                video={video}
                active={index === activeCard}
                onClick={() => setModalVideo(video)}
              />
            ))}
          </div>

          {/* Navegação */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2rem", marginTop: "3rem" }}>
            <button onClick={prevCard}
              style={{ width: "44px", height: "44px", border: `1px solid ${R.border}`, background: "transparent", color: R.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "border-color .2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = R.red)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = R.border)}
            ><ChevronLeft style={{ width: "18px", height: "18px" }} strokeWidth={1.5} /></button>

            <div style={{ display: "flex", gap: ".5rem" }}>
              {VIDEOS.map((_, i) => (
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
              {VIDEOS[activeCard].client} · {VIDEOS[activeCard].tag}
            </p>
            <p style={{ ...R.grotesk, fontSize: "1.4rem", fontWeight: 700, color: R.text }}>
              {VIDEOS[activeCard].title}
            </p>
          </div>
        </div>
      </section>

      {/* ══ FEEDBACK — depoimento em vídeo ══════════════════════════ */}
      <FeedbackSection />

      {/* ══ QUEM SOMOS ══════════════════════════════════════════════ */}
      <section ref={quemSomosRef} style={{ background: R.bg, position: "relative", overflow: "hidden" }}>
        <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.6 }} />
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "8rem 2rem", position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center" }}>

            <div className="rec-reveal" style={{ position: "relative" }}>
              <div style={{ width: "100%", aspectRatio: "4/5", position: "relative", overflow: "hidden", border: `1px solid ${R.border}`, ...caisOverlay("qs", "center 60%") }}>
                <div className="rec-grain" style={{ position: "absolute", inset: 0 }} />
                <div style={{ position: "absolute", top: "42%", left: 0, right: 0, height: "1px", background: `linear-gradient(to right, transparent 5%, rgba(200,150,70,0.18) 30%, rgba(220,170,80,0.22) 55%, transparent 95%)` }} />
                {[18, 36, 60, 76, 90].map((pct) => (
                  <div key={pct} style={{ position: "absolute", bottom: `${pct}%`, left: "6%", right: "6%", height: "1px", background: `rgba(255,255,255,${pct > 42 ? "0.03" : "0.02"})` }} />
                ))}
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: .06, zIndex: 1 }}>
                  <RecDrop size={200} phase="red" />
                </div>
                <div style={{ position: "absolute", top: "1rem", right: "1rem", width: "16px", height: "16px", borderTop: `1px solid ${R.red}55`, borderRight: `1px solid ${R.red}55` }} />
                <div style={{ position: "absolute", top: "1rem", left: "1rem", width: "16px", height: "16px", borderTop: `1px solid ${R.red}30`, borderLeft: `1px solid ${R.red}30` }} />
                <div style={{ position: "absolute", bottom: "1rem", left: "1rem", width: "16px", height: "16px", borderBottom: `1px solid ${R.red}55`, borderLeft: `1px solid ${R.red}55` }} />
                <div style={{ position: "absolute", bottom: "1rem", right: "1rem", width: "16px", height: "16px", borderBottom: `1px solid ${R.red}30`, borderRight: `1px solid ${R.red}30` }} />
                <div style={{ position: "absolute", top: "1.5rem", left: "50%", transform: "translateX(-50%)", ...R.mono, fontSize: ".38rem", letterSpacing: ".2em", color: R.muted, opacity: 0.45, zIndex: 1, whiteSpace: "nowrap" }}>LOKAT REC · CE · BR</div>
                <div style={{ position: "absolute", bottom: "2.5rem", left: "2rem", right: "2rem", zIndex: 1 }}>
                  <p style={{ ...R.grotesk, fontSize: "2.2rem", fontWeight: 700, color: R.text, lineHeight: 1, opacity: .42 }}>QUEM</p>
                  <p style={{ ...R.grotesk, fontSize: "2.2rem", fontWeight: 700, color: R.text, lineHeight: 1, opacity: .42 }}>SOMOS</p>
                  <p style={{ ...R.grotesk, fontSize: "2.2rem", fontWeight: 700, color: R.red, lineHeight: 1 }}>NÓS.</p>
                </div>
              </div>
              <div style={{ position: "absolute", bottom: "-1.5rem", right: "-1.5rem", background: R.warm, border: `1px solid ${R.border}`, padding: "1rem 1.3rem" }}>
                <p style={{ ...R.mono, fontSize: ".48rem", letterSpacing: ".15em", textTransform: "uppercase", color: R.muted }}>Localização</p>
                <p style={{ ...R.grotesk, fontSize: ".82rem", fontWeight: 600, color: R.text, marginTop: ".2rem" }}>Fortaleza — CE · Brasil</p>
              </div>
            </div>

            <div className="rec-reveal-d1">
              <p style={{ ...R.mono, fontSize: ".58rem", letterSpacing: ".2em", textTransform: "uppercase", color: R.red, marginBottom: ".6rem" }}>[Quem somos]</p>
              <h2 style={{ ...R.grotesk, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, color: R.text, lineHeight: 1.05, marginBottom: "1.5rem" }}>
                Câmera, roteiro<br />e intenção de campanha.
              </h2>
              <span className="rec-divider" />
              <p style={{ ...R.grotesk, fontSize: ".95rem", lineHeight: 1.8, color: R.muted, marginBottom: "1.2rem" }}>
                Somos a frente audiovisual da LOKAT. Uma produtora que filma marcas locais com olhar de campanha, não só câmera ligada.
              </p>
              <p style={{ ...R.grotesk, fontSize: ".95rem", lineHeight: 1.8, color: R.muted, marginBottom: "2rem" }}>
                Roteiro, direção, gravação e edição organizados para transformar conteúdo em presença real — consistente, com identidade e resultado.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: R.border, border: `1px solid ${R.border}`, marginBottom: "2rem" }}>
                {[
                  ["Direção criativa",  "Conceito, storyboard e direção de cena"],
                  ["Produção",          "Gravação, trilha, edição e pós-produção"],
                  ["Reels e VTs",       "Peças curtas com impacto e clareza"],
                  ["Branded content",   "Conteúdo de marca com estratégia real"],
                ].map(([title, desc]) => (
                  <div key={title} style={{ background: R.bg, padding: "1rem" }}>
                    <p style={{ ...R.grotesk, fontSize: ".75rem", fontWeight: 700, color: R.text, marginBottom: ".25rem" }}>{title}</p>
                    <p style={{ ...R.grotesk, fontSize: ".68rem", lineHeight: 1.5, color: R.muted }}>{desc}</p>
                  </div>
                ))}
              </div>

              <p style={{ ...R.mono, fontSize: ".5rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted }}>
                ROTEIRO · DIREÇÃO · GRAVAÇÃO · EDIÇÃO · RESULTADO.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CONTATO ══════════════════════════════════════════════════ */}
      <section ref={contatoRef} style={{ position: "relative", overflow: "hidden", ...caisOverlay("contato", "center 45%") }}>
        <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "80px", background: `linear-gradient(to bottom, ${R.bg}, transparent)`, pointerEvents: "none" }} />

        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "8rem 2rem", position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "start" }}>

            <div className="rec-reveal">
              <p style={{ ...R.mono, fontSize: ".58rem", letterSpacing: ".2em", textTransform: "uppercase", color: R.red, marginBottom: ".6rem" }}>[Contato]</p>
              <h2 style={{ ...R.grotesk, fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 700, color: R.text, lineHeight: 1.05, marginBottom: "1rem" }}>
                Tem um projeto<br />em mente?
              </h2>
              <span className="rec-divider" />
              <p style={{ ...R.grotesk, fontSize: ".95rem", lineHeight: 1.8, color: R.muted, marginBottom: "2.5rem" }}>
                Conta sobre sua marca e o que você quer comunicar. Vamos criar algo que conecta de verdade.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: R.border }}>
                <a href="https://wa.me/5585999999999?text=Olá!%20Vi%20os%20trabalhos%20da%20LOKAT.REC%20e%20quero%20conversar%20sobre%20uma%20gravação."
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.1rem 1rem", background: "rgba(20,16,10,0.85)", textDecoration: "none", transition: "background .2s", backdropFilter: "blur(6px)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30,22,12,0.9)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(20,16,10,0.85)")}
                >
                  <div style={{ width: "36px", height: "36px", background: `${R.red}18`, border: `1px solid ${R.red}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Video style={{ width: "14px", height: "14px", color: R.red }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p style={{ ...R.mono, fontSize: ".48rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted }}>WhatsApp</p>
                    <p style={{ ...R.grotesk, fontSize: ".82rem", color: R.text, fontWeight: 600 }}>Falar sobre gravação</p>
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

            <div className="rec-reveal-d1">
              <form onSubmit={(e) => e.preventDefault()}
                style={{ display: "flex", flexDirection: "column", gap: ".75rem", background: "rgba(10,8,6,0.75)", padding: "2rem", backdropFilter: "blur(12px)", border: `1px solid ${R.border}` }}
              >
                {[
                  { label: "Nome / Empresa",      placeholder: "Sua marca ou nome",      type: "text" },
                  { label: "E-mail",               placeholder: "contato@suamarca.com.br", type: "email" },
                  { label: "Telefone / WhatsApp",  placeholder: "(85) 9 0000-0000",        type: "tel" },
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
                  <label style={{ ...R.mono, fontSize: ".5rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted, display: "block", marginBottom: ".4rem" }}>Conte sobre sua gravação</label>
                  <textarea rows={4} placeholder="Tipo de vídeo, objetivo, prazo, referências…"
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

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "80px", background: `linear-gradient(to bottom, transparent, ${R.bg})`, pointerEvents: "none" }} />
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════ */}
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
