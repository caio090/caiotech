"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { getRoleHome } from "@/lib/access-control";
import { Eye, EyeOff, Loader2, ShieldCheck, User, Sparkles, TrendingUp, Wallet, GraduationCap, KeyRound, Link2, ArrowRight } from "lucide-react";

const DEMO_ROLES = [
  { label: "Admin",        desc: "Dashboard completo da agência",   href: "/admin/dashboard",        icon: ShieldCheck,   color: "bg-indigo-600 hover:bg-indigo-700" },
  { label: "Cliente",      desc: "Portal do cliente",               href: "/client/home",             icon: User,          color: "bg-pink-500 hover:bg-pink-600" },
  { label: "Social Media", desc: "ContentOS — criação de conteúdo", href: "/contentos/home",          icon: Sparkles,      color: "bg-purple-600 hover:bg-purple-700" },
  { label: "Growth",       desc: "GrowthOS — funil e metas",        href: "/growth/diagnosticos",     icon: TrendingUp,    color: "bg-emerald-600 hover:bg-emerald-700" },
  { label: "Financeiro",   desc: "FinanceOS — pagamentos",          href: "/financeiro/pagamentos",   icon: Wallet,        color: "bg-teal-600 hover:bg-teal-700" },
  { label: "Aluno",        desc: "Academy — cursos e treinamentos", href: "/academy/home",            icon: GraduationCap, color: "bg-amber-500 hover:bg-amber-600" },
];

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteErr, setInviteErr]   = useState("");

  const handleInviteRedirect = () => {
    setInviteErr("");
    const raw = inviteCode.trim();
    if (!raw) { setInviteErr("Cole o link ou código do convite."); return; }
    // Extrair token de link ou usar direto como token
    let token = raw;
    try {
      const url = new URL(raw);
      const parts = url.pathname.split("/");
      token = parts[parts.length - 1] || raw;
    } catch {}
    router.push(`/convite/${token}`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Preencha e-mail e senha."); return; }
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError || !data.user) {
        setError("E-mail ou senha incorretos.");
        return;
      }

      // Read role from profiles (authoritative), fall back to user_metadata
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      const role = profileRow?.role ?? (data.user.user_metadata?.role as string | undefined) ?? "cliente";
      router.push(getRoleHome(role));
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
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
            <span className="text-white text-xl font-black">L</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">LOKAT OS</h1>
          <p className="text-sm text-gray-500 mt-1">Acesse sua conta</p>
        </div>

        {isSupabaseConfigured ? (
          /* ── Login real ─────────────────────────────────── */
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">E-mail</label>
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

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
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

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex justify-end -mt-1">
                <Link href="/recuperar-senha" className="text-xs text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1">
                  <KeyRound className="w-3 h-3" /> Esqueci minha senha
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando…</> : "Entrar"}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-5">
              Não tem conta?{" "}
              <Link href="/criar-conta" className="text-indigo-600 font-medium hover:underline">Começar teste grátis</Link>
              {" · "}
              <Link href="/planos" className="text-gray-400 hover:text-indigo-600 hover:underline">Ver planos</Link>
            </p>

            {/* ── Recebi um convite ── */}
            <div className="mt-4 pt-4 border-t border-gray-50">
              {!showInvite ? (
                <button
                  type="button"
                  onClick={() => setShowInvite(true)}
                  className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-indigo-600 transition-colors py-1"
                >
                  <Link2 className="w-3.5 h-3.5" /> Recebi um convite
                </button>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700">Link ou código do convite</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Cole o link ou o código aqui…"
                    className="w-full border border-indigo-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors"
                  />
                  {inviteErr && <p className="text-xs text-red-500">{inviteErr}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowInvite(false); setInviteCode(""); setInviteErr(""); }}
                      className="flex-1 text-xs text-gray-400 border border-gray-200 py-2 rounded-xl hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleInviteRedirect}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-indigo-600 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                      <ArrowRight className="w-3.5 h-3.5" /> Acessar convite
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Modo demonstração ──────────────────────────── */
          <div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full uppercase tracking-wider">
                Modo demonstração
              </span>
            </div>
            <p className="text-xs text-center text-gray-500 mb-5">
              Supabase não configurado. Selecione um perfil para explorar o sistema.
            </p>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-2 space-y-1.5 mb-4">
              {DEMO_ROLES.map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.href}
                    onClick={() => router.push(role.href)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl text-white transition-all text-left ${role.color}`}
                  >
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold">{role.label}</div>
                      <div className="text-xs opacity-80 truncate">{role.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-center text-xs text-gray-400">
              Não tem conta?{" "}
              <Link href="/criar-conta" className="text-indigo-600 font-medium hover:underline">Criar conta grátis</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
