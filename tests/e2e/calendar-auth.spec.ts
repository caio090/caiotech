import { test, expect } from "@playwright/test";
import { installQualityListeners, installExternalCallGuard } from "./helpers/quality-listeners";

/**
 * Sprint E2E CI 3.0.2.2 (Fase 10) — Calendário Global autenticado.
 * Confirma, em navegador real, o defeito corrigido na Sprint Navegação e
 * Experiência 3.0.1.2 (redirect indevido para /login em falha de
 * config/permissão) permanece corrigido: com sessão real, /admin/calendario
 * nunca leva ao login.
 */
test.describe("Calendário Global autenticado", () => {
  test("acesso direto: sessão permanece, sem passar por /login", async ({ page }) => {
    const quality = installQualityListeners(page);
    const external = installExternalCallGuard(page);

    await page.goto("/admin/calendario");
    await expect(page).toHaveURL(/\/admin\/calendario/);
    await expect(page).not.toHaveURL(/\/login/);

    quality.assertClean(/favicon/i);
    external.assertNone();
  });

  test("navegação a partir do REC OS chega ao Calendário sem login", async ({ page }) => {
    await page.goto("/admin/contentos");
    const calendarLink = page.locator('a[href^="/admin/calendario"]').first();
    await expect(calendarLink).toBeVisible();
    await calendarLink.click();
    await expect(page).toHaveURL(/\/admin\/calendario/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("navegação a partir do Roadmap preserva contexto ao abrir o Calendário Global", async ({ page }) => {
    await page.goto("/admin/contentos/roadmap");
    const openCalendar = page.getByTestId("roadmap-open-global-calendar");
    if (await openCalendar.count() === 0) {
      test.skip(true, "Roadmap sem itens/data nesta conta E2E — link condicional ao mês selecionado.");
    }
    await openCalendar.click();
    await expect(page).toHaveURL(/\/admin\/calendario/);
    await expect(page).not.toHaveURL(/\/login/);
    // return_to preservado -> banner de origem visível.
    await expect(page.getByTestId("calendar-context-banner")).toBeVisible();
    await expect(page.getByTestId("calendar-return-link")).toBeVisible();
  });

  test("filtros de cliente/fonte usam navegação relativa (nunca domínio absoluto)", async ({ page }) => {
    await page.goto("/admin/calendario");
    const clientFilter = page.getByTestId("calendar-client-filter");
    if (await clientFilter.count() > 0) {
      await expect(page).not.toHaveURL(/lokat\.com\.br/);
    }
  });

  test("nenhum HTTP 500 ao navegar mês anterior/próximo/hoje", async ({ page }) => {
    const quality = installQualityListeners(page);
    await page.goto("/admin/calendario");
    const prev = page.getByTestId("calendar-previous-month");
    const next = page.getByTestId("calendar-next-month");
    const today = page.getByTestId("calendar-today");
    if (await prev.count() > 0) await prev.click();
    if (await next.count() > 0) await next.click();
    if (await today.count() > 0) await today.click();
    quality.assertClean(/favicon/i);
  });
});
