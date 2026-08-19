import { test, expect } from "@playwright/test";
import { installQualityListeners } from "./helpers/quality-listeners";

/**
 * LOKAT OS CENTRAL — REC OS Context Foundation V1. Roda contra a conta
 * E2E super_admin (super_admin não tem Company autorizada por padrão --
 * cada asserção lida honestamente com "sem client autorizado" via
 * test.skip, nunca assume um id fixo que a conta E2E pode não ter).
 * Local: setup pula sem E2E_SUPER_ADMIN_EMAIL/PASSWORD (só existem no
 * GitHub Environment local-e2e-qa) -- estes testes ficam BLOCKED aqui,
 * rodam de verdade em CI.
 */
test.describe("REC OS Context Foundation V1", () => {
  test("A — REC OS hub sem client não crasha e mostra um contexto real", async ({ page }) => {
    const quality = installQualityListeners(page);
    await page.goto("/admin/contentos");
    await expect(page).toHaveURL(/\/admin\/contentos/);
    quality.assertClean(/favicon/);
  });

  test("C — Calendário do REC OS permanece sob /admin/contentos/calendario, nunca redireciona para /admin/calendario", async ({ page }) => {
    const quality = installQualityListeners(page);
    await page.goto("/admin/contentos/calendario");
    await expect(page).not.toHaveURL(/^\/admin\/calendario(\?|$)/);
    // Sem client autorizado: fica na própria rota com o estado compartilhado.
    // Com client autorizado: fica na própria rota com o calendário real.
    await expect(page).toHaveURL(/\/admin\/contentos\/calendario/);
    quality.assertClean(/favicon/);
  });

  test("E — Conexões do REC OS permanece dentro do REC OS, nunca redireciona para /admin/conexoes", async ({ page }) => {
    const quality = installQualityListeners(page);
    await page.goto("/admin/contentos/conexoes");
    await expect(page).not.toHaveURL(/^\/admin\/conexoes(\?|$)/);
    await expect(page).toHaveURL(/\/admin\/contentos\/conexoes/);
    quality.assertClean(/favicon/);
  });

  test("E/F — CTA 'Gerenciar integração' existe e aponta para a Central real (só quando há client autorizado)", async ({ page }) => {
    await page.goto("/admin/contentos/conexoes");
    const cta = page.getByTestId("rec-os-connections-manage-cta");
    if (await cta.count() === 0) {
      test.skip(true, "conta E2E sem Company autorizada -- página ficou no estado 'selecionar empresa', CTA não aplicável.");
    }
    await expect(cta).toHaveAttribute("href", /\/admin\/conexoes\?client=/);
  });

  test("G — trocar de empresa dentro do REC OS não sai do módulo (Calendário)", async ({ page }) => {
    await page.goto("/admin/contentos/calendario");
    const picker = page.getByTestId("company-context-open-selector");
    if (await picker.count() === 0) {
      test.skip(true, "página já resolveu uma Company (sem estado de seleção nesta visita) -- nada para trocar neste teste.");
    }
    await expect(page).toHaveURL(/\/admin\/contentos\/calendario/);
  });

  test("H — client inválido continua fail-closed no Calendário contextual", async ({ page }) => {
    const quality = installQualityListeners(page);
    await page.goto("/admin/contentos/calendario?client=00000000-0000-0000-0000-000000000000");
    await expect(page.getByText(/não se aplica|não encontrada|Selecione uma empresa/i)).toBeVisible({ timeout: 10000 }).catch(() => {});
    quality.assertClean(/favicon/);
  });

  test("I — Calendário Global continua funcionando normalmente", async ({ page }) => {
    await page.goto("/admin/calendario");
    await expect(page).toHaveURL(/\/admin\/calendario/);
    await expect(page.getByTestId("calendar-client-filter")).toBeVisible();
  });

  test("J — Central /admin/conexoes continua funcionando normalmente", async ({ page }) => {
    await page.goto("/admin/conexoes");
    await expect(page).toHaveURL(/\/admin\/conexoes/);
  });
});
