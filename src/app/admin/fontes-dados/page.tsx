"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  Upload, FileText, BarChart3, Link2, AlertCircle, CheckCircle2,
  Loader2, RefreshCw, ChevronDown, Building2, Plus, Clock,
  FileSpreadsheet, Image, FileType, Brain, Eye, CalendarDays,
  UtensilsCrossed, AtSign, Globe, Layers,
} from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────
interface ClientOption { id: string; company_name: string }

interface ReportUpload {
  id: string;
  client_id: string;
  report_type: string;
  period_start: string | null;
  period_end: string | null;
  file_name: string | null;
  file_type: string | null;
  upload_status: string;
  extraction_status: string;
  ai_summary: string | null;
  notes: string | null;
  created_at: string | null;
}

// Tipos de relatório suportados — genéricos para qualquer nicho
const REPORT_TYPES = [
  { value: "revenue",       label: "Faturamento / Receita"   },
  { value: "sales",         label: "Vendas / Serviços"        },
  { value: "abc_curve",     label: "Curva ABC"                },
  { value: "products",      label: "Produtos mais vendidos"   },
  { value: "leads",         label: "Leads / Prospecção"       },
  { value: "appointments",  label: "Agendamentos"             },
  { value: "crm",           label: "CRM / Pipeline"           },
  { value: "campaign",      label: "Campanhas"                },
  { value: "traffic",       label: "Tráfego / Anúncios"       },
  { value: "general",       label: "Relatório geral"          },
] as const;

type ReportTypeValue = typeof REPORT_TYPES[number]["value"];

const EXTRACTION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:       { label: "Aguardando análise",  color: "text-amber-600 bg-amber-50 border-amber-100"  },
  processing:    { label: "Processando…",        color: "text-blue-600 bg-blue-50 border-blue-100"     },
  processed:     { label: "Analisado",           color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  failed:        { label: "Erro na análise",     color: "text-red-600 bg-red-50 border-red-100"        },
  manual_review: { label: "Revisão manual",      color: "text-violet-600 bg-violet-50 border-violet-100" },
};

const FILE_TYPE_ICON: Record<string, React.ElementType> = {
  pdf:  FileType,
  xlsx: FileSpreadsheet,
  csv:  FileSpreadsheet,
  png:  Image,
  jpg:  Image,
  jpeg: Image,
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}

// ── Fontes de dados estáticas disponíveis ──────────────────────
// Reflete o que existe na plataforma. Futuro: buscar de client_data_sources.
const DATA_SOURCES = [
  { key: "meta",         label: "Meta / Instagram", icon: AtSign,       href: "/admin/conexoes",          color: "text-blue-500" },
  { key: "digital_menu", label: "Cardápio Digital",  icon: UtensilsCrossed, href: "/admin/conexoes",       color: "text-orange-500" },
  { key: "crm",          label: "CRM",              icon: Globe,         href: "/admin/conexoes",          color: "text-indigo-500", soon: true },
  { key: "pos",          label: "PDV / Caixa",      icon: Layers,        href: "/admin/conexoes",          color: "text-emerald-500", soon: true },
  { key: "manual_file",  label: "Arquivos manuais", icon: FileText,      href: "#upload",                  color: "text-gray-500" },
];

// ── Modal de upload ─────────────────────────────────────────────
function UploadModal({ clients, onClose, onSaved }: {
  clients: ClientOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [clientId,     setClientId]     = useState("");
  const [reportType,   setReportType]   = useState<ReportTypeValue>("general");
  const [periodStart,  setPeriodStart]  = useState("");
  const [periodEnd,    setPeriodEnd]    = useState("");
  const [fileName,     setFileName]     = useState("");
  const [fileType,     setFileType]     = useState("pdf");
  const [notes,        setNotes]        = useState("");
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");

  async function handleSave() {
    if (!clientId || !fileName) { setError("Cliente e nome do arquivo são obrigatórios."); return; }
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/admin/reports/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id:    clientId,
          report_type:  reportType,
          period_start: periodStart || null,
          period_end:   periodEnd   || null,
          file_name:    fileName,
          file_type:    fileType,
          notes:        notes || null,
          // file_url: vazio por enquanto — upload real para Storage será implementado
        }),
      });
      const d = await r.json() as { ok: boolean; reason?: string; message?: string };
      if (d.ok) { onSaved(); }
      else if (d.reason === "sql_pending") {
        setError("SQL 64 pendente. Rode docs/supabase/64-client-data-sources-and-manual-reports.sql no Supabase.");
      } else {
        setError(d.message ?? "Erro ao registrar relatório.");
      }
    } catch { setError("Erro de rede. Tente novamente."); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Upload className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Anexar Relatório</p>
              <p className="text-[10px] text-gray-400">PDF, Excel, CSV, imagem</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 text-lg leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Cliente */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Cliente <span className="text-red-500">*</span></label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400 bg-white"
            >
              <option value="">Selecione o cliente…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>

          {/* Tipo de relatório */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Tipo de relatório</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportTypeValue)}
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400 bg-white"
            >
              {REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Período */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Período início</label>
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Período fim</label>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400" />
            </div>
          </div>

          {/* Arquivo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Nome do arquivo <span className="text-red-500">*</span></label>
              <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)}
                placeholder="relatorio-junho.pdf"
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Tipo</label>
              <select value={fileType} onChange={(e) => setFileType(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400 bg-white">
                <option value="pdf">PDF</option>
                <option value="xlsx">Excel</option>
                <option value="csv">CSV</option>
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
            <p className="font-semibold mb-1">Upload de arquivo</p>
            <p>O upload direto para Supabase Storage será habilitado em breve. Por enquanto, registre os metadados do relatório e anexe o arquivo manualmente no Supabase ou informe a URL.</p>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Observações</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexto ou instruções para análise..."
              rows={2}
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none resize-none focus:border-indigo-400" />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-xs font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={() => void handleSave()} disabled={saving || !clientId || !fileName}
              className="flex-1 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {saving ? "Registrando..." : "Registrar relatório"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────
export default function FontesDadosPage() {
  const [clients,       setClients]       = useState<ClientOption[]>([]);
  const [clientId,      setClientId]      = useState("");
  const [uploads,       setUploads]       = useState<ReportUpload[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [showUpload,    setShowUpload]    = useState(false);
  const [interpretingId, setInterpretingId] = useState<string | null>(null);
  const [interpretMsg,  setInterpretMsg]  = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/clients");
        if (!r.ok) return;
        const d = await r.json() as { clients?: ClientOption[] };
        const list = d.clients ?? [];
        setClients(list);
        if (list.length > 0) setClientId(list[0].id);
      } catch { /* silent */ }
    })();
  }, []);

  const loadUploads = useCallback(async (cid: string) => {
    if (!cid) return;
    setLoadingUploads(true);
    try {
      const r = await fetch(`/api/admin/reports/uploads?client_id=${cid}`);
      const d = await r.json() as { ok: boolean; uploads?: ReportUpload[]; sql_pending?: boolean };
      setUploads(d.uploads ?? []);
    } catch { /* silent */ }
    finally { setLoadingUploads(false); }
  }, []);

  useEffect(() => { if (clientId) void loadUploads(clientId); }, [clientId, loadUploads]);

  async function handleInterpret(uploadId: string) {
    setInterpretingId(uploadId);
    setInterpretMsg((prev) => ({ ...prev, [uploadId]: "" }));
    try {
      const r = await fetch("/api/admin/reports/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_id: uploadId, client_id: clientId }),
      });
      const d = await r.json() as { ok: boolean; message?: string; already_processed?: boolean };
      setInterpretMsg((prev) => ({
        ...prev,
        [uploadId]: d.message ?? (d.ok ? "Interpretado com sucesso." : "Erro na interpretação."),
      }));
      if (d.ok || d.already_processed) void loadUploads(clientId);
    } catch {
      setInterpretMsg((prev) => ({ ...prev, [uploadId]: "Erro de rede." }));
    } finally {
      setInterpretingId(null);
    }
  }

  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <div>
      <PageHeader
        title="Fontes de Dados"
        description="Integracoes e relatorios manuais por cliente"
      >
        <button
          onClick={() => setShowUpload(true)}
          disabled={!clientId}
          className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Anexar Relatório
        </button>
      </PageHeader>

      {/* Seletor de cliente */}
      <div className="mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="pl-8 pr-8 py-2 text-sm border border-gray-200 bg-white rounded-xl outline-none focus:border-indigo-300 appearance-none"
          >
            {clients.length === 0 && <option value="">Sem clientes</option>}
            {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        <Link href="/admin/conexoes" className="text-xs text-indigo-600 hover:text-indigo-800 underline">
          Gerenciar conexões →
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna esquerda: Fontes disponíveis */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Fontes de dados</p>
            <div className="space-y-2">
              {DATA_SOURCES.map((src) => {
                const Icon = src.icon;
                return (
                  <Link
                    key={src.key}
                    href={src.href}
                    className={`flex items-center justify-between p-3 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors group ${src.soon ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${src.color}`} />
                      <span className="text-xs font-medium text-gray-700">{src.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {src.soon
                        ? <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Em breve</span>
                        : <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">Configurar →</span>
                      }
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Dica de uso */}
          <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-4">
            <p className="text-xs font-bold text-indigo-800 mb-2">Como funciona</p>
            <div className="space-y-1.5 text-xs text-indigo-700">
              <p>1. Conecte fontes automáticas (Meta, Cardápio Digital) em <strong>Conexões</strong>.</p>
              <p>2. Anexe relatórios manuais: PDF, Excel, CSV, prints, curva ABC.</p>
              <p>3. A plataforma consolida tudo por cliente e período.</p>
              <p>4. Interpretação por IA será ativada em breve.</p>
            </div>
          </div>
        </div>

        {/* Coluna direita: Relatórios do cliente */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Relatórios{selectedClient ? ` — ${selectedClient.company_name}` : ""}
            </p>
            <button onClick={() => void loadUploads(clientId)} disabled={loadingUploads || !clientId}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50">
              {loadingUploads ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Atualizar
            </button>
          </div>

          {loadingUploads && (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
            </div>
          )}

          {!loadingUploads && uploads.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-600 mb-1">
                {clientId ? "Nenhum relatório anexado" : "Selecione um cliente"}
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Conecte uma fonte ou anexe um relatório para gerar inteligência do cliente.
              </p>
              {clientId && (
                <button onClick={() => setShowUpload(true)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800">
                  <Upload className="w-4 h-4" /> Anexar primeiro relatório
                </button>
              )}
            </div>
          )}

          {!loadingUploads && uploads.map((u) => {
            const FileIcon = FILE_TYPE_ICON[u.file_type ?? ""] ?? FileText;
            const statusInfo = EXTRACTION_STATUS_LABELS[u.extraction_status] ?? EXTRACTION_STATUS_LABELS.pending;
            const reportLabel = REPORT_TYPES.find((t) => t.value === u.report_type)?.label ?? u.report_type;
            const msg = interpretMsg[u.id];

            return (
              <div key={u.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.file_name ?? "Sem arquivo"}</p>
                      <p className="text-xs text-gray-400">{reportLabel}</p>
                      {(u.period_start || u.period_end) && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <CalendarDays className="w-3 h-3" />
                          {u.period_start ? fmtDate(u.period_start) : "—"} → {u.period_end ? fmtDate(u.period_end) : "—"}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium border px-2 py-0.5 rounded-full flex-shrink-0 ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                {u.ai_summary && (
                  <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700">
                    <p className="font-semibold mb-1 flex items-center gap-1"><Brain className="w-3.5 h-3.5" /> Interpretação da IA</p>
                    <p>{u.ai_summary}</p>
                  </div>
                )}

                {u.notes && (
                  <p className="mt-2 text-xs text-gray-500 italic">{u.notes}</p>
                )}

                {msg && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">{msg}</p>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {fmtDate(u.created_at)}
                  </p>
                  <div className="flex items-center gap-2">
                    {u.extraction_status !== "processed" && (
                      <button
                        onClick={() => void handleInterpret(u.id)}
                        disabled={interpretingId === u.id}
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                      >
                        {interpretingId === u.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Brain className="w-3 h-3" />}
                        Interpretar com IA
                      </button>
                    )}
                    {u.file_name && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {u.file_type?.toUpperCase() ?? "—"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Link para relatórios */}
          {uploads.length > 0 && (
            <div className="flex gap-3">
              <Link href="/admin/relatorios/faturamento"
                className="flex-1 p-3.5 bg-white rounded-xl border border-gray-100 hover:border-indigo-100 transition-colors text-center group">
                <BarChart3 className="w-5 h-5 text-indigo-400 mx-auto mb-1 group-hover:text-indigo-600 transition-colors" />
                <p className="text-xs font-semibold text-gray-700">Faturamento</p>
                <p className="text-[10px] text-gray-400">Cardápio Digital</p>
              </Link>
              <Link href="/admin/conexoes"
                className="flex-1 p-3.5 bg-white rounded-xl border border-gray-100 hover:border-indigo-100 transition-colors text-center group">
                <Link2 className="w-5 h-5 text-indigo-400 mx-auto mb-1 group-hover:text-indigo-600 transition-colors" />
                <p className="text-xs font-semibold text-gray-700">Conexões</p>
                <p className="text-[10px] text-gray-400">Meta · Cardápio</p>
              </Link>
            </div>
          )}
        </div>
      </div>

      {showUpload && (
        <UploadModal
          clients={clients}
          onClose={() => setShowUpload(false)}
          onSaved={() => { setShowUpload(false); void loadUploads(clientId); }}
        />
      )}
    </div>
  );
}
