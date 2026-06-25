"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { Loader2, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState("");
  const [sessionOk, setSessionOk] = useState(false);
  const [checking, setChecking]   = useState(true);

  // Supabase envia o token como fragment (#access_token=...) na URL de redirect.
  // O SDK do Supabase detecta automaticamente e cria a sessão.
  useEffect(() => {
    if (!isSupabaseConfigured) { setSessionOk(true); setChecking(false); return; }
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setSessionOk(!!data.session);
      setChecking(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) { setError("A senha deve ter no mínimo 6 caracteres."); return; }
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    setError("");

    if (!isSupabaseConfigured) { setDone(true); setLoading(false); return; }

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError("Não foi possível atualizar a senha. O link pode ter expirado.");
      } else {
        setDone(true);
        setTimeout(() => router.push("/login"), 3000);
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Nova senha</h1>
          <p className="text-sm text-gray-500 mt-1">Defina sua nova senha de acesso</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          {checking ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : !sessionOk ? (
            <div className="text-center py-4">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm font-bold text-gray-900 mb-1">Link inválido ou expirado</p>
              <p className="text-xs text-gray-500 mb-5">Solicite um novo link de recuperação.</p>
              <Link href="/recuperar-senha" className="text-xs text-indigo-600 font-medium hover:underline">
                Solicitar novo link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm font-bold text-gray-900 mb-1">Senha atualizada!</p>
              <p className="text-xs text-gray-500 mb-5">Você será redirecionado para o login em instantes.</p>
              <Link href="/login" className="text-xs text-indigo-600 font-medium hover:underline">
                Ir para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Nova senha</label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    className={`${inputCls} pr-10`}
                    disabled={loading}
                  />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Confirmar senha</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  className={inputCls}
                  disabled={loading}
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
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : "Salvar nova senha"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
