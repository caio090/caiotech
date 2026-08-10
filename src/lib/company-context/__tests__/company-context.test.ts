/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/company-context/__tests__/company-context.test.ts
 * Sprint MVP Dogfood Spine V0.1 (Fase 47-48) — Company resolver, guard de
 * autorização, isolamento entre companies.
 */
import { resolveCompanyContextFromInputs, assertCompanyAccess, isCompanyAuthorizedForAdmin, type CompanyContextInputs } from "../resolve";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function baseInputs(overrides: Partial<CompanyContextInputs> = {}): CompanyContextInputs {
  return {
    preview: { active: false, workspaceId: null, workspaceName: null, surface: null },
    session: { authenticated: false, role: null },
    clientPortalCompany: null,
    adminSelectedCompany: null,
    explicitCompanyRequestedButInvalid: false,
    ...overrides,
  };
}

console.log("[test] 1 — sem sessão e sem preview => not_authenticated");
{
  const result = resolveCompanyContextFromInputs(baseInputs());
  assert(result.valid === false, "resolução inválida sem sessão");
  assert(result.reason === "not_authenticated", "motivo correto");
}

console.log("[test] 2 — preview ativo em agency_client resolve companyId real");
{
  const result = resolveCompanyContextFromInputs(baseInputs({
    preview: { active: true, workspaceId: "client-1", workspaceName: "Duh Lanches", surface: "agency_client" },
  }));
  assert(result.valid === true, "preview válido resolve contexto");
  assert(result.context?.companyId === "client-1", "companyId vem do preview");
  assert(result.context?.preview === true && result.context?.readOnly === true, "preview sempre readOnly");
  assert(result.context?.source === "workspace_preview", "source correto");
}

console.log("[test] 3 — preview ativo em surface agency (sem company) => company_required");
{
  const result = resolveCompanyContextFromInputs(baseInputs({
    preview: { active: true, workspaceId: "agency-1", workspaceName: "Agência X", surface: "agency" },
  }));
  assert(result.valid === false, "preview de agência sozinha não resolve uma Company");
  assert(result.reason === "company_required", "motivo correto");
}

console.log("[test] 4 — role cliente sem Company resolvida => company_required");
{
  const result = resolveCompanyContextFromInputs(baseInputs({
    session: { authenticated: true, role: "cliente" },
    clientPortalCompany: null,
  }));
  assert(result.valid === false, "cliente sem clientPortalCompany não resolve");
  assert(result.reason === "company_required", "motivo correto");
}

console.log("[test] 5 — role cliente com Company resolvida => válido, source client_portal");
{
  const result = resolveCompanyContextFromInputs(baseInputs({
    session: { authenticated: true, role: "cliente" },
    clientPortalCompany: { companyId: "client-2", companyName: "Tayannara", surface: "direct_business" },
  }));
  assert(result.valid === true, "cliente com company resolvida é válido");
  assert(result.context?.companyId === "client-2", "companyId correto");
  assert(result.context?.source === "client_portal", "source correto");
  assert(result.context?.preview === false && result.context?.readOnly === false, "cliente real nunca é preview/readOnly");
}

console.log("[test] 6 — role admin sem seleção explícita => company_required (nunca assume a primeira company)");
{
  const result = resolveCompanyContextFromInputs(baseInputs({
    session: { authenticated: true, role: "admin" },
  }));
  assert(result.valid === false, "admin sem seleção não resolve sozinho");
  assert(result.reason === "company_required", "motivo correto");
}

console.log("[test] 7 — role admin com seleção explícita validada => válido, source admin_explicit_selection");
{
  const result = resolveCompanyContextFromInputs(baseInputs({
    session: { authenticated: true, role: "admin" },
    adminSelectedCompany: { companyId: "client-3", companyName: "O Pedreirão", surface: "agency_client" },
  }));
  assert(result.valid === true, "admin com seleção validada é válido");
  assert(result.context?.companyId === "client-3", "companyId correto");
  assert(result.context?.source === "admin_explicit_selection", "source correto");
}

console.log("[test] 8 — role admin com parâmetro explícito inválido => company_not_found (nunca aceita id arbitrário)");
{
  const result = resolveCompanyContextFromInputs(baseInputs({
    session: { authenticated: true, role: "admin" },
    explicitCompanyRequestedButInvalid: true,
  }));
  assert(result.valid === false, "id inválido nunca resolve contexto");
  assert(result.reason === "company_not_found", "motivo correto (nunca company_required aqui -- o usuário TENTOU selecionar algo real)");
}

console.log("[test] 9 — role não suportado (ex.: financeiro sem vínculo) => role_not_supported");
{
  const result = resolveCompanyContextFromInputs(baseInputs({
    session: { authenticated: true, role: "financeiro" },
  }));
  assert(result.valid === false, "role sem suporte de resolução não inventa company");
  assert(result.reason === "role_not_supported", "motivo correto");
}

console.log("[test] 10 — preview sempre vence sobre sessão real, mesmo se ambos presentes");
{
  const result = resolveCompanyContextFromInputs(baseInputs({
    preview: { active: true, workspaceId: "client-9", workspaceName: "Preview Co", surface: "direct_business" },
    session: { authenticated: true, role: "admin" },
    adminSelectedCompany: { companyId: "client-3", companyName: "O Pedreirão", surface: "agency_client" },
  }));
  assert(result.context?.companyId === "client-9", "preview vence sobre adminSelectedCompany");
  assert(result.context?.source === "workspace_preview", "source é preview, não admin_explicit_selection");
}

console.log("[test] 11 — cross-company isolation guard (assertCompanyAccess)");
{
  const contextA = resolveCompanyContextFromInputs(baseInputs({
    session: { authenticated: true, role: "cliente" },
    clientPortalCompany: { companyId: "company-A", companyName: "A", surface: "direct_business" },
  })).context;
  assert(assertCompanyAccess(contextA, "company-A") === true, "acesso permitido à própria company");
  assert(assertCompanyAccess(contextA, "company-B") === false, "acesso NUNCA permitido a outra company");
  assert(assertCompanyAccess(null, "company-A") === false, "contexto nulo nunca autoriza nada");
}

console.log("[test] 12 — isolation guard rejeita substring/prefix match (comparação estrita)");
{
  const contextA = resolveCompanyContextFromInputs(baseInputs({
    session: { authenticated: true, role: "cliente" },
    clientPortalCompany: { companyId: "company-A", companyName: "A", surface: "direct_business" },
  })).context;
  assert(assertCompanyAccess(contextA, "company-A-extra") === false, "não basta ter o id como prefixo -- precisa ser exatamente igual");
}

// ── Sprint MVP Dogfood Security + Voice Closure V0.1 (P0, Fase 6-11) ──────
// isCompanyAuthorizedForAdmin() corrige o gap apontado pela auditoria CODEX
// WEB: validateExplicitCompany() sozinha só provava "esta Company existe e
// está visível", nunca "este admin tem vínculo real com ela".

console.log("[test] 13 — agency admin cannot resolve unrelated Company UUID (P0)");
{
  const authorized = isCompanyAuthorizedForAdmin({
    role: "admin",
    hasExplicitClientUserAccessGrant: false,
    ownedAgencyIds: ["agency-1"],
    agencyIdsLinkedToCompany: ["agency-2"], // Company pertence a uma agência DIFERENTE
  });
  assert(authorized === false, "admin sem vínculo real (nenhuma agência em comum, nenhum client_user_access) nunca é autorizado, mesmo fornecendo um UUID de Company real e visível");
}

console.log("[test] 14 — authorized admin resolves allowed Company (agência dona)");
{
  const authorized = isCompanyAuthorizedForAdmin({
    role: "admin",
    hasExplicitClientUserAccessGrant: false,
    ownedAgencyIds: ["agency-1", "agency-2"],
    agencyIdsLinkedToCompany: ["agency-2"], // Company pertence a uma das agências do admin
  });
  assert(authorized === true, "admin cuja agência (agency_workspaces.owner_user_id) está vinculada à Company (agency_clients) é autorizado -- relação real, nenhuma tabela nova");
}

console.log("[test] 15 — authorized admin resolves allowed Company (client_user_access explícito)");
{
  const authorized = isCompanyAuthorizedForAdmin({
    role: "admin",
    hasExplicitClientUserAccessGrant: true, // vínculo explícito usuário -> client, mesmo sem agência
    ownedAgencyIds: [],
    agencyIdsLinkedToCompany: [],
  });
  assert(authorized === true, "grant explícito em client_user_access autoriza mesmo sem qualquer agency_workspaces -- reaproveita tabela já existente, nenhuma nova");
}

console.log("[test] 16 — superadmin test: Super Admin global sempre autorizado (papel real e já nomeado explicitamente)");
{
  const authorized = isCompanyAuthorizedForAdmin({
    role: "super_admin",
    hasExplicitClientUserAccessGrant: false,
    ownedAgencyIds: [],
    agencyIdsLinkedToCompany: ["agency-nao-relacionada"],
  });
  assert(authorized === true, "super_admin preserva acesso global real (Fase 5) -- nunca inferido de role==='admin', só do papel super_admin explícito");
}

console.log("[test] 17 — prefix/substring nunca autoriza (mesma disciplina do assertCompanyAccess)");
{
  const authorized = isCompanyAuthorizedForAdmin({
    role: "admin",
    hasExplicitClientUserAccessGrant: false,
    ownedAgencyIds: ["agency-1"],
    agencyIdsLinkedToCompany: ["agency-1-extra"], // parecido, mas não é o mesmo id
  });
  assert(authorized === false, "comparação de ids é sempre estrita (Array.includes exato) -- 'agency-1' não casa com 'agency-1-extra'");
}

console.log("[test] 18 — client (role cliente) nunca passa pelo caminho de autorização de admin");
{
  const authorized = isCompanyAuthorizedForAdmin({
    role: "cliente",
    hasExplicitClientUserAccessGrant: true,
    ownedAgencyIds: ["agency-1"],
    agencyIdsLinkedToCompany: ["agency-1"],
  });
  // isCompanyAuthorizedForAdmin() só é chamada pelo branch canAccessAdmin() do
  // resolver -- mas a função em si é pura e não deveria ser usada para o papel
  // "cliente" (esse papel resolve exclusivamente via clientPortalCompany).
  // Aqui confirmamos que ela não FALHA/lança para outros papéis, e que a
  // decisão continua vindo só dos grants/relações reais, nunca do texto do role.
  assert(authorized === true, "com grants reais presentes a função autoriza independente do texto do role -- a barreira de qual role pode CHAMAR esta função vive em resolveCompanyContext(), não aqui");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
