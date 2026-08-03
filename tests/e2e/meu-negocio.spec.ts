import { test, expect } from "@playwright/test";
import { installQualityListeners } from "./helpers/quality-listeners";

/**
 * Sprint E2E CI 3.0.2.2 (Fase 21) — Meu Negócio, somente leitura. A conta
 * E2E (super_admin, account_type não definido, sem cliente/agência) pode
 * não ter um DNA/Command Center real configurado — os testes toleram o
 * estado vazio honesto em vez de assumir dado comercial.
 */
test.describe("Meu Negócio", () => {
  test("abre autenticado, sem NaN/Infinity visível, sem erro de console", async ({ page }) => {
    const quality = installQualityListeners(page);
    await page.goto("/admin/meu-negocio");
    await expect(page).not.toHaveURL(/\/login/);

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/\bNaN\b/);
    expect(bodyText).not.toMatch(/\bInfinity\b/);

    quality.assertClean(/favicon/i);
  });

  test("nenhum overflow horizontal na visão geral", async ({ page }) => {
    await page.goto("/admin/meu-negocio");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });
});
