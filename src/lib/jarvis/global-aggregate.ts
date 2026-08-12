/**
 * Sprint Command Center + Jarvis Context V1 (Problema 6) — agregação REAL
 * do Jarvis Global. "Global" nunca significa "sem dados": significa "visão
 * agregada das empresas que o usuário JÁ está autorizado a ver" -- mesmo
 * padrão do Office Global (Sprint Final Closure, Fase 30): ownership vem de
 * listAuthorizedCompanies() (profiles.client_id / client_user_access /
 * agency_workspaces+agency_clients -- nunca role="admin" enxergando tudo),
 * os dados vêm de UMA busca (getBusinessOfficeFeed com clientId: null), e o
 * filtro pelas IDs autorizadas acontece em memória DEPOIS da busca -- a
 * busca global em si não é restrita por Company, então nunca usar seu
 * resultado bruto sem passar por esse filtro primeiro.
 *
 * Nenhuma tabela nova, nenhuma segunda fonte de verdade. Detalhe por
 * projeto (getProjectProjections) só é buscado para um número limitado de
 * empresas (MAX_DETAILED_COMPANIES) -- nunca um N+1 sobre todas as
 * empresas autorizadas de uma agência grande.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { listAuthorizedCompanies } from "@/lib/office-global/authorized-companies";
import { getBusinessOfficeFeed, GLOBAL_CALENDAR_TIMEZONE } from "@/lib/business-office/data";
import { classifyBusinessOfficeItems, isBusinessOfficeItemOverdue, type BusinessOfficeFeedItem } from "@/lib/business-office/types";
import { officeCalendarHealth } from "@/lib/business-office/source-health";
import { getProjectProjections, isActiveProject } from "@/lib/project-projection/adapters";

const MAX_DETAILED_COMPANIES = 6;
const MAX_ATTENTION_TITLES_PER_COMPANY = 3;

export interface JarvisGlobalCompanySummary {
  companyId: string;
  companyName: string;
  todayCount: number;
  overdueCount: number;
  approvalsPendingCount: number;
  activeProjectsCount: number;
  attentionTitles: string[];
}

export interface JarvisGlobalSummary {
  authorizedCompanyCount: number;
  /** Só as empresas mais relevantes (atrasos/hoje/aprovações primeiro), até MAX_DETAILED_COMPANIES. */
  companies: JarvisGlobalCompanySummary[];
  /** Empresas autorizadas que existem mas não entraram no detalhe (cap de contexto). */
  omittedCompanyCount: number;
  calendarAvailable: boolean;
}

export async function buildJarvisGlobalSummary(
  adminDb: SupabaseClient,
  userId: string,
  role: string,
): Promise<JarvisGlobalSummary> {
  const authorized = await listAuthorizedCompanies(adminDb, userId, role);
  if (authorized.length === 0) {
    return { authorizedCompanyCount: 0, companies: [], omittedCompanyCount: 0, calendarAvailable: true };
  }

  const authorizedIds = new Set(authorized.map((c) => c.id));
  const { items, todayKey, sourceErrors } = await getBusinessOfficeFeed(adminDb, { clientId: null });
  // Fail closed: getBusinessOfficeFeed(clientId: null) devolve itens de
  // TODAS as empresas do banco -- nunca repassar isso adiante sem restringir
  // às IDs que listAuthorizedCompanies() de fato autorizou para este usuário.
  const authorizedItems = items.filter((item) => authorizedIds.has(item.workspaceId));
  const nowIso = new Date().toISOString();

  const byCompany = new Map<string, BusinessOfficeFeedItem[]>();
  for (const item of authorizedItems) {
    const list = byCompany.get(item.workspaceId);
    if (list) list.push(item);
    else byCompany.set(item.workspaceId, [item]);
  }

  const ranked = authorized.map((company) => {
    const companyItems = byCompany.get(company.id) ?? [];
    const { today } = classifyBusinessOfficeItems(companyItems, todayKey, GLOBAL_CALENDAR_TIMEZONE);
    const overdueItems = companyItems.filter((item) => isBusinessOfficeItemOverdue(item, nowIso));
    const approvalsPending = companyItems.filter((item) => item.type === "approval" && !item.completedAt);
    return { company, todayCount: today.length, overdueItems, approvalsPending };
  }).sort((a, b) =>
    (b.overdueItems.length - a.overdueItems.length)
    || (b.todayCount - a.todayCount)
    || (b.approvalsPending.length - a.approvalsPending.length)
  );

  const detailed = ranked.slice(0, MAX_DETAILED_COMPANIES);
  const omittedCompanyCount = ranked.length - detailed.length;

  const activeProjectCounts = await Promise.all(
    detailed.map(async (entry) => {
      const projects = await getProjectProjections(adminDb, entry.company.id);
      return projects.filter(isActiveProject).length;
    }),
  );

  const companies: JarvisGlobalCompanySummary[] = detailed.map((entry, index) => ({
    companyId: entry.company.id,
    companyName: entry.company.companyName ?? "Empresa sem nome",
    todayCount: entry.todayCount,
    overdueCount: entry.overdueItems.length,
    approvalsPendingCount: entry.approvalsPending.length,
    activeProjectsCount: activeProjectCounts[index],
    attentionTitles: entry.overdueItems.slice(0, MAX_ATTENTION_TITLES_PER_COMPANY).map((item) => item.title),
  }));

  return {
    authorizedCompanyCount: authorized.length,
    companies,
    omittedCompanyCount,
    calendarAvailable: officeCalendarHealth(sourceErrors) !== "unavailable",
  };
}
