"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Building2, Loader2 } from "lucide-react";

interface Invite {
  id: string;
  client_id: string;
  company_name: string | null;
  email: string | null;
  status: string;
  expires_at: string | null;
}

interface Props {
  token: string;
  invite: Invite | null;
}

const inputCls =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors disabled:bg-gray-50 disabled:text-gray-400";

export function ClientInviteContent({ token, invite }: Props) {
  const router    = useRouter();
  const [form, setForm] = useState({
    email:    invite?.email ?? "",
    password: "",
    confirm:  "",
  });
  const [showPwd,    setShowPwd]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);

  if (!invite || invite.status !== "pending") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-2">Convite inválido</h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Este link de convite expirou, já foi usado ou não existe.
            Peça um novo convite à equipe responsável.
          </p>
          <a href="/login" className="text-sm font-medium text-indigo-600 hover:underline">
            Ir para o login
          </a>
        </div>
      </div>
    );
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-2">Convite expirado</h1>
          <p className="text-sm text-gray-500 mb-6">
            Este convite não é mais válido. Solicite um novo link à equipe.
          </p>
          <a href="/login" className="text-sm font-medium text-indigo-600 hover:underline">
            Ir para o login
          </a>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.email.trim()) { setError("Informe seu e-mail."); return; }
    if (form.password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres."); return; }
    if (form.password !== form.confirm) { setError("As senhas não coincidem."); return; }

    setLoading(true);
    try {
      const supabase = createClient();

      // Tenta criar conta nova; se já existe, loga
      const { error: signUpErr } = await supabase.auth.signUp({
        email:    form.email.trim(),
        password: form.password,
        options: {
          data: { invite_token: token, invite_type: "client" },
        },
      });

      if (signUpErr && !signUpErr.message.includes("already")) {
        setError(signUpErr.message);
        setLoading(false);
        return;
      }

      // Se já existe, faz login
      if (signUpErr?.message.includes("already")) {
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: form.email.trim(), password: form.password,
        });
        if (loginErr) { setError(loginErr.message); setLoading(false); return; }
      }

      // Chama RPC para aceitar convite e vincular client_id ao profile
      await supabase.rpc("accept_client_invite", { p_token: token });

      setSuccess(true);
      setTimeout(() => router.push("/client/home"), 2000);
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-2">Conta ativada!</h1>
          <p className="text-sm text-gray-500">Redirecionando para o painel…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-1">
            {invite.company_name ? `Bem-vindo, ${invite.company_name}!` : "Bem-vindo ao painel!"}
          </h1>
          <p className="text-sm text-gray-500">
            Crie sua senha para acessar o painel do cliente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              className={inputCls}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="seu@email.com"
              disabled={!!invite.email}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Senha</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                className={inputCls}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Confirmar senha</label>
            <input
              type="password"
              className={inputCls}
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              placeholder="Repita a senha"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Ativando conta…" : "Ativar conta e entrar"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Já tem conta?{" "}
          <a href="/login" className="text-indigo-600 hover:underline font-medium">
            Fazer login
          </a>
        </p>
      </div>
    </div>
  );
}
