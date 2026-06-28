"use client";
import { buildWhatsappUrl } from "@/lib/marketing-diagnostic";

interface SuccessProps {
  fullName: string;
  companyName: string;
  temperature: string;
  offerSuggestion: string;
  advice: string;
  score: number;
}

const TEMP_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  quente: { label: "Quente",  color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
  morno:  { label: "Morno",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  frio:   { label: "Frio",    color: "#60a5fa", bg: "rgba(96,165,250,0.12)"  },
};

export function DiagnosticSuccess({ fullName, companyName, temperature, offerSuggestion, advice, score }: SuccessProps) {
  const temp = TEMP_CONFIG[temperature] ?? TEMP_CONFIG.morno;
  const waUrl = buildWhatsappUrl(
    "5589994217181",
    `Olá, fiz o Diagnóstico de Marketing Local no site da Lokat e quero falar sobre os próximos passos.`
  );

  return (
    <div style={{ textAlign: "center", padding: "2rem 0 1rem" }}>
      {/* Ícone */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
        <div style={{
          width: "64px", height: "64px", borderRadius: "50%",
          background: "rgba(123,110,246,0.12)",
          border: "1.5px solid rgba(123,110,246,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.8rem",
        }}>
          ✓
        </div>
      </div>

      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "#f0ecff", marginBottom: ".5rem" }}>
        Diagnóstico recebido com sucesso
      </h2>
      <p style={{ color: "#8070aa", fontSize: ".9rem", marginBottom: "2rem", lineHeight: 1.6, maxWidth: "400px", margin: "0 auto 2rem" }}>
        A equipe da Lokat vai analisar suas respostas e entrar em contato pelo WhatsApp com os próximos passos.
      </p>

      {/* Temperatura */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", padding: ".4rem .9rem", borderRadius: "20px", background: temp.bg, border: `1px solid ${temp.color}40`, marginBottom: "1.5rem" }}>
        <span style={{ fontSize: ".65rem", letterSpacing: ".14em", textTransform: "uppercase", color: temp.color, fontFamily: "'Space Mono', monospace" }}>
          Lead {temp.label}
        </span>
        <span style={{ fontSize: ".65rem", color: temp.color, fontFamily: "'Space Mono', monospace" }}>
          · Score {score}
        </span>
      </div>

      {/* Resumo */}
      <div style={{
        background: "rgba(123,110,246,0.07)",
        border: "1px solid rgba(123,110,246,0.2)",
        borderRadius: "12px",
        padding: "1.4rem",
        marginBottom: "1.5rem",
        textAlign: "left",
      }}>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: ".6rem", letterSpacing: ".16em", textTransform: "uppercase", color: "#7b6ef6", marginBottom: ".8rem" }}>
          [Com base nas suas respostas]
        </p>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".88rem", color: "#c4baff", fontWeight: 600, marginBottom: ".4rem" }}>
          Oferta sugerida: {offerSuggestion}
        </p>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".84rem", color: "#8878aa", lineHeight: 1.55 }}>
          {advice}
        </p>

        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(123,110,246,0.15)" }}>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".78rem", color: "#6a6080", marginBottom: ".4rem" }}>
            Sua empresa precisa organizar melhor:
          </p>
          {["Conteúdo", "Campanhas", "Atendimento", "Acompanhamento comercial"].map((item) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".3rem" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#7b6ef6", flexShrink: 0 }} />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".82rem", color: "#9080b8" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          width: "100%",
          padding: "1rem",
          background: "#25D366",
          color: "#fff",
          borderRadius: "10px",
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: ".95rem",
          textDecoration: "none",
          textAlign: "center",
          marginBottom: ".8rem",
          transition: "opacity .2s",
        }}
      >
        Falar com a Lokat no WhatsApp
      </a>
    </div>
  );
}
