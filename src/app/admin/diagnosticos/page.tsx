"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Sparkles, BarChart3, CheckCircle2, Clock, AlertCircle, Link2,
  FileText, RefreshCw, Trash2, Info, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

// ── Tipos ─────────────────────────────────────────────────────────────────────
type StatusKey = "completo" | "parcial" | "pendente" | "aguardando_conexao" | "aguardando_leitura";

interface DiagAreas {
  presencaDigital: number;
  conteudo:        number;
  engajamento:     number;
  consistencia:    number;
  estrategia:      number;
}

interface ClientDiag {
  id:              string;
  clientId:        string;
  clientName:      string;
  avatar:          string;
  color:           string;
  score:           number | null;
  completedAt:     string | null;
  areas:           DiagAreas | null;
  recommendations: string[];
  hasMetaConn:     boolean;
  hasOlaClick:     boolean;
  isDemo:          boolean;
}

// ── Card demo fixo (tutorial) ────────────────────────────────────────────────
const DEMO_DIAG: ClientDiag = {
  id:          "demo",
  clientId:    "demo",
  clientName:  "Demo Loja",
  avatar:      "DL",
  color:       "bg-gray-400",
  score:       74,
  completedAt: "2025-01-01",
  areas: {
    presencaDigital: 80,
    conteudo:        70,
    engajamento:     75,
    consistencia:    68,
    estrategia:      77,
  },
  recommendations: [
    "Este é um cliente demonstrativo — explore o painel para entender o funcionamento",
    "Diagnóstico Digital analisa presença, conteúdo e engajamento da marca",
    "Diagnóstico Comercial mostra dados de vendas quando OlaClick estiver conectado",
  ],
  hasMetaConn:  false,
  hasOlaClick:  false,
  isDemo:       true,
};

// ── Helpers visuais ───────────────────────────────────────────────────────────
const STATUS: Record<StatusKey, { label: string; color: string; bg: string }> = {
  completo:           { label: "Completo",          color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
  parcial:            { label: "Parcial",            color: "text-amber-700",   bg: "bg-amber-50 border-amber-100"     },
  pendente:           { label: "Pendente",           color: "text-gray-500",    bg: "bg-gray-50 border-gray-200"       },
  aguardando_conexao: { label: "Aguardando conexão", color: "text-blue-700",    bg: "bg-blue-50 border-blue-100"       },
  aguardando_leitura: { label: "Aguardando leitura", color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-100"   },
};

function scoreStatus(score: number | null): StatusKey {
  if (score === null) return "pendente";
  if (score >= 80) return "completo";
  if (score >= 65) return "parcial";
  return "pendente";
}

function StatusBadge({ status }: { status: StatusKey }) {
  const cfg  = STATUS[status];
  const Icon = status === "completo" ? CheckCircle2 : status === "aguardando_conexao" ? Link2 : status === "aguardando_leitura" ? Clock : AlertCircle;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" />{cfg.label}
    </span>
  );
}

function SourceBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${active ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-gray-50 text-gray-400 border-gray-100"}`}>
      {active ? "✓" : "○"} {label}
    </span>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-bold text-gray-700">{value}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className={cn("h-1.5 rounded-full", value >= 80 ? "bg-emerald-500" : value >= 65 ? "bg-amber-400" : "bg-red-400")} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ── Card com score ────────────────────────────────────────────────────────────
function DiagCard({ d, onRemoveDemo }: { d: ClientDiag; onRemoveDemo?: () => void }) {
  const st = scoreStatus(d.score);
  return (
    <div className={cn("bg-white rounded-2xl border p-5 relative", d.isDemo ? "border-dashed border-gray-300" : "border-gray-100")}>
      {/* Badge demo */}
      {d.isDemo && (
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">DEMO — tutorial</span>
          <button onClick={onRemoveDemo} title="Remover card demo" className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("w-10 h-10 rounded-xl text-white text-sm font-bold flex items-center justify-center flex-shrink-0", d.color)}>
          {d.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">{d.clientName}</h3>
          <p className="text-xs text-gray-400">
            {d.completedAt ? new Date(d.completedAt).toLocaleDateString("pt-BR") : "Sem diagnóstico ainda"}
          </p>
        </div>
        {d.score !== null && (
          <div className="text-center flex-shrink-0">
            <div className={cn("text-2xl font-black", d.score >= 80 ? "text-emerald-600" : d.score >= 65 ? "text-amber-500" : "text-red-500")}>{d.score}</div>
            <div className="text-[10px] text-gray-400">score</div>
          </div>
        )}
      </div>

      {/* Diagnóstico Digital */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-purple-500" strokeWidth={1.5} />
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Saúde Digital</p>
          </div>
          <StatusBadge status={d.score !== null ? st : "pendente"} />
        </div>

        {d.areas ? (
          <div className="space-y-2">
            <ScoreBar label="Presença Digital" value={d.areas.presencaDigital} />
            <ScoreBar label="Conteúdo"         value={d.areas.conteudo} />
            <ScoreBar label="Engajamento"      value={d.areas.engajamento} />
            <ScoreBar label="Consistência"     value={d.areas.consistencia} />
            <ScoreBar label="Estratégia"       value={d.areas.estrategia} />
          </div>
        ) : (
          <p className="text-[11px] text-gray-400">Diagnóstico ainda não realizado para este cliente.</p>
        )}

        <div className="flex flex-wrap gap-1 mt-2">
          <SourceBadge label="Diagnóstico da marca" active={d.score !== null} />
          <SourceBadge label="Content OS"            active={d.score !== null} />
          <SourceBadge label="Insights Meta"         active={d.hasMetaConn} />
        </div>
      </div>

      {/* Diagnóstico Comercial */}
      <div className="border-t border-gray-50 pt-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3 text-emerald-500" strokeWidth={1.5} />
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Saúde Comercial</p>
          </div>
          <StatusBadge status={d.hasOlaClick ? "aguardando_leitura" : "aguardando_conexao"} />
        </div>
        <p className="text-[10px] text-gray-400 mb-1.5">
          {d.hasOlaClick
            ? "OlaClick conectado — aguardando leitura de dados."
            : "Dados de faturamento não disponíveis. Conecte OlaClick ou envie relatório."}
        </p>
        <div className="flex flex-wrap gap-1">
          <SourceBadge label="OlaClick"         active={d.hasOlaClick} />
          <SourceBadge label="Relatório mensal" active={false} />
        </div>
      </div>

      {/* Recomendações */}
      {d.recommendations.length > 0 && (
        <div className="border-t border-gray-50 pt-3">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Recomendações</p>
          <ul className="space-y-1">
            {d.recommendations.map((r, i) => (
              <li key={i} className="text-[11px] text-gray-500 flex items-start gap-1.5">
                <span className={cn("mt-0.5 flex-shrink-0", d.isDemo ? "text-gray-300" : "text-indigo-400")}>→</span>{r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ações para cliente sem diagnóstico */}
      {d.score === null && !d.isDemo && (
        <div className="border-t border-gray-50 pt-3 flex flex-col gap-1.5">
          <button className="text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors w-full">
            Iniciar Diagnóstico Digital
          </button>
          <Link href="/admin/conexoes" className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors w-full text-center">
            Conectar fonte comercial
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
const DEMO_HIDDEN_KEY = "lokat_diag_demo_hidden";

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase() || "??";
}

const COLORS = [
  "bg-indigo-500","bg-purple-500","bg-pink-500","bg-rose-500","bg-amber-500",
  "bg-emerald-500","bg-teal-500","bg-cyan-500","bg-blue-500","bg-violet-500",
];
function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return COLORS[Math.abs(h) % COLORS.length];
}

export default function AdminDiagnosticosPage() {
  const [clients,     setClients]     = useState<ClientDiag[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showDemo,    setShowDemo]    = useState(false);

  // Demo pode ser ocultado pelo admin
  useEffect(() => {
    const hidden = localStorage.getItem(DEMO_HIDDEN_KEY) === "1";
    setShowDemo(!hidden);
  }, []);

  const removeDemo = () => {
    localStorage.setItem(DEMO_HIDDEN_KEY, "1");
    setShowDemo(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      setClients([]);
      setLoading(false);
      return;
    }
    try {
      const supabase = createClient();

      // Busca clientes reais
      const { data: rawClients } = await supabase
        .from("clients")
        .select("id, company_name, created_at")
        .eq("status", "active")
        .order("company_name");

      // Busca conexões Meta
      const { data: metaConns } = await supabase
        .from("meta_connections")
        .select("client_id")
        .eq("status", "active");

      // Busca conexões OlaClick
      const { data: olaConns } = await supabase
        .from("olaclick_connections")
        .select("client_id")
        .eq("status", "active");

      // Busca diagnósticos digitais se tabela existir
      const { data: diagData } = await supabase
        .from("client_diagnostics")
        .select("*")
        .eq("status", "active");

      const metaSet = new Set((metaConns ?? []).map((m: { client_id: string }) => m.client_id));
      const olaSet  = new Set((olaConns  ?? []).map((o: { client_id: string }) => o.client_id));
      const diagMap = new Map(
        (diagData ?? []).map((d: { client_id: string; [k: string]: unknown }) => [d.client_id, d])
      );

      const list: ClientDiag[] = (rawClients ?? []).map((c: { id: string; company_name: string; created_at: string }) => {
        const diag = diagMap.get(c.id) as Record<string, unknown> | undefined;
        return {
          id:          c.id,
          clientId:    c.id,
          clientName:  c.company_name,
          avatar:      initials(c.company_name),
          color:       colorFor(c.id),
          score:       diag?.score as number | null ?? null,
          completedAt: diag?.completed_at as string | null ?? null,
          areas:       diag?.areas as DiagAreas | null ?? null,
          recommendations: (diag?.recommendations as string[] | null) ?? [],
          hasMetaConn: metaSet.has(c.id),
          hasOlaClick: olaSet.has(c.id),
          isDemo:      false,
        };
      });

      setClients(list);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Separa clientes com diagnóstico dos sem
  const withDiag    = clients.filter((c) => c.score !== null);
  const withoutDiag = clients.filter((c) => c.score === null);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Diagnósticos</h1>
          <p className="text-sm text-gray-400 mt-0.5">Saúde digital e comercial por cliente — dados reais</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-40">
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Atualizar
        </button>
      </div>

      {/* Explicação do sistema */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6 p-5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" strokeWidth={1.5} />
            </div>
            <p className="text-xs font-black text-purple-800">Diagnóstico Digital</p>
          </div>
          <p className="text-[11px] text-purple-700 leading-relaxed">
            Mede presença digital, conteúdo, engajamento, consistência e estratégia. Alimenta a <strong>Content OS</strong> com contexto.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {["Diagnóstico da marca", "Content OS", "Insights Meta", "Calendário editorial"].map((l) => (
              <span key={l} className="text-[9px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{l}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
            </div>
            <p className="text-xs font-black text-emerald-800">Diagnóstico Comercial</p>
          </div>
          <p className="text-[11px] text-emerald-700 leading-relaxed">
            Mede faturamento, ticket médio, produtos mais vendidos e gargalos de venda via OlaClick ou relatório manual.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {["OlaClick", "API de vendas", "Relatório anexado", "Dados manuais"].map((l) => (
              <span key={l} className="text-[9px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{l}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Carregando clientes reais…
        </div>
      )}

      {/* Aviso: cliente precisa estar cadastrado primeiro */}
      {!loading && clients.length === 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 space-y-1">
            <p className="font-bold">Nenhum cliente cadastrado ainda.</p>
            <p>Para usar os diagnósticos, cadastre o cliente primeiro em <strong>Clientes</strong>, conecte o Meta em <strong>Conexões</strong> e depois o diagnóstico digital pode ser iniciado.</p>
            <Link href="/admin/clientes" className="inline-flex items-center gap-1 text-blue-700 font-semibold hover:underline mt-1">
              Ir para Clientes <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Grid — clientes COM diagnóstico */}
      {!loading && (withDiag.length > 0 || showDemo) && (
        <>
          {withDiag.length > 0 && (
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Com diagnóstico</p>
          )}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
            {showDemo && <DiagCard key="demo" d={DEMO_DIAG} onRemoveDemo={removeDemo} />}
            {withDiag.map((d) => <DiagCard key={d.id} d={d} />)}
          </div>
        </>
      )}

      {/* Grid — clientes SEM diagnóstico */}
      {!loading && withoutDiag.length > 0 && (
        <>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Aguardando diagnóstico</p>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
            {withoutDiag.map((d) => <DiagCard key={d.id} d={d} />)}
          </div>
        </>
      )}

      {/* Demo sozinho (quando não há outros clientes ainda) */}
      {!loading && clients.length === 0 && showDemo && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
          <DiagCard d={DEMO_DIAG} onRemoveDemo={removeDemo} />
        </div>
      )}

      {/* Nota fluxo correto */}
      {!loading && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="text-[11px] text-gray-400 space-y-1">
            <p>
              <strong className="text-gray-600">Fluxo correto:</strong> Cadastre o cliente em <Link href="/admin/clientes" className="text-indigo-500 hover:underline">Clientes</Link> → conecte o Meta em <Link href="/admin/conexoes" className="text-indigo-500 hover:underline">Conexões</Link> → inicie o diagnóstico digital → o comercial aparece automaticamente quando OlaClick estiver conectado.
            </p>
            <p>
              <strong className="text-gray-600">Dados comerciais:</strong> Quando OlaClick ou outro sistema estiver conectado, o Diagnóstico Comercial exibirá faturamento, ticket médio e produtos mais vendidos automaticamente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
