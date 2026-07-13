"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type FormState = "idle" | "submitting" | "success" | "error";

const PERFIS = [
  { value: "empresario",   label: "Empresário / gestor" },
  { value: "agencia",      label: "Agência" },
  { value: "cliente_lokat",label: "Cliente da LOKAT" },
  { value: "parceiro",     label: "Parceiro" },
  { value: "suporte",      label: "Suporte" },
  { value: "imprensa",     label: "Imprensa" },
  { value: "outro",        label: "Outro" },
];

const ASSUNTOS = [
  "Conhecer a plataforma",
  "Demonstração",
  "Parceria",
  "Suporte técnico",
  "Imprensa / assessoria",
  "Outro",
];

const S = {
  mono:   { fontFamily: "'Space Mono', monospace" }    as React.CSSProperties,
  grotesk:{ fontFamily: "'Space Grotesk', sans-serif" } as React.CSSProperties,
};

export default function ContatoPage() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({
    name: "", company: "", email: "", whatsapp: "",
    subject: "", message: "", perfil: "", consent: false,
    _hp: "",
  });

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { ok: boolean; message?: string };
      if (data.ok) {
        setState("success");
      } else {
        setState("error");
        setErrorMsg(data.message ?? "Erro ao enviar. Tente novamente.");
      }
    } catch {
      setState("error");
      setErrorMsg("Erro de conexão. Verifique sua internet e tente novamente.");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#13131a",
    border: "1px solid #222230",
    color: "#e8e8e8",
    padding: ".7rem .9rem",
    ...S.grotesk,
    fontSize: ".88rem",
    outline: "none",
    borderRadius: 0,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    ...S.mono,
    fontSize: ".58rem",
    letterSpacing: ".14em",
    textTransform: "uppercase",
    color: "#555566",
    marginBottom: ".4rem",
  };

  return (
    <div style={{ background: "#0a0a0c", minHeight: "100vh", color: "#e8e8e8" }}>
      <PublicHeader />

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-16">
        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ ...S.mono, fontSize: ".58rem", letterSpacing: ".2em", textTransform: "uppercase", color: "#7b6ef6", marginBottom: ".75rem" }}>
            Contato
          </div>
          <h1 style={{ ...S.grotesk, fontSize: "clamp(1.6rem, 5vw, 2.6rem)", fontWeight: 800, lineHeight: 1.1, color: "#e8e8e8", marginBottom: ".75rem" }}>
            Fale com a LOKAT.
          </h1>
          <p style={{ ...S.grotesk, fontSize: ".9rem", color: "#555566", lineHeight: 1.65, maxWidth: "460px" }}>
            Para demonstrações, parcerias, suporte ou qualquer dúvida. Respondemos por e-mail ou WhatsApp.
          </p>
          <div className="flex flex-wrap gap-4 mt-4">
            {[
              { href: "/diagnostico", label: "Diagnóstico gratuito →" },
              { href: "/pre-acesso",  label: "Lista beta →" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#7b6ef6", textDecoration: "none" }}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        {state === "success" ? (
          <SuccessState />
        ) : (
          <form onSubmit={handleSubmit} noValidate aria-label="Formulário de contato">
            {/* Honeypot */}
            <input
              type="text"
              name="_hp"
              value={form._hp}
              onChange={(e) => set("_hp", e.target.value)}
              style={{ position: "absolute", left: "-9999px", width: 0, height: 0, opacity: 0 }}
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="off"
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="c-name" style={labelStyle}>Nome*</label>
                  <input id="c-name" type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} style={inputStyle} placeholder="Seu nome" autoComplete="name" />
                </div>
                <div>
                  <label htmlFor="c-company" style={labelStyle}>Empresa</label>
                  <input id="c-company" type="text" value={form.company} onChange={(e) => set("company", e.target.value)} style={inputStyle} placeholder="Nome da empresa (opcional)" autoComplete="organization" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="c-email" style={labelStyle}>E-mail*</label>
                  <input id="c-email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} style={inputStyle} placeholder="seu@email.com" autoComplete="email" />
                </div>
                <div>
                  <label htmlFor="c-whatsapp" style={labelStyle}>WhatsApp <span style={{ color: "#44445a", fontSize: ".5rem" }}>(opcional)</span></label>
                  <input id="c-whatsapp" type="tel" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} style={inputStyle} placeholder="+55 (00) 00000-0000" autoComplete="tel" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="c-perfil" style={labelStyle}>Você é*</label>
                  <select id="c-perfil" required value={form.perfil} onChange={(e) => set("perfil", e.target.value)} style={{ ...inputStyle, cursor: "pointer", appearance: "none" } as React.CSSProperties} aria-label="Perfil">
                    <option value="">Selecione...</option>
                    {PERFIS.map((p) => <option key={p.value} value={p.value} style={{ background: "#13131a" }}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="c-subject" style={labelStyle}>Assunto*</label>
                  <select id="c-subject" required value={form.subject} onChange={(e) => set("subject", e.target.value)} style={{ ...inputStyle, cursor: "pointer", appearance: "none" } as React.CSSProperties} aria-label="Assunto">
                    <option value="">Selecione...</option>
                    {ASSUNTOS.map((a) => <option key={a} value={a} style={{ background: "#13131a" }}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="c-message" style={labelStyle}>Mensagem*</label>
                <textarea
                  id="c-message" required rows={5} value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  style={{ ...inputStyle, resize: "vertical", minHeight: 120 }}
                  placeholder="Descreva sua necessidade ou dúvida..."
                />
              </div>

              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={form.consent}
                    onChange={(e) => set("consent", e.target.checked)}
                    style={{ marginTop: "2px", flexShrink: 0, accentColor: "#7b6ef6" }}
                    aria-required="true"
                  />
                  <span style={{ ...S.grotesk, fontSize: ".78rem", color: "#888899", lineHeight: 1.55 }}>
                    Concordo com o tratamento dos meus dados conforme a{" "}
                    <Link href="/privacidade" style={{ color: "#7b6ef6", textDecoration: "none" }}>Política de Privacidade</Link>
                    {" "}e os{" "}
                    <Link href="/termos" style={{ color: "#7b6ef6", textDecoration: "none" }}>Termos de Uso</Link>.
                  </span>
                </label>
              </div>

              {state === "error" && (
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", background: "#c0392b12", border: "1px solid #c0392b30", padding: ".75rem 1rem" }} role="alert">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#c0392b" }} />
                  <span style={{ ...S.grotesk, fontSize: ".82rem", color: "#c0392b" }}>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={state === "submitting" || !form.name || !form.email || !form.subject || !form.message || !form.consent}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem", background: "#7b6ef6", color: "#fff", padding: ".85rem", ...S.mono, fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", border: "none", cursor: "pointer", fontWeight: 700, width: "100%", opacity: state === "submitting" ? .7 : 1, transition: "opacity .2s" }}
                aria-disabled={state === "submitting"}
              >
                {state === "submitting" ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Enviando...</>
                ) : (
                  "■ Enviar mensagem"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function SuccessState() {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem", border: "1px solid #7b6ef630", background: "#7b6ef608" }}>
      <CheckCircle className="w-10 h-10 mx-auto mb-4" style={{ color: "#7b6ef6" }} />
      <h2 style={{ ...S.grotesk, fontSize: "1.2rem", fontWeight: 700, color: "#e8e8e8", marginBottom: ".75rem" }}>
        Mensagem recebida!
      </h2>
      <p style={{ ...S.grotesk, fontSize: ".88rem", color: "#888899", marginBottom: "1.5rem", maxWidth: "360px", margin: "0 auto 1.5rem", lineHeight: 1.6 }}>
        Obrigado pelo contato. Nossa equipe responderá em breve por e-mail ou WhatsApp.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/" style={{ display: "inline-block", background: "#7b6ef6", color: "#fff", padding: ".7rem 1.5rem", ...S.mono, fontSize: ".65rem", letterSpacing: ".12em", textTransform: "uppercase", textDecoration: "none", fontWeight: 700 }}>
          Voltar ao início
        </Link>
        <Link href="/diagnostico" style={{ display: "inline-block", background: "transparent", color: "#e8e8e8", padding: ".7rem 1.5rem", ...S.mono, fontSize: ".65rem", letterSpacing: ".12em", textTransform: "uppercase", textDecoration: "none", border: "1px solid #222230" }}>
          Fazer diagnóstico
        </Link>
      </div>
    </div>
  );
}
