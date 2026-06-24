import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { redirect } from "next/navigation";
import { Clock, AlertCircle } from "lucide-react";

interface Lead {
  id: string;
  company_name: string;
  contact_name: string | null;
  pipeline_stage: string;
  next_action: string | null;
  next_action_at: string | null;
}

const STAGE_LABELS: Record<string, string> = {
  novo_lead:              "Novo lead",
  pre_qualificacao:       "Pré-qualificação",
  contato_feito:          "Contato feito",
  reuniao_agendada:       "Reunião agendada",
  diagnostico_realizado:  "Diagnóstico realizado",
  proposta_enviada:       "Proposta enviada",
  negociacao:             "Negociação",
};

function isOverdue(iso: string | null) {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) +
    " · " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default async function FollowUpsPage() {
  let leads: Lead[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role = profile?.role ?? "";

    let q = supabase
      .from("commercial_leads")
      .select("id, company_name, contact_name, pipeline_stage, next_action, next_action_at")
      .not("next_action_at", "is", null)
      .not("pipeline_stage", "in", '("fechado","perdido")')
      .order("next_action_at");

    if (role !== "admin") {
      q = q.or(`responsible_id.eq.${user.id},created_by.eq.${user.id}`);
    }

    const { data } = await q;
    leads = (data as Lead[]) ?? [];
  }

  const overdue  = leads.filter((l) => isOverdue(l.next_action_at));
  const upcoming = leads.filter((l) => !isOverdue(l.next_action_at));

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Follow-ups
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {leads.length} follow-up{leads.length !== 1 ? "s" : ""} pendente{leads.length !== 1 ? "s" : ""}
          {overdue.length > 0 && (
            <span className="ml-2 text-red-600 font-medium">· {overdue.length} atrasado{overdue.length > 1 ? "s" : ""}</span>
          )}
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-600 mb-1">Nenhum follow-up pendente.</p>
          <p className="text-xs text-gray-400">Define próximas ações nos seus leads para aparecerem aqui.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {overdue.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-bold text-red-700">Atrasados ({overdue.length})</span>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-2xl overflow-hidden">
                <div className="divide-y divide-red-100">
                  {overdue.map((l) => (
                    <div key={l.id} className="flex items-start gap-3 px-5 py-3.5">
                      <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center text-xs font-bold text-red-700 flex-shrink-0 mt-0.5">
                        {(l.company_name[0] ?? "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{l.company_name}</p>
                        {l.contact_name && <p className="text-xs text-gray-500 truncate">{l.contact_name}</p>}
                        {l.next_action && <p className="text-xs text-red-600 mt-1">→ {l.next_action}</p>}
                        {l.next_action_at && (
                          <p className="text-[10px] text-red-500 font-medium mt-0.5">
                            Previsto: {fmtDateTime(l.next_action_at)}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-gray-500 bg-white border border-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                        {STAGE_LABELS[l.pipeline_stage] ?? l.pipeline_stage}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-bold text-gray-700">Próximos ({upcoming.length})</span>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {upcoming.map((l) => (
                    <div key={l.id} className="flex items-start gap-3 px-5 py-3.5">
                      <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0 mt-0.5">
                        {(l.company_name[0] ?? "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{l.company_name}</p>
                        {l.contact_name && <p className="text-xs text-gray-400 truncate">{l.contact_name}</p>}
                        {l.next_action && <p className="text-xs text-blue-600 mt-1">→ {l.next_action}</p>}
                        {l.next_action_at && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {fmtDateTime(l.next_action_at)}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                        {STAGE_LABELS[l.pipeline_stage] ?? l.pipeline_stage}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
