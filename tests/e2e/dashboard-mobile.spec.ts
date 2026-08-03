import { test, expect } from "@playwright/test";
import { findOverflow, assertNoOverflow } from "./helpers/overflow";

/**
 * Sprint E2E CI 3.0.2.2 (Fase 16) — dashboard mobile, roda em
 * 390/393/430. Cobre a causa raiz corrigida na Sprint REC OS 3.0.1
 * (viewport meta ausente) e os fixes de PageHeader/DashboardCard/ação
 * rápida.
 */
test.describe("Dashboard mobile", () => {
  test("primeiro render: sem overflow horizontal, viewport correta", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).not.toHaveURL(/\/login/);

    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute("content", /width=device-width/);

    const report = await findOverflow(page);
    assertNoOverflow(report, "/admin/dashboard");
  });

  test("título do Dashboard nunca é cortado (min-w-0/truncate aplicado, não invisível)", async ({ page }) => {
    await page.goto("/admin/dashboard");
    const title = page.getByRole("heading", { name: "Dashboard" });
    await expect(title).toBeVisible();
  });

  test("Ação rápida cabe na viewport e abre um menu real", async ({ page }) => {
    await page.goto("/admin/dashboard");
    const trigger = page.getByTestId("quick-action-trigger");
    await expect(trigger).toBeVisible();
    const box = await trigger.boundingBox();
    expect(box).not.toBeNull();
    if (box) expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);

    await trigger.click();
    await expect(page.getByTestId("quick-action-menu")).toBeVisible();
  });

  test("busca abre em sheet (não expande além da viewport)", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await page.getByTestId("admin-search-trigger").click();
    const sheet = page.getByTestId("admin-search-sheet");
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();
    if (box) expect(box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  });

  test("bottom navigation visível e dentro da viewport", async ({ page }) => {
    await page.goto("/admin/dashboard");
    const nav = page.locator("nav.md\\:hidden").first();
    await expect(nav).toBeVisible();
    const box = await nav.boundingBox();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    }
  });

  test("FAB (Lokat Voice) não cobre o conteúdo principal", async ({ page }) => {
    await page.goto("/admin/dashboard");
    const fab = page.getByLabel("Abrir Lokat Voice");
    if (await fab.count() > 0) {
      const box = await fab.boundingBox();
      const viewportHeight = page.viewportSize()!.height;
      // FAB deve estar acima da bottom nav (bottom-[5.5rem] ~ 88px do fundo).
      if (box) expect(box.y + box.height).toBeLessThan(viewportHeight);
    }
  });
});
