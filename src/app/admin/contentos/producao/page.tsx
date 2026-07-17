import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  requireAdminContentOSContext,
  validateAdminClient,
} from "@/lib/admin-contentos-api";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
import { PageHeader } from "@/components/page-header";
import {
  ScrollText, Palette, Video, FileText, ArrowRight, Lightbulb, ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { getContentOSSuggestions } from "@/lib/ai-suggestions";

const STATUS_LABEL: Record<string, string> = {
  briefing:           "Briefing",
  producao:           "Em produção",
  em_producao:        "Em produção",
  edicao:             "Edição",
  revisao_interna:    "Revisão interna",
  alteracao_solicitada: "Alteração",
  ajuste:             "Ajuste",
};

const STATUS_COLOR: Record<string, string> = {
  briefing:             "bg-blue-50 text-blue-700 border-blue-100",
  producao:             "bg-indigo-50 text-indigo-700 border-indigo-100",
  em_producao:          "bg-indigo-50 text-indigo-700 border-indigo-100",
  edicao:               "bg-amber-50 text-amber-700 border-amber-100",
  revisao_interna:      "bg-orange-50 text-orange-700 border-orange-100",
  alteracao_solicitada: "bg-red-50 text-red-700 border-red-100",
  ajuste:               "bg-red-50 text-red-700 border-red-100",
};

const TASK_STATUS_LABEL: Record<string, string> = {
  briefing:   "Briefing",
  producao:   "Em produção",
  edicao:     "Edição",
  revisao:    "Revisão",
  concluido:  "Concluído",
};

const TASK_STATUS_COLOR: Record<string, string> = {
  briefing:  "bg-blue-50 text-blue-700 border-blue-100",
  producao:  "bg-indigo-50 text-indigo-700 border-indigo-100",
  edicao:    "bg-amber-50 text-amber-700 border-amber-100",
  revisao:   "bg-orange-50 text-orange-700 border-orange-100",
  concluido: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

const TYPE_ICON: Record<string, React.ElementType> = {
  roteiro: ScrollText, arte: Palette, video: Video,
};

type OperationalTask = {
  id: string;
  client_id: string;
  content_item_id: string | null;
  title: string | null;
  status: string | null;
  task_type: string | null;
  department: string | null;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string | null;
};

export default async function AdminContentosProducaoPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; content_id?: string; task?: string }>;
}) {
  const params     = await searchParams;
  const clientId   = params.client ?? null;
  const highlightContentId = params.content_id ?? null;
  const highlightTaskId    = params.task ?? null;

  if (!clientId) redirect("/admin/contentos/selecionar-cliente");

  let companyName = "";
  let inProduction: Array<{ id: string; title: string | null; channel: string | null; type: string | null; status: string | null; scheduled_date: string | null }> = [];
  let tasks: OperationalTask[] = [];
  let suggestions: Awaited<ReturnType<typeof getContentOSSuggestions>> = [];

  if (isSupabaseConfigured) {
    const ctx = await requireAdminContentOSContext();
    if (ctx instanceof Response) redirect("/admin/contentos/selecionar-cliente");
    const { adminDb } = ctx as Exclude<typeof ctx, Response>;

    const valid = await validateAdminClient(adminDb, clientId);
    if (!valid) redirect("/admin/contentos/selecionar-cliente");

    const { data: clientRow } = await adminDb
      .from("clients")
      .select("company_name")
      .eq("id", clientId)
      .maybeSingle();
    companyName = (clientRow as { company_name?: string } | null)?.company_name ?? "";

    const { data: contentData } = await adminDb
      .from("content_items")
      .select("id, title, channel, type, status, scheduled_date")
      .eq("client_id", clientId)
      .in("status", ["briefing", "producao", "em_producao", "edicao", "revisao_interna", "alteracao_solicitada", "ajuste"])
      .order("created_at", { ascending: false })
      .limit(30);
    inProduction = (contentData ?? []) as typeof inProduction;

    const { data: taskData } = await adminDb
      .from("operational_tasks")
      .select("id, client_id, content_item_id, title, status, task_type, department, assigned_to, due_date, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(30);
    tasks = (taskData ?? []) as OperationalTask[];

    suggestions = await getContentOSSuggestions(adminDb, clientId);
  }

  const criarHref = `/admin/contentos/criar?client=${clientId}`;

  return (
    <>
      <ContentosSubNavServer initialClientId={clientId} />
      <PageHeader
        title="Produção"
        description={`Conteúdos em execução para ${companyName}`}
      />
      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} compact className="mb-5" />
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(STATUS_LABEL)
            .filter(([key]) => key !== "em_producao")
            .map(([key, label]) => {
              const count = inProduction.filter(c => c.status === key || (key === "producao" && c.status === "em_producao")).length;
              if (count === 0) return null;
              return (
                <span key={key} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${STATUS_COLOR[key]}`}>
                  {label}: {count}
                </span>
              );
            })}
        </div>
        <Link
          href={criarHref}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          Novo briefing
        </Link>
      </div>

      {/* Tarefas operacionais */}
      {tasks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-black uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" /> Tarefas operacionais
          </h2>
          <div className="space-y-2">
            {tasks.map((task) => {
              const isHighlighted = task.id === highlightTaskId;
              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-2xl p-4 flex flex-col gap-1.5 ${
                    isHighlighted
                      ? "border-2 border-indigo-400 ring-2 ring-indigo-100"
                      : "border border-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold text-gray-900 truncate">{task.title ?? "Sem título"}</p>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${
                      TASK_STATUS_COLOR[task.status ?? ""] ?? "bg-gray-50 text-gray-600 border-gray-100"
                    }`}>
                      {TASK_STATUS_LABEL[task.status ?? ""] ?? task.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
                    <p className="text-[11px] text-gray-400">
                      <span className="font-semibold text-gray-500">ID tarefa:</span>{" "}
                      <span className="font-mono">{task.id}</span>
                    </p>
                    {task.content_item_id && (
                      <p className="text-[11px] text-gray-400">
                        <span className="font-semibold text-gray-500">Conteúdo:</span>{" "}
                        <span className="font-mono">{task.content_item_id}</span>
                      </p>
                    )}
                    {task.department && (
                      <p className="text-[11px] text-gray-400">
                        <span className="font-semibold text-gray-500">Área:</span> {task.department}
                      </p>
                    )}
                    {task.task_type && (
                      <p className="text-[11px] text-gray-400">
                        <span className="font-semibold text-gray-500">Tipo:</span> {task.task_type}
                      </p>
                    )}
                    {task.assigned_to && (
                      <p className="text-[11px] text-gray-400">
                        <span className="font-semibold text-gray-500">Responsável:</span> {task.assigned_to}
                      </p>
                    )}
                    {task.due_date && (
                      <p className="text-[11px] text-gray-400">
                        <span className="font-semibold text-gray-500">Prazo:</span>{" "}
                        {new Date(task.due_date).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                    {task.created_at && (
                      <p className="text-[11px] text-gray-400">
                        <span className="font-semibold text-gray-500">Criada em:</span>{" "}
                        {new Date(task.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conteúdos em produção */}
      <h2 className="text-xs font-black uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5" /> Conteúdos
      </h2>

      {inProduction.length === 0 ? (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Video className="w-6 h-6 text-purple-400" />
          </div>
          <p className="text-sm font-bold text-gray-700 mb-1">Nenhum conteúdo em produção</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Quando um conteúdo aprovado for enviado para produção, ele aparecerá aqui com briefing, tipo, prazo e responsável.
          </p>
          <Link
            href={criarHref}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 px-3 py-2 rounded-xl hover:bg-purple-100 transition-colors"
          >
            Criar pauta <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {inProduction.map((item) => {
            const Icon = TYPE_ICON[item.type ?? ""] ?? FileText;
            const isHighlighted = item.id === highlightContentId;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-4 flex items-center gap-4 ${
                  isHighlighted
                    ? "border-2 border-purple-400 ring-2 ring-purple-100"
                    : "border border-gray-100"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.channel ?? "—"} · {item.type ?? "—"}
                    {item.scheduled_date ? ` · ${new Date(item.scheduled_date).toLocaleDateString("pt-BR")}` : ""}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_COLOR[item.status ?? ""] ?? "bg-gray-50 text-gray-600 border-gray-100"}`}>
                  {STATUS_LABEL[item.status ?? ""] ?? item.status}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
        <p className="text-xs font-bold text-indigo-800 mb-1 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5" /> Como funciona a produção
        </p>
        <p className="text-xs text-indigo-600">
          A REC OS cria estratégia, briefing, roteiro e direção criativa.
          Ao enviar para produção, uma tarefa é criada no Operacional para o responsável (designer, videomaker, editor ou social media).
          O resultado volta para aprovação do cliente.
        </p>
      </div>
    </>
  );
}
