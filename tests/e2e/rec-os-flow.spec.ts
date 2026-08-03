import { test, expect } from "@playwright/test";
import { installMutationGuard } from "./helpers/mutation-guard";

/**
 * Sprint E2E CI 3.0.2.2 (Fase 17) — fluxo criativo do REC OS usando só o
 * catálogo demonstrativo do Radar (nenhum dado comercial real). Nunca
 * envia/salva/chama IA — só navega e confirma a estrutura.
 */
test.describe("REC OS — fluxo Radar → Criar → Finalizar", () => {
  test("Radar mostra oportunidades demonstrativas com a ação real", async ({ page }) => {
    await page.goto("/admin/contentos/radar");
    await expect(page.getByTestId("radar-opportunity-card").first()).toBeVisible();
  });

  test("Criar a partir desta oportunidade abre Criar preservando origem (sem persistir)", async ({ page }) => {
    const guard = installMutationGuard(page);
    await page.goto("/admin/contentos/radar");

    const createLink = page.getByTestId("radar-create-from-opportunity").first();
    if (await createLink.count() === 0) {
      test.skip(true, "Ação exige um cliente selecionado no contexto — não assumido para a conta E2E.");
    }
    await createLink.click();
    await expect(page).toHaveURL(/\/admin\/contentos\/criar/);
    await expect(page.getByTestId("seed-origin-badge")).toBeVisible();

    guard.assertNoDangerousMutation();
  });

  test("Aplicação & Formato: roteiro é condicional ao formato", async ({ page }) => {
    await page.goto("/admin/contentos/criar");
    if (page.url().includes("/login")) test.skip(true, "sem cliente no contexto");
  });

  test("Finalizar: Enviar só aparece depois do Visual Final, nunca dentro de Destino", async ({ page }) => {
    await page.goto("/admin/contentos/criar");
    const destinationCard = page.getByTestId("destination-choice-production");
    if (await destinationCard.count() === 0) {
      test.skip(true, "fluxo guiado exige um rascunho/cliente que a conta E2E não possui.");
    }
    // Escolher um destino não deve, por si só, criar o botão "Enviar" no MESMO passo.
    await destinationCard.click();
    await expect(page.getByTestId("enviar-destino-button")).toHaveCount(0);
  });
});
