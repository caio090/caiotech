import type { AdminDb } from "@/lib/admin-contentos-api";
import { validateAdminClient } from "@/lib/admin-contentos-api";

/**
 * Fase 5 do hotfix canônico 1.0.1 — interpreta o `?client=` de uma rota do
 * REC OS sem nunca decidir por um redirect universal: cada rota decide o que
 * fazer com o resultado (renderizar modo global, pedir seleção inline, ou
 * mostrar um estado de erro específico).
 */
export type ClientContextResult =
  | { status: "absent" }
  | { status: "valid"; clientId: string; companyName: string }
  | { status: "invalid"; clientId: string };

// Nota: este projeto não tem hoje um conceito de "cliente sem permissão"
// distinto de "cliente inválido" — requireAdminContentOSContext() já exige
// admin/super_admin antes de chegar aqui, e adminDb (service role) enxerga
// todos os clientes não arquivados/excluídos igualmente para esse papel.
// Se um modelo de atribuição por staff for introduzido depois, um terceiro
// estado "forbidden" pode ser adicionado aqui sem mudar as rotas chamadoras.
export async function resolveClientContext(
  adminDb: AdminDb,
  clientId: string | null
): Promise<ClientContextResult> {
  if (!clientId) return { status: "absent" };

  const valid = await validateAdminClient(adminDb, clientId);
  if (!valid) return { status: "invalid", clientId };

  const { data: clientRow } = await adminDb
    .from("clients")
    .select("company_name")
    .eq("id", clientId)
    .maybeSingle();

  const companyName = (clientRow as { company_name?: string } | null)?.company_name ?? "";
  return { status: "valid", clientId, companyName };
}
