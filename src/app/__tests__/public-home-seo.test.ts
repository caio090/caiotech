/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/__tests__/public-home-seo.test.ts
 * Sprint Public Home + Brand SEO V1 (Fase 36) — cobre a causa raiz real
 * (Home e /planos herdavam o MESMO title/description/canonical do layout
 * raiz, por serem Client Components sem `metadata` próprio) e a correção:
 * cada rota agora tem seu próprio `metadata` de servidor, distinto e
 * self-referential.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p: string) => fs.existsSync(path.join(root, p));

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 1 — Home renderiza conteúdo real (Server Component + Client Component)");
assert(exists("src/app/page.tsx"), "/ existe");
assert(exists("src/app/_home-client.tsx"), "Home client component existe");
const homePage = read("src/app/page.tsx");
const homeClient = read("src/app/_home-client.tsx");
assert(homePage.includes("import HomeClient from \"./_home-client\"") && homePage.includes("<HomeClient />"), "page.tsx renderiza o conteúdo real da Home, não um placeholder");
assert(!homePage.includes("\"use client\""), "casca de servidor da Home não é um Client Component (export const metadata exige Server Component)");

console.log("[test] 2 — Home title exato (title.absolute -- nunca sofre o template %s | LOKAT OS do layout raiz)");
assert(homePage.includes('title: { absolute: "LOKAT OS | Gestão, operação e inteligência para sua empresa" }'), "title exato exigido pelo brief");

console.log("[test] 3 — Home description exata");
assert(
  homePage.includes("Centralize projetos, clientes, conteúdo, calendário e operação. Trabalhe com o Jarvis conectado ao contexto da sua empresa."),
  "description exata exigida pelo brief",
);

console.log("[test] 4 — Home canonical self-referential para `/`");
assert(homePage.includes('canonical: "https://www.lokat.com.br/"'), "canonical da Home é https://www.lokat.com.br/ (com barra final)");

console.log("[test] 5 — Planos canonical self-referential para `/planos` (nunca para `/`)");
assert(exists("src/app/(public)/planos/page.tsx"), "/planos existe");
const planosPage = read("src/app/(public)/planos/page.tsx");
assert(planosPage.includes('canonical: "https://www.lokat.com.br/planos"'), "canonical de /planos aponta para /planos, não para a Home");
assert(!planosPage.includes('canonical: "https://www.lokat.com.br/"'), "canonical de /planos NUNCA é o mesmo valor exato da Home");

console.log("[test] 6 — Home e Planos não compartilham mais title/description (raiz do bug original)");
const homeTitleMatch = homePage.match(/title:\s*\{\s*absolute:\s*"([^"]+)"/);
const planosTitleMatch = planosPage.match(/title:\s*\{\s*absolute:\s*"([^"]+)"/);
assert(!!homeTitleMatch && !!planosTitleMatch && homeTitleMatch[1] !== planosTitleMatch[1], "Home e /planos têm <title> distintos (antes: idênticos, herdados do layout raiz)");

console.log("[test] 7 — sitemap contém `/` e `/planos`, nunca áreas autenticadas");
const sitemap = read("src/app/sitemap.ts");
assert(/url:\s*BASE_URL,/.test(sitemap), "sitemap inclui a Home (`/`)");
assert(sitemap.includes("${BASE_URL}/planos"), "sitemap inclui /planos");
assert(!sitemap.includes("/admin") && !sitemap.includes("/api"), "sitemap nunca inclui /admin ou /api");

console.log("[test] 8 — robots permite a Home e aponta para o sitemap real");
const robots = read("src/app/robots.ts");
assert(/allow:\s*\[\s*"\/"/.test(robots) || robots.includes('"/"'), "robots permite `/`");
assert(!/disallow:[^\]]*"\/"[,\]]/.test(robots.replace(/\s+/g, " ")), "robots não bloqueia `/` em disallow");
assert(robots.includes("sitemap.xml"), "robots aponta para o sitemap");

console.log("[test] 9 — WebSite structured data estruturalmente válido, com URL canonical exata");
assert(homePage.includes('"@type": "WebSite"'), "WebSite JSON-LD presente na Home");
assert(homePage.includes('url: "https://www.lokat.com.br/"'), "WebSite usa a URL canonical exata (com barra final)");
assert(homePage.includes('name: "Lokat"') && homePage.includes('alternateName: "LOKAT OS"'), "WebSite tem name/alternateName consistentes com a marca");

console.log("[test] 10 — Organization sem dados inventados");
assert(homePage.includes('"@type": "Organization"'), "Organization JSON-LD presente na Home");
for (const forbidden of ["cnpj", "razaoSocial", "telephone", "address", "numberOfEmployees", "sameAs"]) {
  assert(!homePage.includes(forbidden), `Organization não inventa campo "${forbidden}" (dado não confiável neste repositório)`);
}

console.log("[test] 11 — logo estruturado usa asset oficial real, URL absoluta");
assert(homePage.includes('logo: "https://www.lokat.com.br/icon.svg"'), "logo aponta para asset real já existente (src/app/icon.svg), URL absoluta");
assert(exists("src/app/icon.svg"), "asset do logo realmente existe no repositório");

console.log("[test] 12 — navegação institucional: logo aponta para `/`, não para `/planos`");
const header = read("src/components/public-header.tsx");
assert(/Logo[\s\S]{0,80}<Link href="\/"/.test(header), "logo do header aponta para /");
assert(/href:\s*"\/planos",\s*label:\s*"Planos"/.test(header), "\"Planos\" continua um link específico e distinto no menu");

console.log("[test] 13 — Hero da Home usa o H1 exato exigido");
// Sprint Public Home Hero Visual Restoration — o destaque em <em> muda a
// marcação (não o texto). Checa o CONTEÚDO RENDERIZADO (tags removidas),
// nunca um substring de source frágil contra esse tipo de mudança legítima.
const h1Blocks = homeClient.match(/<h1[\s\S]*?<\/h1>/g) ?? [];
assert(h1Blocks.length === 1, "apenas um H1 na página (sem H1 concorrentes)");
const h1RenderedText = (h1Blocks[0] ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
assert(h1RenderedText === "Sua empresa trabalhando como um sistema.", "H1 exato exigido pelo brief (texto renderizado, ignorando marcação de destaque)");

console.log("[test] 13b — hierarquia visual do H1 restaurada (mesmo tratamento histórico: <em> + S.accent)");
assert(/<em style=\{\{ fontStyle: "italic", color: S\.accent \}\}>sistema<\/em>/.test(h1Blocks[0] ?? ""), "palavra de destaque usa o mesmo tratamento (itálico + cor de accent) do H1 histórico aprovado (commit d06b5c1)");

console.log("[test] 14 — CTA primário/secundário do hero conforme especificado");
assert(homeClient.includes("Conhecer o LOKAT OS"), "CTA primário: Conhecer o LOKAT OS");
assert(homeClient.includes('href="/login"') && homeClient.includes(">\n                Entrar\n              </Link>"), "CTA secundário: Entrar, para a rota real de login");
assert(homeClient.includes('href="/planos"') && homeClient.includes("Ver planos"), "CTA para Planos existe, mas não é a única ação (mantém Entrar/Diagnóstico/Demonstração)");

console.log("[test] 15 — módulos representados na Home são todos reais/implementados");
for (const route of ["/admin/empresa", "/admin/escritorio", "/admin/projetos", "/admin/crm", "/admin/contentos", "/admin/calendario"]) {
  assert(exists(`src/app${route}/page.tsx`), `rota ${route} citada na Home realmente existe no repositório`);
}
assert(homeClient.includes('title: "Jarvis"'), "Jarvis é apresentado como módulo/camada, não como rota isolada inexistente");

console.log("[test] 16 — copy do Jarvis não promete autonomia que não existe");
const jarvisSectionMatch = homeClient.match(/Um assistente que já conhece[\s\S]{0,600}/);
assert(!!jarvisSectionMatch, "seção do Jarvis existe");
if (jarvisSectionMatch) {
  const section = jarvisSectionMatch[0];
  for (const forbidden of ["executa campanhas sozinho", "publica sozinho", "manda mensagens sozinho", "altera qualquer módulo"]) {
    assert(!section.includes(forbidden), `copy do Jarvis não afirma "${forbidden}"`);
  }
}

console.log("[test] 17 — /planos preservado como página própria, não redirecionado para `/`");
assert(exists("src/app/(public)/planos/_planos-client.tsx"), "/planos mantém seu conteúdo real de planos/preços");
assert(!planosPage.includes("redirect(") , "/planos não redireciona para outra rota");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
