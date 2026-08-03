import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Sprint E2E CI 3.0.2.2 (Fase 2/3/4) — autenticação segura via login normal
 * pela UI, usando exclusivamente as variáveis oficiais do GitHub
 * Environment `local-e2e-qa`: E2E_SUPER_ADMIN_EMAIL / E2E_SUPER_ADMIN_PASSWORD.
 *
 * Nunca lê service role, nunca fabrica cookie, nunca lê token — só
 * preenche o formulário de /login como um usuário real faria.
 *
 * Comportamento por ambiente (Fase 2):
 *   - Em CI (process.env.CI === "true"): secret ausente é uma falha real
 *     de configuração do workflow — falha alto e claro com
 *     E2E_AUTH_SECRETS_MISSING, nunca silenciosamente pulado.
 *   - Localmente: nenhuma credencial é esperada (o brief proíbe copiar o
 *     secret para .env.local) — marca o setup como indisponível e pula,
 *     sem fingir autenticação e sem pedir login manual.
 */
const EMAIL = process.env.E2E_SUPER_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_SUPER_ADMIN_PASSWORD;
const IS_CI = process.env.CI === "true" || process.env.CI === "1";

const STORAGE_STATE_PATH = path.join(process.cwd(), ".tmp/playwright/auth/super-admin.json");

setup("authenticate as super admin", async ({ page }) => {
  if (!EMAIL || !PASSWORD) {
    if (IS_CI) {
      throw new Error(
        "E2E_AUTH_SECRETS_MISSING — E2E_SUPER_ADMIN_EMAIL/E2E_SUPER_ADMIN_PASSWORD ausentes " +
        "no Environment local-e2e-qa. Nenhum valor é impresso por design."
      );
    }
    setup.skip(true, "BLOCKER_LOCAL_AUTH_FIXTURE_UNAVAILABLE — E2E_SUPER_ADMIN_EMAIL/E2E_SUPER_ADMIN_PASSWORD não definidos neste ambiente local (esperado — o secret só existe no GitHub Environment).");
    return;
  }

  await page.goto("/login");
  await page.getByLabel(/e-?mail/i).fill(EMAIL);
  await page.getByLabel(/senha|password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /entrar|login/i }).click();
  await page.waitForURL(/\/admin\//, { timeout: 15000 });

  // Login sem erro: nenhuma mensagem de erro visível na própria página pós-submit.
  await expect(page.getByText(/credenciais inválidas|senha incorreta|erro ao entrar/i)).toHaveCount(0);

  // Confirma acesso de Super Admin numa rota exclusiva antes de salvar a sessão.
  await page.goto("/admin/status/arquitetura");
  await expect(page).toHaveURL(/\/admin\/status\/arquitetura/);
  await expect(page.getByText(/login/i)).toHaveCount(0);

  fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
