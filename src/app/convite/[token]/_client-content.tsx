"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getRoleHome } from "@/lib/access-control";
import { ROLE_LABELS } from "@/lib/access-control";
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound } from "lucide-react";

interface Invite {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  department: string | null;
  expires_at: string | null;
}

interface Props {
  token: string;
  invite: Invite | null;
}

const inputCls =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors disabled:bg-gray-50 disabled:text-gray-400";

export function ConviteClientContent({ token, invite }: Props) {
  const router  = useRouter();
  const [form, setForm] = useState({
    name:     invite?.name  ?? "",
    email:    invite?.email ?? "",
    password: "",
    confirm:  "",
  });
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  if (!invite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-2">Link inválido</h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Este link de convite expirou ou não existe. Peça um novo convite ao administrador da agência.
          </p>
          <a
            href="/login"
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            Voltar ao login
          </a>
        </div>
      </div>
    );
  }

  const roleLabel = ROLE_LABELS[invite.role] ?? invite.role;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim())      { setError("Informe seu nome."); return; }
    if (!form.email.trim())     { setError("Informe seu e-mail."); return; }
    if (form.password.length < 6) { setError("A senha deve ter ao menos 6 caracteres."); return; }
    if (form.password !== form.confirm) { setError("As senhas não coincidem."); return; }

    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Create account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email:    form.email.trim(),
        password: form.password,
        options: {
          data: { name: form.name.trim() },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("Este e-mail já está cadastrado. Faça login e então acesse o link de convite novamente.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (!signUpData.user) {
        setError("Erro ao criar conta. Tente novamente.");
        return;
      }

      // 2. Update profile name (the trigger may set it from metadata)
      await supabase
        .from("profiles")
        .update({ name: form.name.trim() })
        .eq("id", signUpData.user.id);

      // 3. Accept invite (sets role, marks invite as accepted)
      const { data: rpcResult } = await supabase.rpc("accept_team_invite", {
        p_token: token,
      });

      if (rpcResult && (rpcResult as Record<string, unknown>).error) {
        const rpcError = (rpcResult as Record<string, unknown>).error as string;
        if (rpcError !== "not_authenticated") {
          // email_mismatch or invalid — still show success since account was created
          console.warn("[convite] accept_team_invite error:", rpcError);
        }
      }

      setSuccess(true);

      // If session is active (email confirmation off), redirect
      if (signUpData.session) {
        setRedirecting(true);
        setTimeout(() => router.push(getRoleHome(invite.role)), 2000);
      }
    } catch (err) {
      console.error("[convite]", err);
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
          <h1 className="text-xl font-black text-gray-900 mb-2">Conta criada!</h1>
          {redirecting ? (
            <p className="text-sm text-gray-500 mb-6">
              Redirecionando para a área operacional…
            </p>
          ) : (
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Verifique seu e-mail para confirmar o cadastro.
              Após confirmar, acesse{" "}
              <a href="/login" className="text-indigo-600 font-medium hover:underline">
                /login
              </a>{" "}
              com suas credenciais.
            </p>
          )}
          {redirecting && <Loader2 className="w-5 h-5 text-emerald-500 animate-spin mx-auto" />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-6 h-6 text-emerald-600" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Você foi convidado</h1>
          <p className="text-sm text-gray-500 mt-1">
            para a equipe da LOKAT OS como{" "}
            <span className="font-bold text-gray-700">{roleLabel}</span>
          </p>
          {invite.department && (
            <p className="text-xs text-gray-400 mt-1">Departamento: {invite.department}</p>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Seu nome completo</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Mariana Costa"
                className={inputCls}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => !invite.email && setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="seu@email.com.br"
                className={inputCls}
                disabled={loading || !!invite.email}
                readOnly={!!invite.email}
                required
              />
              {invite.email && (
                <p className="text-xs text-gray-400 mt-1">
                  E-mail definido pelo convite — não pode ser alterado.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className={`${inputCls} pr-10`}
                  disabled={loading}
                  required
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

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Confirmar senha</label>
              <input
                type={showPwd ? "text" : "password"}
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                placeholder="Repita a senha"
                className={inputCls}
                disabled={loading}
                required
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta…</>
                : "Criar conta e entrar"
              }
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-5">
            Já tem conta?{" "}
            <a href="/login" className="text-indigo-600 font-medium hover:underline">Entrar</a>
          </p>
        </div>

        {invite.expires_at && (
          <p className="text-center text-xs text-gray-400 mt-4">
            Convite válido até{" "}
            {new Date(invite.expires_at).toLocaleDateString("pt-BR", {
              day: "2-digit", month: "long", year: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
