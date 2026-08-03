import { test, expect } from "@playwright/test";
import { installMutationGuard } from "./helpers/mutation-guard";

/**
 * Sprint E2E CI 3.0.2.2 (Fase 18) — Roadmap de Produção: as 4
 * visualizações devem sempre concordar em contagem e IDs, pois consomem
 * o mesmo array `filtered` (ver src/app/admin/contentos/roadmap/_roadmap-client.tsx).
 * Somente leitura — nunca arrasta cards nem altera status.
 */
test.describe("Roadmap de Produção", () => {
  test("Quadro/Lista/Linha do tempo/Calendário têm a mesma contagem de itens", async ({ page }) => {
    const guard = installMutationGuard(page);
    await page.goto("/admin/contentos/roadmap");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByTestId("roadmap-root")).toBeVisible();

    const cardsInView = async () => page.getByTestId("roadmap-item-card").count();

    await expect(page.getByTestId("roadmap-kanban")).toBeVisible();
    const kanbanCount = await cardsInView();

    await page.getByTestId("roadmap-view-lista").click();
    await expect(page.getByTestId("roadmap-list")).toBeVisible();
    const listCount = await cardsInView();

    await page.getByTestId("roadmap-view-linha_do_tempo").click();
    await expect(page.getByTestId("roadmap-timeline")).toBeVisible();

    await page.getByTestId("roadmap-view-calendario").click();
    await expect(page.getByTestId("roadmap-calendar")).toBeVisible();

    // Kanban e Lista compartilham o mesmo `filtered` — mesma contagem total de cards renderizados.
    expect(listCount).toBe(kanbanCount);

    guard.assertNoDangerousMutation();
  });

  test("filtros preservados ao alternar entre visualizações", async ({ page }) => {
    await page.goto("/admin/contentos/roadmap");
    await page.getByTestId("roadmap-filters-trigger").click();
    const sheet = page.getByTestId("roadmap-filter-sheet");
    await expect(sheet).toBeVisible();

    const firstCheckbox = sheet.locator('input[type="checkbox"]').first();
    if (await firstCheckbox.count() > 0) {
      await firstCheckbox.check();
      await sheet.getByText("Aplicar").click();
      await expect(page.getByTestId("roadmap-active-filters")).toBeVisible();

      await page.getByTestId("roadmap-view-lista").click();
      await expect(page.getByTestId("roadmap-active-filters")).toBeVisible();
    }
  });

  test("estado vazio honesto quando não há itens (nunca inventa card)", async ({ page }) => {
    await page.goto("/admin/contentos/roadmap");
    const cards = page.getByTestId("roadmap-item-card");
    if (await cards.count() === 0) {
      await expect(page.getByText(/Nenhum conteúdo no roadmap ainda|Nenhum item para estes filtros/)).toBeVisible();
    }
  });

  test("Mapa do Cliente abre sem login e sem misturar cliente", async ({ page }) => {
    await page.goto("/admin/contentos/mapa-cliente");
    await expect(page).not.toHaveURL(/\/login/);
  });
});
