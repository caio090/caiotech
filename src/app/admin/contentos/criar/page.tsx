import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import { ContentosSubNav } from "../_contentos-subnav";
import ContentosCriarOriginal from "@/app/contentos/criar/page";

export default async function AdminContentosCriarPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params     = await searchParams;
  const clientId   = params.client ?? null;

  if (!clientId) {
    redirect("/admin/contentos/selecionar-cliente");
  }

  if (isSupabaseConfigured) {
    const valid = await validateContentOSClient(clientId);
    if (!valid) {
      redirect("/admin/contentos/selecionar-cliente");
    }
  }

  return (
    <>
      <ContentosSubNav />
      <ContentosCriarOriginal />
    </>
  );
}
