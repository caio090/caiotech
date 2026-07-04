"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2,
  User, Building2, Mail, Tag, ShieldCheck,
} from "lucide-react";

interface ProfileData {
  company_name: string | null;
  responsible_name: string | null;
  email: string | null;
  segment: string | null;
  status: string | null;
}

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors disabled:bg-gray-50 disabled:text-gray-400";

function StatusLabel({ status }: { status: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:     { label: "Ativo",      cls: "bg-emerald-50 text-emerald-700" },
    onboarding: { label: "Onboarding", cls: "bg-blue-50 text-blue-700"       },
    inactive:   { label: "Inativo",    cls: "bg-gray-100 text-gray-500"      },
  };
  const s = status ? (map[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" }) : map.inactive;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>
      <ShieldCheck className="w-3 h-3" />
      {s.label}
    </span>
  );
}

export default function ClientConfiguracoes() {
  const [profile, setProfile]       = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [pwdForm, setPwdForm]       = useState({ current: "", next: "", confirm: "" });
  const [showPwd, setShowPwd]       = useState({ current: false, next: false, confirm: false });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoadingProfile(false); return; }
    const supabase = createClient();

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // API server-side usa service role — bypassa RLS de clients
        const res = await fetch("/api/client/current");
        const json = res.ok ? (await res.json() as { client: { company_name?: string | null; responsible_name?: string | null; email?: string | null; segment?: string | null; status?: string | null } | null }) : { client: null };
        const clientRow = json.client ?? null;

        if (!clientRow) {
          setProfile(null);
        } else {
          setProfile({
            company_name:     clientRow.company_name     ?? null,
            responsible_name: clientRow.responsible_name ?? null,
            email:            clientRow.email            ?? user.email ?? null,
            segment:          clientRow.segment          ?? null,
            status:           clientRow.status           ?? null,
          });
        }
      } catch { /* silent */ }
      finally { setLoadingProfile(false); }
    }

    void load();
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg(null);

    if (pwdForm.next.length < 6) {
      setPwdMsg({ ok: false, text: "A nova senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdMsg({ ok: false, text: "As senhas não coincidem." });
      return;
    }

    setPwdLoading(true);
    try {
      const supabase = createClient();

      // Verifica senha atual via re-autenticação
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setPwdMsg({ ok: false, text: "Não foi possível identificar o usuário." });
        return;
      }

      if (pwdForm.current) {
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: pwdForm.current,
        });
        if (loginErr) {
          setPwdMsg({ ok: false, text: "Senha atual incorreta." });
          return;
        }
      }

      const { error } = await supabase.auth.updateUser({ password: pwdForm.next });
      if (error) {
        setPwdMsg({ ok: false, text: error.message ?? "Erro ao alterar senha." });
      } else {
        setPwdMsg({ ok: true, text: "Senha alterada com sucesso!" });
        setPwdForm({ current: "", next: "", confirm: "" });
      }
    } catch {
      setPwdMsg({ ok: false, text: "Erro inesperado. Tente novamente." });
    } finally {
      setPwdLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Configurações</h1>
        <p className="text-xs text-gray-400 mt-0.5">Dados da sua conta e segurança</p>
      </div>

      {/* Dados da conta */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <p className="text-sm font-bold text-gray-900">Dados da conta</p>

        {loadingProfile ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : !isSupabaseConfigured ? (
          <p className="text-xs text-gray-400">Banco de dados não configurado.</p>
        ) : profile ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Empresa</p>
                <p className="text-sm text-gray-900 font-medium">{profile.company_name ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Responsável</p>
                <p className="text-sm text-gray-900">{profile.responsible_name ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">E-mail</p>
                <p className="text-sm text-gray-900">{profile.email ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Tag className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Segmento</p>
                <p className="text-sm text-gray-900">{profile.segment ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Status</p>
                <div className="mt-0.5"><StatusLabel status={profile.status} /></div>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 pt-1">
              Para atualizar estes dados, entre em contato com a equipe responsável.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-700">Nenhuma empresa vinculada a esta conta</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Se você é agência ou opera por conta própria, acesse o painel correspondente.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a href="/agency/home" className="text-xs font-bold text-purple-600 hover:underline">→ Portal da Agência</a>
              <a href="/admin/inicio" className="text-xs font-bold text-indigo-600 hover:underline">→ Painel Admin</a>
            </div>
            <p className="text-[11px] text-gray-400 pt-1">
              Se recebeu um convite de empresa, peça um novo link à agência responsável.
            </p>
          </div>
        )}
      </div>

      {/* Alterar senha */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-bold text-gray-900">Alterar senha</p>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3">
          {(["current", "next", "confirm"] as const).map((field) => {
            const labels = { current: "Senha atual", next: "Nova senha", confirm: "Confirmar nova senha" };
            const placeholders = { current: "Sua senha atual", next: "Mínimo 6 caracteres", confirm: "Repita a nova senha" };
            return (
              <div key={field}>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{labels[field]}</label>
                <div className="relative">
                  <input
                    type={showPwd[field] ? "text" : "password"}
                    value={pwdForm[field]}
                    onChange={(e) => setPwdForm((f) => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholders[field]}
                    className={inputCls + " pr-10"}
                    required={field !== "current"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => ({ ...v, [field]: !v[field] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {field === "current" && (
                  <p className="text-[10px] text-gray-400 mt-0.5">Deixe em branco se não souber a senha atual.</p>
                )}
              </div>
            );
          })}

          {pwdMsg && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-xs ${pwdMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {pwdMsg.ok
                ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              }
              {pwdMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={pwdLoading || !pwdForm.next || !pwdForm.confirm}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {pwdLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar nova senha
          </button>
        </form>
      </div>
    </div>
  );
}
