import { test, expect, type Page } from "@playwright/test";

/**
 * Sprint E2E CI 3.0.2.2 (Fase 20) — Workspace Preview usando os blueprints
 * fixos (sempre disponíveis, nunca dados reais de cliente). Confirma
 * banner/somente-leitura/saída, e que uma mutação real é bloqueada com
 * WORKSPACE_PREVIEW_READ_ONLY — usando um payload demonstrativo que, se o
 * guard falhar, não é capaz de persistir nada válido.
 */
async function enterPreview(page: Page, surfaceLabel: string) {
  await page.getByRole("button", { name: "Visualizar como outro painel" }).click();
  await page.getByRole("button", { name: surfaceLabel, exact: true }).click();

  // Sprint QA Fix 3.0.2.5 (CI-HARNESS-WORKSPACE-PREVIEW-RACE-001) — as
  // opções de blueprint vêm de um fetch assíncrono
  // (/api/admin/workspaces?source=blueprint, nunca depende de service role
  // — ver comentário na Fase 1-5 do hotfix 1.0.5 em
  // src/app/api/admin/workspaces/route.ts). `.count()` não espera essa
  // resposta chegar; checar count() logo após o clique corria a corrida
  // contra o fetch e saía do loop achando que não havia mais passos, antes
  // mesmo do botão "Blueprint" aparecer. Agora espera explicitamente o
  // botão ficar visível (com um timeout curto e tolerante) antes de decidir
  // se há mais uma etapa na cadeia.
  //
  // Pode exigir 1 ou 2 seleções em cadeia (ex.: Cliente da agência -> agência -> cliente).
  for (let i = 0; i < 2; i++) {
    const blueprintOption = page.locator("button", { hasText: "Blueprint" }).first();
    const appeared = await blueprintOption
      .waitFor({ state: "visible", timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (!appeared) break;
    await blueprintOption.click();
    if (await page.getByText(/Visualização do Super ADM/).count() > 0) break;
  }
}

test.describe("Workspace Preview", () => {
  for (const surfaceLabel of ["Agência", "Empresa direta"]) {
    test(`preview de ${surfaceLabel}: banner, somente leitura, sair`, async ({ page }) => {
      await page.goto("/admin/dashboard");
      await enterPreview(page, surfaceLabel);

      const banner = page.getByText(/Visualização do Super ADM/);
      await expect(banner).toBeVisible({ timeout: 10000 });
      await expect(banner).toContainText("Somente leitura");

      // Navegação continua funcionando dentro do preview.
      await page.goto("/admin/contentos");
      await expect(page.getByText(/Visualização do Super ADM/)).toBeVisible();

      // Reload preserva o preview (cookie assinado, não estado de cliente).
      await page.reload();
      await expect(page.getByText(/Visualização do Super ADM/)).toBeVisible();

      // Sair da visualização.
      await page.getByRole("button", { name: /Sair da visualização/ }).click();
      await expect(page.getByText(/Visualização do Super ADM/)).toHaveCount(0, { timeout: 10000 });
    });
  }

  test("mutação real é bloqueada durante o preview (WORKSPACE_PREVIEW_READ_ONLY)", async ({ page, request, baseURL }) => {
    await page.goto("/admin/dashboard");
    await enterPreview(page, "Agência");
    await expect(page.getByText(/Visualização do Super ADM/)).toBeVisible({ timeout: 10000 });

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    // Payload claramente demonstrativo e inválido — mesmo se o guard falhasse, nada real seria persistido.
    const response = await request.patch(`${baseURL}/api/admin/contentos/drafts/qa-e2e-preview-guard-check`, {
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      data: { client_id: "qa-e2e-preview-guard-check", guided_create: { current_step: "brief" } },
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(403);
    const body = await response.json().catch(() => ({}));
    expect(body.code).toBe("WORKSPACE_PREVIEW_READ_ONLY");

    await page.getByRole("button", { name: /Sair da visualização/ }).click();
    await expect(page.getByText(/Visualização do Super ADM/)).toHaveCount(0, { timeout: 10000 });
  });
});
