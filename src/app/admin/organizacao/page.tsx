import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Users, AlertTriangle, ArrowRight, FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { getOwnOrganizationSummary, resolveOwnOrganizationKind } from "@/lib/own-organization/adapters";

/**
 * Sprint Final Closure (Parte D) — "Minha Agência" / "Minha Organização": a
 * organização do PRÓPRIO usuário/workspace, nunca um Company picker e
 * nunca uma segunda entrada para REC OS (Fase 22/24/28). Uma raiz de
 * dados só (account_type + agency_workspaces/agency_clients/
 * profiles.client_id), duas apresentações -- nunca dois sistemas.
 *
 * /admin/meu-negocio permanece intocada (feature real, testada, com
 * outro propósito -- simulação de operação por Company selecionada) e
 * deliberadamente sai da navegação canônica (Fase 28): o item de
 * sidebar passa a apontar para cá.
 *
 * LKT MISSION CARD — Deployment Production Flow + Organization Naming
 * Separation: a apresentação "business" desta página usava o título
 * "Meu Negócio", colidindo com o módulo operacional real em
 * /admin/meu-negocio (estoque/fichas técnicas/CMV/relatórios) -- duas
 * telas reais, mesmo título. Renomeada para "Minha Organização" (mesmo
 * texto já usado nos estados de loading/erro desta própria página, ver
 * abaixo), nunca alias uma da outra.
 */
export default async function OwnOrganizationPage() {
  const supabase = await createServerSupabaseClient().catch(() => null);
  if (!supabase) {
    return (
      <>
        <PageHeader title="Minha Organização" />
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          Este recurso está temporariamente indisponível.
        </div>
      </>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("account_type, client_id, role").eq("id", user.id).maybeSingle();

  const accountType = (profile as { account_type?: string | null } | null)?.account_type ?? null;
  const profileClientId = (profile as { client_id?: string | null } | null)?.client_id ?? null;
  const role = (profile as { role?: string | null } | null)?.role ?? null;

  if (role === "cliente") redirect("/client/home");

  const kind = resolveOwnOrganizationKind(accountType);
  const label = kind === "agency" ? "Minha Agência" : "Minha Organização";

  if (kind === "not_applicable") {
    return (
      <>
        <PageHeader title="Minha Organização" />
        <EmptyState icon={Building2} title="Este conceito não se aplica ao seu tipo de conta." />
      </>
    );
  }

  if (!hasSupabaseServiceRoleKey()) {
    return (
      <>
        <PageHeader title={label} />
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          Este recurso está temporariamente indisponível. Sua sessão continua ativa.
        </div>
      </>
    );
  }

  const adminDb = createSupabaseAdminClient();
  const result = await getOwnOrganizationSummary(adminDb, user.id, accountType, profileClientId);

  if (result.status !== "available") {
    return (
      <>
        <PageHeader title={label} />
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          Não foi possível carregar os dados agora. Tente novamente em instantes.
        </div>
      </>
    );
  }

  if (result.data.kind === "agency") {
    const { identity, portfolio } = result.data;
    return (
      <>
        <PageHeader title="Minha Agência" description="Identidade, carteira de clientes e capacidade do seu workspace." />

        <section className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          {identity ? (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-900 truncate">{identity.name}</p>
                <p className="text-xs text-gray-400">
                  Plano {identity.planSlug} · até {identity.maxClients} clientes · {identity.status}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Ainda não há um workspace de agência configurado para esta conta.</p>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-4 mb-4" data-testid="own-org-portfolio">
          <h2 className="text-xs font-black uppercase tracking-wide text-gray-500 mb-3">
            Carteira de clientes {portfolio ? `(${portfolio.length})` : ""}
          </h2>
          {!portfolio || portfolio.length === 0 ? (
            <EmptyState icon={Users} title="Nenhum cliente vinculado a esta agência ainda." />
          ) : (
            <div className="space-y-2">
              {portfolio.map((c) => (
                <div key={c.id} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3">
                  <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-800 truncate">{c.companyName ?? "Sem nome"}</p>
                </div>
              ))}
            </div>
          )}
          <Link href="/admin/clientes" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 mt-3">
            Ver todos os clientes <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-xs font-black uppercase tracking-wide text-gray-500 mb-3">Equipe e capacidade operacional</h2>
          <p className="text-sm text-gray-400">Não disponível ainda nesta versão.</p>
        </section>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <Link href="/admin/clientes" className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2.5 transition-colors">
            <Users className="w-3.5 h-3.5" /> Clientes
          </Link>
          <Link href="/admin/escritorio" className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2.5 transition-colors">
            <FolderKanban className="w-3.5 h-3.5" /> Meu Escritório
          </Link>
        </div>
      </>
    );
  }

  // business
  const { companyId, companyName, companyStatus } = result.data;
  return (
    <>
      <PageHeader title="Minha Organização" description="A organização da sua própria empresa." />
      <section className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        {companyId ? (
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 truncate">{companyName ?? "Sua empresa"}</p>
              <p className="text-xs text-gray-400">{companyStatus}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Sua conta ainda não está vinculada a uma empresa.</p>
        )}
      </section>
      {companyId && (
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/admin/empresa?client=${companyId}`} className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2.5 transition-colors">
            <Building2 className="w-3.5 h-3.5" /> Painel da Empresa
          </Link>
          <Link href={`/admin/escritorio?client=${companyId}`} className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2.5 transition-colors">
            <FolderKanban className="w-3.5 h-3.5" /> Meu Escritório
          </Link>
        </div>
      )}
    </>
  );
}
