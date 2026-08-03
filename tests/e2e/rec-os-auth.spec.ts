import { test, expect } from "@playwright/test";
import { installQualityListeners } from "./helpers/quality-listeners";

/**
 * Sprint E2E CI 3.0.2.2 (Fase 11) — REC OS autenticado. Confirma que o
 * hub (/admin/contentos) e suas macroetapas nunca mandam um Super Admin
 * autenticado para login/logo/home genérica.
 */
test.describe("REC OS autenticado", () => {
  test("hub /admin/contentos abre sem login, sem home pública, sem HTTP 500", async ({ page }) => {
    const quality = installQualityListeners(page);
    const response = await page.goto("/admin/contentos");
    await expect(page).toHaveURL(/\/admin\/contentos/);
    await expect(page).not.toHaveURL(/\/login/);
    expect(response?.status()).toBeLessThan(500);
    quality.assertClean(/favicon/i);
  });

  const SUBNAV_ROUTES: Array<[string, string]> = [
    ["Radar", "/admin/contentos/radar"],
    ["Criar", "/admin/contentos/criar"],
    ["Produção", "/admin/contentos/producao"],
    ["Roadmap", "/admin/contentos/roadmap"],
    ["Mapa do Cliente", "/admin/contentos/mapa-cliente"],
  ];

  for (const [label, route] of SUBNAV_ROUTES) {
    test(`${label} (${route}) abre autenticado, sem login e sem HTTP 500`, async ({ page }) => {
      const response = await page.goto(route);
      await expect(page).not.toHaveURL(/\/login/);
      expect(response?.status(), `${route} não deve responder 5xx`).toBeLessThan(500);
    });
  }

  test("estado indisponível (403/503), quando ocorrer, nunca desloga o usuário", async ({ page }) => {
    await page.goto("/admin/contentos");
    const unavailable = page.getByTestId("admin-contentos-unavailable-state");
    if (await unavailable.count() > 0) {
      await expect(page).not.toHaveURL(/\/login/);
      const text = await unavailable.textContent();
      expect(text?.toLowerCase()).not.toContain("service_role");
      expect(text?.toLowerCase()).not.toContain("supabase_service_role_key");
    }
  });
});
