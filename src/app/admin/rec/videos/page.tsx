"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, Copy, Archive, Play, RefreshCw, AlertTriangle, CheckCircle,
  Video, Tag, User, SortAsc, Eye, EyeOff, Star, MessageSquare,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getAdminRecVideos, createRecVideo, archiveRecVideo, uploadRecVideoFile,
  type RecVideo,
} from "@/lib/rec-videos";

const CATEGORIES = ["campanha", "feedback", "institucional", "produto", "evento", "bastidores", "outro"];

// ── Auth guard ───────────────────────────────────────────────────────────────
function useAdminGuard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!isSupabaseConfigured) { setReady(true); return; }
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).maybeSingle();
      const role = (profile as { role?: string } | null)?.role ?? "";
      if (!["admin", "super_admin"].includes(role)) {
        router.replace("/client/home");
        return;
      }
      setReady(true);
    }).catch(() => router.replace("/login"));
  }, [router]);
  return ready;
}

// ── Upload form ──────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  title:         "",
  description:   "",
  client_name:   "",
  category:      "campanha",
  sort_order:    0,
  is_public:     true,
  is_featured:   false,
  is_feedback:   false,
  show_in_cards: true,
  status:        "active",
};

function UploadForm({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file,     setFile]     = useState<File | null>(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [loading,  setLoading]  = useState(false);
  const [progress, setProgress] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !form.title) setForm((p) => ({ ...p, title: f.name.replace(/\.[^.]+$/, "") }));
  };

  const set = (k: keyof typeof EMPTY_FORM) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const val = e.target.type === "checkbox"
      ? (e.target as HTMLInputElement).checked
      : e.target.type === "number"
      ? Number(e.target.value)
      : e.target.value;
    setForm((p) => ({ ...p, [k]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError("Selecione um arquivo de vídeo."); return; }
    if (!form.title.trim()) { setError("Título obrigatório."); return; }
    setError(null); setSuccess(false); setLoading(true);

    try {
      setProgress("Fazendo upload do vídeo…");
      const { publicUrl, storagePath, error: upErr } = await uploadRecVideoFile(file);
      if (upErr || !publicUrl) throw new Error(upErr ?? "Erro no upload.");

      setProgress("Salvando metadados…");
      const { error: dbErr } = await createRecVideo({
        ...form,
        video_url:    publicUrl,
        storage_path: storagePath,
        thumbnail_url: null,
        is_public:    form.is_public,
        is_featured:  form.is_featured,
        is_feedback:  form.is_feedback,
        show_in_cards: form.show_in_cards,
        sort_order:   form.sort_order,
        status:       form.status,
      });
      if (dbErr) throw new Error(dbErr);

      setSuccess(true);
      setForm(EMPTY_FORM);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const inp = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white";
  const lbl = "block text-xs font-semibold text-gray-600 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Arquivo */}
      <div>
        <label className={lbl}>Arquivo de vídeo *</label>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          {file
            ? <p className="text-sm font-medium text-indigo-700">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
            : <p className="text-sm text-gray-400">Clique para selecionar · MP4, WebM, MOV</p>
          }
          <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleFile} />
        </div>
        <p className="text-xs text-gray-400 mt-1">⚠ Vídeos grandes ficam no Supabase Storage — não vão para o GitHub.</p>
      </div>

      {/* Título + Cliente */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Título *</label>
          <input className={inp} value={form.title} onChange={set("title")} placeholder="Ex: Dia do Solteiro" required />
        </div>
        <div>
          <label className={lbl}>Cliente / Case</label>
          <input className={inp} value={form.client_name} onChange={set("client_name")} placeholder="Ex: Sandubão" />
        </div>
      </div>

      {/* Descrição */}
      <div>
        <label className={lbl}>Descrição</label>
        <textarea className={`${inp} resize-none`} rows={2} value={form.description} onChange={set("description")} placeholder="Breve descrição do vídeo" />
      </div>

      {/* Categoria + Ordem */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Categoria</label>
          <select className={inp} value={form.category} onChange={set("category")}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Ordem (menor = primeiro)</label>
          <input className={inp} type="number" min={0} value={form.sort_order} onChange={set("sort_order")} />
        </div>
      </div>

      {/* Flags */}
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            { key: "is_public",     label: "Visível na página pública",    icon: Eye },
            { key: "show_in_cards", label: "Aparece nos cards de portfolio", icon: Video },
            { key: "is_featured",   label: "Vídeo em destaque",             icon: Star },
            { key: "is_feedback",   label: "Depoimento / feedback",         icon: MessageSquare },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer rounded-xl border border-gray-100 px-3 py-2 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={form[key] as boolean}
              onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))}
              className="w-4 h-4 accent-indigo-600"
            />
            <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-700">{label}</span>
          </label>
        ))}
      </div>

      {error   && <p className="text-red-600 text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> {error}</p>}
      {success && <p className="text-green-600 text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Vídeo enviado com sucesso!</p>}
      {loading && progress && <p className="text-indigo-600 text-sm">{progress}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading
          ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando…</>
          : <><Upload className="w-4 h-4" /> Enviar vídeo</>
        }
      </button>
    </form>
  );
}

// ── Video row ────────────────────────────────────────────────────────────────
function VideoRow({ video, onArchive }: { video: RecVideo; onArchive: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(video.video_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-white hover:border-gray-200 transition-colors">
      <div className="flex items-start gap-4">
        {/* Mini preview */}
        <div className="w-20 h-14 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0 relative">
          <video
            src={video.video_url}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="w-5 h-5 text-white opacity-80" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900 truncate">{video.title}</span>
            {video.is_feedback && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Feedback</span>
            )}
            {video.is_featured && (
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Destaque</span>
            )}
            {!video.is_public && (
              <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <EyeOff className="w-2.5 h-2.5" /> Oculto
              </span>
            )}
            {video.status === "archived" && (
              <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Arquivado</span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
            {video.client_name && (
              <span className="flex items-center gap-1"><User className="w-3 h-3" /> {video.client_name}</span>
            )}
            {video.category && (
              <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {video.category}</span>
            )}
            <span className="flex items-center gap-1"><SortAsc className="w-3 h-3" /> ordem: {video.sort_order}</span>
          </div>

          <p className="text-xs text-gray-400 mt-1 truncate font-mono">{video.video_url}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={copy}
            title="Copiar URL pública"
            className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-indigo-600 transition-colors"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>

          {video.status !== "archived" && (
            <button
              onClick={onArchive}
              title="Arquivar vídeo"
              className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────
export default function AdminRecVideosPage() {
  const ready    = useAdminGuard();
  const [videos, setVideos] = useState<RecVideo[]>([]);
  const [tab,    setTab]    = useState<"upload" | "list">("upload");
  const [filter, setFilter] = useState<"all" | "active" | "archived">("active");

  const load = useCallback(async () => {
    const data = await getAdminRecVideos();
    setVideos(data);
  }, []);

  useEffect(() => { if (ready) void load(); }, [ready, load]);

  const handleArchive = async (id: string) => {
    if (!confirm("Arquivar este vídeo? Ele não aparecerá mais na página pública.")) return;
    await archiveRecVideo(id);
    void load();
  };

  const filtered = videos.filter((v) =>
    filter === "all"
      ? true
      : filter === "archived"
      ? v.status === "archived"
      : v.status === "active"
  );

  if (!ready) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Carregando…</div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Vídeos LOKAT.REC</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie os vídeos usados na página pública da produtora.</p>
      </div>

      {/* Avisos */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-800">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
        <div className="space-y-1">
          <p><strong>Vídeos grandes não vão para o GitHub.</strong> Eles ficam no Supabase Storage (bucket <code>rec-videos</code>).</p>
          <p>A página pública usa apenas vídeos com status <strong>ativo</strong> e marcados como <strong>visíveis</strong>.</p>
          <p>Se o bucket <code>rec-videos</code> ainda não existir, crie manualmente no painel Supabase → Storage → New bucket → <strong>rec-videos</strong> (público).</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["upload", "list"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === "list") void load(); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "upload" ? "Novo vídeo" : `Cadastrados (${videos.filter((v) => v.status === "active").length})`}
          </button>
        ))}
      </div>

      {/* Upload tab */}
      {tab === "upload" && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-500" /> Upload de novo vídeo
          </h2>
          <UploadForm onDone={() => { void load(); setTab("list"); }} />
        </div>
      )}

      {/* List tab */}
      {tab === "list" && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
              {(["active", "archived", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  {f === "active" ? "Ativos" : f === "archived" ? "Arquivados" : "Todos"}
                </button>
              ))}
            </div>
            <button onClick={() => void load()} className="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Video className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">Nenhum vídeo encontrado.</p>
              <p className="text-xs mt-1">Use a aba "Novo vídeo" para fazer upload.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((v) => (
                <VideoRow key={v.id} video={v} onArchive={() => void handleArchive(v.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
