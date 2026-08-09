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

  // Sprint E2E Harness 3.0.2.4 (CI-E2E-AUTH-SELECTOR-001) — getByLabel()
  // falhava porque o label visual de /login não tem associação semântica
  // (sem htmlFor/id) com o input. Nenhum input tem `name`, então o
  // seletor estável seguinte na ordem de preferência é `type`, único no
  // DOM inicial da tela (o único outro input type="text" -- o código de
  // convite -- só existe depois de um clique em "Recebi um convite",
  // nunca disparado aqui). Ver src/app/(public)/login/page.tsx.
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  try {
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await expect(passwordInput).toBeVisible({ timeout: 10_000 });
  } catch {
    throw new Error(
      "E2E_AUTH_LOGIN_FORM_UNAVAILABLE — /login não renderizou o formulário " +
      "de e-mail/senha esperado (input[type=email]/input[type=password])."
    );
  }
  await emailInput.fill(EMAIL);
  await passwordInput.fill(PASSWORD);
  await page.getByRole("button", { name: /entrar/i }).click();

  await page
    .waitForURL(/\/admin\//, { timeout: 15000 })
    .catch(() => {
      throw new Error(
        "E2E_AUTH_LOGIN_REJECTED — formulário de /login foi enviado, mas a " +
        "navegação para uma rota /admin/ não ocorreu (credencial rejeitada " +
        "ou erro de conexão). Nenhum e-mail/senha/token é impresso por design."
      );
    });

  // Confirma acesso de Super Admin numa rota exclusiva antes de salvar a sessão.
  await page.goto("/admin/status/arquitetura");
  await expect(page).toHaveURL(/\/admin\/status\/arquitetura/);
  await expect(page.getByText(/login/i)).toHaveCount(0);

  fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
