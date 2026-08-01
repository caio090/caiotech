import { redirect } from "next/navigation";
import { requireAdminContentOSContext } from "@/lib/admin-contentos-api";
import { AdminContentOSUnavailableState } from "@/components/admin-contentos-unavailable-state";
import { getBusinessOfficeFeed, GLOBAL_CALENDAR_TIMEZONE } from "@/lib/business-office/data";
import { EscritorioClient } from "./_escritorio-client";
import { PageHeader } from "@/components/page-header";

/**
 * Sprint Navegação e Experiência 3.0.1.2 (Fase 10) — Meu Escritório: "o que
 * preciso fazer hoje/esta semana/este mês" — nunca outro dashboard
 * genérico. Auditoria confirmou: não havia rota equivalente antes desta
 * sprint (a busca mais próxima, /admin/ecossistema, respondia "quais
 * módulos existem", não "o que fazer agora" — por isso não foi reaproveitada,
 * e sim reinterpretada como Arquitetura da Plataforma, dentro de Status).
 */
export default async function AdminEscritorioPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params = await searchParams;
  const clientId = params.client ?? null;

  const ctx = await requireAdminContentOSContext();
  if (ctx instanceof Response) {
    if (ctx.status === 401) redirect("/login");
    return (
      <AdminContentOSUnavailableState
        status={ctx.status}
        retryHref={clientId ? `/admin/escritorio?client=${clientId}` : "/admin/escritorio"}
      />
    );
  }
  const { adminDb } = ctx;

  const { items, todayKey, sourceErrors } = await getBusinessOfficeFeed(adminDb, { clientId });

  return (
    <>
      <PageHeader
        title="Meu Escritório"
        description="O que fazer hoje, esta semana e como foi este mês — a partir dos módulos reais."
      />
      {sourceErrors.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700">
          Não foi possível carregar alguns dados agora. Os números abaixo podem estar incompletos.
        </div>
      )}
      <EscritorioClient items={items} todayKey={todayKey} timezone={GLOBAL_CALENDAR_TIMEZONE} />
    </>
  );
}
