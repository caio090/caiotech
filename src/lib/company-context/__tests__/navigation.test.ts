/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/company-context/__tests__/navigation.test.ts
 * Sprint MVP Dogfood Final — Company Context Transversal. Cobre o helper
 * canônico usado para preservar `?client=` em toda navegação (sidebar,
 * dashboard, barra global), evitando dezenas de concatenações manuais
 * espalhadas pelo código.
 */
import { withCompanyContext, readCompanyContextParam, COMPANY_CONTEXT_QUERY_KEY } from "../navigation";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 1 — chave canônica é 'client' (nunca company/clientId/business/selectedCompany)");
assert(COMPANY_CONTEXT_QUERY_KEY === "client", "chave canônica confirmada");

console.log("[test] 2 — withCompanyContext adiciona o parâmetro a um path simples");
assert(withCompanyContext("/admin/empresa", "company-A") === "/admin/empresa?client=company-A", "path simples recebe ?client=");

console.log("[test] 3 — withCompanyContext preserva outros query params já presentes");
assert(withCompanyContext("/admin/projetos?tab=ativos", "company-A") === "/admin/projetos?tab=ativos&client=company-A", "query params existentes preservados");

console.log("[test] 4 — withCompanyContext substitui um client já presente, nunca duplica");
assert(withCompanyContext("/admin/escritorio?client=company-OLD", "company-B") === "/admin/escritorio?client=company-B", "client antigo substituído, não duplicado");

console.log("[test] 5 — sem companyId, path retorna inalterado (nunca ?client=null/undefined)");
assert(withCompanyContext("/admin/empresa", null) === "/admin/empresa", "companyId null não adiciona parâmetro");
assert(withCompanyContext("/admin/empresa", undefined) === "/admin/empresa", "companyId undefined não adiciona parâmetro");

console.log("[test] 6 — readCompanyContextParam lê a partir de um URLSearchParams real");
assert(readCompanyContextParam(new URLSearchParams("client=company-A")) === "company-A", "lê o client presente");
assert(readCompanyContextParam(new URLSearchParams("")) === null, "retorna null quando ausente");
assert(readCompanyContextParam(null) === null, "retorna null com searchParams null (SSR/primeira renderização)");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
