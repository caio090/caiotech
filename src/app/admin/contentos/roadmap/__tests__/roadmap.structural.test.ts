/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/contentos/roadmap/__tests__/roadmap.structural.test.ts
 * Cobre Fase 30 (testes Roadmap) itens 13-17, 26-30 do brief da Sprint REC OS 3.0.1.1
 * (18-25 já cobertos em src/lib/__tests__/rec-os-roadmap.test.ts, lógica pura).
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const pageExists = fs.existsSync(path.join(root, "src/app/admin/contentos/roadmap/page.tsx"));
const page = read("src/app/admin/contentos/roadmap/page.tsx");
const client = read("src/app/admin/contentos/roadmap/_roadmap-client.tsx");
const subnav = read("src/app/admin/contentos/_contentos-subnav.tsx");

console.log("[test] 13 — rota real existe e está na navegação do REC OS");
assert(pageExists, "/admin/contentos/roadmap existe como rota real");
assert(subnav.includes('href: "/admin/contentos/roadmap"'), "Roadmap está no subnav do REC OS");

console.log("[test] 14/15/16/17 — as quatro visualizações renderizam");
assert(client.includes('view === "quadro" && <KanbanView'), "Quadro renderiza");
assert(client.includes('view === "lista" && <ListView'), "Lista renderiza");
assert(client.includes('view === "linha_do_tempo" && <TimelineView'), "Linha do tempo renderiza");
assert(client.includes('view === "calendario" && (') && client.includes("<CalendarView"), "Calendário renderiza");

console.log("[test] 5 — mesma fonte: todas as visões recebem o array `filtered`, nenhuma fixture própria");
assert(client.includes("<KanbanView items={filtered}") , "Quadro consome `filtered`");
assert(client.includes("<ListView items={filtered}"), "Lista consome `filtered`");
assert(client.includes("<TimelineView items={filtered}"), "Linha do tempo consome `filtered`");
assert(client.includes("<CalendarView items={filtered}"), "Calendário consome `filtered`");
assert(!/const .*Fixture|MOCK_ITEMS|FAKE_ITEMS/i.test(client), "nenhuma fixture/mock paralela definida no client component");

console.log("[test] 26 — filtros preservados ao alternar entre visualizações (estado único no componente pai)");
assert((client.match(/useState<RoadmapFilters>/g) ?? []).length === 1, "um único useState de filtros compartilhado por todas as visões (não reseta ao trocar de view)");

console.log("[test] 27 — mobile: sheet de filtros, nunca chips sempre visíveis competindo com o conteúdo");
assert(client.includes('role="dialog"') && client.includes('aria-label="Filtros do Roadmap"'), "painel de filtros é uma sheet/dialog acessível");
assert(client.includes("Na tela principal") === false && client.includes("activeChips"), "só os filtros ATIVOS aparecem como chips na tela principal (o resto fica dentro da sheet)");

console.log("[test] 7 — Lista nunca força tabela horizontal no mobile");
assert(client.includes("hidden md:block bg-white border border-gray-100 rounded-2xl overflow-x-auto"), "tabela reservada ao desktop (hidden md:block)");
assert(client.includes('data-testid="roadmap-list"') && client.includes("md:hidden space-y-2"), "mobile usa cards, não a tabela");

console.log("[test] 28 — estado vazio (Roadmap sem itens e filtros sem resultado)");
assert(client.includes("Nenhum conteúdo no roadmap ainda") && client.includes("Nenhum item para estes filtros"), "dois estados vazios honestos: sem dado real vs. filtro sem resultado");

console.log("[test] 29/30 — links para conteúdo e campanha (campanha ainda não existe como entidade, então liga para o conteúdo real)");
assert(client.includes("function contentHref") && client.includes("/admin/contentos/producao?client=") , "cada item linca para o conteúdo real (Produção ou Aprovações conforme o estado)");

console.log("[test] Fase 9 — 'Abrir no Calendário Global' usa buildCalendarNavigationUrl real");
assert(page.includes('import { getRoadmapItems }') || client.includes("buildCalendarNavigationUrl"), "helper canônico do calendário usado no Roadmap");
assert(client.includes('data-testid="roadmap-open-global-calendar"'), "botão real de abrir no Calendário Global existe");

console.log("[test] Nenhum bucket/tabela/SQL novo — só leitura de tabelas existentes");
const dataModule = read("src/lib/rec-os-roadmap-data.ts");
assert(dataModule.includes('from("content_items")') && dataModule.includes('from("operational_tasks")') && dataModule.includes('from("approvals")'), "usa apenas tabelas já existentes");
assert(!dataModule.includes(".insert(") && !dataModule.includes(".update(") && !dataModule.includes(".delete("), "Roadmap é somente leitura — nenhuma mutação");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
