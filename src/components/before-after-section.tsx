"use client";
import { useEffect, useRef, useState } from "react";
import { X, Check } from "lucide-react";

const S = {
  mono:   { fontFamily: "'Space Mono', monospace" } as React.CSSProperties,
  grotesk:{ fontFamily: "'Space Grotesk', sans-serif" } as React.CSSProperties,
  bg:     "#0a0a0c",
  card:   "#13131a",
  border: "#222230",
  text:   "#e8e8e8",
  muted:  "#555566",
  accent: "#7b6ef6",
};

const ANTES = [
  "Conteúdo aprovado por WhatsApp — sem rastreio",
  "Cliente sem saber o status do post",
  "Equipe sem prioridade definida",
  "Financeiro em planilha separada",
  "Relatório manual, demorado e impreciso",
  "Briefings espalhados em e-mail e drive",
  "Inadimplência descoberta tarde demais",
];

const DEPOIS = [
  "Aprovação por link público — com histórico e comentários",
  "Calendário acessível para o cliente em tempo real",
  "Equipe com tarefas, prioridade e status visíveis",
  "FinanceOS com cobranças, status e histórico",
  "Relatórios automáticos por cliente a cada mês",
  "Briefings gerados com IA e aprovados em fluxo único",
  "Inadimplência visível no painel com alerta automático",
];

export function BeforeAfterSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="max-w-6xl mx-auto px-4 md:px-6 pb-14 md:pb-20">
      <div className="mb-8 text-center">
        <p style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".18em", textTransform: "uppercase", color: S.accent, marginBottom: ".4rem" }}>[Transformação]</p>
        <h2 style={{ ...S.grotesk, fontSize: "clamp(1.4rem, 3.5vw, 2.4rem)", fontWeight: 700, color: S.text, lineHeight: 1.1 }}>Antes e depois</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1px", background: S.border, border: `1px solid ${S.border}` }}>
        {/* Antes */}
        <div
          className="p-6 md:p-8"
          style={{
            background: "#0d0d14",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateX(0)" : "translateX(-24px)",
            transition: "opacity 0.55s ease, transform 0.55s ease",
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <div style={{ width: "28px", height: "28px", background: "#ef444418", border: "1px solid #ef444430", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X style={{ width: "14px", height: "14px", color: "#ef4444" }} strokeWidth={2} />
            </div>
            <span style={{ ...S.mono, fontSize: ".65rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#ef4444" }}>Antes</span>
          </div>
          <ul className="space-y-3">
            {ANTES.map((item, i) => (
              <li
                key={item}
                className="flex items-start gap-2.5"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateX(0)" : "translateX(-12px)",
                  transition: `opacity 0.4s ease ${0.1 + i * 0.06}s, transform 0.4s ease ${0.1 + i * 0.06}s`,
                }}
              >
                <X style={{ width: "13px", height: "13px", color: "#ef4444", flexShrink: 0, marginTop: "3px" }} strokeWidth={2.5} />
                <span style={{ ...S.grotesk, fontSize: ".75rem", color: S.muted, lineHeight: 1.5 }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Depois */}
        <div
          className="p-6 md:p-8"
          style={{
            background: S.card,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateX(0)" : "translateX(24px)",
            transition: "opacity 0.55s ease 0.15s, transform 0.55s ease 0.15s",
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <div style={{ width: "28px", height: "28px", background: "#10b98118", border: "1px solid #10b98130", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check style={{ width: "14px", height: "14px", color: "#10b981" }} strokeWidth={2} />
            </div>
            <span style={{ ...S.mono, fontSize: ".65rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#10b981" }}>Depois da LOKAT OS</span>
          </div>
          <ul className="space-y-3">
            {DEPOIS.map((item, i) => (
              <li
                key={item}
                className="flex items-start gap-2.5"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateX(0)" : "translateX(12px)",
                  transition: `opacity 0.4s ease ${0.25 + i * 0.06}s, transform 0.4s ease ${0.25 + i * 0.06}s`,
                }}
              >
                <Check style={{ width: "13px", height: "13px", color: "#10b981", flexShrink: 0, marginTop: "3px" }} strokeWidth={2.5} />
                <span style={{ ...S.grotesk, fontSize: ".75rem", color: S.text, lineHeight: 1.5 }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
