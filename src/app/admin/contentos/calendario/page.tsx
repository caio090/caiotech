import { redirect } from "next/navigation";

// Fase 8 do hotfix canônico 1.0.1 — esta rota era uma implementação própria,
// mais antiga e restrita a um único cliente (redirecionava ao seletor sem
// `client`), duplicando o Calendário Global canônico em /admin/calendario
// (que já agrega content_items/operational_tasks/approvals de todos os
// clientes e nunca redireciona ao seletor). Agora é só um alias: encaminha
// os mesmos parâmetros de busca (client, source, year, month e quaisquer
// outros) para a rota canônica, sem interface própria.
export default async function AdminContentosCalendarioAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) query.append(key, v);
    } else {
      query.set(key, value);
    }
  }
  const qs = query.toString();
  redirect(qs ? `/admin/calendario?${qs}` : "/admin/calendario");
}
