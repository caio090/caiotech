import { redirect } from "next/navigation";

/**
 * LOKAT OS CENTRAL — Audiovisual Route Separation. A implementação real do
 * módulo audiovisual (projetos de vídeo, rec_projects) mudou para
 * /admin/audiovisual, para não colidir com o nome "REC OS" (rota
 * /admin/contentos). Esta rota existe só como redirect de compatibilidade
 * -- nunca uma segunda implementação (ver docs/DECISIONS.md, 2026-07-12).
 */
export default async function RecosLegacyRedirect({
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
  redirect(qs ? `/admin/audiovisual?${qs}` : "/admin/audiovisual");
}
