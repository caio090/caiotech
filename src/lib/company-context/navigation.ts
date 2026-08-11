/**
 * Sprint MVP Dogfood Final — Company Context Transversal (Fase 8/9).
 * Chave canônica única para o parâmetro de Company em toda a aplicação --
 * já era `client` em todo lugar que existia (selecionar-cliente, Meu
 * Escritório, resolveCompanyContext, testes E2E). Nenhuma segunda chave é
 * criada (`?company=`/`?clientId=`/`?business=` concorrentes, proibido
 * pelo brief).
 */
export const COMPANY_CONTEXT_QUERY_KEY = "client";

/**
 * Adiciona (ou substitui) o parâmetro de Company canônico a um path,
 * preservando qualquer outro query param já presente. Path puramente
 * relativo (nunca monta URL absoluta) -- uso em `<Link href>`/`router.push`.
 * Retorna o path inalterado quando `companyId` é null/undefined (nada a
 * preservar).
 */
export function withCompanyContext(path: string, companyId: string | null | undefined): string {
  if (!companyId) return path;
  const [pathname, search] = path.split("?");
  const params = new URLSearchParams(search ?? "");
  params.set(COMPANY_CONTEXT_QUERY_KEY, companyId);
  return `${pathname}?${params.toString()}`;
}

/** Lê o companyId ativo a partir de um `URLSearchParams` real (ex.: useSearchParams()). */
export function readCompanyContextParam(searchParams: URLSearchParams | null | undefined): string | null {
  return searchParams?.get(COMPANY_CONTEXT_QUERY_KEY) ?? null;
}
