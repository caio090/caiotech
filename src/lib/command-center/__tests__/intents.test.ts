/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/command-center/__tests__/intents.test.ts
 * Sprint Final Product Experience Consolidation (Parte A) — cobre o
 * resolvedor de intenção do Command Center: os comandos reais listados
 * na Fase 8 do brief resolvem para uma ação navegável real (nunca texto
 * cru), Company-required é sinalizado corretamente, e uma pergunta
 * aberta nunca é tratada como comando.
 */
import * as fs from "fs";
import * as path from "path";
import { resolveCommandIntent, resolveCommandFlow, looksConversational } from "../intents";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 1 — \"quero fazer uma campanha\" resolve para uma ação Company-required real (Fase 5)");
{
  const r = resolveCommandIntent("quero fazer uma campanha");
  assert(!!r, "intenção resolvida");
  assert(r?.intentId === "create_campaign", "intent correto: create_campaign");
  assert(r?.requiresCompany === true, "campanha exige Company -- nunca criada sem contexto");
  assert(r?.href === "/admin/contentos/campanhas", "rota real confirmada em src/app/admin/contentos/campanhas/page.tsx");
}

console.log("[test] 2 — Fase 8: demais comandos exemplo resolvem para ações reais");
{
  const cases: Array<[string, string, boolean]> = [
    ["abrir calendário", "open_calendar", false],
    ["ver minhas aprovações", "view_approvals", true],
    ["ver clientes", "view_clients", false],
    ["abrir projetos", "open_projects", true],
    ["o que tenho hoje", "today_work", false],
    ["abrir REC OS", "open_rec_os", false],
  ];
  for (const [query, expectedId, expectedRequiresCompany] of cases) {
    const r = resolveCommandIntent(query);
    assert(!!r && r.intentId === expectedId, `"${query}" → ${expectedId}`);
    assert(!!r && r.requiresCompany === expectedRequiresCompany, `"${query}" requiresCompany=${expectedRequiresCompany}`);
  }
}

console.log("[test] 2b — Fase 15: \"planejar semana\" é raciocínio do Jarvis, não uma rota fixa");
{
  assert(resolveCommandIntent("planejar semana") === null, "nenhuma ação fixa resolvida -- não é um comando de navegação");
  assert(looksConversational("planejar semana"), "reconhecido como caso a entregar ao Jarvis (Fase 15/9)");
}

console.log("[test] 3 — nenhuma ação resolvida aponta para rota inexistente (Fase 6, sanidade contra typo)");
{
  const root = process.cwd();
  const queries = ["campanha", "calendário", "aprovação", "cliente", "projeto", "hoje", "rec os", "novo cliente"];
  for (const q of queries) {
    const r = resolveCommandIntent(q);
    if (!r) continue;
    const pagePath = path.join(root, "src/app", r.href.replace(/^\//, ""), "page.tsx");
    assert(fs.existsSync(pagePath), `rota de "${q}" (${r.href}) tem page.tsx real em disco`);
  }
}

console.log("[test] 4 — pergunta aberta nunca é tratada como comando de ação (Fase 9/10)");
{
  assert(looksConversational("por que esse cliente caiu de resultado?"), "pergunta com \"por que\" + \"?\" é conversacional");
  assert(looksConversational("me ajuda a montar uma estratégia"), "\"me ajuda\" + \"estratégia\" é conversacional");
  assert(!looksConversational("abrir calendário"), "comando direto não é conversacional");
  assert(!looksConversational("ver clientes"), "comando direto não é conversacional");
}

console.log("[test] 5 — comando desconhecido não resolve (cai para busca informacional / fallback do caller)");
{
  const r = resolveCommandIntent("xpto inexistente 12345");
  assert(r === null, "sem intenção conhecida, resolver retorna null -- não inventa uma ação");
}

console.log("[test] 6 — Sprint Command Center + Jarvis Context V1 (Problema 2/3): \"criar\"/\"iniciar\" projeto NUNCA resolve para open_projects");
{
  const creationPhrases = [
    "quero iniciar um projeto", "criar projeto", "novo projeto", "iniciar projeto",
    "começar projeto", "quero criar um projeto",
  ];
  for (const phrase of creationPhrases) {
    const flow = resolveCommandFlow(phrase);
    assert(flow?.kind === "create_project", `"${phrase}" resolve para o flow create_project (recebido: ${flow?.kind ?? "null"})`);
  }
}

console.log("[test] 7 — \"abrir/ver/meus/listar projetos\" continua resolvendo para navigate/open_projects (Company-required), nunca para o wizard de criação");
{
  const consultPhrases = ["abrir projetos", "ver projetos", "meus projetos", "listar projetos"];
  for (const phrase of consultPhrases) {
    const flow = resolveCommandFlow(phrase);
    assert(flow?.kind === "navigate" && flow.intentId === "open_projects", `"${phrase}" resolve para navigate/open_projects (recebido: ${flow?.kind ?? "null"})`);
  }
}

console.log("[test] 8 — \"criar cliente\"/variações resolvem para o flow create_client (wizard inline, nunca link cru para /admin/clientes)");
{
  const phrases = ["criar cliente", "novo cliente", "cadastrar cliente", "adicionar cliente"];
  for (const phrase of phrases) {
    const flow = resolveCommandFlow(phrase);
    assert(flow?.kind === "create_client", `"${phrase}" resolve para o flow create_client (recebido: ${flow?.kind ?? "null"})`);
  }
}

console.log("[test] 9 — resolveCommandIntent (compat) só devolve o subconjunto navigate -- create_client/create_project não vazam para o formato antigo");
{
  assert(resolveCommandIntent("criar projeto") === null, "resolveCommandIntent nunca devolve um flow create_project como se fosse navigate");
  assert(resolveCommandIntent("criar cliente") === null, "resolveCommandIntent nunca devolve um flow create_client como se fosse navigate");
  assert(resolveCommandIntent("abrir projetos")?.intentId === "open_projects", "navigate continua funcionando normalmente via resolveCommandIntent");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
