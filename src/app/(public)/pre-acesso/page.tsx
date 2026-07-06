"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

const ACCOUNT_TYPE_OPTIONS = [
  { value: "agency",       label: "Agência de Marketing" },
  { value: "business",     label: "Negócio Local / Empresa" },
  { value: "professional", label: "Profissional Autônomo" },
  { value: "interested",   label: "Só quero acompanhar" },
];

const SEGMENT_OPTIONS = [
  "Gastronomia / Delivery",
  "Moda / Beleza",
  "Saúde / Bem-estar",
  "Educação",
  "Serviços",
  "Varejo / E-commerce",
  "Imóveis",
  "Marketing / Publicidade",
  "Tecnologia",
  "Outro",
];

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

export default function PreAcessoPage() {
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const [form, setForm] = useState({
    name:          "",
    email:         "",
    phone:         "",
    account_type:  "",
    city:          "",
    segment:       "",
    interest:      "",
    social_or_site:"",
    _hp:           "", // honeypot
  });

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !form.account_type) {
      setError("Preencha nome, e-mail e tipo de conta.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/launch/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, source: "pre-acesso" }),
      });
      const json = await res.json() as { ok: boolean; message?: string };
      if (!json.ok) {
        setError(json.message ?? "Erro ao registrar. Tente novamente.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Erro de rede. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center bg-white rounded-3xl border border-gray-100 shadow-sm p-10">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Você está na lista!</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            Vamos te avisar quando o acesso beta for liberado para o seu perfil.
            Quem entrar na fase beta pode receber até{" "}
            <strong className="text-gray-700">6 meses de acesso gratuito</strong>.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Voltar ao site
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="max-w-2xl mx-auto px-4 pt-10 pb-6 text-center">
        <Link href="/" className="inline-block mb-6">
          <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Lokat OS</span>
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight mb-3">
          A Lokat OS está abrindo acesso beta
        </h1>
        <p className="text-base text-gray-500 leading-relaxed max-w-lg mx-auto">
          Estamos liberando contas em lotes para agências, negócios locais e profissionais selecionados.
          Reserve seu lugar agora.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 rounded-xl px-4 py-2 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          Quem entrar no beta pode receber até 6 meses de acesso gratuito
        </div>
      </header>

      {/* Form */}
      <main className="max-w-lg mx-auto px-4 pb-16">
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-7 space-y-4">
          {/* Honeypot */}
          <input
            type="text"
            name="_hp"
            value={form._hp}
            onChange={set("_hp")}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nome *</label>
              <input
                type="text"
                placeholder="Seu nome"
                value={form.name}
                onChange={set("name")}
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">E-mail *</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={set("email")}
                required
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">WhatsApp</label>
              <input
                type="tel"
                placeholder="(00) 9 0000-0000"
                value={form.phone}
                onChange={set("phone")}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Cidade</label>
              <input
                type="text"
                placeholder="Sua cidade"
                value={form.city}
                onChange={set("city")}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Você é... *</label>
            <select
              value={form.account_type}
              onChange={set("account_type")}
              required
              className={inputCls}
            >
              <option value="" disabled>Selecione seu perfil</option>
              {ACCOUNT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Segmento</label>
            <select
              value={form.segment}
              onChange={set("segment")}
              className={inputCls}
            >
              <option value="">Selecione (opcional)</option>
              {SEGMENT_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              O que mais te interessa na Lokat OS?
            </label>
            <textarea
              placeholder="Ex: gestão de conteúdo, faturamento, painel do cliente..."
              value={form.interest}
              onChange={set("interest")}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Instagram ou site (opcional)
            </label>
            <input
              type="text"
              placeholder="@perfil ou www.seusite.com.br"
              value={form.social_or_site}
              onChange={set("social_or_site")}
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[.98] text-white font-bold rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Entrar na lista beta
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-gray-400 leading-relaxed">
            Sem spam. Sem cobrança automática. Você só recebe acesso quando for liberado manualmente.
          </p>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Já tem acesso?{" "}
          <Link href="/login" className="text-indigo-600 hover:underline">Entrar</Link>
          {" · "}
          <Link href="/" className="text-gray-400 hover:underline">Voltar ao site</Link>
        </p>
      </main>
    </div>
  );
}
