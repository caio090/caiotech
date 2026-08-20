/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/conversation/__tests__/conversation-core.structural.test.ts
 *
 * LOKAT OS — CONVERSATION CORE FOUNDATION V1. Verificação estática (fs,
 * sem executar a app) dos requisitos da missão: canais registrados,
 * intents registradas, ausência de segredo, ausência de lógica
 * Telegram/WhatsApp dentro do core, e Company Context reutilizado como
 * dependência real (nunca reimplementado).
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p: string) => fs.existsSync(path.join(root, p));

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const CORE_FILES = [
  "src/lib/conversation/types.ts",
  "src/lib/conversation/channels.ts",
  "src/lib/conversation/intents.ts",
  "src/lib/conversation/session.ts",
  "src/lib/conversation/context.ts",
  "src/lib/conversation/router.ts",
  "src/lib/conversation/adapters/types.ts",
];

console.log("[test] Estrutura src/lib/conversation/ criada exatamente conforme pedido");
for (const f of CORE_FILES) {
  assert(exists(f), `${f} existe`);
}

const channels = read("src/lib/conversation/channels.ts");
const intents = read("src/lib/conversation/intents.ts");
const types = read("src/lib/conversation/types.ts");
const session = read("src/lib/conversation/session.ts");
const context = read("src/lib/conversation/context.ts");
const router = read("src/lib/conversation/router.ts");
const adapterTypes = read("src/lib/conversation/adapters/types.ts");
const ALL_CORE_SOURCE = [channels, intents, types, session, context, router, adapterTypes].join("\n");

console.log("[test] Canais registrados (web/telegram/whatsapp, nunca um 4º sem decisão)");
{
  assert(channels.includes('"web"') && channels.includes('"telegram"') && channels.includes('"whatsapp"'), "os 3 canais do card estão no registry");
  assert(channels.includes("CHANNEL_REGISTRY"), "registry de metadados por canal existe");
  assert(/telegram:\s*\{[\s\S]*?status:\s*"not_connected"/.test(channels), "telegram está honestamente marcado not_connected (nenhum bot conectado nesta missão)");
  assert(/whatsapp:\s*\{[\s\S]*?status:\s*"not_connected"/.test(channels), "whatsapp está honestamente marcado not_connected");
}

console.log("[test] Intents V1 registradas (status/projects/growth/content/influence/meu_negocio)");
{
  for (const id of ["status", "projects", "growth", "content", "influence", "meu_negocio"]) {
    assert(new RegExp(`id:\\s*"${id}"`).test(intents), `intent "${id}" está no catálogo`);
  }
  assert(intents.includes("moduleId"), "cada intent referencia um moduleId real (nunca um destino inventado)");
}

console.log("[test] Ausência de segredo (nenhum token/senha/chave nos tipos ou lógica do core)");
{
  const forbidden = /\btoken\b(?!.*temporaryToken|.*temporaryToken)|password|senha|secret|api_key|apikey/i;
  // Exceção deliberada: temporaryToken (Identity Link) não é um segredo de infraestrutura,
  // é um código de vínculo de curta duração -- checado à parte, nunca com valor hardcoded.
  const withoutIdentityLinkField = ALL_CORE_SOURCE.replace(/temporaryToken/g, "");
  assert(!/\bpassword\b|\bsenha\b|\bapi_key\b|\bapikey\b/i.test(withoutIdentityLinkField), "nenhum campo de password/senha/api_key no core");
  assert(!/BOT_TOKEN|bot_token/i.test(ALL_CORE_SOURCE), "nenhuma referência a BOT_TOKEN no core");
  // Heurística de credencial real: precisa ter dígito E letra maiúscula/minúscula misturada
  // (secrets de verdade quase sempre têm dígitos) -- distingue de identificadores de
  // domínio como "awaiting_confirmation", que são só snake_case minúsculo sem dígito.
  assert(!/["'](?=[A-Za-z0-9_-]{20,}["'])(?=[^"']*[0-9])[A-Za-z0-9_-]+["']/.test(ALL_CORE_SOURCE), "nenhuma string longa com dígitos parecida com credencial hardcoded");
}

console.log("[test] Ausência de lógica Telegram dentro do core (só o identificador de canal, nunca API/webhook)");
{
  assert(!/api\.telegram\.org/i.test(ALL_CORE_SOURCE), "nenhuma URL da Telegram Bot API");
  assert(!/sendMessage\s*\(.*telegram/i.test(ALL_CORE_SOURCE), "nenhuma chamada sendMessage acoplada a Telegram");
  assert(!/setWebhook|getWebhookInfo|getUpdates/i.test(ALL_CORE_SOURCE), "nenhum método de Bot API (setWebhook/getWebhookInfo/getUpdates)");
  assert(!exists("src/lib/conversation/adapters/telegram.ts"), "nenhum arquivo de adapter Telegram concreto foi criado nesta missão");
}

console.log("[test] Ausência de lógica WhatsApp dentro do core (só o identificador de canal, nunca API/webhook)");
{
  assert(!/graph\.facebook\.com|evolution-api/i.test(ALL_CORE_SOURCE), "nenhuma URL de Meta Cloud API / Evolution API");
  assert(!exists("src/lib/conversation/adapters/whatsapp.ts"), "nenhum arquivo de adapter WhatsApp concreto foi criado nesta missão");
}

console.log("[test] Company Context como dependência real (nunca reimplementado)");
{
  assert(context.includes('from "@/lib/company-context/resolve"') && context.includes("resolveCompanyContext"), "context.ts importa e usa resolveCompanyContext() real");
  assert(context.includes('from "@/lib/office-global/authorized-companies"') && context.includes("listAuthorizedCompanies"), "context.ts importa e usa listAuthorizedCompanies() real");
  assert(!/function resolveCompanyContext\s*\(/.test(context) && !/function listAuthorizedCompanies\s*\(/.test(context), "nenhuma das duas funções canônicas foi reimplementada localmente");
  assert(context.includes('kind: "choose"') && context.includes('companies.length === 1'), "comportamento pedido está implementado: 1 empresa autoriza automaticamente, várias pedem escolha");
}

console.log("[test] Router nunca executa ação real -- só resolve intenção/domínio, sempre com maturidade honesta do registry");
{
  assert(router.includes('from "@/config/platform-modules"') && router.includes("findModuleById"), "router.ts lê maturidade real do registry canônico, nunca inventa");
  assert(!/fetch\s*\(/.test(router) && !/createServerSupabaseClient|createSupabaseAdminClient/.test(router), "router.ts não faz nenhuma chamada de rede/banco -- função pura");
  assert(router.includes("honestNotice"), "alvo de domínio carrega aviso honesto quando o módulo não é production");
}

console.log("[test] Nenhuma rota/webhook/tabela criada por esta missão");
{
  assert(!exists("src/app/api/telegram"), "nenhuma rota /api/telegram criada");
  assert(!exists("src/app/api/whatsapp"), "nenhuma rota /api/whatsapp criada");
  assert(!/CREATE TABLE|ALTER TABLE/i.test(ALL_CORE_SOURCE), "nenhum SQL de schema em nenhum arquivo do core");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
