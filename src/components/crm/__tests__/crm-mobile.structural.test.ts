/**
 * Executar com: node .tmp/run-ts-test.cjs src/components/crm/__tests__/crm-mobile.structural.test.ts
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const leadList = read("src/components/crm/crm-mobile-lead-list.tsx");
const filterSheet = read("src/components/crm/crm-mobile-filter-sheet.tsx");
const leadsPage = read("src/app/admin/leads/page.tsx");

console.log("[test] Tabela não é a interface principal no mobile");
assert(leadsPage.includes("hidden md:block overflow-x-auto"), "tabela desktop ganhou hidden md:block");
assert(leadsPage.includes("<CrmMobileLeadList"), "lista mobile em cards está montada na página");
assert(leadList.includes('md:hidden" data-testid="crm-mobile-lead-list"'), "lista de cards só aparece no mobile (md:hidden)");

console.log("[test] Cards de leads");
assert(leadList.includes("crm-mobile-lead-card"), "cada lead vira um card");
assert(leadList.includes("lead.sourceLabel") && leadList.includes("lead.statusLabel"), "card mostra origem e etapa");
assert(!/\.temperature\b|temperatura:/i.test(leadList), "nenhum campo de temperatura calculado/renderizado no card (WaitlistEntry não tem essa coluna real)");
assert(!/\b(hot|warm|cold)\b/i.test(leadList), "nenhum valor hot/warm/cold inventado no card");

console.log("[test] Filtros em sheet");
assert(leadsPage.includes("<CrmMobileFilterSheet"), "sheet de filtros está montado na página");
assert(leadsPage.includes("hidden md:flex flex-wrap items-center gap-2 mb-3"), "filtro de origem desktop ganhou hidden md:flex");
assert(leadsPage.includes("hidden md:flex flex-wrap items-center gap-2 mb-5"), "filtro de etapa desktop ganhou hidden md:flex");
assert(filterSheet.includes("crm-mobile-filters-trigger"), "botão de filtros existe");
assert(filterSheet.includes("activeCount"), "contador de filtros ativos existe");
assert(filterSheet.includes('role="dialog"'), "sheet é um dialog acessível");
assert(filterSheet.includes("safe-area-inset-bottom"), "sheet respeita a safe area inferior");
assert(filterSheet.includes("Aplicar") && filterSheet.includes("Limpar"), "ações Aplicar/Limpar presentes no sheet");

console.log("[test] Mesma fonte para mobile e desktop (Fase 36)");
assert(leadsPage.includes("leads={filtered.map"), "cards consomem exatamente o mesmo array `filtered` já usado pela tabela");
assert((leadsPage.match(/const filtered = useMemo/g) ?? []).length === 1, "só existe uma definição de `filtered` (nenhum segundo filtro duplicado para o mobile)");
assert((leadsPage.match(/filtered\.map\(/g) ?? []).length === 2, "`filtered` é mapeado exatamente duas vezes: tabela desktop e cards mobile — nunca uma terceira fonte");

console.log("[test] Nenhuma persistência/API nova para o CRM mobile");
assert(!leadList.includes("fetch(") && !filterSheet.includes("fetch("), "nenhum dos dois componentes chama fetch() diretamente");
assert(!fs.existsSync(path.join(root, "src/app/api/crm-mobile")), "nenhuma rota de API nova");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
