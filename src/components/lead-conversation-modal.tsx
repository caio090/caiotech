"use client";
import { useState, useEffect, useRef } from "react";
import { normalizeAccountType } from "@/lib/leads/normalize-lead-payload";

type Field = { name: string; label: string; type?: string; required?: boolean; options?: string[] };

const FIELDS: Field[] = [
  { name: "name",         label: "Seu nome",                required: true },
  { name: "email",        label: "Seu melhor e-mail",       type: "email", required: true },
  { name: "phone",        label: "WhatsApp (com DDD)",      type: "tel" },
  { name: "account_type", label: "Você é...",               options: ["Empresa / Negócio local", "Agência", "Autônomo / Freelancer", "Outro"] },
  { name: "main_problem", label: "Qual é o seu maior gargalo hoje?", options: ["Organizar conteúdo e aprovações", "Entender resultados de marketing", "Gestão de clientes / agência", "Conectar dados do negócio", "Outro"] },
  { name: "interest",     label: "O que você quer resolver primeiro?", options: ["Diagnóstico gratuito", "Demonstração guiada", "Falar com a equipe", "Só estou explorando"] },
];

type ModalState = {
  step:    number;
  values:  Record<string, string>;
  loading: boolean;
  done:    boolean;
  error:   string | null;
};

const INITIAL_STATE: ModalState = { step: 0, values: {}, loading: false, done: false, error: null };

interface Props {
  open:    boolean;
  onClose: () => void;
}

export function LeadConversationModal({ open, onClose }: Props) {
  const [s, setS]  = useState<ModalState>(INITIAL_STATE);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>(null);

  // State resets automatically when parent changes the `key` prop on re-open.
  // No effect needed here — see LeadConversationModal usage in page.tsx.

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, s.step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const field    = FIELDS[s.step];
  const value    = s.values[field.name] ?? "";
  const canNext  = !field.required || value.trim().length > 0;

  const setValues = (vals: Record<string, string>) => setS((p) => ({ ...p, values: vals }));
  const setStep   = (step: number)                  => setS((p) => ({ ...p, step }));

  const advance = () => {
    if (s.step < FIELDS.length - 1) {
      setStep(s.step + 1);
    } else {
      submit();
    }
  };

  const submit = async () => {
    setS((p) => ({ ...p, loading: true, error: null }));
    try {
      const mainProblem = s.values.main_problem ?? null;
      const interest    = s.values.interest ?? null;
      const payload = {
        name:         s.values.name ?? "",
        email:        s.values.email ?? "",
        phone:        s.values.phone ?? null,
        // normalizeAccountType maps "Empresa / Negócio local" → "business" etc.
        account_type: normalizeAccountType(s.values.account_type ?? null),
        interest:     [mainProblem, interest].filter(Boolean).join(" — ") || null,
        source:       "site_modal",
      };
      const res  = await fetch("/api/launch/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json() as { ok: boolean; message?: string; code?: string };
      if (json.ok) {
        setS((p) => ({ ...p, loading: false, done: true }));
      } else {
        setS((p) => ({ ...p, loading: false, error: json.message ?? "Erro ao enviar. Tente novamente." }));
      }
    } catch {
      setS((p) => ({ ...p, loading: false, error: "Erro de conexão. Tente novamente." }));
    }
  };

  const S = {
    bg:     "#0a0a0c",
    card:   "#13131a",
    border: "#222230",
    text:   "#e8e8e8",
    muted:  "#555566",
    accent: "#7b6ef6",
    mono:   { fontFamily: "'Space Mono', monospace" }     as React.CSSProperties,
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

        {s.done ? (
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
                {s.step + 1} / {FIELDS.length}
              </div>
              <div style={{ height: 2, background: S.border, borderRadius: 1 }}>
                <div style={{ height: "100%", width: `${((s.step + 1) / FIELDS.length) * 100}%`, background: S.accent, borderRadius: 1, transition: "width .3s ease" }} />
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
                    onClick={() => { setValues({ ...s.values, [field.name]: opt }); setTimeout(advance, 180); }}
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
                onChange={(e) => setValues({ ...s.values, [field.name]: e.target.value })}
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
                onChange={(e) => setValues({ ...s.values, [field.name]: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter" && canNext) advance(); }}
                placeholder={field.label}
                style={{ width: "100%", background: S.bg, border: `1px solid ${S.border}`, color: S.text, padding: ".75rem", ...S.grotesk, fontSize: ".9rem", outline: "none", boxSizing: "border-box" }}
              />
            )}

            {s.error && (
              <p style={{ ...S.mono, color: "#e05555", fontSize: ".7rem", marginTop: ".75rem" }}>{s.error}</p>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem" }}>
              <button
                onClick={() => s.step > 0 && setStep(s.step - 1)}
                disabled={s.step === 0}
                style={{ background: "none", border: "none", color: s.step > 0 ? S.muted : "transparent", cursor: s.step > 0 ? "pointer" : "default", ...S.mono, fontSize: ".68rem", letterSpacing: ".1em" }}
              >← Voltar</button>

              {!field.options && (
                <button
                  onClick={advance}
                  disabled={!canNext || s.loading}
                  style={{ background: canNext ? S.accent : S.border, color: "#fff", border: "none", padding: ".7rem 1.8rem", ...S.mono, fontSize: ".68rem", letterSpacing: ".14em", textTransform: "uppercase", cursor: canNext ? "pointer" : "default", transition: "background .2s", opacity: s.loading ? .7 : 1 }}
                >
                  {s.loading ? "Enviando..." : s.step === FIELDS.length - 1 ? "Enviar →" : "Próximo →"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
