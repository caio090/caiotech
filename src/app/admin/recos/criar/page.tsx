"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clapperboard, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { CLIENT_VISIBLE_STATUSES } from "@/lib/client-visibility";

const PROJECT_TYPES = [
  { id: "comercial",    label: "Comercial",           desc: "Anúncio com narrativa" },
  { id: "institucional",label: "Institucional",        desc: "Vídeo da empresa/marca" },
  { id: "aftermovie",  label: "Aftermovie",           desc: "Cobertura de evento" },
  { id: "casamento",   label: "Casamento",             desc: "Cerimônia e festa" },
  { id: "evento",      label: "Evento",                desc: "Cobertura de evento" },
  { id: "documentario",label: "Documentário curto",   desc: "Narrativa documental" },
  { id: "video_marca", label: "Vídeo de Marca",       desc: "Filme de identidade" },
  { id: "campanha",    label: "Campanha Audiovisual", desc: "Série de vídeos" },
  { id: "clipe",       label: "Clipe",                desc: "Clipe musical" },
  { id: "depoimento",  label: "Depoimento",           desc: "Testemunhal / entrevista" },
  { id: "reels",       label: "Reels Cinematográfico",desc: "Reels com produção" },
  { id: "outro",       label: "Outro",                desc: "Formato personalizado" },
] as const;

const VISUAL_STYLES = [
  "Cinematográfico", "Documental", "Institucional", "Emocional",
  "Dinâmico", "Comercial", "Elegante", "Urbano",
  "Minimalista", "Premium", "Espontâneo",
];

const STATUS_OPTIONS = [
  { value: "em_andamento", label: "Em andamento" },
  { value: "em_producao",  label: "Em produção" },
  { value: "pausado",      label: "Pausado" },
];

interface DbClient { id: string; company_name: string; }

export default function RecosCreatePage() {
  const router = useRouter();

  const [title, setTitle]             = useState("");
  const [projectType, setProjectType] = useState("comercial");
  const [objective, setObjective]     = useState("");
  const [style, setStyle]             = useState("");
  const [duration, setDuration]       = useState("");
  const [location, setLocation]       = useState("");
  const [recDate, setRecDate]         = useState("");
  const [notes, setNotes]             = useState("");
  const [status, setStatus]           = useState("em_andamento");
  const [clientId, setClientId]       = useState("");
  const [clients, setClients]         = useState<DbClient[]>([]);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    supabase
      .from("clients")
      .select("id, company_name, deleted_at, archived_at")
      .in("status", CLIENT_VISIBLE_STATUSES)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("company_name")
      .then(({ data }) => setClients((data as DbClient[]) ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError(null);

    try {
      if (!isSupabaseConfigured) throw new Error("Supabase não configurado");
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        title:             title.trim(),
        project_type:      projectType,
        objective:         objective.trim() || null,
        style:             style || null,
        duration_estimate: duration.trim() || null,
        location:          location.trim() || null,
        recording_date:    recDate || null,
        notes:             notes.trim() || null,
        status,
        client_id:         clientId || null,
        created_by:        user?.id ?? null,
      };

      const { data, error: insertErr } = await supabase
        .from("rec_projects")
        .insert(payload)
        .select("id")
        .single();

      if (insertErr) throw insertErr;
      router.push(`/admin/recos/${data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar projeto.");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/recos"
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center">
            <Clapperboard className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-gray-900">Criar projeto audiovisual</h1>
            <p className="text-xs text-gray-400">RecOS</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nome do projeto */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-800">Informações básicas</h2>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Nome do projeto *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Institucional Empresa X, Aftermovie Evento Y..."
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-rose-400 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Cliente (opcional)</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-rose-400 transition-colors bg-white"
            >
              <option value="">Sem cliente vinculado</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Objetivo do vídeo</label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="O que este vídeo precisa comunicar? Qual a ação esperada do espectador?"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-rose-400 resize-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Duração estimada</label>
              <input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Ex: 2 min, 30 seg..."
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-rose-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-rose-400 transition-colors bg-white"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tipo de projeto */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-800">Tipo de projeto</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROJECT_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setProjectType(t.id)}
                className={cn(
                  "text-left p-3 rounded-xl border-2 transition-all",
                  projectType === t.id
                    ? "border-rose-500 bg-rose-50"
                    : "border-gray-100 hover:border-rose-200"
                )}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-gray-800">{t.label}</span>
                  {projectType === t.id && <Check className="w-3 h-3 text-rose-500" />}
                </div>
                <span className="text-[10px] text-gray-400">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Estilo visual */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-800">Estilo visual</h2>
          <div className="flex flex-wrap gap-2">
            {VISUAL_STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(style === s ? "" : s)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
                  style === s
                    ? "border-rose-500 bg-rose-50 text-rose-700"
                    : "border-gray-200 text-gray-600 hover:border-rose-200"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Locação e gravação */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-800">Locação e data</h2>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Local de gravação</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Studio São Paulo, Empresa X – Av. Paulista..."
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-rose-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Data prevista de gravação</label>
            <input
              type="date"
              value={recDate}
              onChange={(e) => setRecDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-rose-400 transition-colors"
            />
          </div>
        </div>

        {/* Observações */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Observações internas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Informações adicionais, contexto, referências iniciais..."
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-rose-400 resize-none transition-colors"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/admin/recos"
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors text-center"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />}
            {saving ? "Criando..." : "Criar projeto"}
          </button>
        </div>
      </form>
    </div>
  );
}
