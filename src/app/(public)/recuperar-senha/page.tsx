"use client";
import { useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { Loader2, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors";

export default function RecuperarSenhaPage() {
  const [email, setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Informe seu e-mail."); return; }
    setLoading(true);
    setError("");

    if (!isSupabaseConfigured) {
      // Demo mode
      setSent(true);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://www.lokat.com.br";
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/redefinir-senha`,
      });

      if (resetError) {
        setError("Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.");
      } else {
        setSent(true);
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
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Recuperar senha</h1>
          <p className="text-sm text-gray-500 mt-1">Enviaremos um link para seu e-mail</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm font-bold text-gray-900 mb-1">E-mail enviado!</p>
              <p className="text-xs text-gray-500 mb-5">
                Se existir uma conta com esse e-mail, você receberá as instruções em instantes. Verifique também a caixa de spam.
              </p>
              <Link href="/login" className="text-xs text-indigo-600 font-medium hover:underline flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">E-mail da conta</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com.br"
                  autoComplete="email"
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
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</> : "Enviar link de recuperação"}
              </button>

              <Link href="/login" className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-1 pt-1">
                <ArrowLeft className="w-3 h-3" /> Voltar para o login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
