import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CalendarClock, ArrowRight } from "lucide-react";
import { ContentosSubNavServer } from "../_contentos-subnav-server";

interface PageProps {
  searchParams: Promise<{ client?: string }>;
}

export default async function AgendamentoPage({ searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    redirect("/admin/dashboard");
  }

  const params = await searchParams;
  const activeClientId = params.client ?? null;

  let companyName: string | null = null;
  if (activeClientId) {
    const { data: clientData } = await supabase
      .from("clients")
      .select("company_name")
      .eq("id", activeClientId)
      .is("deleted_at", null)
      .single();
    companyName = clientData?.company_name ?? null;
  }

  const CHANNELS = [
    { label: "Instagram Feed",  icon: "📸", status: "not_configured" },
    { label: "Instagram Story", icon: "📱", status: "not_configured" },
    { label: "Facebook Feed",   icon: "📘", status: "not_configured" },
    { label: "LinkedIn",        icon: "💼", status: "not_configured" },
    { label: "TikTok",          icon: "🎵", status: "not_configured" },
    { label: "YouTube",         icon: "▶️", status: "not_configured" },
  ];

  return (
    <>
      <ContentosSubNavServer />
      <div className="space-y-8">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-bold text-zinc-100">Agendamento</h1>
              <span className="text-xs bg-zinc-800 text-zinc-500 border border-zinc-700 rounded px-2 py-0.5">
                Não configurado
              </span>
            </div>
            {companyName && (
              <p className="text-sm text-zinc-500">
                REC OS · {companyName}
              </p>
            )}
            {!companyName && (
              <p className="text-sm text-zinc-500">
                Programe conteúdos aprovados para publicação automática nos canais sociais.
              </p>
            )}
          </div>
        </div>

        {/* Not configured state */}
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-10 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <CalendarClock className="w-6 h-6 text-zinc-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-200">Provedor de publicação não configurado</h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto">
              Conecte um provedor de publicação para programar conteúdos aprovados nos canais sociais do
              cliente.
            </p>
          </div>
          <div className="inline-flex items-center gap-1 text-xs text-zinc-600 bg-zinc-800/60 rounded-lg px-3 py-1.5">
            <span>Motor candidato: Postiz (AGPL-3.0 — requer infraestrutura)</span>
          </div>
        </div>

        {/* Approval flow */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
            Fluxo de aprovação obrigatório
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              "Rascunho",
              "Revisão interna",
              "Aprovado internamente",
              "Enviado ao cliente",
              "Aprovado pelo cliente",
              "Pronto para agendar",
              "Agendado",
              "Publicado",
            ].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span
                  className={`px-3 py-1.5 rounded-lg border ${
                    step === "Aprovado pelo cliente" || step === "Pronto para agendar"
                      ? "border-emerald-700/50 bg-emerald-900/20 text-emerald-300"
                      : step === "Publicado"
                      ? "border-indigo-700/50 bg-indigo-900/20 text-indigo-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400"
                  }`}
                >
                  {step}
                </span>
                {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-zinc-600 shrink-0" />}
              </span>
            ))}
          </div>
          <p className="text-xs text-zinc-600">
            Somente conteúdos com status &ldquo;Aprovado pelo cliente&rdquo; ou &ldquo;Pronto para
            agendar&rdquo; podem ser programados.
          </p>
        </section>

        {/* Channel grid */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
            Canais
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {CHANNELS.map((ch) => (
              <div
                key={ch.label}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex items-center gap-3"
              >
                <span className="text-xl">{ch.icon}</span>
                <div>
                  <p className="text-sm font-medium text-zinc-300">{ch.label}</p>
                  <p className="text-xs text-zinc-600">Não configurado</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
