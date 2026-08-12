/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/escritorio/__tests__/escritorio.structural.test.ts
 * Cobre Fase 36 (testes Meu Escritório) itens 26-49 (partes estruturais)
 * do brief da Sprint Navegação e Experiência 3.0.1.2.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p: string) => fs.existsSync(path.join(root, p));

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 26 — rota existe");
assert(exists("src/app/admin/escritorio/page.tsx"), "/admin/escritorio existe");

const page = read("src/app/admin/escritorio/page.tsx");
const client = read("src/app/admin/escritorio/_escritorio-client.tsx");

console.log("[test] 27/28/29 — Hoje/Semana/Mês existem");
assert(client.includes('{ id: "hoje", label: "Hoje" }'), "visão Hoje existe");
assert(client.includes('{ id: "semana", label: "Semana" }'), "visão Semana existe");
assert(client.includes('{ id: "mes", label: "Mês" }'), "visão Mês existe");
assert(client.includes('data-testid={`escritorio-view-${v.id}`}'), "cada visão tem um data-testid real e clicável (template por id)");

console.log("[test] 30 — mesma fonte alimenta as três visões");
assert((client.match(/classifyBusinessOfficeItems\(items,/g) ?? []).length === 1, "uma única chamada de classificação sobre o mesmo array `items` — nenhuma segunda busca por visão");
// Sprint Final Closure (Parte E) adicionou um SEGUNDO call site real:
// o modo Global (clientId: null), usado só quando não há Company
// selecionada -- os dois branches (Company-scoped e Global) são
// mutuamente exclusivos em tempo de execução, cada um busca uma única
// vez dentro do próprio branch.
assert(page.includes("getBusinessOfficeFeed") && (page.match(/getBusinessOfficeFeed\(/g) ?? []).length === 2, "página busca os dados uma única vez por branch (Company-scoped e Global), nunca duas vezes no mesmo caminho");

console.log("[test] 31/32 — itens têm origem e abrem módulos reais");
assert(client.includes("item.sourceModule") && client.includes("item.href"), "cada linha do feed mostra o módulo de origem e usa o href real");
assert(client.includes("<Link href={item.href}"), "clique no item navega para o módulo real, não para uma página fictícia");

console.log("[test] 33 — workspace/cliente preservado quando presente na URL");
assert(page.includes("params.client") && page.includes("clientId"), "clientId da URL é lido e repassado para a busca de dados");

console.log("[test] 34/35/36/37 — isolamento por superfície (mesmo padrão já estabelecido)");
// Sprint MVP Experience Completion V0.1 substituiu o gate antigo
// (requireAdminContentOSContext/AdminContentOSUnavailableState) pelo
// resolveCompanyContext/CompanyContextRequiredState compartilhado com
// Company Central e Projetos -- atualizado aqui para checar a arquitetura
// real, nunca a antiga.
assert(page.includes("resolveCompanyContext"), "reaproveita o mesmo Company Context resolver já usado no resto do Spine (Company Central/Projetos)");
assert(
  page.includes('if (resolution.reason === "not_authenticated") redirect("/login");') && page.includes("CompanyContextRequiredState"),
  "falha de config/permissão (ex.: company_required) nunca vira redirect para login -- só sessão realmente ausente redireciona; o resto renderiza o estado inline",
);

console.log("[test] 38/39 — estados vazios honestos, exatamente como especificado (Fase 18)");
assert(client.includes("Nenhum compromisso encontrado para hoje."), "estado vazio de Hoje com o texto exato do brief");
assert(client.includes("Não há atividades conectadas para esta semana."), "estado vazio de Semana com o texto exato do brief");
assert(client.includes("Ainda não existem dados suficientes para montar o fechamento."), "estado vazio de fechamento do mês com o texto exato do brief");
// Sprint MVP Experience Completion V0.1 substituiu o bloco antigo
// "office-not-integrated" pelo SourcesPanel colapsável -- mesma intenção
// (módulos não integrados aparecem nomeados, nunca como zero fabricado),
// checada contra o componente real atual.
assert(
  client.includes('data-testid="office-sources-panel"') && client.includes('data-testid="office-source-badge"') && client.includes('"Ainda não integrado"'),
  "módulos não integrados aparecem nomeados no SourcesPanel real, nunca escondidos atrás de um zero fabricado",
);

console.log("[test] 40 — nenhum número fictício sem indicação (não há dado demonstrativo aqui, só real ou ausente)");
assert(!client.includes("isDemo: true") && !/Math\.random/.test(client), "nenhum dado aleatório/fabricado no client component");

console.log("[test] 41/42 — Fechamento do mês e Planejamento do próximo mês existem como seções distintas");
assert(client.includes("Fechamento do mês") && client.includes("Planejamento do próximo mês"), "duas seções claras dentro da visão Mês");

console.log("[test] 43/44/45 — metas/decisões/pendências cobertas pelo rascunho + feed");
assert(client.includes("Metas e decisões do mês"), "campo de metas/decisões presente na visão Mês");
assert(client.includes("overdueToday"), "pendências/atrasados calculados a partir do mesmo feed, destacados em Hoje");

console.log("[test] 46/47/48 — rascunho em memória, nunca localStorage/sessionStorage");
assert(client.includes('data-testid="office-draft-badge"') && client.includes("Rascunho desta sessão"), "badge de rascunho explícito");
assert(!client.includes("localStorage"), "nenhum uso de localStorage no client component");
assert(!client.includes("sessionStorage"), "nenhum uso de sessionStorage no client component");

console.log("[test] 49 — nenhuma tabela nova, nenhuma migration");
const dataModule = read("src/lib/business-office/data.ts");
assert(!dataModule.includes(".insert(") && !dataModule.includes(".update(") && !dataModule.includes(".delete("), "Meu Escritório é 100% leitura — nenhuma mutação, nenhuma tabela nova");
assert(dataModule.includes('from("content_items")') && dataModule.includes('from("operational_tasks")') && dataModule.includes('from("approvals")'), "usa apenas tabelas já existentes, reaproveitando os normalizadores do Calendário Global");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
