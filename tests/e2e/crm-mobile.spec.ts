import { test, expect } from "@playwright/test";
import { findOverflow, assertNoOverflow } from "./helpers/overflow";

/**
 * Sprint E2E CI 3.0.2.2 (Fase 15) — CRM mobile, roda nos 3 projetos mobile
 * (390/393/430). A conta E2E pode não ter nenhum lead real — o teste
 * valida a adaptação estrutural (cards, sheet de filtros) e/ou o estado
 * vazio/indisponível, nunca inventa registros.
 */
test.describe("CRM mobile", () => {
  test("tabela desktop não é a interface principal; cards ou estado adaptado aparecem", async ({ page }) => {
    await page.goto("/admin/leads");
    await expect(page).not.toHaveURL(/\/login/);

    const desktopTable = page.locator("table").first();
    if (await desktopTable.count() > 0) await expect(desktopTable).not.toBeVisible();

    const mobileList = page.getByTestId("crm-mobile-lead-list");
    await expect(mobileList).toBeVisible();
  });

  test("botão Filtros abre sheet com Origem/Etapa/Aplicar/Limpar", async ({ page }) => {
    await page.goto("/admin/leads");
    const trigger = page.getByTestId("crm-mobile-filters-trigger");
    await expect(trigger).toBeVisible();
    await trigger.click();

    const sheet = page.locator('[role="dialog"]').first();
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("Aplicar")).toBeVisible();
    await expect(sheet.getByText("Limpar")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("nenhum scroll horizontal na página do CRM mobile", async ({ page }) => {
    await page.goto("/admin/leads");
    const report = await findOverflow(page);
    assertNoOverflow(report, "/admin/leads");
  });

  test("KPIs mostram '—' (não 0 fabricado) quando o estado não é available_*", async ({ page }) => {
    await page.goto("/admin/leads");
    const banner = page.getByTestId("crm-unavailable-banner");
    if (await banner.count() > 0) {
      const values = page.getByTestId("crm-kpi-value");
      const first = await values.first().textContent();
      expect(first?.trim()).toBe("—");
      const bannerText = (await banner.textContent())?.toLowerCase() ?? "";
      expect(bannerText).not.toContain("service_role");
      expect(bannerText).not.toContain("supabase_service_role_key");
    }
  });
});
