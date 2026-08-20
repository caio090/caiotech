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
// channels.ts é deliberadamente documentação em prosa sobre o ESTADO de
// cada canal (por isso menciona "setWebhook"/"TELEGRAM_BOT_TOKEN" como
// texto explicativo, nunca como código) -- as checagens de "nenhuma
// lógica/segredo real" abaixo usam este subconjunto sem ele, para não
// confundir prosa honesta com lógica de fato.
const CORE_LOGIC_SOURCE = [intents, types, session, context, router, adapterTypes].join("\n");

console.log("[test] Canais registrados (web/telegram/whatsapp, nunca um 4º sem decisão)");
{
  assert(channels.includes('"web"') && channels.includes('"telegram"') && channels.includes('"whatsapp"'), "os 3 canais do card estão no registry");
  assert(channels.includes("CHANNEL_REGISTRY"), "registry de metadados por canal existe");
  // TELEGRAM ADAPTER V1 atualizou telegram de not_connected para code_ready
  // (adapter/webhook/sender reais e testados, mas setWebhook nunca chamado
  // -- ver channels.ts). whatsapp continua not_connected, intocado.
  assert(/telegram:\s*\{[\s\S]*?status:\s*"code_ready"/.test(channels), "telegram honestamente marcado code_ready (adapter real e testado, mas sem tráfego real ainda -- setWebhook nunca chamado)");
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
  assert(!/BOT_TOKEN|bot_token/i.test(CORE_LOGIC_SOURCE), "nenhuma referência a BOT_TOKEN na lógica do core (fora da prosa de estado em channels.ts)");
  // Heurística de credencial real: precisa ter dígito E letra maiúscula/minúscula misturada
  // (secrets de verdade quase sempre têm dígitos) -- distingue de identificadores de
  // domínio como "awaiting_confirmation", que são só snake_case minúsculo sem dígito.
  assert(!/["'](?=[A-Za-z0-9_-]{20,}["'])(?=[^"']*[0-9])[A-Za-z0-9_-]+["']/.test(ALL_CORE_SOURCE), "nenhuma string longa com dígitos parecida com credencial hardcoded");
}

console.log("[test] Ausência de lógica Telegram dentro do CORE puro (types/channels/intents/session/context/router) -- o adapter real vive à parte, em adapters/telegram.ts");
{
  // TELEGRAM ADAPTER V1 criou adapters/telegram.ts de propósito -- excluído
  // deliberadamente de ALL_CORE_SOURCE aqui, porque ele É o adapter, não o
  // core. Continua coberto (sem I/O, sem API do Telegram) no bloco abaixo.
  assert(!/api\.telegram\.org/i.test(ALL_CORE_SOURCE), "nenhuma URL da Telegram Bot API dentro do core puro");
  assert(!/setWebhook|getWebhookInfo|getUpdates/i.test(CORE_LOGIC_SOURCE), "nenhum método de Bot API (setWebhook/getWebhookInfo/getUpdates) na lógica do core puro (fora da prosa de estado em channels.ts)");
  assert(exists("src/lib/conversation/adapters/telegram.ts"), "adapter real do Telegram existe (TELEGRAM ADAPTER V1) -- mas fora do core puro");
  const telegramAdapter = read("src/lib/conversation/adapters/telegram.ts");
  assert(!/fetch\s*\(|api\.telegram\.org|setWebhook|getWebhookInfo|getUpdates/i.test(telegramAdapter), "adapters/telegram.ts continua puro/síncrono -- nenhuma chamada de rede, sendMessage real vive só em src/lib/telegram/client.ts");
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

console.log("[test] Nenhuma rota/webhook/tabela criada por esta fundação (o webhook real do TELEGRAM ADAPTER V1 vive em src/app/api/integrations/telegram/webhook, testado à parte)");
{
  assert(!exists("src/app/api/telegram"), "nenhuma rota solta /api/telegram (fora da convenção integrations/) foi criada");
  assert(!exists("src/app/api/whatsapp"), "nenhuma rota /api/whatsapp criada -- WhatsApp continua not_connected");
  assert(!/CREATE TABLE|ALTER TABLE/i.test(ALL_CORE_SOURCE), "nenhum SQL de schema em nenhum arquivo do core");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
