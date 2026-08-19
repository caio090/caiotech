/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/status/__tests__/lkt-activity-status.structural.test.ts
 *
 * STATUS LIVE ACTIVITY V1 + LKT DEVELOPMENT HISTORY FOUNDATION — verificação
 * estrutural (estática, sem executar a app) dos requisitos da missão:
 * Status consome a nova fonte de atividade, DeploymentInfo (Live State)
 * segue intocado, registry de módulos futuros (Influence OS/Paid Traffic)
 * existe, Playwright/E2E aparece representado no Status técnico, e nenhuma
 * dependência de SQL/Supabase foi introduzida nesta fundação.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p: string) => fs.existsSync(path.join(root, p));

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const statusPage = read("src/app/admin/status/page.tsx");
const statusClient = read("src/app/admin/status/_status-client.tsx");
const activityTypes = read("src/lib/lkt-activity/types.ts");
const activityStore = read("src/lib/lkt-activity/store.ts");
const deploymentInfoLib = read("src/lib/deployment-info.ts");
const platformModules = read("src/config/platform-modules.ts");
const lktRecordScript = read("scripts/lkt-record.ts");
const packageJson = read("package.json");

console.log("[test] Status page consome a nova fonte de atividade LKT");
assert(statusPage.includes("getRecentLktActivity") && statusPage.includes("getLatestMovement"), "page.tsx (Server Component) chama getRecentLktActivity/getLatestMovement de src/lib/lkt-activity/store");
assert(statusPage.includes("getDeploymentInfo"), "page.tsx continua chamando getDeploymentInfo — as duas camadas (Live State + LKT History) coexistem, nenhuma substitui a outra");
assert(statusClient.includes("activity: LktActivityEvent[]") && statusClient.includes("latestMovement: LktActivityEvent | null"), "StatusPageClient recebe activity/latestMovement como props tipadas, não como import direto de arquivo de dados");
assert(statusClient.includes("<StatusGeralSection") && statusClient.includes("<LktHistorySection"), "UI renderiza as novas seções Status Geral e Histórico Recente");
assert(!statusClient.includes("V1_HISTORY"), "V1_HISTORY (mecanismo antigo e estático) não é mais importado/renderizado pelo Status — superado, não duplicado");

console.log("[test] Live State (DeploymentInfo) preservado, nunca mockado/substituído");
assert(deploymentInfoLib.includes("VERCEL_GIT_COMMIT_SHA") && deploymentInfoLib.includes("VERCEL_ENV"), "getDeploymentInfo continua lendo variáveis de ambiente Vercel reais, ao vivo");
assert(statusClient.includes("<DeploymentBanner"), "DeploymentBanner (faixa de deployment ao vivo) continua renderizado, não removido/substituído pela nova seção");

console.log("[test] LKT Activity Log — fundação própria, nunca dentro de project-status.ts");
assert(exists("src/lib/lkt-activity/types.ts") && exists("src/lib/lkt-activity/store.ts") && exists("src/lib/lkt-activity/activity.json"), "tipos/leitura/dados vivem em src/lib/lkt-activity/, um domínio próprio");
assert(!fs.readFileSync(path.join(root, "src/config/project-status.ts"), "utf8").includes("LktActivityEvent"), "project-status.ts não foi inflado com a lógica do novo Activity Log");
assert(activityTypes.includes("LKT_EVENT_KINDS") && activityTypes.includes("LKT_EVENT_STATUSES"), "vocabulário fechado de kind/status existe e é a única fonte da verdade para validação");
assert(activityStore.includes("fs.readFileSync") && !activityStore.includes("supabase") && !/from ["']@\/lib\/supabase/i.test(activityStore), "leitura do Activity Log é puramente arquivo (fs), sem cliente Supabase");

console.log("[test] npm run lkt:record — CLI append-only, cross-platform, sem Playwright/Chrome");
assert(packageJson.includes('"lkt:record": "node scripts/lkt-record.ts"'), "script lkt:record registrado em package.json");
assert(lktRecordScript.includes("readExisting") && lktRecordScript.includes("...existing, candidate"), "grava por append (preserva histórico existente), nunca reescreve eventos antigos");
assert(!lktRecordScript.includes("playwright") && !lktRecordScript.includes("chromium"), "lkt-record não depende de Playwright/Chrome");
assert(lktRecordScript.includes('execFileSync("git", ["branch", "--show-current"]') , "branch é detectada automaticamente via git, nunca digitada à mão");

console.log("[test] Registry de módulos futuros — Influence OS / Paid Traffic nunca esquecidos");
for (const id of ["influence_os", "creator_dna", "creator_branding", "creator_radar", "creator_calendar", "creator_partnerships", "creator_analytics"]) {
  assert(new RegExp(`id:\\s*"${id}"`).test(platformModules), `platform-modules.ts registra "${id}"`);
}
assert(/id:\s*"rec_os_paid_traffic_planner"/.test(platformModules), 'platform-modules.ts registra "rec_os_paid_traffic_planner" (planned/next)');
assert(/id:\s*"paid_traffic_persistence"/.test(platformModules), 'platform-modules.ts registra "paid_traffic_persistence" (not_implemented)');
assert(/id:\s*"meta_publish"/.test(platformModules) && /id:\s*"google_ads"/.test(platformModules), "platform-modules.ts registra meta_publish e google_ads (coming_soon)");
assert(platformModules.includes('"not_implemented"') && platformModules.includes('"coming_soon"'), "PlatformModuleMaturity foi estendido com not_implemented/coming_soon, nunca um enum paralelo");

console.log("[test] Playwright/E2E representado no Status técnico (LKT DEV standard)");
assert(statusClient.includes("LKT_DEV_STANDARD") && statusClient.includes("AVAILABLE") && statusClient.includes("BLOCKED_BY_LOCAL_FIXTURE"), "Status expõe o estado real de Playwright/E2E autenticado, nunca PASS sem execução real");

console.log("[test] Nenhuma dependência de SQL/Supabase introduzida por esta fundação");
for (const src of [activityTypes, activityStore, lktRecordScript]) {
  assert(!/from\s+["'][^"']*supabase[^"']*["']|createClient\s*\(/i.test(src), "arquivo da fundação LKT Activity não importa/instancia um cliente Supabase");
  assert(!/\bCREATE TABLE\b|\bALTER TABLE\b/i.test(src), "arquivo da fundação LKT Activity não contém SQL de schema");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
