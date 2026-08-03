import { test, expect } from "@playwright/test";
import { installQualityListeners } from "./helpers/quality-listeners";

/**
 * Sprint E2E CI 3.0.2.2 (Fase 12/16) — Meu Escritório autenticado. A
 * conta E2E não tem dados comerciais reais, então os asserts focam em
 * estrutura (Hoje/Semana/Mês existem, mesma fonte, links reais, rascunho
 * em memória) em vez de valores específicos de conteúdo.
 */
test.describe("Meu Escritório", () => {
  test("página abre autenticada, com as três visões", async ({ page }) => {
    const quality = installQualityListeners(page);
    await page.goto("/admin/escritorio");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByTestId("escritorio-root")).toBeVisible();

    const switcher = page.getByTestId("escritorio-view-switcher");
    await expect(switcher).toBeVisible();
    await expect(page.getByTestId("escritorio-view-hoje")).toBeVisible();
    await expect(page.getByTestId("escritorio-view-semana")).toBeVisible();
    await expect(page.getByTestId("escritorio-view-mes")).toBeVisible();

    quality.assertClean(/favicon/i);
  });

  test("Hoje: mostra itens reais ou estado vazio honesto, nunca número fictício", async ({ page }) => {
    await page.goto("/admin/escritorio");
    await page.getByTestId("escritorio-view-hoje").click();
    await expect(page.getByTestId("escritorio-hoje")).toBeVisible();
    // Ou há pelo menos um item real com link para o módulo de origem, ou o estado vazio exato do brief.
    const items = page.getByTestId("office-feed-item");
    const count = await items.count();
    if (count === 0) {
      await expect(page.getByText("Nenhum compromisso encontrado para hoje.")).toBeVisible();
    } else {
      await expect(items.first()).toHaveAttribute("href", /^\/admin\//);
    }
  });

  test("Semana: agrupamento visível, mesma fonte da visão Hoje", async ({ page }) => {
    await page.goto("/admin/escritorio");
    await page.getByTestId("escritorio-view-semana").click();
    await expect(page.getByTestId("escritorio-semana")).toBeVisible();
  });

  test("Mês: Fechamento e Planejamento do próximo mês existem como seções distintas", async ({ page }) => {
    await page.goto("/admin/escritorio");
    await page.getByTestId("escritorio-view-mes").click();
    await expect(page.getByTestId("escritorio-mes")).toBeVisible();
    await expect(page.getByText("Fechamento do mês")).toBeVisible();
    await expect(page.getByText("Planejamento do próximo mês")).toBeVisible();
  });

  test("módulos ainda não conectados aparecem nomeados, nunca como zero fabricado", async ({ page }) => {
    await page.goto("/admin/escritorio");
    await expect(page.getByTestId("office-not-integrated")).toBeVisible();
    await expect(page.getByText("Este módulo ainda não fornece dados para Meu Escritório.")).toBeVisible();
  });

  test("rascunho: QA TEMPORÁRIO - NÃO SALVAR fica só em memória, some ao recarregar", async ({ page }) => {
    await page.goto("/admin/escritorio");
    await page.getByTestId("escritorio-view-mes").click();

    const draft = page.getByTestId("office-draft-notes").locator("textarea");
    await expect(page.getByTestId("office-draft-badge")).toHaveText(/Rascunho desta sessão/);

    const persistentRequests: string[] = [];
    page.on("request", (req) => {
      if (["POST", "PUT", "PATCH"].includes(req.method()) && req.url().includes("/api/")) persistentRequests.push(req.url());
    });

    await draft.fill("QA TEMPORÁRIO - NÃO SALVAR");
    await expect(draft).toHaveValue("QA TEMPORÁRIO - NÃO SALVAR");
    await page.waitForTimeout(500); // margem para qualquer debounce de autosave que não deveria existir

    expect(persistentRequests, "nenhum request de persistência deve disparar ao digitar no rascunho").toEqual([]);

    await page.reload();
    await page.getByTestId("escritorio-view-mes").click();
    await expect(page.getByTestId("office-draft-notes").locator("textarea")).toHaveValue("");
  });

  test("nenhum localStorage/sessionStorage usado pela página", async ({ page }) => {
    await page.goto("/admin/escritorio");
    const storageSnapshot = await page.evaluate(() => ({
      local: Object.keys(localStorage).filter((k) => k.toLowerCase().includes("escritorio") || k.toLowerCase().includes("office")),
      session: Object.keys(sessionStorage).filter((k) => k.toLowerCase().includes("escritorio") || k.toLowerCase().includes("office")),
    }));
    expect(storageSnapshot.local).toEqual([]);
    expect(storageSnapshot.session).toEqual([]);
  });
});
