"use client";
import { useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { Send, CheckCircle2, AlertCircle, ArrowLeft, BriefcaseBusiness, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLES = [
  { value: "comercial",      label: "Comercial" },
  { value: "sdr",            label: "SDR (pré-vendas)" },
  { value: "closer",         label: "Closer (fechamento)" },
  { value: "social_media",   label: "Social Media" },
  { value: "designer",       label: "Designer" },
  { value: "editor",         label: "Editor" },
  { value: "videomaker",     label: "Videomaker" },
  { value: "gestor_trafego", label: "Gestor de Tráfego" },
  { value: "financeiro",     label: "Financeiro" },
  { value: "operacional",    label: "Operacional" },
];

const DEPARTMENTS = [
  { value: "comercial",   label: "Comercial" },
  { value: "estrategia",  label: "Estratégia" },
  { value: "social_media",label: "Social Media" },
  { value: "design",      label: "Design" },
  { value: "video",       label: "Vídeo" },
  { value: "edicao",      label: "Edição" },
  { value: "trafego",     label: "Tráfego" },
  { value: "financeiro",  label: "Financeiro" },
  { value: "suporte",     label: "Suporte" },
];

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors disabled:bg-gray-50 disabled:text-gray-400 bg-white";
const labelCls = "block text-xs font-bold text-gray-700 mb-1.5";

const EMPTY_FORM = {
  name:               "",
  email:              "",
  phone:              "",
  city:               "",
  birthday:           "",
  desired_role:       "designer",
  desired_department: "",
  portfolio_url:      "",
  tools:              "",
  availability:       "",
  notes:              "",
};

export function SolicitarAcessoContent() {
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");

  const set = (k: keyof typeof EMPTY_FORM) => (
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim())  { setError("Informe seu nome completo."); return; }
    if (!form.email.trim()) { setError("Informe seu e-mail."); return; }
    if (!form.desired_role) { setError("Selecione a função desejada."); return; }

    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        // Demo mode — simulate success
        await new Promise((r) => setTimeout(r, 800));
        setSuccess(true);
        return;
      }

      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("create_team_access_request", {
        p_name:               form.name.trim(),
        p_email:              form.email.trim(),
        p_phone:              form.phone   || null,
        p_city:               form.city    || null,
        p_birthday:           form.birthday || null,
        p_desired_role:       form.desired_role,
        p_desired_department: form.desired_department || null,
        p_portfolio_url:      form.portfolio_url || null,
        p_tools:              form.tools         || null,
        p_availability:       form.availability  || null,
        p_notes:              form.notes         || null,
      });

      if (rpcError) {
        setError("Erro ao enviar solicitação: " + rpcError.message);
        return;
      }

      const result = data as { success?: boolean; error?: string } | null;
      if (!result?.success) {
        if (result?.error === "duplicate_pending_request") {
          setError("Já existe uma solicitação pendente para este e-mail. Aguarde a análise do administrador.");
        } else if (result?.error === "name_and_email_required") {
          setError("Nome e e-mail são obrigatórios.");
        } else {
          setError("Erro ao enviar. Verifique se o SQL 08 foi executado no Supabase.");
        }
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error("[solicitar-acesso]", err);
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-3">Solicitação enviada!</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            O administrador da LOKAT OS vai analisar seu acesso e entrar em contato.
            Você receberá um link de convite caso seja aprovado.
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-xs text-blue-700 mb-6 text-left">
            <strong>Importante:</strong> esta solicitação não libera acesso automaticamente.
            Aguarde a aprovação do administrador.
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="w-full max-w-lg mx-auto">

        {/* Back */}
        <Link
          href="/convite"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <BriefcaseBusiness className="w-5 h-5 text-indigo-600" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Solicitar acesso à equipe</h1>
              <p className="text-xs text-gray-500">Preencha os dados abaixo. O admin avaliará seu perfil.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
          <form onSubmit={handleSubmit}>

            {/* ── Dados pessoais ── */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-50">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">Dados pessoais</p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Nome completo *</label>
                    <input type="text" value={form.name} onChange={set("name")} placeholder="Ex: Mariana Costa" className={inputCls} required disabled={loading} />
                  </div>
                  <div>
                    <label className={labelCls}>E-mail *</label>
                    <input type="email" value={form.email} onChange={set("email")} placeholder="seu@email.com.br" className={inputCls} required disabled={loading} />
                  </div>
                  <div>
                    <label className={labelCls}>WhatsApp</label>
                    <input type="tel" value={form.phone} onChange={set("phone")} placeholder="(11) 99999-0000" className={inputCls} disabled={loading} />
                  </div>
                  <div>
                    <label className={labelCls}>Cidade <span className="font-normal text-gray-400">(opcional)</span></label>
                    <input type="text" value={form.city} onChange={set("city")} placeholder="São Paulo - SP" className={inputCls} disabled={loading} />
                  </div>
                  <div>
                    <label className={labelCls}>Data de nascimento <span className="font-normal text-gray-400">(opcional)</span></label>
                    <input type="date" value={form.birthday} onChange={set("birthday")} className={inputCls} disabled={loading} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Função e departamento ── */}
            <div className="px-6 py-4 border-b border-gray-50">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">Perfil profissional</p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Função desejada *</label>
                    <select value={form.desired_role} onChange={set("desired_role")} className={inputCls} required disabled={loading}>
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Departamento desejado <span className="font-normal text-gray-400">(opcional)</span></label>
                    <select value={form.desired_department} onChange={set("desired_department")} className={inputCls} disabled={loading}>
                      <option value="">Selecionar…</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={cn(labelCls, "flex items-center gap-1")}>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    Portfólio / link de trabalhos <span className="font-normal text-gray-400">(opcional)</span>
                  </label>
                  <input type="url" value={form.portfolio_url} onChange={set("portfolio_url")} placeholder="https://behance.net/seu-perfil" className={inputCls} disabled={loading} />
                </div>

                <div>
                  <label className={labelCls}>Ferramentas que domina <span className="font-normal text-gray-400">(opcional)</span></label>
                  <input type="text" value={form.tools} onChange={set("tools")} placeholder="Ex: Premiere, Figma, Meta Ads, Canva…" className={inputCls} disabled={loading} />
                </div>

                <div>
                  <label className={labelCls}>Disponibilidade <span className="font-normal text-gray-400">(opcional)</span></label>
                  <input type="text" value={form.availability} onChange={set("availability")} placeholder="Ex: Integral, parcial, freelance, 20h/semana…" className={inputCls} disabled={loading} />
                </div>

                <div>
                  <label className={labelCls}>Observação <span className="font-normal text-gray-400">(opcional)</span></label>
                  <textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Conte um pouco sobre você, sua experiência ou por que quer entrar na equipe…" className={cn(inputCls, "resize-none")} disabled={loading} />
                </div>
              </div>
            </div>

            {/* ── Aviso + Submit ── */}
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  Esta solicitação <strong>não libera acesso</strong> automaticamente.
                  O administrador avaliará seu perfil e enviará um link de convite se aprovado.
                </span>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando…</>
                  : <><Send className="w-4 h-4" /> Enviar solicitação</>
                }
              </button>

              <p className="text-center text-xs text-gray-400">
                Já tem um convite?{" "}
                <Link href="/convite" className="text-indigo-600 font-medium hover:underline">Usar convite</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
