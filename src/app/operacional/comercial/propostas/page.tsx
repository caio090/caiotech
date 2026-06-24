import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";

interface Proposal {
  id: string;
  title: string;
  value: number | null;
  recurrence: string | null;
  status: string;
  valid_until: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  rascunho:   { label: "Rascunho",    cls: "bg-gray-100 text-gray-600" },
  enviada:    { label: "Enviada",     cls: "bg-blue-100 text-blue-700" },
  visualizada:{ label: "Visualizada", cls: "bg-indigo-100 text-indigo-700" },
  aceita:     { label: "Aceita ✓",    cls: "bg-emerald-100 text-emerald-700" },
  recusada:   { label: "Recusada",    cls: "bg-red-100 text-red-700" },
  expirada:   { label: "Expirada",    cls: "bg-orange-100 text-orange-700" },
};

function fmtCurrency(val: number | null) {
  if (!val) return "—";
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PropostasPage() {
  let proposals: Proposal[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role = profile?.role ?? "";

    let q = supabase
      .from("commercial_proposals")
      .select("id, title, value, recurrence, status, valid_until, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    if (role !== "admin") {
      q = q.eq("created_by", user.id);
    }

    const { data } = await q;
    proposals = (data as Proposal[]) ?? [];
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-600" />
          Propostas
        </h1>
        <p className="text-sm text-gray-500 mt-1">{proposals.length} proposta{proposals.length !== 1 ? "s" : ""}</p>
      </div>

      {proposals.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-600 mb-1">Nenhuma proposta criada ainda.</p>
          <p className="text-xs text-gray-400">Propostas comerciais aparecerão aqui conforme forem criadas no pipeline.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {proposals.map((p) => {
              const cfg = STATUS_CONFIG[p.status] ?? { label: p.status, cls: "bg-gray-100 text-gray-600" };
              return (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{p.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs font-bold text-gray-800">{fmtCurrency(p.value)}</span>
                      {p.recurrence && <span className="text-xs text-gray-400">/ {p.recurrence}</span>}
                      {p.valid_until && (
                        <span className="text-[10px] text-gray-400">
                          Válida até {new Date(p.valid_until).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
