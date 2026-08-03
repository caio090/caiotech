import { test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Sprint QA Local 3.0.2 (Fase 6/7) — autenticação segura para o QA visual
 * autenticado.
 *
 * Ordem de preferência (na íntegra, sem pular etapas):
 *   1. Credencial de QA já existente no ambiente local.
 *   2. Fixture de login existente.
 *   3. Conta de teste documentada.
 *   4. Login normal automatizado (com uma credencial real de QA/teste).
 *   5. storageState gerado a partir do login acima.
 *
 * Auditoria desta sprint (ver docs/qa/navigation-office-crm-local-browser-qa.md):
 * nenhuma das opções 1-3 existe hoje neste projeto — nenhuma variável
 * E2E_EMAIL/E2E_PASSWORD/QA_EMAIL/QA_PASSWORD/TEST_EMAIL/TEST_PASSWORD/
 * SUPER_ADMIN_TEST_EMAIL/SUPER_ADMIN_TEST_PASSWORD em .env.local, nenhum
 * fixture de login, nenhuma conta de teste documentada. Criar uma conta
 * agora, usar service role para fabricar sessão, ou copiar um token são
 * todos explicitamente proibidos pelo brief desta sprint.
 *
 * Este setup NUNCA fabrica uma sessão. Se uma credencial real de QA for
 * disponibilizada futuramente via as variáveis de ambiente abaixo, este
 * mesmo arquivo passa a funcionar sem nenhuma alteração — é por isso que
 * ele existe já, mesmo bloqueado.
 */
const EMAIL =
  process.env.SUPER_ADMIN_TEST_EMAIL ??
  process.env.QA_EMAIL ??
  process.env.E2E_EMAIL ??
  process.env.TEST_EMAIL;

const PASSWORD =
  process.env.SUPER_ADMIN_TEST_PASSWORD ??
  process.env.QA_PASSWORD ??
  process.env.E2E_PASSWORD ??
  process.env.TEST_PASSWORD;

const STORAGE_STATE_PATH = path.join(process.cwd(), ".tmp/playwright/auth/super-admin.json");

setup("authenticate as super admin", async ({ page }) => {
  if (!EMAIL || !PASSWORD) {
    console.error(
      "\nBLOCKER_LOCAL_AUTH_FIXTURE_UNAVAILABLE\n" +
      "Nenhuma credencial de QA encontrada (SUPER_ADMIN_TEST_EMAIL/SUPER_ADMIN_TEST_PASSWORD, " +
      "QA_EMAIL/QA_PASSWORD, E2E_EMAIL/E2E_PASSWORD ou TEST_EMAIL/TEST_PASSWORD). " +
      "Defina um dos pares em .env.local (uma conta de teste já existente, nunca criada por este script) " +
      "para desbloquear o QA visual autenticado.\n"
    );
    setup.skip(true, "BLOCKER_LOCAL_AUTH_FIXTURE_UNAVAILABLE — nenhuma credencial de QA disponível neste ambiente.");
    return;
  }

  await page.goto("/login");
  await page.getByLabel(/e-?mail/i).fill(EMAIL);
  await page.getByLabel(/senha|password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /entrar|login/i }).click();
  await page.waitForURL(/\/admin\//, { timeout: 15000 });

  fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
