"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Play, Mail, AtSign, Video,
  ChevronLeft, ChevronRight, Pause, Volume2, VolumeX,
} from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useInView,
} from "framer-motion";
import { getPublicRecVideos, getVideosFromStorage, type RecVideo } from "@/lib/rec-videos";
import { isSupabaseConfigured } from "@/lib/supabase/client";

// ── Design tokens ─────────────────────────────────────────────────────────────
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

// URL base do bucket Supabase — preenchida automaticamente pelo env var
const SUPABASE_REC_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/rec-videos`
  : "";

// Monta URL pública com encoding correto (suporta espaços no nome)
function recUrl(filename: string): string {
  if (!SUPABASE_REC_BASE) return "";
  return `${SUPABASE_REC_BASE}/${encodeURIComponent(filename)}`;
}

function mkv(id: string, title: string, file: string, category: string, order: number): RecVideo {
  return { id, title, client_name: "Sandubão", category, video_url: recUrl(file), storage_path: file, thumbnail_url: null, is_public: true, is_featured: false, is_feedback: false, show_in_cards: true, sort_order: order, status: "active", description: null, created_at: "" };
}

// Filenames exatos do bucket rec-videos no Supabase Storage
const STATIC_VIDEOS: RecVideo[] = [
  mkv("s0", "Dia dos Solteiros", "duhlache-DIA -DO-SOLTEIRO.mp4", "campanha", 0),
  mkv("s1", "Sandubão Vol. 1",   "duhlanche1.mp4",            "campanha", 1),
  mkv("s2", "Sandubão Vol. 2",   "duhlache2.mp4",             "campanha", 2),
  mkv("s3", "Sandubão Vol. 3",   "duhlanche3.mp4",            "campanha", 3),
  mkv("s4", "Sandubão Vol. 4",   "duhlanche4.mp4",            "campanha", 4),
  mkv("s5", "Sandubão Vol. 5",   "dulanche5.mp4",             "campanha", 5),
  mkv("s6", "VT HP",             "VT HP II 30 SEG V2.mp4",   "institucional", 6),
];

const STATIC_FEEDBACK: RecVideo = {
  id: "fb1", title: "Depoimento Sandubão", client_name: "Sandubão", category: "feedback",
  video_url: recUrl("feedbackduh.mp4"),
  storage_path: "feedbackduh.mp4", thumbnail_url: null,
  is_public: true, is_featured: true, is_feedback: true, show_in_cards: false,
  sort_order: 999, status: "active", description: null, created_at: "",
};

function caisOverlay(dir: "hero" | "qs" | "contato" = "hero", pos = "center 55%"): React.CSSProperties {
  const overlays = {
    hero:    `linear-gradient(180deg,rgba(4,4,3,0.82) 0%,rgba(8,6,4,0.70) 35%,rgba(10,8,6,0.80) 70%,rgba(10,8,6,0.97) 100%),linear-gradient(to right,rgba(192,57,43,0.06) 0%,transparent 60%)`,
    qs:      `linear-gradient(170deg,rgba(6,5,3,0.90) 0%,rgba(18,12,6,0.86) 55%,rgba(12,8,4,0.92) 100%)`,
    contato: `linear-gradient(180deg,rgba(10,8,6,0.96) 0%,rgba(14,10,6,0.88) 50%,rgba(10,8,6,0.96) 100%)`,
  };
  return {
    backgroundImage: `${overlays[dir]}, url('${CAIS}')`,
    backgroundSize: "auto, cover",
    backgroundPosition: `center, ${pos}`,
    backgroundRepeat: "no-repeat",
  };
}

// ── Drop SVG ──────────────────────────────────────────────────────────────────
function RecDrop({ size = 130, phase = "purple" }: { size?: number; phase?: "purple" | "red" }) {
  const isRed = phase === "red";
  const c1    = isRed ? "#ff9a9a" : "#c4baff";
  const c2    = isRed ? "#c0392b" : "#7b6ef6";
  const c3    = isRed ? "#7a1a10" : "#3a2a9a";
  const glow  = isRed
    ? "drop-shadow(0 0 36px rgba(192,57,43,0.8)) drop-shadow(0 0 90px rgba(192,57,43,0.35))"
    : "drop-shadow(0 0 28px rgba(123,110,246,0.6)) drop-shadow(0 0 60px rgba(123,110,246,0.2))";
  return (
    <svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: size, height: Math.round(size * 1.3), filter: glow, transition: "filter 1.4s ease" }}>
      <defs>
        <linearGradient id={`rdg-${phase}`} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%"   stopColor={c1} />
          <stop offset="45%"  stopColor={c2} />
          <stop offset="100%" stopColor={c3} />
        </linearGradient>
        <linearGradient id="rdshine" x1="0" y1="0" x2="0.6" y2="0.6">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.25)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path d="M100 18 C148 78 178 122 178 165 C178 218 143 250 100 250 C57 250 22 218 22 165 C22 122 52 78 100 18Z" fill={c2} opacity="0.15" />
      <path d="M100 22 C146 80 174 123 174 164 C174 215 141 247 100 247 C59 247 26 215 26 164 C26 123 54 80 100 22Z" fill={`url(#rdg-${phase})`} />
      <path d="M70 58 C78 46 92 38 104 37 C92 78 74 112 63 143 C50 114 56 76 70 58Z" fill="url(#rdshine)" />
      <ellipse cx="80" cy="82" rx="6" ry="9" fill="rgba(255,255,255,0.18)" />
    </svg>
  );
}

// ── Modal de vídeo ────────────────────────────────────────────────────────────
function VideoModal({ video, onClose }: { video: RecVideo; onClose: () => void }) {
  const ref       = useRef<HTMLVideoElement>(null);
  const [muted,   setMuted]   = useState(false);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (video.video_url) ref.current?.play().catch(() => undefined);
  }, [video.video_url]);

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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(4,3,2,0.97)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "900px", position: "relative" }}>

        {video.video_url ? (
          <video ref={ref} src={video.video_url} muted={muted} loop playsInline preload="metadata" controls={false}
            style={{ width: "100%", display: "block", background: "#000", maxHeight: "80vh", objectFit: "contain" }}
            onError={(e) => { (e.currentTarget.style.display = "none"); (e.currentTarget.nextElementSibling as HTMLElement | null)?.style && ((e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex"); }} />
        ) : null}
        {/* fallback onError ou sem url */}
        <div style={{ width: "100%", aspectRatio: "16/9", background: "#1a1210", display: video.video_url ? "none" : "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ ...R.mono, fontSize: ".65rem", letterSpacing: ".18em", textTransform: "uppercase", color: R.muted }}>Vídeo indisponível</p>
        </div>

        {video.video_url && (
          <div style={{ position: "absolute", bottom: ".75rem", left: ".75rem", display: "flex", gap: ".4rem" }}>
            <button onClick={togglePlay} style={{ width: "36px", height: "36px", background: "rgba(10,8,6,0.85)", border: `1px solid ${R.border}`, color: R.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              {playing ? <Pause style={{ width: "14px" }} /> : <Play style={{ width: "14px" }} />}
            </button>
            <button onClick={() => setMuted((m) => !m)} style={{ width: "36px", height: "36px", background: "rgba(10,8,6,0.85)", border: `1px solid ${R.border}`, color: R.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              {muted ? <VolumeX style={{ width: "12px" }} /> : <Volume2 style={{ width: "12px" }} />}
            </button>
          </div>
        )}

        <div style={{ position: "absolute", top: "-2.5rem", left: 0, display: "flex", gap: "1rem", alignItems: "baseline" }}>
          {video.category && <span style={{ ...R.mono, fontSize: ".5rem", letterSpacing: ".16em", textTransform: "uppercase", color: R.red }}>{video.category}</span>}
          <span style={{ ...R.grotesk, fontSize: ".9rem", fontWeight: 700, color: R.text }}>{video.title}</span>
          {video.client_name && <span style={{ ...R.mono, fontSize: ".44rem", color: R.muted }}>{video.client_name}</span>}
        </div>
        <button onClick={onClose} style={{ position: "absolute", top: "-2.5rem", right: 0, ...R.mono, fontSize: ".5rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted, background: "none", border: "none", cursor: "pointer" }}>✕ fechar</button>
      </div>
    </div>
  );
}

// ── Card do portfolio — deck com profundidade ─────────────────────────────────
function PortfolioCard({ video, position, onActivate, onOpen }: {
  video: RecVideo;
  position: number;   // -1 | 0 | 1  (0 = ativo)
  onActivate: () => void;
  onOpen:     () => void;
}) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const isActive  = position === 0;
  const [hov, setHov] = useState(false);

  // Toca preview muted só quando ativo + hover
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !video.video_url) return;
    if (isActive && hov) { el.play().catch(() => undefined); }
    else                 { el.pause(); el.currentTime = 0; }
  }, [isActive, hov, video.video_url]);

  // Pausa quando sai da viewport
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (!e.isIntersecting) { el.pause(); el.currentTime = 0; } }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const styles: Record<string, React.CSSProperties> = {
    "-1": { transform: "translateX(-52%) scale(0.78) rotate(-4deg)", opacity: 0.55, zIndex: 1 },
     "0": { transform: "translateX(0) scale(1) rotate(0deg)",        opacity: 1,    zIndex: 3 },
     "1": { transform: "translateX(52%) scale(0.78) rotate(4deg)",   opacity: 0.55, zIndex: 1 },
  };
  const st = styles[String(Math.max(-1, Math.min(1, position)))] ?? { transform: "scale(0.5)", opacity: 0, zIndex: 0 };

  return (
    <div
      onClick={isActive ? onOpen : onActivate}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "absolute",
        width: "320px", height: "400px",
        left: "50%", top: "50%",
        marginLeft: "-160px", marginTop: "-200px",
        overflow: "hidden",
        cursor: "pointer",
        border: `1px solid ${isActive ? `${R.red}60` : R.border}`,
        transition: "transform .55s cubic-bezier(.22,.68,0,1.2), opacity .4s ease, border-color .3s",
        ...st,
      }}
    >
      {/* Vídeo preview */}
      {video.video_url && (
        <video ref={videoRef} src={video.video_url} muted loop playsInline preload="metadata"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: hov && isActive ? 1 : 0, transition: "opacity .5s ease" }} />
      )}

      {/* Fundo */}
      <div style={{
        position: "absolute", inset: 0,
        background: hov && isActive && video.video_url
          ? "linear-gradient(to top, rgba(10,8,6,0.96) 0%, rgba(10,8,6,0.35) 50%, transparent 100%)"
          : `linear-gradient(155deg, rgba(8,4,2,0.93) 0%, rgba(22,10,5,0.84) 55%, rgba(10,6,4,0.96) 100%), url('${CAIS}') center/cover`,
        transition: "background .5s ease",
      }} />

      {/* Cantos do viewfinder — apenas no card ativo */}
      {isActive && (
        <>
          <div style={{ position: "absolute", top: "1rem", left: "1rem",  width: "16px", height: "16px", borderTop: `2px solid ${R.red}90`, borderLeft: `2px solid ${R.red}90` }} />
          <div style={{ position: "absolute", top: "1rem", right: "1rem", width: "16px", height: "16px", borderTop: `2px solid ${R.red}50`, borderRight: `2px solid ${R.red}50` }} />
          <div style={{ position: "absolute", bottom: "1rem", left: "1rem",  width: "16px", height: "16px", borderBottom: `2px solid ${R.red}90`, borderLeft: `2px solid ${R.red}90` }} />
          <div style={{ position: "absolute", bottom: "1rem", right: "1rem", width: "16px", height: "16px", borderBottom: `2px solid ${R.red}50`, borderRight: `2px solid ${R.red}50` }} />
          {/* Linha inferior */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(to right, ${R.red}, ${R.red}40, transparent)` }} />
          {/* Linha lateral esquerda */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "2px", height: "35%", background: `linear-gradient(to bottom, ${R.red}60, transparent)` }} />
        </>
      )}

      {/* Conteúdo */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "1.2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ ...R.mono, fontSize: ".44rem", letterSpacing: ".2em", color: isActive ? R.red : R.muted }}>
            {String(video.sort_order + 1).padStart(2, "0")}
          </span>
          <span style={{ ...R.mono, fontSize: ".44rem", letterSpacing: ".16em", textTransform: "uppercase", color: R.muted }}>
            {video.category ?? ""}
          </span>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* Anel orbital no card ativo */}
            {isActive && (
              <div className="rec-card-orbit" style={{ position: "absolute", inset: "-10px", border: `1px solid ${R.red}30`, borderRadius: "50%" }} />
            )}
            <Play style={{ width: "22px", height: "22px", color: isActive ? R.red : R.muted, opacity: isActive ? 0.9 : 0.4 }} strokeWidth={1.5} />
          </div>
        </div>

        <div>
          <p style={{ ...R.mono, fontSize: ".44rem", letterSpacing: ".18em", textTransform: "uppercase", color: R.muted, marginBottom: ".3rem" }}>
            {video.client_name ?? "LOKAT.REC"}
          </p>
          <p style={{ ...R.grotesk, fontSize: "1.15rem", fontWeight: 700, color: isActive ? R.text : "#7a6a5a", lineHeight: 1, letterSpacing: "-.01em" }}>
            {video.title.toUpperCase()}
          </p>
          {isActive && video.video_url && (
            <p style={{ ...R.mono, fontSize: ".42rem", letterSpacing: ".14em", color: `${R.muted}90`, marginTop: ".35rem" }}>
              passe o mouse para preview · clique para abrir
            </p>
          )}
          {isActive && !video.video_url && (
            <p style={{ ...R.mono, fontSize: ".42rem", letterSpacing: ".14em", color: `${R.muted}70`, marginTop: ".35rem" }}>
              vídeo indisponível
            </p>
          )}
        </div>
      </div>

      <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
    </div>
  );
}

// ── Seção de feedback/depoimento Sandubão ─────────────────────────────────────
function FeedbackSection({ video, isMobile }: { video: RecVideo | null; isMobile: boolean }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const isInView   = useInView(sectionRef, { once: true, amount: 0.15 });
  const [playing,  setPlaying]  = useState(false);
  const [showCover,setShowCover] = useState(true);
  const [muted,    setMuted]    = useState(true);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const _yVid  = useSpring(useTransform(scrollYProgress, [0, 1], [50, -50]), { stiffness: 55, damping: 20 });
  const _yText = useSpring(useTransform(scrollYProgress, [0, 1], [30, -30]), { stiffness: 55, damping: 20 });
  const yVid  = isMobile ? 0 : _yVid;
  const yText = isMobile ? 0 : _yText;

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

  const handlePlay = () => {
    setShowCover(false);
    setPlaying(true);
    setTimeout(() => videoRef.current?.play().catch(() => undefined), 50);
  };

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el || !video?.video_url) return;
    if (el.paused) { el.play().catch(() => undefined); setPlaying(true); }
    else           { el.pause(); setPlaying(false); }
  };

  return (
    <section ref={sectionRef} style={{ position: "relative", padding: isMobile ? "4rem 0" : "8rem 0", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${R.bg} 0%, #100c06 50%, ${R.bg} 100%)`, pointerEvents: "none" }} />
      <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5 }} />
      <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: "3px", height: "40%", background: `linear-gradient(to bottom, transparent, ${R.red}45, transparent)`, pointerEvents: "none" }} />

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 2rem", position: "relative", zIndex: 1 }}>

        {/* Título */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: .8, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: "3rem" }}
        >
          <div>
            <p style={{ ...R.mono, fontSize: ".58rem", letterSpacing: ".2em", textTransform: "uppercase", color: R.red, marginBottom: ".4rem" }}>[Feedback real]</p>
            <h2 style={{ ...R.grotesk, fontSize: "clamp(1.6rem,3.5vw,2.4rem)", fontWeight: 700, color: R.text, lineHeight: 1.05 }}>
              Cliente falando<br />vale mais que promessa.
            </h2>
            <p style={{ ...R.grotesk, fontSize: ".9rem", color: R.muted, marginTop: ".6rem", maxWidth: "480px" }}>
              Um feedback real de quem passou por reposicionamento, criativos e retomada de presença.
            </p>
          </div>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "2rem" : "4rem", alignItems: "center" }}>
          {/* Vídeo */}
          <motion.div
            style={{ y: yVid, maxWidth: isMobile ? "340px" : "unset", margin: isMobile ? "0 auto" : "unset" }}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: .9, delay: .1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div style={{ position: "relative", border: `1px solid ${R.border}`, overflow: "hidden" }}>
              {video?.video_url ? (
                <>
                  {/* Cover / thumbnail antes de tocar */}
                  {showCover && (
                    <motion.div
                      onClick={handlePlay}
                      whileHover="hov"
                      style={{ position: "absolute", inset: 0, zIndex: 4, cursor: "pointer", background: `linear-gradient(155deg, #180e08 0%, #0e0804 60%, #1a0c06 100%)` }}
                    >
                      {/* Grain */}
                      <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.7 }} />
                      {/* Linha vermelha top */}
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(to right, ${R.red}, ${R.red}40, transparent)` }} />
                      {/* Cantos */}
                      <div style={{ position: "absolute", top: ".75rem", left: ".75rem", width: "16px", height: "16px", borderTop: `1px solid ${R.red}70`, borderLeft: `1px solid ${R.red}70` }} />
                      <div style={{ position: "absolute", top: ".75rem", right: ".75rem", width: "16px", height: "16px", borderTop: `1px solid ${R.red}40`, borderRight: `1px solid ${R.red}40` }} />
                      <div style={{ position: "absolute", bottom: ".75rem", left: ".75rem", width: "16px", height: "16px", borderBottom: `1px solid ${R.red}70`, borderLeft: `1px solid ${R.red}70` }} />
                      <div style={{ position: "absolute", bottom: ".75rem", right: ".75rem", width: "16px", height: "16px", borderBottom: `1px solid ${R.red}40`, borderRight: `1px solid ${R.red}40` }} />

                      {/* Conteúdo central */}
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center" }}>
                        {/* Ícone S */}
                        <div style={{ width: "64px", height: "64px", border: `1px solid ${R.red}40`, background: `${R.red}10`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.2rem" }}>
                          <span style={{ ...R.grotesk, fontSize: "1.6rem", fontWeight: 900, color: R.red, opacity: 0.7 }}>S</span>
                        </div>
                        <p style={{ ...R.mono, fontSize: ".44rem", letterSpacing: ".2em", textTransform: "uppercase", color: R.muted, marginBottom: ".5rem" }}>Sandubão · Hamburgueria</p>
                        <p style={{ ...R.grotesk, fontSize: "1rem", fontWeight: 700, color: R.text, lineHeight: 1.2, marginBottom: "1.8rem" }}>
                          O que o cliente<br />tem a dizer.
                        </p>
                        {/* Botão play */}
                        <motion.div
                          variants={{ hov: { scale: 1.1 } }}
                          style={{ width: "58px", height: "58px", border: `2px solid ${R.red}90`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `${R.red}18`, backdropFilter: "blur(4px)", marginBottom: ".75rem" }}
                        >
                          <Play style={{ width: "20px", height: "20px", color: R.red, marginLeft: "3px" }} strokeWidth={1.5} />
                        </motion.div>
                        <p style={{ ...R.mono, fontSize: ".42rem", letterSpacing: ".14em", textTransform: "uppercase", color: `${R.muted}90` }}>Toque para assistir</p>
                      </div>

                      {/* Aspect ratio placeholder */}
                      <div style={{ width: "100%", aspectRatio: "9/16", visibility: "hidden" }} />
                    </motion.div>
                  )}

                  <video ref={videoRef} src={video.video_url} muted={muted} playsInline preload="metadata"
                    style={{ width: "100%", display: "block", background: "#0a0806", aspectRatio: "9/16", objectFit: "cover" }} />
                  {!playing && !showCover && (
                    <div onClick={togglePlay} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,8,6,0.5)", cursor: "pointer", zIndex: 3 }}>
                      <div style={{ width: "60px", height: "60px", border: `1px solid ${R.red}80`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `${R.red}22`, backdropFilter: "blur(4px)" }}>
                        <Play style={{ width: "22px", height: "22px", color: R.red, marginLeft: "2px" }} strokeWidth={1.5} />
                      </div>
                    </div>
                  )}
                  {!showCover && (
                    <div style={{ position: "absolute", bottom: ".75rem", left: ".75rem", display: "flex", gap: ".4rem", zIndex: 3 }}>
                      <button onClick={togglePlay} style={{ width: "32px", height: "32px", background: "rgba(10,8,6,0.85)", border: `1px solid ${R.border}`, color: R.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        {playing ? <Pause style={{ width: "12px" }} /> : <Play style={{ width: "12px" }} />}
                      </button>
                      <button onClick={() => setMuted((m) => !m)} style={{ width: "32px", height: "32px", background: "rgba(10,8,6,0.85)", border: `1px solid ${R.border}`, color: R.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        {muted ? <VolumeX style={{ width: "12px" }} /> : <Volume2 style={{ width: "12px" }} />}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ width: "100%", aspectRatio: "9/16", background: "#14100a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: ".75rem" }}>
                  <Video style={{ width: "32px", height: "32px", color: R.muted, opacity: 0.4 }} strokeWidth={1} />
                  <p style={{ ...R.mono, fontSize: ".5rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted, opacity: 0.6 }}>Vídeo indisponível</p>
                </div>
              )}
              <div style={{ position: "absolute", top: ".75rem", left: ".75rem", width: "14px", height: "14px", borderTop: `1px solid ${R.red}55`, borderLeft: `1px solid ${R.red}55`, pointerEvents: "none", zIndex: 5 }} />
              <div style={{ position: "absolute", bottom: ".75rem", right: ".75rem", width: "14px", height: "14px", borderBottom: `1px solid ${R.red}30`, borderRight: `1px solid ${R.red}30`, pointerEvents: "none", zIndex: 5 }} />
            </div>
            <div style={{ marginTop: ".75rem", display: "flex", alignItems: "center", gap: ".6rem" }}>
              <div style={{ width: "6px", height: "6px", background: R.red, borderRadius: "50%", flexShrink: 0 }} />
              <span style={{ ...R.mono, fontSize: ".48rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted }}>
                Sandubão · Hamburgueria · Floriano — PI
              </span>
            </div>
          </motion.div>

          {/* Texto do case */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: .9, delay: .2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div style={{ ...R.mono, fontSize: "3rem", color: R.red, opacity: 0.35, lineHeight: 1, marginBottom: ".5rem" }}>"</div>
            <p style={{ ...R.grotesk, fontSize: "1.1rem", fontWeight: 600, color: R.text, lineHeight: 1.45, marginBottom: "1.5rem" }}>
              A Sandubão já tinha história, mas precisava voltar para o jogo com clareza.
            </p>
            <p style={{ ...R.grotesk, fontSize: ".88rem", lineHeight: 1.8, color: R.muted, marginBottom: "2rem" }}>
              A marca já existia no mercado, mas uma pausa na operação dificultou a retomada. O trabalho foi reorganizar a comunicação, reacostumar o público e voltar a vender com mais clareza — sem parecer recomeço forçado.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem", borderLeft: `2px solid ${R.red}35`, paddingLeft: "1.2rem" }}>
              {[
                ["Cliente",   "Sandubão"],
                ["Nicho",     "Hamburgueria"],
                ["Serviço",   "Remarketing · Posicionamento · Criativos"],
                ["Resultado", "Retomada de presença e comunicação organizada"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: ".75rem", alignItems: "baseline" }}>
                  <span style={{ ...R.mono, fontSize: ".44rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted, minWidth: "80px" }}>{k}</span>
                  <span style={{ ...R.grotesk, fontSize: ".82rem", fontWeight: 600, color: R.text }}>{v}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Seção: Filme de 15 anos ───────────────────────────────────────────────────
const FILME_YT   = "fkImA1oe_3E";
const FILME_THUMB = `https://img.youtube.com/vi/${FILME_YT}/maxresdefault.jpg`;

function FilmeSection({ isMobile }: { isMobile: boolean }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [playing,  setPlaying] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const _yFrame  = useSpring(useTransform(scrollYProgress, [0, 1], [70, -70]),  { stiffness: 55, damping: 20 });
  const _yText   = useSpring(useTransform(scrollYProgress, [0, 1], [40, -40]),  { stiffness: 55, damping: 20 });
  const _scale   = useSpring(useTransform(scrollYProgress, [0, 0.4], [0.9, 1]), { stiffness: 80, damping: 22 });

  // Mobile: sem parallax, sem fade por scroll (usa whileInView direto)
  const yFrame  = isMobile ? 0 : _yFrame;
  const yText   = isMobile ? 0 : _yText;
  const scale   = isMobile ? 1 : _scale;
  const opacity = isMobile ? 1 : undefined;

  return (
    <section ref={sectionRef} style={{ position: "relative", padding: "10rem 0", overflow: "hidden", background: `linear-gradient(180deg, ${R.bg} 0%, #0e0a06 50%, ${R.bg} 100%)` }}>
      <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: "3px", height: "60%", background: `linear-gradient(to bottom, transparent, ${R.red}40, transparent)`, pointerEvents: "none" }} />
      <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.45 }} />

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 2rem", position: "relative", zIndex: 1 }}>

        {/* Headline */}
        <motion.div
          style={{ y: yText, opacity }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: .8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p style={{ ...R.mono, fontSize: ".58rem", letterSpacing: ".22em", textTransform: "uppercase", color: R.red, marginBottom: ".6rem" }}>[Produção especial]</p>
          <h2 style={{ ...R.grotesk, fontSize: "clamp(2rem,5.5vw,4rem)", fontWeight: 700, lineHeight: .96, letterSpacing: "-.03em", color: R.text, maxWidth: "680px", marginBottom: "1.2rem" }}>
            O dia dela,<br />
            <em style={{ fontStyle: "italic", color: R.red }}>gravado pra durar</em><br />
            para sempre.
          </h2>
          <div style={{ height: "2px", width: "48px", background: R.red, marginBottom: "1.4rem" }} />
          <p style={{ ...R.grotesk, fontSize: ".9rem", lineHeight: 1.75, color: R.muted, maxWidth: "460px" }}>
            XV anos. Um momento único que merecia mais do que fotos — merecia um filme com começo, meio e emoção real.
          </p>
        </motion.div>

        {/* Frame com parallax */}
        <motion.div
          style={{ y: yFrame, scale, opacity, marginTop: "4rem", position: "relative" }}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 1, delay: .1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Cantos decorativos */}
          {[
            { top: "-.75rem", left: "-.75rem", borderTop: `2px solid ${R.red}70`, borderLeft: `2px solid ${R.red}70` },
            { top: "-.75rem", right: "-.75rem", borderTop: `2px solid ${R.red}40`, borderRight: `2px solid ${R.red}40` },
            { bottom: "-.75rem", left: "-.75rem", borderBottom: `2px solid ${R.red}70`, borderLeft: `2px solid ${R.red}70` },
            { bottom: "-.75rem", right: "-.75rem", borderBottom: `2px solid ${R.red}40`, borderRight: `2px solid ${R.red}40` },
          ].map((s, i) => (
            <div key={i} style={{ position: "absolute", width: "22px", height: "22px", ...s, pointerEvents: "none" }} />
          ))}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(to right, ${R.red}, ${R.red}40, transparent)`, zIndex: 2, pointerEvents: "none" }} />

          {/* Thumbnail → iframe */}
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", border: `1px solid ${R.red}20`, background: "#0a0806" }}>
            {playing ? (
              <iframe
                src={`https://www.youtube.com/embed/${FILME_YT}?autoplay=1&rel=0&modestbranding=1&color=white`}
                title="Filme XV Maria Clara — LOKAT.REC"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
              />
            ) : (
              <motion.div
                onClick={() => setPlaying(true)}
                whileHover="hov"
                style={{ position: "absolute", inset: 0, cursor: "pointer", overflow: "hidden" }}
              >
                <img src={FILME_THUMB} alt="Filme XV Maria Clara" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

                {/* Overlay */}
                <motion.div
                  variants={{ hov: { opacity: 0.55 } }}
                  style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,8,6,0.96) 0%, rgba(10,8,6,0.55) 45%, rgba(10,8,6,0.2) 100%)", opacity: 0.72, transition: "opacity .4s" }}
                />

                {/* Badge no topo */}
                <div style={{ position: "absolute", top: "1.5rem", left: "1.8rem" }}>
                  <span style={{ ...R.mono, fontSize: ".46rem", letterSpacing: ".2em", textTransform: "uppercase", color: R.text, background: `${R.red}22`, border: `1px solid ${R.red}40`, padding: ".25rem .7rem", display: "inline-block" }}>
                    XV anos · Filme completo
                  </span>
                </div>

                {/* Título na thumbnail */}
                <div style={{ position: "absolute", bottom: "4.8rem", left: "1.8rem", right: "1.8rem" }}>
                  <p style={{ ...R.mono, fontSize: ".44rem", letterSpacing: ".18em", textTransform: "uppercase", color: `${R.red}cc`, marginBottom: ".35rem" }}>Maria Clara</p>
                  <p style={{ ...R.grotesk, fontSize: "clamp(1.2rem,2.8vw,2rem)", fontWeight: 700, color: R.text, lineHeight: 1.02, letterSpacing: "-.02em" }}>
                    O dia que ela<br />nunca vai esquecer.
                  </p>
                </div>

                {/* Botão play */}
                <div style={{ position: "absolute", bottom: "1.4rem", left: "1.8rem", display: "flex", alignItems: "center", gap: ".9rem" }}>
                  <motion.div
                    variants={{ hov: { scale: 1.1 } }}
                    style={{ width: "52px", height: "52px", border: `2px solid ${R.red}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `${R.red}22`, backdropFilter: "blur(6px)" }}
                  >
                    <Play style={{ width: "18px", height: "18px", color: R.red, marginLeft: "2px" }} strokeWidth={1.5} />
                  </motion.div>
                  <div>
                    <p style={{ ...R.mono, fontSize: ".46rem", letterSpacing: ".16em", textTransform: "uppercase", color: R.red }}>Assistir agora</p>
                    <p style={{ ...R.mono, fontSize: ".4rem", letterSpacing: ".1em", color: R.muted, marginTop: ".12rem" }}>YouTube · sem sair da página</p>
                  </div>
                </div>

                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(to right, ${R.red}, ${R.red}40, transparent)` }} />
              </motion.div>
            )}
          </div>

          <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: ".75rem" }}>
            <div style={{ width: "6px", height: "6px", background: R.red, borderRadius: "50%", flexShrink: 0 }} />
            <span style={{ ...R.mono, fontSize: ".44rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted }}>
              Maria Clara · XV anos · Filme de aniversário
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Formulário de contato — envia via WhatsApp ────────────────────────────────
function ContactForm() {
  const [nome,    setNome]    = useState("");
  const [email,   setEmail]   = useState("");
  const [wpp,     setWpp]     = useState("");
  const [msg,     setMsg]     = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const texto = [
      `Olá, sou ${nome || "alguém"} e tenho um projeto para a LOKAT.REC.`,
      email   ? `E-mail: ${email}` : "",
      wpp     ? `WhatsApp: ${wpp}` : "",
      msg     ? `Sobre a gravação: ${msg}` : "",
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/5589994217181?text=${encodeURIComponent(texto)}`, "_blank");
  };

  const fieldStyle: React.CSSProperties = { width: "100%", background: "rgba(20,16,10,0.9)", border: `1px solid ${R.border}`, color: R.text, padding: ".8rem 1rem", ...R.grotesk, fontSize: ".85rem", outline: "none", transition: "border-color .2s" };
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.currentTarget.style.borderColor = R.red);
  const blur  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.currentTarget.style.borderColor = R.border);

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: ".75rem", background: "rgba(10,8,6,0.75)", padding: "2rem", backdropFilter: "blur(12px)", border: `1px solid ${R.border}` }}>
      {[
        { label: "Nome / Empresa", ph: "Sua marca",              type: "text",  val: nome,  set: setNome },
        { label: "E-mail",         ph: "contato@suamarca.com.br", type: "email", val: email, set: setEmail },
        { label: "WhatsApp",       ph: "(89) 9 0000-0000",        type: "tel",   val: wpp,   set: setWpp },
      ].map(({ label, ph, type, val, set }) => (
        <div key={label}>
          <label style={{ ...R.mono, fontSize: ".5rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted, display: "block", marginBottom: ".4rem" }}>{label}</label>
          <input type={type} placeholder={ph} value={val} onChange={(e) => set(e.target.value)} style={fieldStyle} onFocus={focus} onBlur={blur} />
        </div>
      ))}
      <div>
        <label style={{ ...R.mono, fontSize: ".5rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted, display: "block", marginBottom: ".4rem" }}>Sobre a gravação</label>
        <textarea rows={3} placeholder="Tipo de vídeo, objetivo, prazo…" value={msg} onChange={(e) => setMsg(e.target.value)}
          style={{ ...fieldStyle, resize: "vertical" }} onFocus={focus} onBlur={blur} />
      </div>
      <button type="submit"
        style={{ background: R.red, color: "#fff", padding: ".9rem", ...R.mono, fontSize: ".68rem", letterSpacing: ".14em", textTransform: "uppercase", border: "none", cursor: "pointer", fontWeight: 700, transition: "background .2s" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#a02a20")}
        onMouseLeave={(e) => (e.currentTarget.style.background = R.red)}
      >■ Enviar no WhatsApp →</button>
    </form>
  );
}

// ── Hook: detecta mobile para desligar parallax ───────────────────────────────
function useIsMobile() {
  // Inicia detectando imediatamente para evitar re-render que causa flash
  const [mobile, setMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768 || navigator.maxTouchPoints > 0;
  });
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768 || navigator.maxTouchPoints > 0);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function LokatRecPage() {
  const isMobile = useIsMobile();
  // Mobile pula intro — animação pesada com drop-shadow trava GPU mobile
  const [introComplete, setIntroComplete] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768 || navigator.maxTouchPoints > 0;
  });
  const [dropPhase,     setDropPhase]     = useState<"purple" | "red">("purple");
  const [activeIdx,     setActiveIdx]     = useState(0);
  const [modalVideo,    setModalVideo]    = useState<RecVideo | null>(null);
  const [videos,        setVideos]        = useState<RecVideo[]>([]);
  const [feedbackVideo, setFeedbackVideo] = useState<RecVideo | null>(null);
  const [dataLoaded,    setDataLoaded]    = useState(false);

  const portfolioRef = useRef<HTMLDivElement>(null);
  const quemRef      = useRef<HTMLDivElement>(null);
  const contatoRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setDropPhase("red"), 800);
    const t2 = setTimeout(() => setIntroComplete(true), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Buscar vídeos: 1º tabela rec_videos, 2º storage listing, 3º STATIC_VIDEOS hardcoded
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setVideos(STATIC_VIDEOS);
      setFeedbackVideo(STATIC_FEEDBACK);
      setDataLoaded(true);
      return;
    }

    const load = async () => {
      // Tenta tabela primeiro
      let data = await getPublicRecVideos().catch(() => [] as RecVideo[]);

      // Tabela vazia ou não existe — lista direto do bucket
      if (data.length === 0) {
        data = await getVideosFromStorage().catch(() => [] as RecVideo[]);
      }

      const feedback = data.find((v) => v.is_feedback && v.is_featured)
        ?? data.find((v) => v.is_feedback)
        ?? (STATIC_FEEDBACK.video_url ? STATIC_FEEDBACK : null);
      const cards = data.filter((v) => v.show_in_cards && !v.is_feedback);

      setFeedbackVideo(feedback);
      setVideos(cards.length > 0 ? cards : STATIC_VIDEOS);
      setDataLoaded(true);
    };

    void load();
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth" });

  const prev = useCallback(() => setActiveIdx((i) => (i - 1 + videos.length) % videos.length), [videos.length]);
  const next = useCallback(() => setActiveIdx((i) => (i + 1) % videos.length), [videos.length]);

  const getPos = useCallback((idx: number) => {
    let p = idx - activeIdx;
    const half = Math.floor(videos.length / 2);
    if (p > half)  p -= videos.length;
    if (p < -half) p += videos.length;
    return Math.max(-1, Math.min(1, p));
  }, [activeIdx, videos.length]);

  return (
    <div style={{ background: R.bg, color: R.text, minHeight: "100vh", overflowX: "hidden" }}>

      {modalVideo && <VideoModal video={modalVideo} onClose={() => setModalVideo(null)} />}

      {/* ── INTRO ────────────────────────────────────────────────── */}
      {!introComplete && (
        <div className="rec-intro-overlay" style={{ position: "fixed", inset: 0, zIndex: 100, background: R.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}>
          <div className={`rec-drop-float ${dropPhase === "red" ? "rec-drop-morph" : ""}`}>
            <RecDrop size={110} phase={dropPhase} />
          </div>
          <span style={{ ...R.mono, fontSize: ".65rem", letterSpacing: ".3em", textTransform: "uppercase", color: dropPhase === "red" ? R.red : "#7b6ef6", transition: "color 1.4s ease" }}>
            LOKAT.REC
          </span>
        </div>
      )}

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <header className="rec-menu-in" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".9rem 1.25rem", background: "rgba(10,8,6,0.92)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: `1px solid ${R.border}` }}>
        <span style={{ ...R.mono, fontSize: ".82rem", letterSpacing: ".08em", fontWeight: 700, color: R.text }}>
          LOKAT<span style={{ color: R.red }}>.</span><span style={{ color: R.red }}>REC</span>
        </span>
        {!isMobile && (
          <nav style={{ display: "flex", gap: "2rem" }}>
            {[["Trabalhos", portfolioRef], ["Quem somos", quemRef], ["Contato", contatoRef]].map(([label, ref]) => (
              <button key={label as string} onClick={() => scrollTo(ref as React.RefObject<HTMLDivElement>)}
                style={{ ...R.mono, fontSize: ".62rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted, background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color .2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = R.text)}
                onMouseLeave={(e) => (e.currentTarget.style.color = R.muted)}
              >{label as string}</button>
            ))}
          </nav>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          {isMobile && (
            <button onClick={() => scrollTo(contatoRef)}
              style={{ ...R.mono, fontSize: ".52rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted, background: "none", border: `1px solid ${R.border}`, cursor: "pointer", padding: ".3rem .65rem" }}>
              Contato
            </button>
          )}
          <Link href="/" className="rec-lokat-os-btn" style={{ ...R.mono, fontSize: ".52rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#c4baff", textDecoration: "none", display: "flex", alignItems: "center", gap: ".5rem", padding: ".35rem .75rem", border: "1px solid #7b6ef640", background: "#7b6ef610", position: "relative", overflow: "hidden", transition: "background .2s, border-color .2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#7b6ef620"; e.currentTarget.style.borderColor = "#7b6ef680"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#7b6ef610"; e.currentTarget.style.borderColor = "#7b6ef640"; }}
          ><ArrowLeft style={{ width: "11px" }} /> LOKAT OS</Link>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{ position: "relative", minHeight: "100vh", paddingTop: "5rem", overflow: "hidden", ...caisOverlay("hero", "center 55%") }}>
        <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "2px", background: `linear-gradient(to bottom, transparent, ${R.red}28 30%, ${R.red}18 70%, transparent)`, pointerEvents: "none" }} />

        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "14vh 2rem 6rem", position: "relative", zIndex: 1 }}>
          <div className="rec-hero-in" style={{ display: "flex", alignItems: "center", gap: "1.4rem", marginBottom: "2rem" }}>
            <div className="rec-drop-float"><RecDrop size={52} phase="red" /></div>
            <div>
              <span style={{ ...R.mono, fontSize: ".52rem", letterSpacing: ".24em", textTransform: "uppercase", color: R.muted, display: "block", marginBottom: ".3rem" }}>Produção audiovisual · Floriano PI</span>
              <div style={{ height: "1px", width: "80px", background: `linear-gradient(to right, ${R.red}, transparent)` }} />
            </div>
          </div>

          <h1 className="rec-hero-in-d1" style={{ ...R.grotesk, fontSize: "clamp(2rem,5.5vw,4.2rem)", fontWeight: 700, lineHeight: .96, letterSpacing: "-.03em", color: R.text, maxWidth: "680px", marginBottom: "1.5rem" }}>
            Vídeos com<br />
            <em style={{ fontStyle: "italic", color: R.red }}>direção, ritmo</em><br />
            e intenção.
          </h1>

          <span className="rec-divider rec-hero-in-d2" style={{ display: "block", marginBottom: "1.5rem" }} />

          <p className="rec-hero-in-d2" style={{ ...R.grotesk, fontSize: ".9rem", lineHeight: 1.75, color: R.muted, maxWidth: "400px", marginBottom: "2rem" }}>
            Campanhas, reels e peças audiovisuais para marcas locais venderem melhor sem parecer anúncio barato.
          </p>

          <div className="rec-hero-in-d3" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo(portfolioRef)} style={{ background: R.red, color: "#fff", padding: ".85rem 2rem", ...R.mono, fontSize: ".68rem", letterSpacing: ".14em", textTransform: "uppercase", border: "none", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: ".5rem" }}>
              <Play style={{ width: "14px" }} strokeWidth={2} /> Ver trabalhos
            </button>
            <button onClick={() => scrollTo(contatoRef)} style={{ background: "rgba(10,8,6,0.6)", color: R.text, border: `1px solid ${R.border}`, padding: ".85rem 1.8rem", ...R.mono, fontSize: ".68rem", letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer", backdropFilter: "blur(8px)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = R.red)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = R.border)}
            >Falar com a Lokat</button>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "120px", background: `linear-gradient(to bottom, transparent, ${R.bg})`, pointerEvents: "none" }} />
      </section>

      {/* ── PORTFOLIO / DECK DE CARTAS ─────────────────────────── */}
      <section ref={portfolioRef} style={{ padding: "6rem 0 8rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${R.bg} 0%, #100d08 40%, #14100a 60%, ${R.bg} 100%)`, pointerEvents: "none" }} />
        <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5 }} />

        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 2rem", position: "relative", zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: .8, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: "3rem" }}
          >
            <p style={{ ...R.mono, fontSize: ".58rem", letterSpacing: ".2em", textTransform: "uppercase", color: R.red, marginBottom: ".6rem" }}>[Trabalhos]</p>
            <h2 style={{ ...R.grotesk, fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 700, color: R.text, lineHeight: 1.05 }}>
              Passe o mouse.<br />O vídeo toca.
            </h2>
            <p style={{ ...R.grotesk, fontSize: ".82rem", color: R.muted, marginTop: ".6rem" }}>
              Clique no card ativo para assistir em tela cheia.
            </p>
          </motion.div>

          {/* Deck */}
          <div className="rec-case-carousel" style={{ position: "relative", height: isMobile ? "340px" : "440px", userSelect: "none", overflow: "hidden" }}>
            {dataLoaded
              ? videos.map((video, idx) => {
                  const pos    = getPos(idx);
                  const hidden = Math.abs(pos) > 1;
                  return (
                    <div key={video.id} style={{ pointerEvents: hidden ? "none" : "auto" }}>
                      <PortfolioCard
                        video={video}
                        position={pos}
                        onActivate={() => setActiveIdx(idx)}
                        onOpen={() => setModalVideo(video)}
                      />
                    </div>
                  );
                })
              : (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ ...R.mono, fontSize: ".55rem", letterSpacing: ".18em", textTransform: "uppercase", color: R.muted }}>Carregando…</p>
                </div>
              )
            }
          </div>

          {/* Nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2rem", marginTop: "2rem" }}>
            <button onClick={prev} aria-label="Anterior"
              style={{ width: "44px", height: "44px", border: `1px solid ${R.border}`, background: "transparent", color: R.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "border-color .2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = R.red)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = R.border)}
            ><ChevronLeft style={{ width: "18px" }} strokeWidth={1.5} /></button>

            <div style={{ display: "flex", gap: ".5rem" }}>
              {videos.map((_, i) => (
                <button key={i} onClick={() => setActiveIdx(i)}
                  style={{ width: i === activeIdx ? "20px" : "6px", height: "6px", background: i === activeIdx ? R.red : R.border, border: "none", cursor: "pointer", transition: "all .3s ease", padding: 0 }}
                />
              ))}
            </div>

            <button onClick={next} aria-label="Próximo"
              style={{ width: "44px", height: "44px", border: `1px solid ${R.border}`, background: "transparent", color: R.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "border-color .2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = R.red)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = R.border)}
            ><ChevronRight style={{ width: "18px" }} strokeWidth={1.5} /></button>
          </div>

          {/* Label do card ativo */}
          {videos[activeIdx] && (
            <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
              <p style={{ ...R.mono, fontSize: ".48rem", letterSpacing: ".2em", textTransform: "uppercase", color: R.muted }}>
                {videos[activeIdx].client_name ?? "LOKAT.REC"} · {videos[activeIdx].category}
              </p>
              <p style={{ ...R.grotesk, fontSize: "1.25rem", fontWeight: 700, color: R.text, marginTop: ".2rem" }}>
                {videos[activeIdx].title}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── FEEDBACK SANDUBÃO ─────────────────────────────────────── */}
      <FeedbackSection video={feedbackVideo} isMobile={isMobile} />

      {/* ── FILME 15 ANOS ─────────────────────────────────────────── */}
      <FilmeSection isMobile={isMobile} />

      {/* ── PROCESSO ──────────────────────────────────────────────── */}
      <section style={{ background: R.bg, padding: "6rem 0", position: "relative" }}>
        <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.35 }} />
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 2rem", position: "relative", zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: .8, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: "3rem" }}
          >
            <p style={{ ...R.mono, fontSize: ".58rem", letterSpacing: ".2em", textTransform: "uppercase", color: R.red, marginBottom: ".6rem" }}>[Como fazemos]</p>
            <h2 style={{ ...R.grotesk, fontSize: "clamp(1.5rem,3.5vw,2.2rem)", fontWeight: 700, color: R.text, lineHeight: 1.05 }}>Do roteiro ao resultado.</h2>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: "1px", background: R.border }}>
            {[
              { n: "01", t: "Roteiro",   d: "Briefing, conceito e estrutura do vídeo antes de ligar a câmera." },
              { n: "02", t: "Captação",  d: "Direção de cena, enquadramento, luz e ritmo de produção no set." },
              { n: "03", t: "Edição",    d: "Corte, trilha, texto e identidade visual alinhados à marca." },
              { n: "04", t: "Resultado", d: "Peça pronta para publicação, campanha ou distribuição orgânica." },
            ].map(({ n, t, d }) => (
              <div key={n} style={{ background: R.bg, padding: "2rem 1.5rem" }}>
                <span style={{ ...R.mono, fontSize: ".7rem", color: R.red, display: "block", marginBottom: ".75rem" }}>{n}</span>
                <p style={{ ...R.grotesk, fontSize: "1rem", fontWeight: 700, color: R.text, marginBottom: ".5rem" }}>{t}</p>
                <p style={{ ...R.grotesk, fontSize: ".8rem", lineHeight: 1.65, color: R.muted }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUEM SOMOS ────────────────────────────────────────────── */}
      <section ref={quemRef} style={{ background: R.bg, position: "relative", overflow: "hidden" }}>
        <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.6 }} />
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "6rem 2rem", position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "2rem" : "5rem", alignItems: "center" }}>
            {!isMobile && <div>
              <div style={{ width: "100%", aspectRatio: "4/5", overflow: "hidden", border: `1px solid ${R.border}`, ...caisOverlay("qs", "center 60%"), position: "relative" }}>
                <div className="rec-grain" style={{ position: "absolute", inset: 0 }} />
                <div style={{ position: "absolute", bottom: "2rem", left: "2rem", right: "2rem", zIndex: 1 }}>
                  <p style={{ ...R.grotesk, fontSize: "2rem", fontWeight: 700, color: R.text, lineHeight: 1, opacity: .4 }}>QUEM</p>
                  <p style={{ ...R.grotesk, fontSize: "2rem", fontWeight: 700, color: R.red, lineHeight: 1 }}>SOMOS.</p>
                </div>
              </div>
            </div>}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: .9, ease: [0.16, 1, 0.3, 1] }}
            >
              <p style={{ ...R.mono, fontSize: ".58rem", letterSpacing: ".2em", textTransform: "uppercase", color: R.red, marginBottom: ".6rem" }}>[Quem somos]</p>
              <h2 style={{ ...R.grotesk, fontSize: "clamp(1.5rem,3.5vw,2.2rem)", fontWeight: 700, color: R.text, lineHeight: 1.05, marginBottom: "1.5rem" }}>
                Câmera, roteiro<br />e intenção de campanha.
              </h2>
              <span className="rec-divider" />
              <p style={{ ...R.grotesk, fontSize: ".9rem", lineHeight: 1.8, color: R.muted, marginBottom: "1rem" }}>
                Somos a frente audiovisual da LOKAT. Uma produtora que filma marcas locais com olhar de campanha, não só câmera ligada.
              </p>
              <p style={{ ...R.grotesk, fontSize: ".9rem", lineHeight: 1.8, color: R.muted }}>
                Roteiro, direção, gravação e edição organizados para transformar conteúdo em presença real.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CONTATO ───────────────────────────────────────────────── */}
      <section ref={contatoRef} style={{ position: "relative", overflow: "hidden", ...caisOverlay("contato", "center 45%") }}>
        <div className="rec-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "80px", background: `linear-gradient(to bottom, ${R.bg}, transparent)`, pointerEvents: "none" }} />
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "8rem 2rem", position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "3rem" : "5rem", alignItems: "start" }}>
            <div>
              <p style={{ ...R.mono, fontSize: ".58rem", letterSpacing: ".2em", textTransform: "uppercase", color: R.red, marginBottom: ".6rem" }}>[Contato]</p>
              <h2 style={{ ...R.grotesk, fontSize: "clamp(1.5rem,3.5vw,2.2rem)", fontWeight: 700, color: R.text, lineHeight: 1.05, marginBottom: "1rem" }}>Tem um projeto<br />em mente?</h2>
              <span className="rec-divider" />
              <p style={{ ...R.grotesk, fontSize: ".9rem", lineHeight: 1.8, color: R.muted, marginBottom: "2rem" }}>Conta sobre sua marca e o que você quer comunicar.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: R.border }}>
                {[
                  { label: "WhatsApp", sub: "(89) 9 9421-7181",       Icon: Video,  href: "https://wa.me/5589994217181?text=Ol%C3%A1%2C%20vi%20a%20LOKAT.REC%20e%20tenho%20um%20projeto%20em%20mente." },
                  { label: "E-mail",   sub: "lokat.rec@hotmail.com",   Icon: Mail,  href: "mailto:lokat.rec@hotmail.com" },
                  { label: "Instagram",sub: "@Lokat.rec",              Icon: AtSign, href: "https://instagram.com/lokat.rec" },
                ].map(({ label, sub, Icon, href }) => (
                  <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "rgba(20,16,10,0.85)", textDecoration: "none", transition: "background .2s", backdropFilter: "blur(6px)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30,22,12,0.9)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(20,16,10,0.85)")}
                  >
                    <div style={{ width: "36px", height: "36px", background: `${R.red}18`, border: `1px solid ${R.red}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon style={{ width: "14px", height: "14px", color: R.red }} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p style={{ ...R.mono, fontSize: ".48rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted }}>{label}</p>
                      <p style={{ ...R.grotesk, fontSize: ".82rem", color: R.text, fontWeight: 600 }}>{sub}</p>
                    </div>
                    <div style={{ marginLeft: "auto", ...R.mono, fontSize: ".44rem", color: R.red }}>→</div>
                  </a>
                ))}
              </div>
            </div>

            <ContactForm />
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "80px", background: `linear-gradient(to bottom, transparent, ${R.bg})`, pointerEvents: "none" }} />
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${R.border}`, padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", textAlign: "center", background: R.bg }}>
        <span style={{ ...R.mono, fontSize: ".7rem", letterSpacing: ".1em", fontWeight: 700, color: R.text }}>LOKAT<span style={{ color: R.red }}>.</span><span style={{ color: R.red }}>REC</span></span>
        <p style={{ ...R.mono, fontSize: ".48rem", letterSpacing: ".14em", textTransform: "uppercase", color: R.muted }}>Floriano — PI · Brasil · Desde 2022</p>
        <Link href="/" style={{ ...R.mono, fontSize: ".5rem", letterSpacing: ".12em", textTransform: "uppercase", color: R.muted, textDecoration: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = R.text)}
          onMouseLeave={(e) => (e.currentTarget.style.color = R.muted)}
        >← LOKAT OS</Link>
      </footer>
    </div>
  );
}
