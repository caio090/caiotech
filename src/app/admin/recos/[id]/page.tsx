import { redirect } from "next/navigation";

/**
 * LOKAT OS CENTRAL — Audiovisual Route Separation. Redirect de
 * compatibilidade, preservando o ID -- ver src/app/admin/recos/page.tsx.
 */
export default async function RecosProjectLegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/audiovisual/${encodeURIComponent(id)}`);
}
