import { redirect } from "next/navigation";
import { requireAdminContentOSContext } from "@/lib/admin-contentos-api";
import { AdminContentOSUnavailableState } from "@/components/admin-contentos-unavailable-state";
import { getBusinessOfficeFeed, GLOBAL_CALENDAR_TIMEZONE } from "@/lib/business-office/data";
import { getFortalezaToday } from "@/lib/global-calendar";
import type { BusinessOfficeFeedItem } from "@/lib/business-office/types";
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
    if (ctx.status === 403) {
      return (
        <AdminContentOSUnavailableState
          status={403}
          retryHref={clientId ? `/admin/escritorio?client=${clientId}` : "/admin/escritorio"}
        />
      );
    }
  }

  // Sprint QA Fix 3.0.2.6 (CI-PRODUCT-OFFICE-SHELL-001) — 503 ("fonte de
  // dados temporariamente indisponível", o estado real quando
  // SUPABASE_SERVICE_ROLE_KEY não está configurada -- deliberadamente
  // ausente no Environment de CI local-e2e-qa) não é falta de permissão:
  // a pessoa continua autenticada e com acesso, só uma fonte de dados está
  // fora do ar agora. Diferente de 403 (acima), mantém o shell operacional
  // (Hoje/Semana/Mês) visível com um aviso honesto, em vez de substituir a
  // página inteira por um estado genérico.
  let items: BusinessOfficeFeedItem[] = [];
  let todayKey = getFortalezaToday().dateKey;
  let unavailableBanner: string | null = null;

  if (ctx instanceof Response) {
    unavailableBanner = "Este recurso está temporariamente indisponível. Não foi possível carregar os dados agora — tente novamente em instantes. Sua sessão continua ativa.";
  } else {
    const result = await getBusinessOfficeFeed(ctx.adminDb, { clientId });
    items = result.items;
    todayKey = result.todayKey;
    if (result.sourceErrors.length > 0) {
      unavailableBanner = "Não foi possível carregar alguns dados agora. Os números abaixo podem estar incompletos.";
    }
  }

  return (
    <>
      <PageHeader
        title="Meu Escritório"
        description="O que fazer hoje, esta semana e como foi este mês — a partir dos módulos reais."
      />
      {unavailableBanner && (
        <div className="mb-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700">
          {unavailableBanner}
        </div>
      )}
      <EscritorioClient items={items} todayKey={todayKey} timezone={GLOBAL_CALENDAR_TIMEZONE} />
    </>
  );
}
