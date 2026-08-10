/**
 * Fase 18 do hotfix 1.0.2 — verificação automática de cobertura de
 * mutações do preview de workspaces.
 *
 *   node scripts/check-workspace-mutation-coverage.ts
 *   npm run check:workspace-mutations
 *
 * O QUE ESTE SCRIPT PROVA: que toda rota HTTP mutável (POST/PUT/PATCH/
 * DELETE) sob src/app/api está listada no ALLOWLIST abaixo com uma
 * classificação, e que toda rota classificada como "protected" realmente
 * contém `withMutationProtection` no texto do arquivo.
 *
 * O QUE ESTE SCRIPT NÃO PROVA (busca textual não é prova absoluta — ver
 * Fase 18 do ticket): que uma rota "protected" aplica o wrapper ao handler
 * CERTO (poderia estar decorando uma função morta); que uma rota
 * "demo_memory_only" realmente nunca persiste (isso foi confirmado por
 * leitura manual, documentado em docs/workspace-mutation-inventory.md);
 * que uma rota "not_reachable_from_preview" continua de fato sem link  —
 * isso pode mudar a qualquer sprint futura sem este script perceber. Este
 * script é uma rede de segurança CONTRA REGRESSÃO E DRIFT (uma rota nova
 * some sem classificação, ou uma rota protegida perde o wrapper), não um
 * substituto da revisão manual que gerou o inventário.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

// import.meta.dirname (não __dirname) porque este arquivo é executado como
// ESM real — ele tem imports de verdade (fs/path), então não se aplica o
// truque CJS-via-require usado nos arquivos de teste ad-hoc desta sprint.
const ROOT = join(import.meta.dirname, "..");
const API_DIR = join(ROOT, "src", "app", "api");
const SRC_DIR = join(ROOT, "src");

type Classification =
  | "protected"
  | "not_reachable_from_preview"
  | "read_only_operation"
  | "demo_memory_only"
  | "excluded_with_reason";

// Espelha docs/workspace-mutation-inventory.md — se os dois divergirem,
// o documento é a fonte da verdade narrativa e este mapa deve ser
// atualizado para bater com ele.
const ALLOWLIST: Record<string, { classification: Classification; note: string }> = {
  "admin/clients/route.ts": { classification: "protected", note: "Clientes — criar" },
  "admin/clients/[id]/route.ts": { classification: "protected", note: "Clientes — editar/arquivar" },
  "admin/clients/[id]/invite/route.ts": { classification: "protected", note: "Clientes — convite" },
  "admin/clients/[id]/hard-delete/route.ts": { classification: "protected", note: "Clientes — hard delete" },
  "admin/clients/[id]/restore/route.ts": { classification: "protected", note: "Clientes — restaurar" },
  "admin/clients/bulk-delete/route.ts": { classification: "protected", note: "Clientes — bulk delete" },
  "admin/contentos/actions/send-to-approval/route.ts": { classification: "protected", note: "REC OS" },
  "admin/contentos/actions/send-to-production/route.ts": { classification: "protected", note: "REC OS" },
  "admin/contentos/drafts/route.ts": { classification: "protected", note: "REC OS" },
  "admin/contentos/drafts/[id]/route.ts": { classification: "protected", note: "REC OS" },
  "admin/rec-projects/[id]/route.ts": { classification: "protected", note: "REC OS" },
  "admin/reports/interpret/route.ts": { classification: "protected", note: "Relatórios" },
  "admin/reports/uploads/route.ts": { classification: "protected", note: "Relatórios" },
  "team/invite/send-email/route.ts": { classification: "protected", note: "Equipe" },
  "admin/users/delete-test-account/route.ts": { classification: "protected", note: "Equipe" },
  "olaclick/connect/route.ts": { classification: "protected", note: "Integrações" },
  "olaclick/connections/[id]/route.ts": { classification: "protected", note: "Integrações" },
  "olaclick/test/route.ts": { classification: "protected", note: "Integrações" },
  "meta/assets/link/route.ts": { classification: "protected", note: "Integrações" },
  "payments/manual-confirm/route.ts": { classification: "protected", note: "Financeiro" },
  "payments/create-charge/route.ts": { classification: "protected", note: "Financeiro" },
  "payments/asaas/create-charge/route.ts": { classification: "protected", note: "Financeiro" },
  "admin/billing/coupons/route.ts": { classification: "protected", note: "Financeiro" },
  "admin/billing/coupons/[id]/route.ts": { classification: "protected", note: "Financeiro" },
  "billing/checkout/route.ts": { classification: "protected", note: "Financeiro (plataforma)" },
  "ai/briefing/route.ts": { classification: "protected", note: "Chamada externa" },
  "ai/dashboard-search/route.ts": { classification: "protected", note: "Chamada externa" },
  "ai/diagnostico/route.ts": { classification: "protected", note: "Chamada externa" },
  "ai/legenda/route.ts": { classification: "protected", note: "Chamada externa" },
  "meu-negocio/ai/analyze/route.ts": { classification: "protected", note: "Chamada externa — Sprint Meu Negócio 2.1.2" },
  "jarvis/chat/route.ts": { classification: "protected", note: "Chamada externa — Sprint MVP Experience Completion V0.1 (Jarvis)" },
  "jarvis/transcribe/route.ts": { classification: "protected", note: "Chamada externa — Sprint MVP Experience Completion V0.1 (Jarvis)" },
  "jarvis/speech/route.ts": { classification: "protected", note: "Chamada externa — Sprint MVP Experience Completion V0.1 (Jarvis)" },

  "admin/workspaces/preview/route.ts": { classification: "excluded_with_reason", note: "É o próprio ponto de entrada/saída do preview" },
  "admin/workspaces/preview/exit/route.ts": { classification: "excluded_with_reason", note: "Hotfix 1.0.10 — saída atômica do preview (Set-Cookie + 303 na mesma resposta); mesma natureza de admin/workspaces/preview/route.ts, não uma mutação de dado de negócio. ATENÇÃO: esta classificação é só análise estática — não exime a rota do guard EM RUNTIME do proxy (src/proxy.ts). O hotfix 1.0.11 encontrou exatamente essa lacuna (classificada aqui, mas ainda bloqueada em produção); a allowlist real é isWorkspacePreviewControlMutation() em src/lib/workspaces/mutation-guard-runtime.ts — ver a tabela dedicada em docs/workspace-mutation-inventory.md." },
  "leads/typebot/route.ts": { classification: "excluded_with_reason", note: "Webhook inbound do Typebot" },
  "webhooks/billing/[provider]/route.ts": { classification: "excluded_with_reason", note: "Webhook inbound" },
  "webhooks/payments/asaas/route.ts": { classification: "excluded_with_reason", note: "Webhook inbound" },
  "webhooks/payments/route.ts": { classification: "excluded_with_reason", note: "Webhook inbound" },

  "admin/accounts/[id]/classification/route.ts": { classification: "not_reachable_from_preview", note: "Ferramenta de plataforma /admin/super/accounts" },
  "admin/waitlist/route.ts": { classification: "not_reachable_from_preview", note: "Leads de vendas da própria LOKAT" },
  "billing/coupons/validate/route.ts": { classification: "read_only_operation", note: "Nunca faz insert/update/upsert/delete" },
  "contato/route.ts": { classification: "not_reachable_from_preview", note: "Site público" },
  "launch/waitlist/route.ts": { classification: "not_reachable_from_preview", note: "Site público" },
  "marketing-diagnostics/route.ts": { classification: "not_reachable_from_preview", note: "Site público" },
};

const MUTATING_METHOD_RE = /export\s+(?:const|async function)\s+(POST|PUT|PATCH|DELETE)\b/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (entry === "route.ts") out.push(full);
  }
  return out;
}

function toKey(fullPath: string): string {
  return fullPath.slice(API_DIR.length + 1).split("\\").join("/");
}

function main() {
  const routeFiles = walk(API_DIR);
  let failures = 0;
  const summary: { key: string; methods: string[]; classification: Classification; guarded: boolean; ok: boolean }[] = [];

  for (const file of routeFiles) {
    const key = toKey(file);
    const content = readFileSync(file, "utf8");
    const methods = [...content.matchAll(MUTATING_METHOD_RE)].map((m) => m[1]);
    if (methods.length === 0) continue; // GET-only route, not a mutation surface

    const entry = ALLOWLIST[key];
    const guarded = content.includes("withMutationProtection");

    if (!entry) {
      failures++;
      summary.push({ key, methods, classification: "not_reachable_from_preview", guarded, ok: false });
      console.error(`FAIL  ${key} — mutação nova (${methods.join(",")}) sem classificação no ALLOWLIST. Adicione uma entrada e documente em docs/workspace-mutation-inventory.md.`);
      continue;
    }

    if (entry.classification === "protected" && !guarded) {
      failures++;
      summary.push({ key, methods, classification: entry.classification, guarded, ok: false });
      console.error(`FAIL  ${key} — classificado como "protected" mas withMutationProtection não foi encontrado no arquivo (regressão?).`);
      continue;
    }

    summary.push({ key, methods, classification: entry.classification, guarded, ok: true });
  }

  // Servidor de checagem inversa: allowlist entries that no longer exist as files (stale documentation)
  for (const key of Object.keys(ALLOWLIST)) {
    const full = join(API_DIR, key.split("/").join("\\"));
    try {
      statSync(full);
    } catch {
      console.warn(`WARN  ${key} está no ALLOWLIST mas o arquivo não existe mais — remova a entrada.`);
    }
  }

  console.log(`\n[check-workspace-mutation-coverage] ${summary.length} rotas mutáveis encontradas, ${failures} falha(s).`);
  console.log(`Nenhuma Server Action encontrada em ${SRC_DIR} (grep '"use server"' confirmado manualmente na Fase 7 — este script não escaneia isso, ver docs/workspace-mutation-inventory.md).`);

  if (failures > 0) process.exit(1);
}

main();
