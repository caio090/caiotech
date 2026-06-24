"use client";
import { useState } from "react";
import { Users, Plus, Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";

interface Lead {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  origin: string | null;
  interest: string | null;
  pipeline_stage: string;
  next_action: string | null;
  next_action_at: string | null;
  notes: string | null;
  created_at: string;
}

const STAGE_LABELS: Record<string, string> = {
  novo_lead:              "Novo lead",
  pre_qualificacao:       "Pré-qualificação",
  contato_feito:          "Contato feito",
  reuniao_agendada:       "Reunião agendada",
  diagnostico_realizado:  "Diagnóstico realizado",
  proposta_enviada:       "Proposta enviada",
  negociacao:             "Negociação",
  fechado:                "Fechado",
  perdido:                "Perdido",
  onboarding:             "Onboarding",
};

const STAGE_COLORS: Record<string, string> = {
  novo_lead:             "bg-gray-100 text-gray-600",
  pre_qualificacao:      "bg-sky-100 text-sky-700",
  contato_feito:         "bg-blue-100 text-blue-700",
  reuniao_agendada:      "bg-violet-100 text-violet-700",
  diagnostico_realizado: "bg-indigo-100 text-indigo-700",
  proposta_enviada:      "bg-amber-100 text-amber-700",
  negociacao:            "bg-orange-100 text-orange-700",
  fechado:               "bg-emerald-100 text-emerald-700",
  perdido:               "bg-red-100 text-red-700",
  onboarding:            "bg-purple-100 text-purple-700",
};

const EMPTY_FORM = {
  company_name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  origin: "",
  interest: "",
  pipeline_stage: "novo_lead",
  notes: "",
};

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-400 transition-colors bg-white";

function NewLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: (lead: Lead) => void }) {
  const [form,   setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (k: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim()) { setError("Informe a empresa."); return; }
    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: err } = await supabase
        .from("commercial_leads")
        .insert({
          company_name:   form.company_name.trim(),
          contact_name:   form.contact_name  || null,
          contact_email:  form.contact_email || null,
          contact_phone:  form.contact_phone || null,
          origin:         form.origin        || null,
          interest:       form.interest      || null,
          pipeline_stage: form.pipeline_stage,
          notes:          form.notes         || null,
          responsible_id: user?.id ?? null,
          created_by:     user?.id ?? null,
        })
        .select()
        .single();
      if (err) { setError(err.message); return; }
      onCreated(data as Lead);
    } catch (e) {
      setError("Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
          <h2 className="text-sm font-black text-gray-900">Novo lead</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Empresa *</label>
            <input value={form.company_name} onChange={set("company_name")} placeholder="Nome da empresa" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Contato</label>
              <input value={form.contact_name} onChange={set("contact_name")} placeholder="Nome" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Telefone</label>
              <input value={form.contact_phone} onChange={set("contact_phone")} placeholder="(11) 99999-0000" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">E-mail</label>
            <input type="email" value={form.contact_email} onChange={set("contact_email")} placeholder="contato@empresa.com" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Origem</label>
              <input value={form.origin} onChange={set("origin")} placeholder="Ex: Instagram, indicação" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Interesse</label>
              <input value={form.interest} onChange={set("interest")} placeholder="Ex: Gestão de redes" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Etapa no pipeline</label>
            <select value={form.pipeline_stage} onChange={set("pipeline_stage")} className={inputCls}>
              {Object.entries(STAGE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Observações</label>
            <textarea value={form.notes} onChange={set("notes")} rows={2} placeholder="Contexto, fonte, detalhes..." className={cn(inputCls, "resize-none")} />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 text-xs font-bold py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {saving ? "Salvando…" : "Criar lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LeadsContent({ leads: initial, isDemo }: { leads: Lead[]; isDemo?: boolean }) {
  const [leads,      setLeads]      = useState<Lead[]>(initial);
  const [search,     setSearch]     = useState("");
  const [stageFilter,setStageFilter]= useState("todos");
  const [showNew,    setShowNew]    = useState(false);

  const filtered = leads.filter((l) => {
    const matchSearch = !search ||
      l.company_name.toLowerCase().includes(search.toLowerCase()) ||
      (l.contact_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "todos" || l.pipeline_stage === stageFilter;
    return matchSearch && matchStage;
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Leads
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {leads.length} lead{leads.length !== 1 ? "s" : ""}
            {isDemo && <span className="ml-2 text-amber-600 text-xs">· modo demonstração</span>}
          </p>
        </div>
        {isSupabaseConfigured && (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Novo lead
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresa ou contato..."
            className="text-xs bg-transparent outline-none text-gray-700 placeholder-gray-400 flex-1"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white outline-none focus:border-blue-400"
        >
          <option value="todos">Todas as etapas</option>
          {Object.entries(STAGE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-600 mb-1">
            {leads.length === 0 ? "Nenhum lead atribuído a você ainda." : "Nenhum lead encontrado."}
          </p>
          {isSupabaseConfigured && leads.length === 0 && (
            <button
              onClick={() => setShowNew(true)}
              className="mt-3 text-xs text-blue-600 font-medium hover:underline"
            >
              Criar primeiro lead →
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map((lead) => (
              <div key={lead.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                  {(lead.company_name[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{lead.company_name}</p>
                  {lead.contact_name && <p className="text-xs text-gray-400 truncate">{lead.contact_name}</p>}
                  {lead.interest && <p className="text-xs text-gray-400 truncate">↳ {lead.interest}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {lead.origin && (
                    <span className="text-[10px] text-gray-400 hidden sm:block">{lead.origin}</span>
                  )}
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", STAGE_COLORS[lead.pipeline_stage] ?? "bg-gray-100 text-gray-600")}>
                    {STAGE_LABELS[lead.pipeline_stage] ?? lead.pipeline_stage}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showNew && isSupabaseConfigured && (
        <NewLeadModal
          onClose={() => setShowNew(false)}
          onCreated={(lead) => { setLeads((prev) => [lead, ...prev]); setShowNew(false); }}
        />
      )}
    </div>
  );
}
