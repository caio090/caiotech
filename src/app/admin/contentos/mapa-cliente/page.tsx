import Link from "next/link";
import { CalendarDays, CheckSquare, ClipboardList, Factory, Files, Users, AlertTriangle, ArrowRight, Eye } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireAdminContentOSContext } from "@/lib/admin-contentos-api";
import { resolveClientContext } from "@/lib/rec-os-client-context";
import { getWorkspacePreviewContext } from "@/lib/workspaces/context";
import { getRoadmapItems } from "@/lib/rec-os-roadmap-data";
import type { RecOsRoadmapItem } from "@/lib/rec-os-roadmap";
import { buildCalendarNavigationUrl } from "@/lib/rec-os-workflow/types";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

/**
 * Sprint REC OS 3.0.1.1 (Fase 11/12) — Mapa do Cliente. Painel de leitura
 * (nenhuma mutação nesta tela) que agrega e LINCA para os módulos reais —
 * nunca duplica dado. Isolamento: reaproveita exatamente
 * `requireAdminContentOSContext()` + `resolveClientContext()`, os mesmos
 * primitivos já auditados usados por Produção/Aprovações — nenhuma segunda
 * camada de autorização inventada aqui. Isso dá a esta tela as MESMAS
 * garantias de RLS/staff-only que o resto do REC OS já tem.
 *
 * Limitação honesta (documentada em docs/rec-os/client-map.md): isolamento
 * diferenciado por login real de agência/cliente-da-agência/empresa-direta
 * ainda não existe fora do preview do Super Admin (mesma lacuna já
 * registrada para a bottom navigation na Sprint REC OS 3.0.1). Quando o
 * Super Admin está em preview, o `clientId` da URL é ignorado em favor do
 * workspace do preview — a única diferenciação de superfície hoje possível
 * com segurança real.
 */
export default async function AdminContentosMapaClientePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  let clientId = client ?? null;

  const preview = await getWorkspacePreviewContext();
  const isPreview = preview.status === "active_read_only";
  if (isPreview && preview.context && (preview.context.surface === "agency_client" || preview.context.surface === "direct_business")) {
    // Fase 12 — nunca confia apenas no clientId da URL: em preview de um
    // workspace de negócio, o workspace do preview sempre vence.
    clientId = preview.context.workspaceId;
  }

  let companyName = "";
  let clientStatus: "absent" | "valid" | "invalid" = "absent";
  let items: RecOsRoadmapItem[] = [];
  let approvalsPending = 0;
  let tasksOpen = 0;

  if (isSupabaseConfigured && clientId) {
    const ctx = await requireAdminContentOSContext();
    if (!(ctx instanceof Response)) {
      const { adminDb } = ctx;
      const clientContext = await resolveClientContext(adminDb, clientId);
      clientStatus = clientContext.status;
      if (clientContext.status === "valid") {
        companyName = clientContext.companyName;
        items = await getRoadmapItems(adminDb, { clientId: clientContext.clientId });

        const [{ count: approvalsCount }, { count: tasksCount }] = await Promise.all([
          adminDb.from("approvals").select("id", { count: "exact", head: true }).eq("client_id", clientContext.clientId).eq("status", "aguardando"),
          adminDb.from("operational_tasks").select("id", { count: "exact", head: true }).eq("client_id", clientContext.clientId).neq("status", "concluido"),
        ]);
        approvalsPending = approvalsCount ?? 0;
        tasksOpen = tasksCount ?? 0;
      }
    }
  }

  if (!clientId || clientStatus === "absent") {
    return (
      <>
        <ContentosSubNavServer />
        <PageHeader title="Mapa do Cliente" description="Selecione um cliente na navegação para ver o mapa consolidado." />
        <EmptyState icon={Users} title="Nenhum cliente selecionado" description="O Mapa do Cliente agrega campanhas, conteúdos, aprovações, calendário, tarefas e bloqueios de um único cliente por vez." />
      </>
    );
  }

  if (clientStatus === "invalid") {
    return (
      <>
        <ContentosSubNavServer />
        <PageHeader title="Mapa do Cliente" />
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-xs text-red-700">
          Cliente não encontrado ou sem acesso para o ID informado na URL.
        </div>
      </>
    );
  }

  const blocked = items.filter((i) => i.blocked);
  const upcoming = items.filter((i) => !!i.dueAt).sort((a, b) => (a.dueAt! < b.dueAt! ? -1 : 1)).slice(0, 5);
  const responsibles = [...new Set(items.map((i) => i.responsibleName).filter((n): n is string => !!n))];
  const calendarUrl = buildCalendarNavigationUrl("/admin/calendario", {
    workspaceId: clientId, clientId, campaignId: null, contentId: null, month: null,
    filters: {}, returnRoute: `/admin/contentos/mapa-cliente?client=${clientId}`,
  });

  return (
    <>
      <ContentosSubNavServer initialClientId={clientId} />
      <PageHeader title="Mapa do Cliente" description={`Visão consolidada de ${companyName} — cada card abre o módulo real.`}>
        {isPreview && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full">
            <Eye className="w-3 h-3" /> Modo de visualização — somente leitura
          </span>
        )}
      </PageHeader>

      {items.length === 0 && (
        <div className="mb-6 bg-gray-50 border border-gray-100 rounded-2xl p-6 text-center" data-testid="client-map-empty-content">
          <p className="text-sm font-bold text-gray-700 mb-1">Este cliente ainda não tem conteúdo ou campanha</p>
          <p className="text-xs text-gray-400">Quando um conteúdo for criado no REC OS para ele, aparece aqui automaticamente.</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link href={`/admin/contentos/producao?client=${clientId}`} className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-purple-200">
          <Factory className="w-4 h-4 text-purple-500 mb-2" />
          <p className="text-xl font-black text-gray-900">{items.length}</p>
          <p className="text-xs text-gray-500">Conteúdos</p>
        </Link>
        <Link href={`/admin/contentos/aprovacoes?client=${clientId}`} className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-purple-200">
          <CheckSquare className="w-4 h-4 text-amber-500 mb-2" />
          <p className="text-xl font-black text-gray-900">{approvalsPending}</p>
          <p className="text-xs text-gray-500">Aprovações pendentes</p>
        </Link>
        <Link href={`/admin/contentos/producao?client=${clientId}`} className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-purple-200">
          <ClipboardList className="w-4 h-4 text-indigo-500 mb-2" />
          <p className="text-xl font-black text-gray-900">{tasksOpen}</p>
          <p className="text-xs text-gray-500">Tarefas abertas</p>
        </Link>
        <Link href={calendarUrl} className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-purple-200">
          <CalendarDays className="w-4 h-4 text-emerald-500 mb-2" />
          <p className="text-xl font-black text-gray-900">{upcoming.length}</p>
          <p className="text-xs text-gray-500">Próximos prazos</p>
        </Link>
      </div>

      {blocked.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-red-800 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Bloqueios ({blocked.length})</p>
          <div className="space-y-1.5">
            {blocked.map((i) => (
              <Link key={i.id} href={`/admin/contentos/producao?client=${clientId}&content_id=${i.contentId}`} className="flex items-center justify-between text-xs text-red-700 hover:underline">
                <span className="truncate">{i.title} — {i.blockReason}</span>
                <ArrowRight className="w-3 h-3 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-gray-700 mb-3">Próximos prazos</p>
          {upcoming.length === 0 ? (
            <p className="text-xs text-gray-400">Nenhum conteúdo com prazo definido ainda.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((i) => (
                <div key={i.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 truncate">{i.title}</span>
                  <span className="text-gray-400 flex-shrink-0 ml-2">{new Date(i.dueAt!).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Responsáveis envolvidos</p>
          {responsibles.length === 0 ? (
            <p className="text-xs text-gray-400">Nenhum responsável atribuído nos conteúdos deste cliente ainda.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {responsibles.map((r) => (
                <span key={r} className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-100">{r}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
        <p className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1.5"><Files className="w-3.5 h-3.5" /> Arquivos e resultados</p>
        <p className="text-xs text-gray-400">
          Biblioteca de arquivos ainda não disponível (ver Biblioteca de ativos). Resultados de campanha:{" "}
          <Link href={`/admin/contentos/resultados?client=${clientId}`} className="underline font-semibold text-gray-600">ver Resultados</Link>.
        </p>
      </div>
    </>
  );
}
