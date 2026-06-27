import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight, FileText, Link2, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface CheckItem {
  key: string;
  label: string;
  description: string;
  done: boolean;
  href?: string;
  cta?: string;
}

export default async function ClientSetupPage() {
  let brandName         = "seu negócio";
  let hasOnboarding     = false;
  let hasClient         = false;
  let hasMetaConnection = false;

  if (isSupabaseConfigured) {
    try {
      const supabase  = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles").select("client_id").eq("id", user.id).maybeSingle();
        const clientId = (profile as { client_id?: string | null } | null)?.client_id;

        if (clientId) {
          hasClient = true;
          const { data: clientRow } = await supabase
            .from("clients").select("company_name").eq("id", clientId).maybeSingle();
          brandName = (clientRow as { company_name?: string | null } | null)?.company_name ?? brandName;

          const { data: onbRow } = await supabase
            .from("onboarding_profiles").select("id, brand_name").eq("client_id", clientId).maybeSingle();
          hasOnboarding = !!(onbRow as { brand_name?: string | null } | null)?.brand_name;

          const { data: metaRow } = await supabase
            .from("client_meta_assets").select("id").eq("client_id", clientId).maybeSingle();
          hasMetaConnection = !!metaRow;
        } else {
          const { data: clientRow } = await supabase
            .from("clients").select("id, company_name").eq("owner_id", user.id).maybeSingle();
          if (clientRow) {
            hasClient = true;
            brandName = (clientRow as { company_name?: string | null }).company_name ?? brandName;
          }
        }
      }
    } catch {}
  }

  const checklist: CheckItem[] = [
    {
      key:         "client",
      label:       "Conta vinculada",
      description: "Sua conta está conectada ao perfil do cliente na plataforma.",
      done:        hasClient,
      cta:         "Falar com suporte",
      href:        "/client/suporte",
    },
    {
      key:         "onboarding",
      label:       "Diagnóstico preenchido",
      description: "Informações sobre sua marca, objetivo e tom de voz.",
      done:        hasOnboarding,
      cta:         "Preencher diagnóstico",
      href:        "/client/suporte",
    },
    {
      key:         "meta",
      label:       "Canais conectados",
      description: "Meta/Instagram vinculado para acompanhar resultados.",
      done:        hasMetaConnection,
      cta:         "Ver conexões",
      href:        "/client/suporte",
    },
    {
      key:         "project",
      label:       "Projeto configurado",
      description: "Equipe define escopo, prazos e tarefas do projeto.",
      done:        false,
      cta:         "Ver projeto",
      href:        "/client/projeto",
    },
  ];

  const doneCount = checklist.filter((c) => c.done).length;
  const pct       = Math.round((doneCount / checklist.length) * 100);

  return (
    <div>
      <PageHeader
        title="Configuração inicial"
        description={`Veja o que falta para ativar o painel de ${brandName}`}
      />

      {/* Progress */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-700">Progresso de ativação</p>
          <span className="text-xs font-bold text-indigo-600">{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-400 mt-2">{doneCount} de {checklist.length} etapas concluídas</p>
      </div>

      {/* Checklist */}
      <div className="space-y-3 mb-6">
        {checklist.map((item) => (
          <div
            key={item.key}
            className={`bg-white border rounded-2xl p-4 flex items-start gap-3 ${
              item.done ? "border-emerald-100" : "border-gray-100"
            }`}
          >
            {item.done
              ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              : <Circle       className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
            }
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold ${item.done ? "text-gray-500 line-through" : "text-gray-900"}`}>
                {item.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
            </div>
            {!item.done && item.href && (
              <Link
                href={item.href}
                className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
              >
                {item.cta}
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/client/suporte"
          className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
        >
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">Falar com suporte</p>
            <p className="text-[11px] text-gray-400">Tire dúvidas com a equipe</p>
          </div>
        </Link>

        <Link
          href="/client/arquivos"
          className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
        >
          <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">Seus arquivos</p>
            <p className="text-[11px] text-gray-400">Materiais enviados pela equipe</p>
          </div>
        </Link>

        <Link
          href="/client/solicitacoes"
          className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
        >
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Link2 className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">Solicitações</p>
            <p className="text-[11px] text-gray-400">Envie pedidos para a equipe</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
