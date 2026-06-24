import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { CurrentUserCard } from "@/components/current-user-card";
import { getOpUserCtx } from "@/lib/operational-tasks";
import { ROLE_LABELS } from "@/lib/access-control";
import { PerfilEditForm } from "./_edit-form";
import { User, Mail, Phone, Building2, ShieldCheck } from "lucide-react";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar_url: string | null;
}

export default async function OperacionalPerfilPage() {
  let profile: ProfileData | null = null;
  let roleDisplay = "Operacional";

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const ctx = await getOpUserCtx(supabase);
      if (ctx) {
        roleDisplay = ctx.roleDisplay;
        const { data } = await supabase
          .from("profiles")
          .select("id, name, email, phone, role, avatar_url")
          .eq("id", ctx.userId)
          .maybeSingle();
        if (data) profile = data as ProfileData;
      }
    } catch {}
  }

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Meu Perfil" description={roleDisplay} />

      {/* Identity card */}
      <CurrentUserCard
        name={profile?.name}
        email={profile?.email}
        role={profile?.role}
        avatarUrl={profile?.avatar_url}
      />

      {/* Profile details */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-4">Informações da conta</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Nome</p>
              <p className="text-sm font-semibold text-gray-800">{profile?.name ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400">E-mail</p>
              <p className="text-sm font-semibold text-gray-800">{profile?.email ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Telefone</p>
              <p className="text-sm font-semibold text-gray-800">{profile?.phone ?? "Não informado"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Função</p>
              <p className="text-sm font-semibold text-gray-800">
                {profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400">ID interno</p>
              <p className="text-xs font-mono text-gray-500">{profile?.id ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      {profile && (
        <PerfilEditForm
          profileId={profile.id}
          initialName={profile.name}
          initialPhone={profile.phone ?? ""}
        />
      )}
    </div>
  );
}
