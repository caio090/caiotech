"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { DiagnosticProgress } from "./_components/diagnostic-progress";
import { DiagnosticOptionCard } from "./_components/diagnostic-option-card";
import { DiagnosticSuccess } from "./_components/diagnostic-success";

// ── Tokens visuais ────────────────────────────────────────────────────────────
const T = {
  bg:     "#07060f",
  card:   "#0d0b1a",
  border: "#1e1830",
  text:   "#f0ecff",
  muted:  "#8070aa",
  purple: "#7b6ef6",
  lite:   "#c4baff",
  grotesk: { fontFamily: "'Space Grotesk', sans-serif" } as React.CSSProperties,
  mono:   { fontFamily: "'Space Mono', monospace" } as React.CSSProperties,
};

// ── Opções do diagnóstico ─────────────────────────────────────────────────────
const BUSINESS_TYPES = [
  "Academia", "Restaurante / Lanchonete", "Loja local",
  "Material de construção", "Clínica / Estética",
  "Mercado / Conveniência", "Prestador de serviço", "Outro",
];

const MARKETING_RESPONSIBLE = [
  "Eu mesmo", "Funcionário interno", "Social media freelancer",
  "Agência", "Ninguém cuida direito",
];

const MAIN_PROBLEMS = [
  "Falta de conteúdo", "Poucas mensagens no WhatsApp", "Instagram parado",
  "Pouca venda", "Falta de campanha", "Não sei o que postar",
  "Não tenho relatório", "Atendimento bagunçado",
];

const CONTACT_TIMES = [
  "Manhã (8h–12h)", "Tarde (12h–18h)", "Noite (18h–21h)", "Qualquer horário",
];

// ── Estado do form ────────────────────────────────────────────────────────────
interface FormState {
  business_type: string;
  marketing_responsible: string;
  main_problem: string;
  full_name: string;
  company_name: string;
  instagram: string;
  whatsapp: string;
  best_contact_time: string;
}

const EMPTY: FormState = {
  business_type: "", marketing_responsible: "", main_problem: "",
  full_name: "", company_name: "", instagram: "", whatsapp: "", best_contact_time: "",
};

interface SubmitResult {
  lead_score: number;
  lead_temperature: string;
  offer_suggestion: string;
  advice: string;
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function DiagnosticoMarketingPage() {
  const [step, setStep] = useState(0); // 0 = hero
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const goTo = (s: number) => {
    setError("");
    setStep(s);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const validate = (): boolean => {
    if (step === 1 && !form.business_type)        { setError("Selecione o tipo de negócio.");           return false; }
    if (step === 2 && !form.marketing_responsible) { setError("Selecione quem cuida do marketing.");     return false; }
    if (step === 3 && !form.main_problem)          { setError("Selecione o principal problema.");        return false; }
    if (step === 4) {
      if (!form.full_name.trim())    { setError("Nome obrigatório.");       return false; }
      if (!form.company_name.trim()) { setError("Empresa obrigatória.");    return false; }
      if (!form.whatsapp.trim())     { setError("WhatsApp obrigatório.");   return false; }
      if (form.whatsapp.replace(/\D/g, "").length < 10) { setError("WhatsApp inválido."); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (step < 4) goTo(step + 1);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/marketing-diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao enviar. Tente novamente."); return; }
      setResult(data as SubmitResult);
      goTo(5);
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: T.bg, color: T.text, minHeight: "100vh" }}>

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: ".8rem 1.5rem",
        background: "rgba(7,6,15,0.92)",
        backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".8rem" }}>
          <span style={{ ...T.grotesk, fontSize: "1rem", fontWeight: 700, color: T.lite }}>LOKAT</span>
          <span style={{ ...T.mono, fontSize: ".55rem", letterSpacing: ".16em", textTransform: "uppercase", color: T.muted }}>
            Diagnóstico gratuito
          </span>
        </div>
        <Link href="/login" style={{ ...T.mono, fontSize: ".6rem", letterSpacing: ".1em", color: T.muted, textDecoration: "none", padding: ".35rem .7rem", border: `1px solid ${T.border}`, borderRadius: "6px" }}>
          Entrar
        </Link>
      </header>

      {/* ── HERO ────────────────────────────────────────────────── */}
      {step === 0 && (
        <section style={{ minHeight: "calc(100vh - 53px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 1.5rem" }}>
          <div style={{ maxWidth: "600px", textAlign: "center" }}>
            <p style={{ ...T.mono, fontSize: ".6rem", letterSpacing: ".22em", textTransform: "uppercase", color: T.purple, marginBottom: "1rem" }}>
              [Diagnóstico de Marketing Local]
            </p>
            <h1 style={{ ...T.grotesk, fontSize: "clamp(1.75rem, 6vw, 3rem)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-.02em", marginBottom: "1.25rem" }}>
              Descubra onde sua empresa está{" "}
              <span style={{ color: T.lite }}>perdendo clientes</span>{" "}
              no marketing
            </h1>
            <p style={{ ...T.grotesk, fontSize: "1rem", lineHeight: 1.7, color: T.muted, marginBottom: "2.5rem", maxWidth: "480px", margin: "0 auto 2.5rem" }}>
              Responda algumas perguntas rápidas e veja como sua empresa pode melhorar no Instagram, WhatsApp e vendas.
            </p>

            <button
              onClick={() => goTo(1)}
              style={{
                ...T.grotesk,
                padding: "1rem 2.5rem",
                background: T.purple,
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: "pointer",
                width: "100%",
                maxWidth: "360px",
                transition: "opacity .2s",
              }}
            >
              Começar diagnóstico
            </button>

            <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginTop: "2.5rem" }}>
              {["Gratuito", "2 minutos", "Resultado imediato"].map((t) => (
                <span key={t} style={{ ...T.mono, fontSize: ".58rem", letterSpacing: ".1em", textTransform: "uppercase", color: "#4a3d70" }}>{t}</span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FORM STEPS ──────────────────────────────────────────── */}
      {step >= 1 && step <= 4 && (
        <div ref={formRef} style={{ minHeight: "calc(100vh - 53px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "3rem 1.5rem" }}>
          <div style={{ width: "100%", maxWidth: "520px" }}>
            <DiagnosticProgress step={step} total={4} />

            <div style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: "16px",
              padding: "clamp(1.5rem, 5vw, 2.5rem)",
            }}>

              {/* Step 1 */}
              {step === 1 && (
                <StepCard
                  question="Qual tipo de negócio melhor representa sua empresa?"
                  options={BUSINESS_TYPES}
                  selected={form.business_type}
                  onSelect={(v) => setForm((f) => ({ ...f, business_type: v }))}
                />
              )}

              {/* Step 2 */}
              {step === 2 && (
                <StepCard
                  question="Hoje, quem cuida do marketing da sua empresa?"
                  options={MARKETING_RESPONSIBLE}
                  selected={form.marketing_responsible}
                  onSelect={(v) => setForm((f) => ({ ...f, marketing_responsible: v }))}
                />
              )}

              {/* Step 3 */}
              {step === 3 && (
                <StepCard
                  question="Qual o maior problema do seu marketing hoje?"
                  options={MAIN_PROBLEMS}
                  selected={form.main_problem}
                  onSelect={(v) => setForm((f) => ({ ...f, main_problem: v }))}
                />
              )}

              {/* Step 4 — dados do lead */}
              {step === 4 && (
                <div>
                  <p style={{ ...T.mono, fontSize: ".58rem", letterSpacing: ".18em", textTransform: "uppercase", color: T.purple, marginBottom: ".5rem" }}>
                    [Seus dados]
                  </p>
                  <h3 style={{ ...T.grotesk, fontSize: "1.15rem", fontWeight: 700, color: T.text, marginBottom: "1.5rem" }}>
                    Para onde enviamos seu diagnóstico?
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <Input label="Nome completo *" value={form.full_name} placeholder="Seu nome"
                      onChange={(v) => setForm((f) => ({ ...f, full_name: v }))} />
                    <Input label="Nome da empresa *" value={form.company_name} placeholder="Nome do negócio"
                      onChange={(v) => setForm((f) => ({ ...f, company_name: v }))} />
                    <Input label="WhatsApp *" value={form.whatsapp} placeholder="(89) 99999-9999" type="tel"
                      onChange={(v) => setForm((f) => ({ ...f, whatsapp: v }))} />
                    <Input label="Instagram da empresa" value={form.instagram} placeholder="@suaempresa"
                      onChange={(v) => setForm((f) => ({ ...f, instagram: v }))} />

                    <div>
                      <label style={{ ...T.mono, fontSize: ".6rem", letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, display: "block", marginBottom: ".5rem" }}>
                        Melhor horário para contato
                      </label>
                      <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                        {CONTACT_TIMES.map((t) => (
                          <DiagnosticOptionCard key={t} label={t} selected={form.best_contact_time === t}
                            onSelect={() => setForm((f) => ({ ...f, best_contact_time: t }))} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Erro */}
              {error && (
                <p style={{ ...T.grotesk, fontSize: ".8rem", color: "#ef4444", marginTop: "1rem", padding: ".6rem .9rem", background: "rgba(239,68,68,0.08)", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {error}
                </p>
              )}

              {/* Botões */}
              <div style={{ display: "flex", gap: ".75rem", marginTop: "1.75rem" }}>
                <button
                  type="button"
                  onClick={() => goTo(step - 1)}
                  style={{ ...T.grotesk, padding: ".85rem 1.1rem", background: "transparent", border: `1px solid ${T.border}`, color: T.muted, borderRadius: "10px", cursor: "pointer", fontSize: ".88rem", flexShrink: 0 }}
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={step === 4 ? handleSubmit : handleNext}
                  disabled={loading}
                  style={{
                    ...T.grotesk,
                    flex: 1,
                    padding: ".85rem 1.4rem",
                    background: loading ? "#3a3260" : T.purple,
                    color: "#fff",
                    border: "none",
                    borderRadius: "10px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: ".95rem",
                    fontWeight: 700,
                    transition: "background .2s",
                  }}
                >
                  {loading ? "Enviando..." : step === 4 ? "Receber meu diagnóstico" : "Continuar →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUCESSO ─────────────────────────────────────────────── */}
      {step === 5 && result && (
        <div ref={formRef} style={{ minHeight: "calc(100vh - 53px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "3rem 1.5rem" }}>
          <div style={{ width: "100%", maxWidth: "520px" }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "clamp(1.5rem, 5vw, 2.5rem)" }}>
              <DiagnosticSuccess
                fullName={form.full_name}
                companyName={form.company_name}
                temperature={result.lead_temperature}
                offerSuggestion={result.offer_suggestion}
                advice={result.advice}
                score={result.lead_score}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-componentes internos ──────────────────────────────────────────────────

function StepCard({ question, options, selected, onSelect }: {
  question: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const T2 = { mono: { fontFamily: "'Space Mono', monospace" } as React.CSSProperties, grotesk: { fontFamily: "'Space Grotesk', sans-serif" } as React.CSSProperties };
  return (
    <div>
      <p style={{ ...T2.mono, fontSize: ".58rem", letterSpacing: ".18em", textTransform: "uppercase", color: "#7b6ef6", marginBottom: ".5rem" }}>
        [Pergunta]
      </p>
      <h3 style={{ ...T2.grotesk, fontSize: "1.15rem", fontWeight: 700, color: "#f0ecff", marginBottom: "1.5rem", lineHeight: 1.35 }}>
        {question}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: ".55rem" }}>
        {options.map((opt) => (
          <DiagnosticOptionCard key={opt} label={opt} selected={selected === opt} onSelect={() => onSelect(opt)} />
        ))}
      </div>
    </div>
  );
}

function Input({ label, value, placeholder, type = "text", onChange }: {
  label: string; value: string; placeholder: string; type?: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={{ fontFamily: "'Space Mono', monospace", fontSize: ".6rem", letterSpacing: ".1em", textTransform: "uppercase", color: "#8070aa", display: "block", marginBottom: ".4rem" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: ".85rem 1rem",
          background: "rgba(255,255,255,0.04)",
          border: "1.5px solid #1e1830",
          borderRadius: "10px",
          color: "#f0ecff",
          fontSize: ".9rem",
          fontFamily: "'Space Grotesk', sans-serif",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color .18s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#7b6ef6")}
        onBlur={(e) => (e.target.style.borderColor = "#1e1830")}
      />
    </div>
  );
}
