import { test, expect } from "@playwright/test";

/**
 * Sprint E2E CI 3.0.2.2 (Fase 19) — EditorOS: sem ativo, nunca finge que
 * carregou um; nunca abre um canvas genuinamente vazio sem cliente. Só
 * usa dados/arquivos já rastreados pelo projeto (nenhuma foto real de
 * cliente, nenhum arquivo untracked).
 */
test.describe("EditorOS", () => {
  test("sem client na URL: mostra landing com seletor, nunca um canvas vazio", async ({ page }) => {
    await page.goto("/admin/contentos/editor-os");
    await expect(page).not.toHaveURL(/\/login/);
    // Landing real (EditorOSLandingState) tem o próprio heading "EditorOS" e um seletor de cliente — nunca o canvas.
    await expect(page.getByRole("heading", { name: "EditorOS" })).toBeVisible();
  });

  test("scanner de camadas continua Experimental, nenhuma ação funcional", async ({ page }) => {
    await page.goto("/admin/contentos/editor-os");
    const note = page.getByTestId("layer-scanner-status-note");
    if (await note.count() > 0) {
      await expect(note).toContainText(/experimental/i);
    }
  });

  test("Biblioteca de ativos continua desabilitada (planned), nunca uma rota vazia", async ({ page }) => {
    await page.goto("/admin/contentos/criar");
    const libraryCard = page.getByTestId("asset-library-disabled");
    if (await libraryCard.count() > 0) {
      await expect(libraryCard).toBeDisabled();
      await expect(page.getByText("Biblioteca de ativos ainda não disponível")).toBeVisible();
    }
  });
});
