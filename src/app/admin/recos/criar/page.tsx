import { redirect } from "next/navigation";

/**
 * LOKAT OS CENTRAL — Audiovisual Route Separation. Redirect de
 * compatibilidade, preservando query params (ex.: ?client=) -- ver
 * src/app/admin/recos/page.tsx.
 */
export default async function RecosCreateLegacyRedirect({
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
  redirect(qs ? `/admin/audiovisual/criar?${qs}` : "/admin/audiovisual/criar");
}
