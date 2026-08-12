/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/__tests__/final-experience-consolidation.structural.test.ts
 * Sprint Final Product Experience Consolidation — trava em teste a
 * fiação real das mudanças desta sprint: Command Center integrado a
 * /admin/inicio (nunca um segundo Jarvis), header público reduzido
 * (Fase 41), e o atalho de criação de cliente sempre visível no
 * picker (Fase 20/21) apontando para a única autoridade real.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 1 — /admin/inicio passa o contexto de Company real para o Command Bar");
{
  const page = read("src/app/admin/inicio/page.tsx");
  assert(page.includes("activeCompanyId={activeCompany?.companyId ?? null}"), "companyId real (do resolveCompanyContext existente) passado, nunca um segundo resolver");
  assert(page.includes("activeCompanyName={activeCompany?.companyName ?? null}"), "companyName real passado");
}

console.log("[test] 2 — Command Bar (SmartStartInput) resolve intenção localmente antes de qualquer rede, e entrega pergunta aberta ao Jarvis real");
{
  const cmp = read("src/components/smart-start-input.tsx");
  assert(cmp.includes('from "@/lib/command-center/intents"'), "usa o resolvedor de intenção real, não inventa um novo aqui");
  assert(cmp.includes('from "@/lib/jarvis/open-jarvis"'), "handoff usa o mecanismo real openJarvis() já existente -- nenhum segundo Jarvis (Fase 10)");
  assert(cmp.includes("openJarvis({ prompt: conversational })"), "prompt do usuário é entregue ao Jarvis real, nunca respondido aqui dentro");
  assert(!cmp.includes("acesse a rota") && !cmp.includes("acesse /admin"), "nunca instrui o usuário a copiar uma rota manualmente (Fase 6)");
}

console.log("[test] 3 — Action Result é um contêiner genérico reaproveitável, não um mini-framework (Fase 7)");
{
  const cmp = read("src/components/command-center/action-result.tsx");
  assert(cmp.includes("CommandActionResultCard") && cmp.includes("CommandJarvisHandoffCard"), "os dois estados reais (ação executável / handoff ao Jarvis) existem como componentes distintos e pequenos");
  // Sprint Command Center + Jarvis Context V1 (Problema 2) — Company-required
  // resolve INLINE via InlineCompanyPicker (nunca mais um link cru para
  // /contentos/selecionar-cliente); "selecionar" e "criar" continuam sendo as
  // duas saídas reais, só que a primeira agora é a lista real de empresas
  // autorizadas e a segunda é o onNewClient repassado ao picker.
  assert(cmp.includes("InlineCompanyPicker") && cmp.includes("onNewClient"), "Company-required oferece as duas saídas reais: selecionar (picker inline com empresas autorizadas) ou criar (onNewClient) -- nunca mais um redirect para /contentos/selecionar-cliente");
  assert(!cmp.includes("/contentos/selecionar-cliente"), "nunca redireciona para o seletor do ContentOS a partir do Command Center (Problema 2)");
  assert(cmp.includes("withCompanyContext"), "reaproveita o helper canônico de navegação com Company (não constrói querystring à mão)");
}

console.log("[test] 4 — header público reduzido: no máximo 3 links informacionais, sem badge concorrendo com Entrar/CTA (Fase 41)");
{
  const header = read("src/components/public-header.tsx");
  const navLinksMatch = header.match(/const navLinks = \[([\s\S]*?)\];/);
  const linkCount = (navLinksMatch?.[1].match(/href:/g) ?? []).length;
  assert(linkCount <= 3, `navLinks tem ${linkCount} itens (meta: no máximo 3, Fase 41)`);
  // Restaurado a pedido explícito do usuário na sprint Final Home CTA
  // Refinement -- volta a existir no header, como estava antes.
  assert(header.includes("LOKAT.REC"), "badge LOKAT.REC presente no header (restaurado a pedido do usuário)");
  assert(header.includes('href="/login"') && header.includes("Entrar"), "Entrar continua presente");
  assert(/background: "#7b6ef6"/.test(header), "1 CTA primário continua presente (cor de accent)");
}

console.log("[test] 5 — rotas removidas do header continuam existindo (Fase 42: descer na página, nunca deletar)");
{
  assert(fs.existsSync(path.join(root, "src/app/blog")) || fs.existsSync(path.join(root, "src/app/(public)/blog")), "rota /blog continua existindo em algum lugar do app router");
  const homeClient = read("src/app/_home-client.tsx");
  assert(homeClient.includes('id="rec-os"'), "seção REC OS continua na Home (âncora #rec-os), só não compete mais no header");
}

console.log("[test] 6 — picker de Company (/contentos/selecionar-cliente) tem atalho de criação sempre visível, apontando para a autoridade real");
{
  const picker = read("src/app/contentos/selecionar-cliente/_client-content.tsx");
  assert(/mb-4 text-right[\s\S]{0,150}href="\/admin\/clientes"/.test(picker), "atalho 'Novo cliente' sempre visível (não só no estado vazio), aponta para /admin/clientes");
  assert((picker.match(/href="\/admin\/clientes"/g) ?? []).length === 1, "aponta para a ÚNICA autoridade real de criação, sem duplicar o fluxo em outro lugar deste arquivo");
}

console.log("[test] 7 — Novo cliente continua visível no topo de /admin/clientes (Fase 19)");
{
  const clientsPage = read("src/app/admin/clientes/page.tsx");
  assert(/Novo cliente/.test(clientsPage), "ação 'Novo cliente' presente na página real");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
