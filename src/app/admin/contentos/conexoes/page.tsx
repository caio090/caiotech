import { redirect } from "next/navigation";
import { resolveCompanyContext } from "@/lib/company-context/resolve";
import { CompanyContextRequiredState } from "@/components/company-context-required-state";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
import { RecOsConnectionsContent } from "./_client-content";

/**
 * REC OS Context Foundation V1 — antes, "Conexões" no sub-nav do REC OS
 * saía direto para /admin/conexoes, perdendo o `?client=` (Company Context
 * Foundation, item 3 da missão). Esta rota ESPELHA o status real das
 * integrações relevantes ao REC OS (Meta/Instagram, OlaClick) sem duplicar
 * tabela/credencial -- consome exatamente as mesmas APIs que
 * /admin/conexoes já usa (/api/meta/hub-assets, /api/olaclick/status),
 * nunca uma segunda Central de Integrações. Configuração avançada continua
 * exclusivamente em /admin/conexoes (CTA secundário "Gerenciar integração").
 */
export default async function RecOsConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params = await searchParams;
  const clientId = params.client ?? null;
  const nextPath = clientId ? `/admin/contentos/conexoes?client=${clientId}` : "/admin/contentos/conexoes";

  const resolution = await resolveCompanyContext(clientId);
  if (!resolution.valid) {
    if (resolution.reason === "not_authenticated") redirect("/login");
    if (resolution.reason === "role_not_supported") redirect("/admin/dashboard");
    return (
      <>
        <ContentosSubNavServer />
        <CompanyContextRequiredState reason={resolution.reason ?? "company_required"} nextPath={nextPath} />
      </>
    );
  }
  const context = resolution.context!;

  return (
    <>
      <ContentosSubNavServer initialClientId={context.companyId} />
      <RecOsConnectionsContent companyId={context.companyId} companyName={context.companyName} />
    </>
  );
}
