import { test, expect } from "@playwright/test";

/**
 * Sprint E2E CI 3.0.2.2 (Fase 13) — CRM canônico autenticado.
 */
test.describe("CRM canônico", () => {
  test("/admin/leads é a implementação real, com o nome visível CRM", async ({ page }) => {
    await page.goto("/admin/leads");
    await expect(page).toHaveURL(/\/admin\/leads/);
    await expect(page.getByRole("heading", { name: "CRM" })).toBeVisible();
  });

  test("/admin/crm redireciona para /admin/leads, sem loop", async ({ page }) => {
    await page.goto("/admin/crm");
    await expect(page).toHaveURL(/\/admin\/leads/);
  });

  test("Pipeline comercial pertence à mesma página do CRM (não é outro banco)", async ({ page }) => {
    await page.goto("/admin/leads");
    await expect(page.getByText("Pipeline comercial")).toBeVisible();
  });

  test("Waitlist/Central aparecem como ferramentas relacionadas, não como um segundo CRM", async ({ page }) => {
    await page.goto("/admin/leads");
    await expect(page.getByText("Onboarding de plataforma (Super Admin)")).toBeVisible();
  });

  test("sidebar usa a rota canônica /admin/leads para CRM", async ({ page }) => {
    await page.goto("/admin/dashboard");
    const sidebarCrmLink = page.locator('a[href="/admin/leads"]').first();
    await expect(sidebarCrmLink).toBeVisible();
  });

  test("busca mobile/admin resolve CRM para a rota canônica", async ({ page }) => {
    await page.goto("/admin/dashboard");
    const trigger = page.getByTestId("admin-search-trigger");
    await trigger.click();
    await expect(page.getByTestId("admin-search-sheet")).toBeVisible();
    await page.getByTestId("admin-search-input").fill("CRM");
    const result = page.locator('a[href="/admin/leads"]').first();
    await expect(result).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("nenhuma duplicação textual de CRM no header desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/admin/dashboard");
    // O header mantém só o indicador (ícone + contador) — não deve haver um SEGUNDO texto "CRM" clicável fora da sidebar.
    const headerCrmTextButtons = page.locator("header a, header button").filter({ hasText: /^CRM$/ });
    await expect(headerCrmTextButtons).toHaveCount(0);
  });
});
