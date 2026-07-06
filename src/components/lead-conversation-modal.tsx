"use client";
import { useState, useEffect, useRef } from "react";

type Field = { name: string; label: string; type?: string; required?: boolean; options?: string[] };

const FIELDS: Field[] = [
  { name: "name",         label: "Seu nome",                    required: true },
  { name: "phone",        label: "WhatsApp (com DDD)",          type: "tel" },
  { name: "account_type", label: "Você é...",                   options: ["Empresa / Negócio local", "Agência", "Autônomo / Freelancer", "Outro"] },
  { name: "interest",     label: "Principal objetivo",          options: ["Organizar conteúdo", "Conectar dados do negócio", "Gestão de clientes (agência)", "Aprovação de conteúdo", "Outro"] },
  { name: "message",      label: "Alguma mensagem? (opcional)", type: "textarea" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function LeadConversationModal({ open, onClose }: Props) {
  const [step, setStep]     = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const overlayRef          = useRef<HTMLDivElement>(null);
  const inputRef            = useRef<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>(null);

  useEffect(() => {
    if (open) { setStep(0); setValues({}); setDone(false); setError(null); }
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const field = FIELDS[step];
  const value = values[field.name] ?? "";

  const canAdvance = !field.required || value.trim().length > 0;

  const advance = () => {
    if (step < FIELDS.length - 1) {
      setStep(step + 1);
    } else {
      submit();
    }
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name:         values.name ?? "",
        email:        "", // email not collected here — saved with source=site_conversation
        phone:        values.phone ?? null,
        account_type: values.account_type ?? null,
        interest:     values.interest ?? null,
        source:       "site_conversation",
      };
      const res  = await fetch("/api/launch/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json() as { ok: boolean; message?: string; code?: string };
      if (!json.ok && json.code !== "missing_required_fields") {
        setError(json.message ?? "Erro ao enviar. Tente novamente.");
      } else {
        setDone(true);
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const S = {
    bg:     "#0a0a0c",
    card:   "#13131a",
    border: "#222230",
    text:   "#e8e8e8",
    muted:  "#555566",
    accent: "#7b6ef6",
    mono:   { fontFamily: "'Space Mono', monospace" } as React.CSSProperties,
    grotesk:{ fontFamily: "'Space Grotesk', sans-serif" } as React.CSSProperties,
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Agendar demonstração"
        style={{ background: S.card, border: `1px solid ${S.border}`, width: "100%", maxWidth: 480, padding: "2.5rem 2rem", position: "relative" }}
      >
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", color: S.muted, cursor: "pointer", fontSize: "1.1rem", lineHeight: 1 }}
        >✕</button>

        {done ? (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✦</div>
            <h2 style={{ ...S.grotesk, color: S.text, fontSize: "1.25rem", fontWeight: 700, marginBottom: ".5rem" }}>
              Conversa iniciada!
            </h2>
            <p style={{ ...S.grotesk, color: S.muted, fontSize: ".875rem", lineHeight: 1.6 }}>
              Nossa equipe vai entrar em contato em breve pelo WhatsApp ou e-mail.
            </p>
            <button
              onClick={onClose}
              style={{ marginTop: "1.5rem", background: S.accent, color: "#fff", border: "none", padding: ".75rem 2rem", ...S.mono, fontSize: ".7rem", letterSpacing: ".12em", textTransform: "uppercase", cursor: "pointer" }}
            >Fechar →</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "2rem" }}>
              <div style={{ ...S.mono, fontSize: ".58rem", letterSpacing: ".18em", textTransform: "uppercase", color: S.accent, marginBottom: ".5rem" }}>
                {step + 1} / {FIELDS.length}
              </div>
              <div style={{ height: 2, background: S.border, borderRadius: 1 }}>
                <div style={{ height: "100%", width: `${((step + 1) / FIELDS.length) * 100}%`, background: S.accent, borderRadius: 1, transition: "width .3s ease" }} />
              </div>
            </div>

            <h3 style={{ ...S.grotesk, color: S.text, fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem", lineHeight: 1.3 }}>
              {field.label}
            </h3>

            {field.options ? (
              <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                {field.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setValues({ ...values, [field.name]: opt }); setTimeout(advance, 180); }}
                    style={{
                      background: value === opt ? `${S.accent}20` : "transparent",
                      border: `1px solid ${value === opt ? S.accent : S.border}`,
                      color: value === opt ? S.accent : S.text,
                      padding: ".75rem 1rem",
                      textAlign: "left",
                      cursor: "pointer",
                      ...S.grotesk,
                      fontSize: ".875rem",
                      transition: "all .15s",
                    }}
                  >{opt}</button>
                ))}
              </div>
            ) : field.type === "textarea" ? (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={value}
                onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) advance(); }}
                rows={3}
                placeholder="Opcional..."
                style={{ width: "100%", background: S.bg, border: `1px solid ${S.border}`, color: S.text, padding: ".75rem", ...S.grotesk, fontSize: ".9rem", resize: "vertical", outline: "none", boxSizing: "border-box" }}
              />
            ) : (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type={field.type ?? "text"}
                value={value}
                onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter" && canAdvance) advance(); }}
                placeholder={field.label}
                style={{ width: "100%", background: S.bg, border: `1px solid ${S.border}`, color: S.text, padding: ".75rem", ...S.grotesk, fontSize: ".9rem", outline: "none", boxSizing: "border-box" }}
              />
            )}

            {error && (
              <p style={{ ...S.mono, color: "#e05555", fontSize: ".7rem", marginTop: ".75rem" }}>{error}</p>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem" }}>
              <button
                onClick={() => step > 0 && setStep(step - 1)}
                disabled={step === 0}
                style={{ background: "none", border: "none", color: step > 0 ? S.muted : "transparent", cursor: step > 0 ? "pointer" : "default", ...S.mono, fontSize: ".68rem", letterSpacing: ".1em" }}
              >← Voltar</button>

              {!field.options && (
                <button
                  onClick={advance}
                  disabled={!canAdvance || loading}
                  style={{ background: canAdvance ? S.accent : S.border, color: "#fff", border: "none", padding: ".7rem 1.8rem", ...S.mono, fontSize: ".68rem", letterSpacing: ".14em", textTransform: "uppercase", cursor: canAdvance ? "pointer" : "default", transition: "background .2s", opacity: loading ? .7 : 1 }}
                >
                  {loading ? "Enviando..." : step === FIELDS.length - 1 ? "Enviar →" : "Próximo →"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
