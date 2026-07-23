import { redirect } from "next/navigation";

// Sprint canônica — esta rota deixou de ter uma implementação própria de
// seleção de cliente (que usava localStorage, divergindo da regra "URL é a
// única fonte de verdade" já adotada pelo hub). Redireciona para o hub com o
// seletor pesquisável já aberto — mesmo componente canônico, sem fluxo
// paralelo.
export default async function AdminSelecionarClientePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params = await searchParams;
  const target = params.client
    ? `/admin/contentos?client=${encodeURIComponent(params.client)}&clientPicker=open`
    : "/admin/contentos?clientPicker=open";
  redirect(target);
}
