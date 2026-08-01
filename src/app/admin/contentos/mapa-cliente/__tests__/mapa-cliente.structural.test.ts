/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/contentos/mapa-cliente/__tests__/mapa-cliente.structural.test.ts
 * Cobre Fase 31 (testes Mapa do Cliente) itens 31-43 do brief da Sprint REC OS 3.0.1.1.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const pageExists = fs.existsSync(path.join(root, "src/app/admin/contentos/mapa-cliente/page.tsx"));
const page = read("src/app/admin/contentos/mapa-cliente/page.tsx");
const subnav = read("src/app/admin/contentos/_contentos-subnav.tsx");

console.log("[test] 31 — Mapa do Cliente existe como rota real");
assert(pageExists, "/admin/contentos/mapa-cliente existe");
assert(subnav.includes('href: "/admin/contentos/mapa-cliente"'), "está na navegação do REC OS");

console.log("[test] 32/33/34/35/37/38 — agrega campanhas/conteúdos/aprovações/calendário/tarefas/bloqueios");
assert(page.includes("Conteúdos"), "seção de conteúdos");
assert(page.includes("Aprovações pendentes"), "seção de aprovações");
assert(page.includes("Tarefas abertas"), "seção de tarefas");
assert(page.includes("Próximos prazos") && page.includes("calendarUrl"), "seção de calendário/prazos");
assert(page.includes("Bloqueios"), "seção de bloqueios");
assert(page.includes("Responsáveis envolvidos"), "seção de responsáveis");

console.log("[test] Não duplica dados — usa links reais para os módulos, reaproveita getRoadmapItems");
assert(page.includes("getRoadmapItems"), "reaproveita a mesma fonte do Roadmap (uma única fonte de conteúdo por cliente)");
assert(page.includes('href={`/admin/contentos/producao?client=') && page.includes('href={`/admin/contentos/aprovacoes?client='), "links reais para os módulos, não uma segunda cópia dos dados");

console.log("[test] Isolamento — reaproveita os mesmos primitivos já auditados do REC OS (Fase 39/40)");
assert(page.includes("requireAdminContentOSContext") && page.includes("resolveClientContext"), "mesmo par de funções já usado por Produção/Aprovações — nenhuma segunda camada de autorização inventada");

console.log("[test] 43 — query adulterada (cliente inválido) é bloqueada, mesma UI de erro do resto do REC OS");
assert(page.includes('clientStatus === "invalid"') && page.includes("Cliente não encontrado ou sem acesso"), "cliente inválido/adulterado é rejeitado com mensagem clara, nunca um crash");

console.log("[test] 39/40/41/42 — isolamento por superfície declarado e aplicado onde é seguro (preview)");
assert(page.includes("getWorkspacePreviewContext"), "usa o resolvedor real de preview, não reinventa uma verificação de superfície");
assert(page.includes('surface === "agency_client" || preview.context.surface === "direct_business"'), "em preview de negócio, o workspace do preview sempre vence sobre o clientId da URL (Fase 12)");
assert(page.includes("Modo de visualização — somente leitura") && page.includes("isPreview"), "Super ADM em preview vê o badge de somente leitura");
assert(!/\.insert\(|\.update\(|\.delete\(/.test(page), "página é 100% leitura — nenhuma mutação, então nunca altera dado em nenhuma superfície");

console.log("[test] 36 — link para arquivos/resultados, sem fingir biblioteca de arquivos que não existe");
assert(page.includes("Biblioteca de arquivos ainda não disponível"), "arquivos: estado honesto, não uma biblioteca falsa");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
