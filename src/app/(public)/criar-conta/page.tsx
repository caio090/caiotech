"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { ArrowRight, Sparkles, Clock, Shield, Loader2, Eye, EyeOff, Target, CalendarDays, CheckCircle2, BarChart2, Tag } from "lucide-react";
import type { ElementType } from "react";
import { MIN_PUBLIC_PRICE } from "@/lib/billing/plans";

const perks: { Icon: ElementType; text: string }[] = [
  { Icon: Clock,        text: `14 dias grátis — a partir de R$ ${MIN_PUBLIC_PRICE}/mês` },
  { Icon: Target,       text: "Diagnóstico gratuito da sua marca" },
  { Icon: CalendarDays, text: "Calendário editorial com aprovação por link" },
  { Icon: CheckCircle2, text: "Faturamento, Meta e relatórios no painel" },
  { Icon: BarChart2,    text: "Sem cartão de crédito para começar" },
];

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors";

function CriarContaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromDiagnostic = searchParams.get("from") === "diagnostic";
  const planFromUrl = searchParams.get("plan") ?? "";
  const couponFromUrl = searchParams.get("coupon") ?? "";
  const [form, setForm] = useState({ name: "", company: "", email: "", password: "", coupon: couponFromUrl });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError("Preencha nome, e-mail e senha.");
      return;
    }
    if (form.password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (!acceptedTerms) {
      setError("Aceite os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name: form.name,
            role: "cliente",
          },
        },
      });

      if (signUpError || !authData.user) {
        setError(signUpError?.message ?? "Erro ao criar conta. Tente novamente.");
        return;
      }

      const userId = authData.user.id;

      // 2. Criar client via função SECURITY DEFINER (bypassa RLS).
      // Necessário porque após signUp com "Email Confirmation" ativado no Supabase
      // a sessão é null → auth.uid() = null → insert direto falha com RLS 42501.
      const { data: clientId, error: clientError } = await supabase.rpc(
        "create_client_on_signup",
        {
          p_user_id:      userId,
          p_company_name: form.company || form.name,
          p_responsible:  form.name,
          p_email:        form.email,
        }
      );

      if (clientError) {
        console.error("[criar-conta] Erro ao criar client:", JSON.stringify(clientError));
      } else if (clientId) {
        localStorage.setItem("lokat_client_id", clientId as string);
      }

      // Verifica se há sessão ativa para o onboarding
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        // Email confirmation ativado — conta criada mas sessão ainda não existe.
        // Tenta login; se falhar (email não confirmado), mostra mensagem clara.
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (signInErr) {
          setError(
            "Conta criada! Confirme seu e-mail para ativar o acesso e depois faça login."
          );
          return;
        }
      }

      // Salva aceite dos termos no perfil (melhor esforço — não bloqueia cadastro)
      const termsNow = new Date().toISOString();
      await supabase
        .from("profiles")
        .update({
          accepted_terms_at:      termsNow,
          accepted_terms_version: "1.0",
          accepted_privacy_at:    termsNow,
        })
        .eq("id", userId);

      router.push(fromDiagnostic ? "/client/home" : "/onboarding/tipo");
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center">

        {/* Esquerda — pitch */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-sm font-black">L</div>
            <span className="font-bold text-gray-900">LOKAT OS</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3 leading-tight">
            Marketing organizado.<br />Resultado visível.
          </h1>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            14 dias para testar tudo — conteúdo, relatórios, aprovações e integrações. Sem cartão.
          </p>
          <div className="space-y-3 mb-8">
            {perks.map((p) => (
              <div key={p.text} className="flex items-center gap-3">
                <div className="w-7 h-7 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <p.Icon className="w-3.5 h-3.5 text-indigo-500" strokeWidth={1.5} />
                </div>
                <span className="text-sm text-gray-600">{p.text}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {[
              { icon: Clock,  label: "14 dias grátis" },
              { icon: Shield, label: "Sem fidelidade" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-100 px-3 py-1.5 rounded-xl">
                <Icon className="w-3 h-3" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Direita — formulário */}
        <div>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 lg:hidden">
                <span className="text-white text-xl font-black">L</span>
              </div>
              <h2 className="text-xl font-black text-gray-900">Começar teste grátis</h2>
              <p className="text-xs text-gray-400 mt-1">14 dias grátis · sem cartão · cancele quando quiser</p>
              {planFromUrl && (
                <span className="inline-block mt-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full capitalize">
                  Plano: {planFromUrl}
                </span>
              )}
            </div>

            {isSupabaseConfigured ? (
              /* ── Formulário real ──────────────────────── */
              <form onSubmit={handleSignUp} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Seu nome</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={set("name")}
                    placeholder="Maria Silva"
                    autoComplete="name"
                    className={inputCls}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Nome da empresa <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={set("company")}
                    placeholder="Nome da empresa"
                    autoComplete="organization"
                    className={inputCls}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="maria@empresa.com.br"
                    autoComplete="email"
                    className={inputCls}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Senha</label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      value={form.password}
                      onChange={set("password")}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                      className={`${inputCls} pr-10`}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Cupom opcional */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-indigo-400" />
                    Cupom <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.coupon}
                    onChange={(e) => setForm((f) => ({ ...f, coupon: e.target.value.toUpperCase() }))}
                    placeholder="Digite seu cupom"
                    autoComplete="off"
                    className={inputCls}
                    disabled={loading}
                  />
                </div>

                {/* Aceite de termos */}
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-indigo-600 cursor-pointer flex-shrink-0"
                    disabled={loading}
                  />
                  <span className="text-xs text-gray-500 leading-relaxed">
                    Li e aceito os{" "}
                    <Link href="/termos" target="_blank" className="text-indigo-600 hover:underline font-medium">
                      Termos de Uso
                    </Link>{" "}
                    e a{" "}
                    <Link href="/privacidade" target="_blank" className="text-indigo-600 hover:underline font-medium">
                      Política de Privacidade
                    </Link>
                    .
                  </span>
                </label>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !acceptedTerms}
                  className="w-full flex items-center justify-between p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-60 group mt-2"
                >
                  <div className="flex items-center gap-3">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    <div className="text-left">
                      <p className="text-sm font-bold">{loading ? "Criando conta…" : "Começar teste grátis"}</p>
                      <p className="text-xs text-indigo-200">14 dias grátis · sem cartão de crédito</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <p className="text-center text-xs text-gray-400 mt-2">
                  Já tem conta?{" "}
                  <Link href="/login" className="text-indigo-600 font-medium hover:underline">Entrar</Link>
                </p>
              </form>
            ) : (
              /* ── Modo demonstração ────────────────────── */
              <div className="space-y-3">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full uppercase tracking-wider">
                    Modo demonstração
                  </span>
                </div>
                <button
                  onClick={() => router.push("/onboarding/tipo")}
                  className="w-full flex items-center justify-between p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5" />
                    <div className="text-left">
                      <p className="text-sm font-bold">Começar onboarding</p>
                      <p className="text-xs text-indigo-200">Configure sua marca passo a passo</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs text-gray-400">ou entre como demo</span>
                  </div>
                </div>

                <button
                  onClick={() => router.push("/login")}
                  className="w-full py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
                >
                  Acessar área de demonstração
                </button>

                <p className="text-center text-xs text-gray-400">
                  Já tem conta?{" "}
                  <Link href="/login" className="text-indigo-600 font-medium hover:underline">Entrar</Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CriarContaPage() {
  return (
    <Suspense>
      <CriarContaForm />
    </Suspense>
  );
}
