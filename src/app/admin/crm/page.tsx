import { redirect } from "next/navigation";

/**
 * Sprint Navegação e Experiência 3.0.1.2 (Fase 21) — a implementação
 * principal do CRM já vive em /admin/leads (sidebar, header, bottom nav,
 * busca e ação rápida já apontam para lá). /admin/crm existe como alias
 * de compatibilidade para quem espera essa rota pelo nome visível "CRM" —
 * nunca uma segunda implementação.
 */
export default async function CrmAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) { for (const v of value) query.append(key, v); }
    else query.set(key, value);
  }
  const qs = query.toString();
  redirect(qs ? `/admin/leads?${qs}` : "/admin/leads");
}
